const pool = require('../config/db');
const { NotFoundError } = require('../utils/errors');

async function getOrdersByStation(station) {
  const query = `
    SELECT 
      o.id as order_id, 
      t.name as table_name, 
      o.created_at, 
      json_agg(json_build_object(
        'order_item_id', oi.id,
        'menu_item_id', mi.id,
        'name', mi.name,
        'quantity', oi.quantity,
        'note', oi.note,
        'status', oi.status
      )) as items
    FROM ORDER_ITEMS oi
    JOIN ORDERS o ON o.id = oi.order_id
    JOIN MENU_ITEMS mi ON mi.id = oi.menu_item_id
    JOIN MENU_CATEGORIES mc ON mc.id = mi.category_id
    JOIN SESSIONS s ON s.id = o.session_id
    JOIN TABLES t ON t.id = s.table_id
    WHERE oi.status IN ('PENDING', 'PREPARING')
      AND mc.station = $1
      AND o.deleted_at IS NULL
    GROUP BY o.id, t.name, o.created_at
    ORDER BY o.created_at ASC
  `;

  const { rows } = await pool.query(query, [station]);
  return rows;
}

async function updateOrderItemStatus(order_item_id, new_status, user_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Cập nhật status của order_item
    const updateItemRes = await client.query(
      `UPDATE ORDER_ITEMS SET status = $1 WHERE id = $2 RETURNING order_id, status`,
      [new_status, order_item_id]
    );

    if (updateItemRes.rows.length === 0) {
      throw new NotFoundError('Order item không tồn tại');
    }

    const { order_id } = updateItemRes.rows[0];

    // 2. Lấy danh sách status của tất cả items trong order đó (ngoại trừ CANCELLED)
    const { rows: itemsStatus } = await client.query(
      `SELECT status FROM ORDER_ITEMS WHERE order_id = $1 AND status != 'CANCELLED'`,
      [order_id]
    );

    // 3. Tính toán status mới cho ORDER
    let orderNewStatus = null;
    const allReady = itemsStatus.every(i => i.status === 'READY' || i.status === 'SERVED');
    const allServed = itemsStatus.every(i => i.status === 'SERVED');
    const hasPreparing = itemsStatus.some(i => i.status === 'PREPARING' || i.status === 'READY');

    if (allServed) {
      orderNewStatus = 'SERVED';
    } else if (allReady) {
      orderNewStatus = 'READY';
    } else if (hasPreparing) {
      orderNewStatus = 'PREPARING';
    }

    // Lấy status cũ của ORDER
    const orderRes = await client.query(`SELECT status, session_id FROM ORDERS WHERE id = $1`, [order_id]);
    const orderOldStatus = orderRes.rows[0].status;
    const session_id = orderRes.rows[0].session_id;

    // 4. Nếu order status thay đổi, cập nhật và ghi log
    if (orderNewStatus && orderNewStatus !== orderOldStatus) {
      await client.query(`UPDATE ORDERS SET status = $1 WHERE id = $2`, [orderNewStatus, order_id]);
      
      await client.query(
        `INSERT INTO ORDER_STATUS_LOGS (order_id, changed_by, old_status, new_status, changed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [order_id, user_id, orderOldStatus, orderNewStatus]
      );
    }

    await client.query('COMMIT');

    // 5. Emit socket cho Customer nếu order status thay đổi
    if (orderNewStatus && orderNewStatus !== orderOldStatus) {
      const { getIO } = require('../sockets/io');
      const io = getIO();
      io.of('/customer').to(session_id).emit('order_status_updated', {
        order_id,
        new_status: orderNewStatus,
        changed_at: new Date(),
      });
    }

    return { order_id, order_status: orderNewStatus || orderOldStatus };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getOrdersByStation,
  updateOrderItemStatus,
};
