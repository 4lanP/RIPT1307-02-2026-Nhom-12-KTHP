// ... existing imports
const pool = require('../config/db');
const { generateSessionToken } = require('../utils/jwt.util');
const { NotFoundError, ConflictError } = require('../utils/errors');

// --- CÁC HÀM CUSTOMER ĐÃ CÓ ---
async function scan(qr_code) {
  // ...
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const qrRes = await client.query('SELECT * FROM QR_CODES WHERE code = $1 AND is_active = true', [qr_code]);
    if (qrRes.rows.length === 0) throw new NotFoundError('Mã QR không hợp lệ hoặc đã bị vô hiệu hóa');
    const qr = qrRes.rows[0];

    const tableRes = await client.query('SELECT * FROM TABLES WHERE id = $1 FOR UPDATE', [qr.table_id]);
    const table = tableRes.rows[0];

    if (table.status === 'OCCUPIED') {
      throw new ConflictError('Bàn đang có khách, vui lòng liên hệ nhân viên');
    }

    const sessionRes = await client.query(
      `INSERT INTO SESSIONS (table_id, qr_code_id, status, version, started_at, subtotal, discount_amount, tax_amount, final_amount)
       VALUES ($1, $2, 'ACTIVE', 1, NOW(), 0, 0, 0, 0) RETURNING id`,
      [table.id, qr.id]
    );
    const session_id = sessionRes.rows[0].id;

    await client.query("UPDATE TABLES SET status = 'OCCUPIED' WHERE id = $1", [table.id]);
    await client.query('COMMIT');

    const { getIO } = require('../sockets/io');
    const io = getIO();
    io.of('/staff').emit('table_status_changed', { table_id: table.id, status: 'OCCUPIED' });

    // Generate JWT session token instead of returning plain ID
    const session_token = generateSessionToken(session_id);
    return { session_token, table_name: table.name };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getSession(session_id) {
  const { rows } = await pool.query(
    `SELECT s.*, t.name as table_name 
     FROM SESSIONS s JOIN TABLES t ON s.table_id = t.id WHERE s.id = $1`,
    [session_id]
  );
  if (rows.length === 0) throw new NotFoundError('Session không tồn tại');
  return rows[0];
}

async function getMenu({ category_id, station }) {
  let categoryQuery = 'SELECT * FROM MENU_CATEGORIES WHERE is_active = true';
  const categoryParams = [];
  let paramIndex = 1;
  if (category_id) { categoryQuery += ` AND id = $${paramIndex++}`; categoryParams.push(category_id); }
  if (station) { categoryQuery += ` AND station = $${paramIndex++}`; categoryParams.push(station); }
  categoryQuery += ' ORDER BY sort_order';

  const catRes = await pool.query(categoryQuery, categoryParams);
  const categories = catRes.rows;
  if (categories.length === 0) return [];

  const categoryIds = categories.map((c) => c.id);
  const itemsRes = await pool.query(
    `SELECT * FROM MENU_ITEMS WHERE category_id = ANY($1) AND is_available = true ORDER BY sort_order`,
    [categoryIds]
  );
  const items = itemsRes.rows;
  if (items.length === 0) return categories.map((c) => ({ ...c, items: [] }));

  const itemIds = items.map((i) => i.id);
  const optionsRes = await pool.query(
    `SELECT * FROM MENU_ITEM_OPTIONS WHERE menu_item_id = ANY($1) AND is_available = true`,
    [itemIds]
  );
  const options = optionsRes.rows;

  items.forEach(item => { item.options = options.filter(o => o.menu_item_id === item.id); });
  return categories.map(c => ({ ...c, items: items.filter(i => i.category_id === c.id) }));
}

async function createCustomerRequest(session_id, request_type) {
  const { rows } = await pool.query(
    `INSERT INTO CUSTOMER_REQUESTS (session_id, request_type, status, created_at)
     VALUES ($1, $2, 'OPEN', NOW()) RETURNING id`,
    [session_id, request_type]
  );
  const request_id = rows[0].id;

  const sessionRes = await pool.query(
    'SELECT t.name FROM SESSIONS s JOIN TABLES t ON s.table_id = t.id WHERE s.id = $1',
    [session_id]
  );
  const table_name = sessionRes.rows[0]?.name;

  const { getIO } = require('../sockets/io');
  const io = getIO();
  io.of('/staff').emit('new_customer_request', { request_id, table_name, request_type });
  return { request_id };
}

async function calculateSessionBill(session_id, client) {
  const billQuery = `
    SELECT
      COALESCE(SUM(
        oi.quantity * oi.unit_price +
        COALESCE((
          SELECT SUM(oio.quantity * oio.extra_price)
          FROM order_item_options oio
          WHERE oio.order_item_id = oi.id
        ), 0)
      ), 0) AS subtotal
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.session_id = $1
      AND oi.status != 'CANCELLED'
      AND o.deleted_at IS NULL
  `;
  const { rows } = await client.query(billQuery, [session_id]);
  const subtotal = parseFloat(rows[0].subtotal);

  const sessionRes = await client.query('SELECT discount_amount FROM sessions WHERE id = $1', [session_id]);
  const discount_amount = parseFloat(sessionRes.rows[0].discount_amount);
  const TAX_RATE = process.env.TAX_RATE ? parseFloat(process.env.TAX_RATE) : 0.08;
  const tax_amount = parseFloat(((subtotal - discount_amount) * TAX_RATE).toFixed(2));
  const final_amount = parseFloat((subtotal - discount_amount + tax_amount).toFixed(2));

  await client.query(
    `UPDATE sessions SET subtotal=$1, tax_amount=$2, final_amount=$3 WHERE id=$4`,
    [subtotal, tax_amount, final_amount, session_id]
  );
}

// --- CÁC HÀM STAFF MỚI THÊM ---

async function getTables() {
  const query = `
    SELECT t.id as table_id, t.name as table_name, t.status, t.zone, t.capacity, s.id as active_session_id
    FROM TABLES t
    LEFT JOIN SESSIONS s ON s.table_id = t.id AND s.status = 'ACTIVE'
    ORDER BY t.zone, t.name
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function getTableActiveSession(table_id) {
  const sessionRes = await pool.query(
    `SELECT s.*, t.name as table_name FROM SESSIONS s JOIN TABLES t ON t.id = s.table_id WHERE s.table_id = $1 AND s.status = 'ACTIVE'`,
    [table_id]
  );
  if (sessionRes.rows.length === 0) {
    throw new NotFoundError('Bàn không có session đang hoạt động');
  }
  const session = sessionRes.rows[0];

  // Lấy chi tiết bill
  const { getSessionOrders } = require('./order.service');
  session.orders = await getSessionOrders(session.id);
  
  return session;
}

async function checkoutCash(session_id, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const sessionRes = await client.query(`SELECT table_id, status, final_amount FROM SESSIONS WHERE id = $1 FOR UPDATE`, [session_id]);
    if (sessionRes.rows.length === 0) throw new NotFoundError('Session không tồn tại');
    const session = sessionRes.rows[0];
    if (session.status !== 'ACTIVE') {
      throw new ConflictError('Session is already closed');
    }
    const paidAmount = Number(amount);
    const finalAmount = Number(session.final_amount);
    if (!Number.isFinite(paidAmount) || paidAmount < finalAmount) {
      throw new ConflictError('Invalid payment amount');
    }
    const table_id = session.table_id;

    // 1. Tạo PAYMENT
    await client.query(
      `INSERT INTO PAYMENTS (session_id, method, amount, status, paid_at) VALUES ($1, 'CASH', $2, 'COMPLETED', NOW())`,
      [session_id, amount]
    );

    // 2. Cập nhật SESSION và TABLE
    await client.query(`UPDATE SESSIONS SET status = 'CLOSED', ended_at = NOW() WHERE id = $1`, [session_id]);
    await client.query(`UPDATE TABLES SET status = 'AVAILABLE' WHERE id = $1`, [table_id]);

    await client.query('COMMIT');

    // 3. Emit sockets
    const { getIO } = require('../sockets/io');
    const io = getIO();
    io.of('/staff').emit('table_status_changed', { table_id, status: 'AVAILABLE' });
    io.of('/customer').to(session_id).emit('session_closed', { reason: 'PAID' });

    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function forceCloseSession(session_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query(`SELECT table_id FROM SESSIONS WHERE id = $1 FOR UPDATE`, [session_id]);
    if (sessionRes.rows.length === 0) throw new NotFoundError('Session không tồn tại');
    const table_id = sessionRes.rows[0].table_id;

    await client.query(`UPDATE SESSIONS SET status = 'CLOSED', ended_at = NOW() WHERE id = $1`, [session_id]);
    await client.query(`UPDATE TABLES SET status = 'AVAILABLE' WHERE id = $1`, [table_id]);

    await client.query('COMMIT');

    const { getIO } = require('../sockets/io');
    const io = getIO();
    io.of('/staff').emit('table_status_changed', { table_id, status: 'AVAILABLE' });
    io.of('/customer').to(session_id).emit('session_closed', { reason: 'FORCE_CLOSED' });

    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function cancelOrderItem(order_item_id, cancel_reason) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update status
    const updateRes = await client.query(
      `UPDATE ORDER_ITEMS SET status = 'CANCELLED', cancel_reason = $1 WHERE id = $2 RETURNING order_id`,
      [cancel_reason, order_item_id]
    );
    if (updateRes.rows.length === 0) throw new NotFoundError('Order item không tồn tại');
    const order_id = updateRes.rows[0].order_id;

    // Lấy session id
    const orderRes = await client.query(`SELECT session_id FROM ORDERS WHERE id = $1`, [order_id]);
    const session_id = orderRes.rows[0].session_id;

    // Cập nhật bill
    await calculateSessionBill(session_id, client);

    // Kiểm tra và cập nhật status ORDER nếu tất cả item đều cancel
    const itemsStatusRes = await client.query(`SELECT status FROM ORDER_ITEMS WHERE order_id = $1`, [order_id]);
    if (itemsStatusRes.rows.every(i => i.status === 'CANCELLED')) {
      await client.query(`UPDATE ORDERS SET status = 'CANCELLED' WHERE id = $1`, [order_id]);
    }

    await client.query('COMMIT');

    // Emit sockets
    const { getIO } = require('../sockets/io');
    const io = getIO();
    io.of('/kitchen').emit('item_cancelled', { order_item_id, cancel_reason });
    io.of('/customer').to(session_id).emit('order_status_updated', { order_id, new_status: 'CANCELLED', changed_at: new Date() });

    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getRequests() {
  const { rows } = await pool.query(
    `SELECT cr.*, t.name as table_name 
     FROM CUSTOMER_REQUESTS cr
     JOIN SESSIONS s ON s.id = cr.session_id
     JOIN TABLES t ON t.id = s.table_id
     WHERE cr.status = 'OPEN' ORDER BY cr.created_at ASC`
  );
  return rows;
}

async function resolveRequest(request_id) {
  await pool.query(
    `UPDATE CUSTOMER_REQUESTS SET status = 'RESOLVED', resolved_at = NOW() WHERE id = $1`,
    [request_id]
  );
  return { success: true };
}

module.exports = {
  scan,
  getSession,
  getMenu,
  createCustomerRequest,
  calculateSessionBill,
  getTables,
  getTableActiveSession,
  checkoutCash,
  forceCloseSession,
  cancelOrderItem,
  getRequests,
  resolveRequest,
};
