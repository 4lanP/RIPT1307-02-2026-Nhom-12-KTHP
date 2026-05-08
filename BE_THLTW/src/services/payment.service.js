const pool = require('../config/db');
const { createPaymentUrl, verifyIPN } = require('../utils/vnpay.util');

async function createVNPayPayment(session_id, ipAddr) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query(
      `SELECT final_amount FROM SESSIONS WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE`,
      [session_id]
    );

    if (sessionRes.rows.length === 0) {
      throw { statusCode: 404, message: 'Session không tồn tại hoặc đã bị đóng' };
    }

    const final_amount = sessionRes.rows[0].final_amount;
    const txnRef = `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Tạo record PAYMENT
    await client.query(
      `INSERT INTO PAYMENTS (session_id, method, amount, status, transaction_id)
       VALUES ($1, 'VNPAY', $2, 'PENDING', $3)`,
      [session_id, final_amount, txnRef]
    );

    await client.query('COMMIT');

    const payment_url = createPaymentUrl(ipAddr, final_amount, `Thanh toan don hang ${txnRef}`, txnRef);
    return { payment_url };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function processVNPayWebhook(queryData) {
  const isValid = verifyIPN(queryData);
  if (!isValid) {
    return { RspCode: '97', Message: 'Invalid Checksum' };
  }

  const vnp_TxnRef = queryData['vnp_TxnRef'];
  const vnp_ResponseCode = queryData['vnp_ResponseCode'];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. SELECT payment
    const paymentRes = await client.query(
      `SELECT * FROM PAYMENTS WHERE transaction_id = $1 FOR UPDATE`,
      [vnp_TxnRef]
    );

    if (paymentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { RspCode: '01', Message: 'Order not found' };
    }

    const payment = paymentRes.rows[0];

    // 2. Idempotent check
    if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
      await client.query('ROLLBACK');
      return { RspCode: '02', Message: 'Order already confirmed' }; // VNPay docs khuyên trả 02 nếu đã update
    }

    if (vnp_ResponseCode === '00') {
      // 3. Update payment & session & table
      await client.query(
        `UPDATE PAYMENTS SET status = 'COMPLETED', paid_at = NOW(), webhook_data = $1 WHERE transaction_id = $2`,
        [queryData, vnp_TxnRef]
      );

      const session_id = payment.session_id;
      const sessionRes = await client.query(
        `UPDATE SESSIONS SET status = 'CLOSED', ended_at = NOW() WHERE id = $1 RETURNING table_id`,
        [session_id]
      );
      const table_id = sessionRes.rows[0].table_id;

      await client.query(`UPDATE TABLES SET status = 'AVAILABLE' WHERE id = $1`, [table_id]);

      // Emit sockets
      const { getIO } = require('../sockets/io');
      const io = getIO();
      io.of('/staff').emit('table_status_changed', { table_id, status: 'AVAILABLE' });
      io.of('/customer').to(session_id).emit('session_closed', { reason: 'PAID' });
    } else {
      // Thanh toán thất bại
      await client.query(
        `UPDATE PAYMENTS SET status = 'FAILED', webhook_data = $1 WHERE transaction_id = $2`,
        [queryData, vnp_TxnRef]
      );
    }

    await client.query('COMMIT');
    return { RspCode: '00', Message: 'Confirm Success' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createVNPayPayment,
  processVNPayWebhook,
};
