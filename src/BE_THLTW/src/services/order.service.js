const pool = require('../config/db');
const { calculateSessionBill } = require('./session.service');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = require('../utils/errors');
const { getIO } = require('../sockets/io');
const logger = require('../utils/logger');

async function createOrder(session_id, items, session_version) {
  let order_id, table_id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. SELECT FOR UPDATE sessions để kiểm tra version (Optimistic locking)
    const sessionRes = await client.query(
      `SELECT * FROM SESSIONS WHERE id = $1 AND version = $2 FOR UPDATE`,
      [session_id, session_version]
    );

    if (sessionRes.rows.length === 0) {
      throw new ConflictError('Session đã được cập nhật bởi request khác hoặc không tồn tại. Vui lòng thử lại.');
    }
    const session = sessionRes.rows[0];

    if (session.status !== 'ACTIVE') {
      throw new AuthorizationError('Session này đã bị đóng.');
    }

    // 2. Validate và lock MENU_ITEMS
    for (const item of items) {
      const itemRes = await client.query(
        `SELECT id, name, price, is_available, daily_quota FROM MENU_ITEMS WHERE id = $1 FOR UPDATE`,
        [item.menu_item_id]
      );
      if (itemRes.rows.length === 0) {
        throw new NotFoundError(`Không tìm thấy món ăn (ID: ${item.menu_item_id})`);
      }

      const menuItem = itemRes.rows[0];
      if (!menuItem.is_available) {
        throw new ValidationError(`Món [${menuItem.name}] hiện không phục vụ`);
      }
      if (menuItem.daily_quota < item.quantity) {
        throw new ValidationError(`Món [${menuItem.name}] không đủ số lượng phục vụ`);
      }

      // Trừ daily_quota với constraint check để tránh race condition
      const updateRes = await client.query(
        `UPDATE MENU_ITEMS SET daily_quota = daily_quota - $1
         WHERE id = $2 AND daily_quota >= $1
         RETURNING daily_quota`,
        [item.quantity, item.menu_item_id]
      );

      if (updateRes.rows.length === 0) {
        throw new ValidationError(`Món [${menuItem.name}] không đủ số lượng phục vụ (đã được đặt bởi khách khác)`);
      }

      // Pass properties for later insert
      item._price = menuItem.price;
    }

    // 3. Tạo bản ghi ORDERS
    const orderRes = await client.query(
      `INSERT INTO ORDERS (session_id, table_id, status, version, created_at)
       VALUES ($1, $2, 'PENDING', 1, NOW()) RETURNING id`,
      [session_id, session.table_id]
    );
    order_id = orderRes.rows[0].id;
    table_id = session.table_id;

    // 4. Tạo ORDER_ITEMS và ORDER_ITEM_OPTIONS
    for (const item of items) {
      const orderItemRes = await client.query(
        `INSERT INTO ORDER_ITEMS (order_id, menu_item_id, quantity, unit_price, note, status, version)
         VALUES ($1, $2, $3, $4, $5, 'PENDING', 1) RETURNING id`,
        [order_id, item.menu_item_id, item.quantity, item._price, item.note || null]
      );
      const order_item_id = orderItemRes.rows[0].id;

      if (item.options && Array.isArray(item.options)) {
        for (const option of item.options) {
          const optionRes = await client.query(
            `SELECT extra_price FROM MENU_ITEM_OPTIONS
             WHERE id = $1 AND menu_item_id = $2 AND is_available = true`,
            [option.option_id, item.menu_item_id]
          );
          if (optionRes.rows.length === 0) {
            throw new ValidationError(`Invalid option for menu item ${item.menu_item_id}`);
          }

          const extra_price = optionRes.rows[0].extra_price;

          await client.query(
            `INSERT INTO ORDER_ITEM_OPTIONS (order_item_id, menu_item_option_id, quantity, extra_price)
             VALUES ($1, $2, $3, $4)`,
            [order_item_id, option.option_id, option.quantity || 1, extra_price]
          );
        }
      }
    }

    // 5. Cập nhật Bill của session
    await calculateSessionBill(session_id, client);

    // 6. Tăng version của session
    await client.query(
      `UPDATE SESSIONS SET version = version + 1 WHERE id = $1`,
      [session_id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // 7. Emit socket sau khi client đã release — lỗi socket không ảnh hưởng response
  try {
    await emitNewOrder(order_id, table_id);
  } catch (err) {
    logger.error('Failed to emit new_order socket event', { order_id, err: err.message });
  }

  return { order_id };
}

async function emitNewOrder(order_id, table_id) {
  const io = getIO();

  const { rows: groupedItems } = await pool.query(
    `SELECT mc.station, json_agg(json_build_object(
      'order_item_id', oi.id,
      'menu_item_id', mi.id,
      'name', mi.name,
      'quantity', oi.quantity,
      'note', oi.note
    )) as station_items
     FROM ORDER_ITEMS oi
     JOIN MENU_ITEMS mi ON mi.id = oi.menu_item_id
     JOIN MENU_CATEGORIES mc ON mc.id = mi.category_id
     WHERE oi.order_id = $1
     GROUP BY mc.station`,
    [order_id]
  );

  const tableRes = await pool.query(`SELECT name FROM TABLES WHERE id = $1`, [table_id]);
  const table_name = tableRes.rows[0]?.name;

  for (const group of groupedItems) {
    io.of('/kitchen').to(group.station).emit('new_order', {
      order_id,
      table_name,
      items: group.station_items,
    });
  }
}

async function getSessionOrders(session_id) {
  // Lấy danh sách orders
  const ordersRes = await pool.query(
    `SELECT id, status, created_at, version FROM ORDERS WHERE session_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [session_id]
  );
  const orders = ordersRes.rows;

  if (orders.length === 0) return [];

  const orderIds = orders.map(o => o.id);

  // Lấy order items
  const itemsRes = await pool.query(
    `SELECT oi.*, mi.name, mi.image_url 
     FROM ORDER_ITEMS oi 
     JOIN MENU_ITEMS mi ON oi.menu_item_id = mi.id 
     WHERE oi.order_id = ANY($1) ORDER BY oi.id`,
    [orderIds]
  );
  const orderItems = itemsRes.rows;

  if (orderItems.length === 0) {
    return orders.map(o => ({ ...o, items: [] }));
  }

  const itemIds = orderItems.map(i => i.id);

  // Lấy order item options
  const optionsRes = await pool.query(
    `SELECT oio.*, mio.option_name, mio.option_group 
     FROM ORDER_ITEM_OPTIONS oio 
     JOIN MENU_ITEM_OPTIONS mio ON oio.menu_item_option_id = mio.id 
     WHERE oio.order_item_id = ANY($1)`,
    [itemIds]
  );
  const options = optionsRes.rows;

  // Format response
  const itemsMap = orderItems.map(item => {
    return {
      ...item,
      options: options.filter(opt => opt.order_item_id === item.id)
    };
  });

  return orders.map(order => {
    return {
      ...order,
      items: itemsMap.filter(i => i.order_id === order.id)
    };
  });
}

module.exports = {
  createOrder,
  getSessionOrders,
};
