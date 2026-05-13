-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER');
CREATE TYPE table_status AS ENUM ('AVAILABLE', 'OCCUPIED');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
CREATE TYPE order_item_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'VNPAY');
CREATE TYPE payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE request_type AS ENUM ('CALL_STAFF', 'REQUEST_BILL', 'OTHER');
CREATE TYPE request_status AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE kds_station AS ENUM ('GRILL', 'BAR', 'COLD');

-- Tables
CREATE TABLE USERS (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE REFRESH_TOKENS (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES USERS(id),
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE TABLES (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    zone VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    status table_status DEFAULT 'AVAILABLE'
);

CREATE TABLE QR_CODES (
    id SERIAL PRIMARY KEY,
    table_id INT REFERENCES TABLES(id),
    code VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SESSIONS (
    id SERIAL PRIMARY KEY,
    table_id INT REFERENCES TABLES(id),
    qr_code_id INT REFERENCES QR_CODES(id),
    status session_status DEFAULT 'ACTIVE',
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) DEFAULT 0,
    version INT DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE TABLE MENU_CATEGORIES (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    station kds_station NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE MENU_ITEMS (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES MENU_CATEGORIES(id),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    daily_quota INT DEFAULT 0,
    daily_quota_default INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_available BOOLEAN DEFAULT true
);

CREATE TABLE MENU_ITEM_OPTIONS (
    id SERIAL PRIMARY KEY,
    menu_item_id INT REFERENCES MENU_ITEMS(id),
    option_group VARCHAR(100) NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    extra_price DECIMAL(10,2) DEFAULT 0,
    is_available BOOLEAN DEFAULT true
);

CREATE TABLE ORDERS (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES SESSIONS(id),
    table_id INT REFERENCES TABLES(id),
    status order_status DEFAULT 'PENDING',
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE ORDER_ITEMS (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES ORDERS(id),
    menu_item_id INT REFERENCES MENU_ITEMS(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    note TEXT,
    status order_item_status DEFAULT 'PENDING',
    cancel_reason TEXT,
    version INT DEFAULT 1
);

CREATE TABLE ORDER_ITEM_OPTIONS (
    id SERIAL PRIMARY KEY,
    order_item_id INT REFERENCES ORDER_ITEMS(id),
    menu_item_option_id INT REFERENCES MENU_ITEM_OPTIONS(id),
    quantity INT DEFAULT 1,
    extra_price DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE PAYMENTS (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES SESSIONS(id),
    method payment_method NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status payment_status DEFAULT 'PENDING',
    transaction_id VARCHAR(100) UNIQUE,
    webhook_data JSONB,
    paid_at TIMESTAMP
);

CREATE TABLE ORDER_STATUS_LOGS (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES ORDERS(id),
    changed_by INT REFERENCES USERS(id),
    old_status order_status,
    new_status order_status NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CUSTOMER_REQUESTS (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES SESSIONS(id),
    request_type request_type NOT NULL,
    status request_status DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
