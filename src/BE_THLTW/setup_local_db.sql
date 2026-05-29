-- Script để setup database trên PostgreSQL local
-- Chạy bằng: psql -U postgres -f setup_local_db.sql

-- 1. Tạo database
DROP DATABASE IF EXISTS restaurant_dbs;
CREATE DATABASE restaurant_dbs;

-- 2. Connect vào database mới
\c restaurant_dbs

-- 3. Tạo user (optional, có thể dùng postgres user)
-- CREATE USER restaurant_user WITH PASSWORD '<local-db-password>';
-- GRANT ALL PRIVILEGES ON DATABASE restaurant_dbs TO restaurant_user;

-- 4. Import schema
\i src/config/schema.sql

-- MENU_ITEMS.image_url is TEXT so JPG/PNG Base64 data URLs can be stored
-- directly. Rolling back to VARCHAR(500) is only safe after converting or
-- removing values longer than 500 characters.

-- 5. Verify
\dt
