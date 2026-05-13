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

  // MENU_ITEM_OPTIONS table
  pgm.createTable('MENU_ITEM_OPTIONS', {
    id: 'id',
    menu_item_id: { type: 'integer', references: 'MENU_ITEMS(id)' },
    option_group: { type: 'varchar(100)', notNull: true },
    option_name: { type: 'varchar(100)', notNull: true },
    extra_price: { type: 'decimal(10,2)', default: 0 },
    is_available: { type: 'boolean', default: true }
  });

  // ORDERS table
  pgm.createTable('ORDERS', {
    id: 'id',
    session_id: { type: 'integer', references: 'SESSIONS(id)' },
    table_id: { type: 'integer', references: 'TABLES(id)' },
    status: { type: 'order_status', default: 'PENDING' },
    version: { type: 'integer', default: 1 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    deleted_at: { type: 'timestamp' }
  });

  // ORDER_ITEMS table
  pgm.createTable('ORDER_ITEMS', {
    id: 'id',
    order_id: { type: 'integer', references: 'ORDERS(id)' },
    menu_item_id: { type: 'integer', references: 'MENU_ITEMS(id)' },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'decimal(10,2)', notNull: true },
    note: { type: 'text' },
    status: { type: 'order_item_status', default: 'PENDING' },
    cancel_reason: { type: 'text' },
    version: { type: 'integer', default: 1 }
  });

  // ORDER_ITEM_OPTIONS table
  pgm.createTable('ORDER_ITEM_OPTIONS', {
    id: 'id',
    order_item_id: { type: 'integer', references: 'ORDER_ITEMS(id)' },
    menu_item_option_id: { type: 'integer', references: 'MENU_ITEM_OPTIONS(id)' },
    quantity: { type: 'integer', default: 1 },
    extra_price: { type: 'decimal(10,2)', default: 0 }
  });

  // PAYMENTS table
  pgm.createTable('PAYMENTS', {
    id: 'id',
    session_id: { type: 'integer', references: 'SESSIONS(id)' },
    method: { type: 'payment_method', notNull: true },
    amount: { type: 'decimal(10,2)', notNull: true },
    status: { type: 'payment_status', default: 'PENDING' },
    transaction_id: { type: 'varchar(100)', unique: true },
    webhook_data: { type: 'jsonb' },
    paid_at: { type: 'timestamp' }
  });

  // ORDER_STATUS_LOGS table
  pgm.createTable('ORDER_STATUS_LOGS', {
    id: 'id',
    order_id: { type: 'integer', references: 'ORDERS(id)' },
    changed_by: { type: 'integer', references: 'USERS(id)' },
    old_status: { type: 'order_status' },
    new_status: { type: 'order_status', notNull: true },
    changed_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // CUSTOMER_REQUESTS table
  pgm.createTable('CUSTOMER_REQUESTS', {
    id: 'id',
    session_id: { type: 'integer', references: 'SESSIONS(id)' },
    request_type: { type: 'request_type', notNull: true },
    status: { type: 'request_status', default: 'OPEN' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    resolved_at: { type: 'timestamp' }
  });
};

exports.down = (pgm) => {
  // Drop tables in reverse order (respecting foreign keys)
  pgm.dropTable('CUSTOMER_REQUESTS');
  pgm.dropTable('ORDER_STATUS_LOGS');
  pgm.dropTable('PAYMENTS');
  pgm.dropTable('ORDER_ITEM_OPTIONS');
  pgm.dropTable('ORDER_ITEMS');
  pgm.dropTable('ORDERS');
  pgm.dropTable('MENU_ITEM_OPTIONS');
  pgm.dropTable('MENU_ITEMS');
  pgm.dropTable('MENU_CATEGORIES');
  pgm.dropTable('SESSIONS');
  pgm.dropTable('QR_CODES');
  pgm.dropTable('TABLES');
  pgm.dropTable('REFRESH_TOKENS');
  pgm.dropTable('USERS');

  // Drop types
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
