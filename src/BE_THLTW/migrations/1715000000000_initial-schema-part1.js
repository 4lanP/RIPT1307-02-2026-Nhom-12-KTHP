/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create Enums
  pgm.createType('user_role', ['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']);
  pgm.createType('table_status', ['AVAILABLE', 'OCCUPIED']);
  pgm.createType('session_status', ['ACTIVE', 'CLOSED']);
  pgm.createType('order_status', ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']);
  pgm.createType('order_item_status', ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']);
  pgm.createType('payment_method', ['CASH', 'VNPAY']);
  pgm.createType('payment_status', ['PENDING', 'COMPLETED', 'FAILED']);
  pgm.createType('request_type', ['CALL_STAFF', 'REQUEST_BILL', 'OTHER']);
  pgm.createType('request_status', ['OPEN', 'RESOLVED']);
  pgm.createType('kds_station', ['GRILL', 'BAR', 'COLD']);

  // USERS table
  pgm.createTable('USERS', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    full_name: { type: 'varchar(255)', notNull: true },
    role: { type: 'user_role', notNull: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // REFRESH_TOKENS table
  pgm.createTable('REFRESH_TOKENS', {
    id: 'id',
    user_id: { type: 'integer', references: 'USERS(id)' },
    token: { type: 'varchar(255)', notNull: true },
    expires_at: { type: 'timestamp', notNull: true },
    revoked_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // TABLES table
  pgm.createTable('TABLES', {
    id: 'id',
    name: { type: 'varchar(50)', notNull: true },
    zone: { type: 'varchar(50)', notNull: true },
    capacity: { type: 'integer', notNull: true },
    status: { type: 'table_status', default: 'AVAILABLE' }
  });

  // QR_CODES table
  pgm.createTable('QR_CODES', {
    id: 'id',
    table_id: { type: 'integer', references: 'TABLES(id)' },
    code: { type: 'varchar(100)', notNull: true, unique: true },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // SESSIONS table
  pgm.createTable('SESSIONS', {
    id: 'id',
    table_id: { type: 'integer', references: 'TABLES(id)' },
    qr_code_id: { type: 'integer', references: 'QR_CODES(id)' },
    status: { type: 'session_status', default: 'ACTIVE' },
    subtotal: { type: 'decimal(10,2)', default: 0 },
    discount_amount: { type: 'decimal(10,2)', default: 0 },
    tax_amount: { type: 'decimal(10,2)', default: 0 },
    final_amount: { type: 'decimal(10,2)', default: 0 },
    version: { type: 'integer', default: 1 },
    started_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    ended_at: { type: 'timestamp' }
  });

  // MENU_CATEGORIES table
  pgm.createTable('MENU_CATEGORIES', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true },
    station: { type: 'kds_station', notNull: true },
    sort_order: { type: 'integer', default: 0 },
    is_active: { type: 'boolean', default: true }
  });

  // MENU_ITEMS table
  pgm.createTable('MENU_ITEMS', {
    id: 'id',
    category_id: { type: 'integer', references: 'MENU_CATEGORIES(id)' },
    name: { type: 'varchar(255)', notNull: true },
    price: { type: 'decimal(10,2)', notNull: true },
    image_url: { type: 'varchar(500)' },
    daily_quota: { type: 'integer', default: 0 },
    daily_quota_default: { type: 'integer', default: 0 },
    sort_order: { type: 'integer', default: 0 },
    is_available: { type: 'boolean', default: true }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('MENU_ITEMS');
  pgm.dropTable('MENU_CATEGORIES');
  pgm.dropTable('SESSIONS');
  pgm.dropTable('QR_CODES');
  pgm.dropTable('TABLES');
  pgm.dropTable('REFRESH_TOKENS');
  pgm.dropTable('USERS');

  pgm.dropType('kds_station');
  pgm.dropType('request_status');
  pgm.dropType('request_type');
  pgm.dropType('payment_status');
  pgm.dropType('payment_method');
  pgm.dropType('order_item_status');
  pgm.dropType('order_status');
  pgm.dropType('session_status');
  pgm.dropType('table_status');
  pgm.dropType('user_role');
};
