const pool = require('../config/db');
const ExcelJS = require('exceljs');

async function getRevenueReport(from, to, groupBy) {
  // groupBy: 'day', 'week', 'month'
  // Validate
  const validGroups = ['day', 'week', 'month'];
  const truncGroup = validGroups.includes(groupBy) ? groupBy : 'day';

  const query = `
    SELECT DATE_TRUNC($1, paid_at) as date, method, SUM(amount) as total, COUNT(id) as order_count
    FROM PAYMENTS 
    WHERE status = 'COMPLETED' AND paid_at >= $2 AND paid_at <= $3
    GROUP BY 1, method 
    ORDER BY 1
  `;
  const { rows } = await pool.query(query, [truncGroup, from, to]);
  return rows;
}

async function getMenuReport() {
  const query = `
    SELECT mi.name, SUM(oi.quantity) as total_quantity
    FROM ORDER_ITEMS oi 
    JOIN MENU_ITEMS mi ON mi.id = oi.menu_item_id
    WHERE oi.status = 'SERVED'
    GROUP BY mi.id, mi.name
    ORDER BY total_quantity DESC
    LIMIT 20
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function getKdsReport() {
  const query = `
    SELECT 
      o.id as order_id, 
      o.created_at,
      MIN(CASE WHEN osl.new_status='READY' THEN osl.changed_at END) as ready_at,
      EXTRACT(EPOCH FROM (MIN(CASE WHEN osl.new_status='READY' THEN osl.changed_at END) - o.created_at))/60 as minutes_to_ready
    FROM ORDERS o 
    LEFT JOIN ORDER_STATUS_LOGS osl ON osl.order_id = o.id
    WHERE o.deleted_at IS NULL
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 100
  `;
  const { rows } = await pool.query(query);
  return rows;
}

async function generateExcelReport(res) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QR Ordering System';
  
  // Sheet 1: Payments
  const sheetPayments = workbook.addWorksheet('Payments');
  sheetPayments.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Session ID', key: 'session_id', width: 40 },
    { header: 'Method', key: 'method', width: 15 },
    { header: 'Amount', key: 'amount', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Paid At', key: 'paid_at', width: 25 },
  ];

  const paymentsRes = await pool.query(`SELECT * FROM PAYMENTS ORDER BY paid_at DESC`);
  sheetPayments.addRows(paymentsRes.rows);

  // Sheet 2: Sessions
  const sheetSessions = workbook.addWorksheet('Sessions');
  sheetSessions.columns = [
    { header: 'ID', key: 'id', width: 40 },
    { header: 'Table ID', key: 'table_id', width: 40 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Tax', key: 'tax_amount', width: 15 },
    { header: 'Final Amount', key: 'final_amount', width: 15 },
    { header: 'Started At', key: 'started_at', width: 25 },
    { header: 'Ended At', key: 'ended_at', width: 25 },
  ];

  const sessionsRes = await pool.query(`SELECT * FROM SESSIONS ORDER BY started_at DESC`);
  sheetSessions.addRows(sessionsRes.rows);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=report-${new Date().getTime()}.xlsx`);
  
  await workbook.xlsx.write(res);
  res.end();
}

async function resetMenuQuota() {
  await pool.query(`UPDATE MENU_ITEMS SET daily_quota = daily_quota_default`);
  return { success: true };
}

module.exports = {
  getRevenueReport,
  getMenuReport,
  getKdsReport,
  generateExcelReport,
  resetMenuQuota,
};
