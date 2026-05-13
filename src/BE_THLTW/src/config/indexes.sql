-- Performance Indexes Migration
-- Run this after initial schema setup to improve query performance

-- Index for ORDERS table
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON ORDERS(session_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON ORDERS(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON ORDERS(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON ORDERS(created_at DESC);

-- Index for ORDER_ITEMS table
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON ORDER_ITEMS(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON ORDER_ITEMS(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON ORDER_ITEMS(status);

-- Index for SESSIONS table
CREATE INDEX IF NOT EXISTS idx_sessions_table_id ON SESSIONS(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON SESSIONS(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON SESSIONS(started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sessions_one_active_per_table ON SESSIONS(table_id) WHERE status = 'ACTIVE';

-- Index for REFRESH_TOKENS table
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON REFRESH_TOKENS(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON REFRESH_TOKENS(token) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON REFRESH_TOKENS(expires_at) WHERE revoked_at IS NULL;

-- Index for PAYMENTS table
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON PAYMENTS(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_id ON PAYMENTS(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_status ON PAYMENTS(status);

-- Index for CUSTOMER_REQUESTS table
CREATE INDEX IF NOT EXISTS idx_customer_requests_session_id ON CUSTOMER_REQUESTS(session_id);
CREATE INDEX IF NOT EXISTS idx_customer_requests_status ON CUSTOMER_REQUESTS(status) WHERE status = 'OPEN';

-- Index for MENU_ITEMS table
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON MENU_ITEMS(category_id) WHERE is_available = true;

-- Index for MENU_ITEM_OPTIONS table
CREATE INDEX IF NOT EXISTS idx_menu_item_options_menu_item_id ON MENU_ITEM_OPTIONS(menu_item_id) WHERE is_available = true;

-- Index for ORDER_ITEM_OPTIONS table
CREATE INDEX IF NOT EXISTS idx_order_item_options_order_item_id ON ORDER_ITEM_OPTIONS(order_item_id);

-- Index for QR_CODES table
CREATE INDEX IF NOT EXISTS idx_qr_codes_table_id ON QR_CODES(table_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON QR_CODES(code) WHERE is_active = true;

-- Index for USERS table
CREATE INDEX IF NOT EXISTS idx_users_email ON USERS(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role ON USERS(role) WHERE is_active = true;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_session_status ON ORDERS(session_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order_status ON ORDER_ITEMS(order_id, status);

-- Analyze tables to update statistics
ANALYZE ORDERS;
ANALYZE ORDER_ITEMS;
ANALYZE SESSIONS;
ANALYZE REFRESH_TOKENS;
ANALYZE PAYMENTS;
ANALYZE CUSTOMER_REQUESTS;
ANALYZE MENU_ITEMS;
ANALYZE USERS;
