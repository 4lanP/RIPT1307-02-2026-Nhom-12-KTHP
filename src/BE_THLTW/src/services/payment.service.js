const pool = require('../config/db');
const { createPaymentUrl, verifyIPN } = require('../utils/vnpay.util');
const { acquireLock, releaseLock } = require('../config/redis');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');
const crypto = require('crypto');

function generateTransactionRef() {
  return `RES-${crypto.randomUUID()}`;
}

async function createVNPayPayment(session_id, ipAddr) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sessionRes = await client.query(
      `SELECT final_amount FROM SESSIONS WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE`,
      [session_id]
    );

    if (sessionRes.rows.length === 0) {
      throw new NotFoundError('Session không tồn tại hoặc đã bị đóng');
    }

    const final_amount = sessionRes.rows[0].final_amount;
    const txnRef = generateTransactionRef();

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
    logger.warn('VNPay webhook: Invalid checksum', { txnRef: queryData['vnp_TxnRef'] });
    return { RspCode: '97', Message: 'Invalid Checksum' };
  }

  const vnp_TxnRef = queryData['vnp_TxnRef'];
  const vnp_ResponseCode = queryData['vnp_ResponseCode'];
  const lockKey = `webhook:vnpay:${vnp_TxnRef}`;

  const lockAcquired = await acquireLock(lockKey, 60);

  if (lockAcquired === false) {
    logger.warn('VNPay webhook: Already processing', { txnRef: vnp_TxnRef });
    return { RspCode: '02', Message: 'Webhook already processing' };
  }

  if (lockAcquired === null) {
    logger.warn('VNPay webhook: Redis lock unavailable, continuing with DB idempotency', { txnRef: vnp_TxnRef });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const paymentRes = await client.query(
      `SELECT * FROM PAYMENTS WHERE transaction_id = $1 FOR UPDATE`,
      [vnp_TxnRef]
    );

    if (paymentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn('VNPay webhook: Payment not found', { txnRef: vnp_TxnRef });
      return { RspCode: '01', Message: 'Order not found' };
    }

    const payment = paymentRes.rows[0];
    const paidAmount = Number(queryData['vnp_Amount']) / 100;
    const expectedAmount = Number(payment.amount);

    if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
      await client.query('ROLLBACK');
      logger.warn('VNPay webhook: Amount mismatch', {
        txnRef: vnp_TxnRef,
        paidAmount,
        expectedAmount,
      });
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (payment.status === 'COMPLETED' || payment.status === 'FAILED') {
      await client.query('ROLLBACK');
      logger.info('VNPay webhook: Payment already processed', {
        txnRef: vnp_TxnRef,
        status: payment.status,
      });
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (vnp_ResponseCode === '00') {
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

      const { getIO } = require('../sockets/io');
      const io = getIO();
      io.of('/staff').emit('table_status_changed', { table_id, status: 'AVAILABLE' });
      io.of('/customer').to(session_id).emit('session_closed', { reason: 'PAID' });

      logger.info('VNPay webhook: Payment completed', { txnRef: vnp_TxnRef, sessionId: session_id });
    } else {
      await client.query(
        `UPDATE PAYMENTS SET status = 'FAILED', webhook_data = $1 WHERE transaction_id = $2`,
        [queryData, vnp_TxnRef]
      );
      logger.warn('VNPay webhook: Payment failed', {
        txnRef: vnp_TxnRef,
        responseCode: vnp_ResponseCode,
      });
    }

    await client.query('COMMIT');
    return { RspCode: '00', Message: 'Confirm Success' };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('VNPay webhook: Processing error', {
      txnRef: vnp_TxnRef,
      error: err.message,
    });
    throw err;
  } finally {
    client.release();
    if (lockAcquired) {
      await releaseLock(lockKey);
    }
  }
}

module.exports = {
  createVNPayPayment,
  processVNPayWebhook,
  generateTransactionRef,
};
