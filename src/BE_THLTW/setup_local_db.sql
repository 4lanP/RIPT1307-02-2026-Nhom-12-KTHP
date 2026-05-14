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

-- 5. Verify
\dt
