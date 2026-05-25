const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = [
  { email: 'admin@restaurant.com',   full_name: 'Nguyễn Admin',    role: 'ADMIN' },
  { email: 'manager@restaurant.com', full_name: 'Trần Manager',    role: 'MANAGER' },
  { email: 'cashier@restaurant.com', full_name: 'Lê Thu Ngân',     role: 'CASHIER' },
  { email: 'kitchen@restaurant.com', full_name: 'Phạm Đầu Bếp',   role: 'KITCHEN' },
  { email: 'waiter@restaurant.com',  full_name: 'Hoàng Phục Vụ',  role: 'WAITER' },
];

const tables = [
  { name: 'Bàn 01', zone: 'Tầng 1', capacity: 4 },
  { name: 'Bàn 02', zone: 'Tầng 1', capacity: 4 },
  { name: 'Bàn 03', zone: 'Tầng 1', capacity: 6 },
  { name: 'Bàn 04', zone: 'Tầng 1', capacity: 2 },
  { name: 'Bàn 05', zone: 'Tầng 2', capacity: 4 },
  { name: 'Bàn 06', zone: 'Tầng 2', capacity: 4 },
  { name: 'Bàn 07', zone: 'Tầng 2', capacity: 8 },
  { name: 'Bàn VIP', zone: 'Phòng riêng', capacity: 10 },
];

const categories = [
  { name: 'Đồ Nướng',  station: 'GRILL',   sort_order: 1 },
  { name: 'Đồ Uống',   station: 'BAR',     sort_order: 2 },
  { name: 'Món Nguội', station: 'COLD',    sort_order: 3 },
];

const grillItems = [
  { name: 'Thịt Bò Nướng Tảng',   price: 120000, daily_quota: 20 },
  { name: 'Sườn Heo Nướng BBQ',   price: 95000,  daily_quota: 30 },
  { name: 'Mực Nướng Muối Ớt',    price: 85000,  daily_quota: 25 },
  { name: 'Rau Nướng Tổng Hợp',   price: 45000,  daily_quota: 50 },
];

const barItems = [
  { name: 'Coca Cola',             price: 25000,  daily_quota: 100 },
  { name: 'Nước Suối',             price: 15000,  daily_quota: 200 },
  { name: 'Bia Tiger',             price: 35000,  daily_quota: 100 },
  { name: 'Sinh Tố Xoài',         price: 45000,  daily_quota: 50 },
];

const coldItems = [
  { name: 'Gỏi Bò Bóp Thấu',      price: 75000,  daily_quota: 30 },
  { name: 'Salad Trộn',            price: 55000,  daily_quota: 40 },
  { name: 'Đậu Hũ Lạnh',          price: 35000,  daily_quota: 60 },
  { name: 'Nem Cuốn (5 cuốn)',     price: 65000,  daily_quota: 40 },
];

const beefOptions = [
  { option_group: 'Độ chín',  option_name: 'Tái',       extra_price: 0 },
  { option_group: 'Độ chín',  option_name: 'Chín vừa',  extra_price: 0 },
  { option_group: 'Độ chín',  option_name: 'Chín kỹ',   extra_price: 0 },
  { option_group: 'Sauce',    option_name: 'Sốt Tiêu Đen', extra_price: 15000 },
  { option_group: 'Sauce',    option_name: 'Sốt Phô Mai',  extra_price: 20000 },
];

const smoothieOptions = [
  { option_group: 'Độ ngọt', option_name: 'Ít ngọt',   extra_price: 0 },
  { option_group: 'Độ ngọt', option_name: 'Bình thường', extra_price: 0 },
  { option_group: 'Topping', option_name: 'Thêm Đá Xay',  extra_price: 10000 },
  { option_group: 'Topping', option_name: 'Thêm Thạch',   extra_price: 10000 },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Xóa data theo thứ tự FK (leaf trước, root sau) để chạy lại được
    console.log('Clearing existing data...');
    await client.query(`
      TRUNCATE TABLE order_item_options, order_items, order_status_logs,
                     orders, customer_requests, payments, sessions,
                     refresh_tokens, qr_codes, menu_item_options,
                     menu_items, menu_categories, tables, users
      RESTART IDENTITY CASCADE
    `);

    // --- USERS ---
    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    for (const u of users) {
      await client.query(
        'INSERT INTO USERS (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)',
        [u.email, passwordHash, u.full_name, u.role]
      );
    }
    console.log(`✅ Seeded ${users.length} users.`);

    // --- TABLES & QR CODES ---
    console.log('Seeding tables and QR codes...');
    for (const t of tables) {
      const tableRes = await client.query(
        'INSERT INTO TABLES (name, zone, capacity) VALUES ($1, $2, $3) RETURNING id',
        [t.name, t.zone, t.capacity]
      );
      const tableId = tableRes.rows[0].id;
      
      const qrCodeString = `QR-${t.name.replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await client.query(
        'INSERT INTO QR_CODES (table_id, code, is_active) VALUES ($1, $2, true)',
        [tableId, qrCodeString]
      );
    }
    console.log(`✅ Seeded ${tables.length} tables and QR codes.`);

    // --- CATEGORIES ---
    console.log('Seeding categories and items...');
    for (const c of categories) {
      const catRes = await client.query(
        'INSERT INTO MENU_CATEGORIES (name, station, sort_order) VALUES ($1, $2, $3) RETURNING id',
        [c.name, c.station, c.sort_order]
      );
      const catId = catRes.rows[0].id;

      let itemsToInsert = [];
      if (c.station === 'GRILL') itemsToInsert = grillItems;
      if (c.station === 'BAR') itemsToInsert = barItems;
      if (c.station === 'COLD') itemsToInsert = coldItems;

      for (let i = 0; i < itemsToInsert.length; i++) {
        const item = itemsToInsert[i];
        const itemRes = await client.query(
          `INSERT INTO MENU_ITEMS (category_id, name, price, daily_quota, daily_quota_default, sort_order, is_available) 
           VALUES ($1, $2, $3, $4, $4, $5, true) RETURNING id`,
          [catId, item.name, item.price, item.daily_quota, i + 1]
        );
        const itemId = itemRes.rows[0].id;

        // Insert options if applicable
        if (item.name === 'Thịt Bò Nướng Tảng') {
          for (const opt of beefOptions) {
            await client.query(
              `INSERT INTO MENU_ITEM_OPTIONS (menu_item_id, option_group, option_name, extra_price, is_available) 
               VALUES ($1, $2, $3, $4, true)`,
              [itemId, opt.option_group, opt.option_name, opt.extra_price]
            );
          }
        }
        if (item.name === 'Sinh Tố Xoài') {
          for (const opt of smoothieOptions) {
            await client.query(
              `INSERT INTO MENU_ITEM_OPTIONS (menu_item_id, option_group, option_name, extra_price, is_available) 
               VALUES ($1, $2, $3, $4, true)`,
              [itemId, opt.option_group, opt.option_name, opt.extra_price]
            );
          }
        }
      }
    }
    console.log(`✅ Seeded categories, items and options.`);

    // --- MOCK OPERATIONAL DATA FOR DASHBOARD ---
    console.log('Seeding mock operational data for dashboard analytics...');
    const itemsRes = await client.query('SELECT id, name, price FROM MENU_ITEMS');
    const items = itemsRes.rows;
    const tablesRes = await client.query('SELECT id FROM TABLES');
    const tableIds = tablesRes.rows.map(r => r.id);
    const qrCodesRes = await client.query('SELECT id, table_id FROM QR_CODES');
    const qrCodes = qrCodesRes.rows;
    
    const now = new Date();
    let paymentCount = 1;
    
    for (let d = 7; d >= 0; d--) {
      const sessionDate = new Date();
      sessionDate.setDate(now.getDate() - d);
      
      // 2 completed sessions per day
      for (let s = 1; s <= 2; s++) {
        const tableId = tableIds[(d * 2 + s) % tableIds.length];
        const qrCode = qrCodes.find(q => q.table_id === tableId);
        
        const randomItem1 = items[(d + s) % items.length];
        const randomItem2 = items[(d + s + 1) % items.length];
        
        const qty1 = 2;
        const qty2 = 1;
        const subtotal = (randomItem1.price * qty1) + (randomItem2.price * qty2);
        const tax = Math.round(subtotal * 0.1);
        const finalAmount = subtotal + tax;
        
        // Insert closed session
        const sessionRes = await client.query(
          `INSERT INTO SESSIONS (table_id, qr_code_id, status, subtotal, discount_amount, tax_amount, final_amount, started_at, ended_at)
           VALUES ($1, $2, 'CLOSED', $3, 0, $4, $5, $6, $6) RETURNING id`,
          [tableId, qrCode ? qrCode.id : null, subtotal, tax, finalAmount, sessionDate]
        );
        const sessionId = sessionRes.rows[0].id;
        
        // Insert order
        const orderRes = await client.query(
          `INSERT INTO ORDERS (session_id, table_id, status, created_at)
           VALUES ($1, $2, 'SERVED', $3) RETURNING id`,
          [sessionId, tableId, sessionDate]
        );
        const orderId = orderRes.rows[0].id;
        
        // Insert order items (served status)
        await client.query(
          `INSERT INTO ORDER_ITEMS (order_id, menu_item_id, quantity, unit_price, status)
           VALUES ($1, $2, $3, $4, 'SERVED')`,
          [orderId, randomItem1.id, qty1, randomItem1.price]
        );
        
        await client.query(
          `INSERT INTO ORDER_ITEMS (order_id, menu_item_id, quantity, unit_price, status)
           VALUES ($1, $2, $3, $4, 'SERVED')`,
          [orderId, randomItem2.id, qty2, randomItem2.price]
        );
        
        // Insert completed payment
        await client.query(
          `INSERT INTO PAYMENTS (session_id, method, amount, status, transaction_id, paid_at)
           VALUES ($1, $2, $3, 'COMPLETED', $4, $5)`,
          [
            sessionId,
            s % 2 === 0 ? 'CASH' : 'VNPAY',
            finalAmount,
            `TXN-${sessionDate.getTime()}-${paymentCount++}`,
            sessionDate
          ]
        );
      }
    }
    console.log('✅ Seeded mock operational data successfully.');

    await client.query('COMMIT');
    console.log('🌱 Seed hoàn tất!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed thất bại:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
