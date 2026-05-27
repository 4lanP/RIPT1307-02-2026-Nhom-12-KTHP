const crypto = require('crypto');
const pool = require('../config/db');
const { ConflictError, NotFoundError, ValidationError } = require('../utils/errors');

function toNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeInvoice(row) {
  if (!row) return null;
  return {
    ...row,
    subtotal: toNumber(row.subtotal),
    discount_amount: toNumber(row.discount_amount),
    tax_amount: toNumber(row.tax_amount),
    rounding_amount: toNumber(row.rounding_amount),
    final_amount: toNumber(row.final_amount),
    is_reprint: Boolean(row.is_reprint),
  };
}

function normalizeItem(row) {
  return {
    ...row,
    quantity: Number(row.quantity || 0),
    unit_price: toNumber(row.unit_price),
    options_total: toNumber(row.options_total),
    line_total: toNumber(row.line_total),
    note: row.note || '',
  };
}

function buildBillFingerprint({ session, items, payment }) {
  const payload = {
    session_id: session.id,
    subtotal: toNumber(session.subtotal),
    discount_amount: toNumber(session.discount_amount),
    tax_amount: toNumber(session.tax_amount),
    final_amount: toNumber(session.final_amount),
    payment_status: payment.payment_status,
    payment_method: payment.payment_method,
    items: items.map((item) => ({
      order_item_id: item.order_item_id,
      item_name: item.item_name,
      quantity: Number(item.quantity),
      unit_price: toNumber(item.unit_price),
      options_total: toNumber(item.options_total),
      line_total: toNumber(item.line_total),
    })),
  };

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function getPaymentState(payments) {
  const completed = payments.find((payment) => payment.status === 'COMPLETED');
  if (completed) {
    return { payment_status: 'PAID', payment_method: completed.method };
  }

  const pending = payments.find((payment) => payment.status === 'PENDING');
  if (pending) {
    return { payment_status: 'PENDING', payment_method: pending.method };
  }

  return { payment_status: 'UNPAID', payment_method: null };
}

function createInvoiceNumber(sessionId) {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = `${sessionId}-${now.getTime().toString(36)}`.toUpperCase();
  return `INV-${ymd}-${suffix}`;
}

async function loadInvoiceWithItems(invoiceId, db = pool) {
  const invoiceRes = await db.query(
    `SELECT * FROM INVOICES WHERE id = $1`,
    [invoiceId]
  );
  if (invoiceRes.rows.length === 0) {
    throw new NotFoundError('Invoice not found');
  }

  const itemsRes = await db.query(
    `SELECT item_name, quantity, unit_price, options_total, line_total, note
     FROM INVOICE_LINE_ITEMS
     WHERE invoice_id = $1
     ORDER BY sort_order, id`,
    [invoiceId]
  );

  return {
    invoice: normalizeInvoice(invoiceRes.rows[0]),
    items: itemsRes.rows.map(normalizeItem),
  };
}

async function createInvoice(sessionId, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sessionRes = await client.query(
      `SELECT s.*, t.id as table_id, t.name as table_name
       FROM SESSIONS s
       JOIN TABLES t ON t.id = s.table_id
       WHERE s.id = $1
       FOR UPDATE`,
      [sessionId]
    );
    if (sessionRes.rows.length === 0) {
      throw new NotFoundError('Session not found');
    }
    const session = sessionRes.rows[0];

    const itemsRes = await client.query(
      `SELECT
         oi.id as order_item_id,
         mi.name as item_name,
         oi.quantity,
         oi.unit_price,
         COALESCE(SUM(oio.extra_price * COALESCE(oio.quantity, 1)), 0) as options_total,
         (oi.quantity * (oi.unit_price + COALESCE(SUM(oio.extra_price * COALESCE(oio.quantity, 1)), 0))) as line_total,
         oi.note
       FROM ORDERS o
       JOIN ORDER_ITEMS oi ON oi.order_id = o.id
       JOIN MENU_ITEMS mi ON mi.id = oi.menu_item_id
       LEFT JOIN ORDER_ITEM_OPTIONS oio ON oio.order_item_id = oi.id
       WHERE o.session_id = $1
         AND o.deleted_at IS NULL
         AND oi.status = 'SERVED'
       GROUP BY oi.id, mi.name, oi.quantity, oi.unit_price, oi.note
       ORDER BY oi.id`,
      [sessionId]
    );
    const items = itemsRes.rows.map(normalizeItem);
    if (items.length === 0) {
      throw new ValidationError('Chưa có món đã phục vụ để tạo hóa đơn');
    }

    const paymentsRes = await client.query(
      `SELECT method, status
       FROM PAYMENTS
       WHERE session_id = $1
       ORDER BY paid_at DESC NULLS LAST, id DESC`,
      [sessionId]
    );
    const payment = getPaymentState(paymentsRes.rows);
    const billFingerprint = buildBillFingerprint({ session, items, payment });

    const existingRes = await client.query(
      `SELECT * FROM INVOICES
       WHERE session_id = $1 AND bill_fingerprint = $2 AND status = 'ISSUED'
       ORDER BY created_at DESC
       LIMIT 1`,
      [sessionId, billFingerprint]
    );
    if (existingRes.rows.length > 0) {
      const invoice = await loadInvoiceWithItems(existingRes.rows[0].id, client);
      await client.query('COMMIT');
      return invoice;
    }

    await client.query(
      `UPDATE INVOICES
       SET status = 'SUPERSEDED', superseded_at = NOW()
       WHERE session_id = $1 AND status = 'ISSUED'`,
      [sessionId]
    );

    const invoiceNumber = createInvoiceNumber(sessionId);
    const invoiceRes = await client.query(
      `INSERT INTO INVOICES (
         invoice_number, session_id, table_id, table_name, created_by, created_by_name,
         status, payment_status, payment_method, bill_fingerprint,
         subtotal, discount_amount, tax_amount, rounding_amount, final_amount
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'ISSUED', $7::invoice_payment_status, $8::payment_method, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        invoiceNumber,
        session.id,
        session.table_id,
        session.table_name,
        user.id,
        user.full_name,
        payment.payment_status,
        payment.payment_method,
        billFingerprint,
        toNumber(session.subtotal),
        toNumber(session.discount_amount),
        toNumber(session.tax_amount),
        0,
        toNumber(session.final_amount),
      ]
    );
    const invoice = normalizeInvoice(invoiceRes.rows[0]);

    const insertedItems = [];
    for (const [index, item] of items.entries()) {
      const itemRes = await client.query(
        `INSERT INTO INVOICE_LINE_ITEMS (
           invoice_id, order_item_id, item_name, quantity, unit_price,
           options_total, line_total, note, sort_order
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING item_name, quantity, unit_price, options_total, line_total, note`,
        [
          invoice.id,
          item.order_item_id,
          item.item_name,
          item.quantity,
          item.unit_price,
          item.options_total,
          item.line_total,
          item.note,
          index,
        ]
      );
      insertedItems.push(normalizeItem(itemRes.rows[0]));
    }

    await client.query('COMMIT');
    return { invoice, items: insertedItems };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getInvoice(invoiceId) {
  return loadInvoiceWithItems(invoiceId, pool);
}

async function listSessionInvoices(sessionId) {
  const { rows } = await pool.query(
    `SELECT id, invoice_number, session_id, table_name, status, payment_status,
            payment_method, final_amount, created_at
     FROM INVOICES
     WHERE session_id = $1
     ORDER BY created_at DESC, id DESC`,
    [sessionId]
  );
  return rows.map(normalizeInvoice);
}

async function recordPrintEvent(invoiceId, user, printType) {
  if (!['PRINT', 'REPRINT'].includes(printType)) {
    throw new ValidationError('Invalid print type');
  }

  const invoiceRes = await pool.query(`SELECT id FROM INVOICES WHERE id = $1`, [invoiceId]);
  if (invoiceRes.rows.length === 0) {
    throw new NotFoundError('Invoice not found');
  }

  const { rows } = await pool.query(
    `INSERT INTO INVOICE_PRINT_EVENTS (invoice_id, printed_by, printed_by_name, print_type)
     VALUES ($1, $2, $3, $4::invoice_print_type)
     RETURNING invoice_id, print_type, created_at as printed_at`,
    [invoiceId, user.id, user.full_name, printType]
  );
  return rows[0];
}

module.exports = {
  createInvoice,
  getInvoice,
  listSessionInvoices,
  recordPrintEvent,
};
