/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ORDERS indexes
  pgm.createIndex('ORDERS', 'session_id', { name: 'idx_orders_session_id', where: 'deleted_at IS NULL' });
  pgm.createIndex('ORDERS', 'table_id', { name: 'idx_orders_table_id' });
  pgm.createIndex('ORDERS', 'status', { name: 'idx_orders_status', where: 'deleted_at IS NULL' });
  pgm.createIndex('ORDERS', 'created_at', { name: 'idx_orders_created_at', method: 'btree' });

  // ORDER_ITEMS indexes
  pgm.createIndex('ORDER_ITEMS', 'order_id', { name: 'idx_order_items_order_id' });
  pgm.createIndex('ORDER_ITEMS', 'menu_item_id', { name: 'idx_order_items_menu_item_id' });
  pgm.createIndex('ORDER_ITEMS', 'status', { name: 'idx_order_items_status' });

  // SESSIONS indexes
  pgm.createIndex('SESSIONS', 'table_id', { name: 'idx_sessions_table_id' });
  pgm.createIndex('SESSIONS', 'status', { name: 'idx_sessions_status' });
  pgm.createIndex('SESSIONS', 'started_at', { name: 'idx_sessions_started_at', method: 'btree' });

  // REFRESH_TOKENS indexes
  pgm.createIndex('REFRESH_TOKENS', 'user_id', { name: 'idx_refresh_tokens_user_id' });
  pgm.createIndex('REFRESH_TOKENS', 'token', { name: 'idx_refresh_tokens_token', where: 'revoked_at IS NULL' });
  pgm.createIndex('REFRESH_TOKENS', 'expires_at', { name: 'idx_refresh_tokens_expires_at', where: 'revoked_at IS NULL' });

  // PAYMENTS indexes
  pgm.createIndex('PAYMENTS', 'session_id', { name: 'idx_payments_session_id' });
  pgm.createIndex('PAYMENTS', 'transaction_id', {
    name: 'idx_payments_transaction_id',
    unique: true,
    where: 'transaction_id IS NOT NULL',
  });
  pgm.createIndex('PAYMENTS', 'status', { name: 'idx_payments_status' });

  // CUSTOMER_REQUESTS indexes
  pgm.createIndex('CUSTOMER_REQUESTS', 'session_id', { name: 'idx_customer_requests_session_id' });
  pgm.createIndex('CUSTOMER_REQUESTS', 'status', { name: 'idx_customer_requests_status', where: "status = 'OPEN'" });

  // MENU_ITEMS indexes
  pgm.createIndex('MENU_ITEMS', 'category_id', { name: 'idx_menu_items_category_id', where: 'is_available = true' });

  // MENU_ITEM_OPTIONS indexes
  pgm.createIndex('MENU_ITEM_OPTIONS', 'menu_item_id', { name: 'idx_menu_item_options_menu_item_id', where: 'is_available = true' });

  // ORDER_ITEM_OPTIONS indexes
  pgm.createIndex('ORDER_ITEM_OPTIONS', 'order_item_id', { name: 'idx_order_item_options_order_item_id' });

  // QR_CODES indexes
  pgm.createIndex('QR_CODES', 'table_id', { name: 'idx_qr_codes_table_id' });
  pgm.createIndex('QR_CODES', 'code', { name: 'idx_qr_codes_code', where: 'is_active = true' });

  // USERS indexes
  pgm.createIndex('USERS', 'email', { name: 'idx_users_email', where: 'is_active = true' });
  pgm.createIndex('USERS', 'role', { name: 'idx_users_role', where: 'is_active = true' });

  // Composite indexes
  pgm.createIndex('ORDERS', ['session_id', 'status'], { name: 'idx_orders_session_status', where: 'deleted_at IS NULL' });
  pgm.createIndex('ORDER_ITEMS', ['order_id', 'status'], { name: 'idx_order_items_order_status' });
};

exports.down = (pgm) => {
  pgm.dropIndex('ORDER_ITEMS', ['order_id', 'status'], { name: 'idx_order_items_order_status' });
  pgm.dropIndex('ORDERS', ['session_id', 'status'], { name: 'idx_orders_session_status' });
  pgm.dropIndex('USERS', 'role', { name: 'idx_users_role' });
  pgm.dropIndex('USERS', 'email', { name: 'idx_users_email' });
  pgm.dropIndex('QR_CODES', 'code', { name: 'idx_qr_codes_code' });
  pgm.dropIndex('QR_CODES', 'table_id', { name: 'idx_qr_codes_table_id' });
  pgm.dropIndex('ORDER_ITEM_OPTIONS', 'order_item_id', { name: 'idx_order_item_options_order_item_id' });
  pgm.dropIndex('MENU_ITEM_OPTIONS', 'menu_item_id', { name: 'idx_menu_item_options_menu_item_id' });
  pgm.dropIndex('MENU_ITEMS', 'category_id', { name: 'idx_menu_items_category_id' });
  pgm.dropIndex('CUSTOMER_REQUESTS', 'status', { name: 'idx_customer_requests_status' });
  pgm.dropIndex('CUSTOMER_REQUESTS', 'session_id', { name: 'idx_customer_requests_session_id' });
  pgm.dropIndex('PAYMENTS', 'status', { name: 'idx_payments_status' });
  pgm.dropIndex('PAYMENTS', 'transaction_id', { name: 'idx_payments_transaction_id' });
  pgm.dropIndex('PAYMENTS', 'session_id', { name: 'idx_payments_session_id' });
  pgm.dropIndex('REFRESH_TOKENS', 'expires_at', { name: 'idx_refresh_tokens_expires_at' });
  pgm.dropIndex('REFRESH_TOKENS', 'token', { name: 'idx_refresh_tokens_token' });
  pgm.dropIndex('REFRESH_TOKENS', 'user_id', { name: 'idx_refresh_tokens_user_id' });
  pgm.dropIndex('SESSIONS', 'started_at', { name: 'idx_sessions_started_at' });
  pgm.dropIndex('SESSIONS', 'status', { name: 'idx_sessions_status' });
  pgm.dropIndex('SESSIONS', 'table_id', { name: 'idx_sessions_table_id' });
  pgm.dropIndex('ORDER_ITEMS', 'status', { name: 'idx_order_items_status' });
  pgm.dropIndex('ORDER_ITEMS', 'menu_item_id', { name: 'idx_order_items_menu_item_id' });
  pgm.dropIndex('ORDER_ITEMS', 'order_id', { name: 'idx_order_items_order_id' });
  pgm.dropIndex('ORDERS', 'created_at', { name: 'idx_orders_created_at' });
  pgm.dropIndex('ORDERS', 'status', { name: 'idx_orders_status' });
  pgm.dropIndex('ORDERS', 'table_id', { name: 'idx_orders_table_id' });
  pgm.dropIndex('ORDERS', 'session_id', { name: 'idx_orders_session_id' });
};
