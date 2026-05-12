# Setup Guide

Hướng dẫn cài đặt và chạy backend cho cả hai môi trường: **Docker** (khuyên dùng) và **Local**.

## Yêu cầu

| Môi trường | Yêu cầu |
|---|---|
| Docker | Docker Desktop (bật trước khi chạy lệnh) |
| Local | Node.js >= 20, PostgreSQL 16, Redis |

---

## Chạy bằng Docker (khuyên dùng)

Phù hợp cho cả backend dev và frontend dev muốn chạy nhanh.

**Bước 1:** Copy file cấu hình môi trường:
```bash
cp .env.docker .env
```

**Bước 2:** Build và khởi động toàn bộ stack:
```bash
docker compose up --build -d
```

Docker Compose sẽ tự động:
1. Khởi động PostgreSQL (port 5433)
2. Chạy seeder — nạp dữ liệu mẫu
3. Chạy indexer — áp dụng 30+ DB indexes
4. Khởi động API server (port 5000)

**Reset hoàn toàn (xóa data):**
```bash
docker compose down -v && docker compose up --build -d
```

**Các lệnh Docker thường dùng:**
```bash
docker compose up -d          # Khởi động nền
docker compose logs -f backend # Xem logs
docker compose down           # Dừng
docker compose ps             # Kiểm tra status
```

---

## Chạy Local

**Bước 1:** Cài dependencies:
```bash
npm install
```

**Bước 2:** Copy và chỉnh sửa `.env`:
```bash
cp .env.example .env
# Điền DATABASE_URL, JWT secrets, VNPay keys
```

**Bước 3:** Setup database:
```bash
psql -U postgres -c "CREATE DATABASE restaurant_dbs;"
psql -U postgres -d restaurant_dbs -f src/config/schema.sql
node src/config/seed.js
node src/config/applyIndexes.js
```

**Bước 4:** Chạy server:
```bash
npm run dev   # development (hot reload)
npm start     # production
```

**Chuyển đổi môi trường (Windows):**
```bash
switch-to-local.bat    # Dùng PostgreSQL local (port 5432)
switch-to-docker.bat   # Dùng PostgreSQL Docker (port 5433)
```

---

## Endpoints

| | Docker | Local |
|---|---|---|
| API | http://localhost:5000/api | http://localhost:5000/api |
| Health | http://localhost:5000/api/health | http://localhost:5000/api/health |
| Swagger | http://localhost:5000/api/docs | http://localhost:5000/api/docs |
| PostgreSQL | localhost:**5433** | localhost:**5432** |

---

## Tài khoản mặc định

### Nhân viên — mật khẩu: `Password123!`

| Role | Email |
|---|---|
| Admin | admin@restaurant.com |
| Quản lý | manager@restaurant.com |
| Thu ngân | cashier@restaurant.com |
| Bếp | kitchen@restaurant.com |
| Phục vụ | waiter@restaurant.com |

### Khách hàng (QR)

Hệ thống có sẵn 8 bàn. Mã QR test cho Bàn 01: `QR-Bàn-01`

```bash
# Tạo session khách hàng
POST /api/customer/scan
{ "qr_code": "QR-Bàn-01" }
# → trả về session_token (JWT, hết hạn sau 24h)
```

### Database (Docker)

| | Giá trị |
|---|---|
| User | restaurant_user |
| Password | strongpassword123 |
| Database | restaurant_dbs |

---

## Dữ liệu mẫu (Menu)

| Danh mục | Món |
|---|---|
| Đồ Nướng (GRILL) | Thịt Bò Nướng Tảng, Sườn Heo... |
| Đồ Uống (BAR) | Coca, Bia Tiger, Sinh tố xoài... |
| Món Nguội (COLD) | Salad, Nem cuốn... |

---

## Biến môi trường

### Bắt buộc
```bash
DATABASE_URL=postgres://user:pass@host:port/dbname
JWT_ACCESS_SECRET=min_32_chars
JWT_REFRESH_SECRET=min_32_chars
VNPAY_TMNCODE=your_tmn_code
VNPAY_HASHSECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-frontend.com/payment-result
FRONTEND_URL=https://your-frontend.com  # Không được là "*" trong production
```

### Tuỳ chọn
```bash
REDIS_URL=redis://localhost:6379  # Cho webhook idempotency
LOG_LEVEL=info                    # error | warn | info | http | debug
PORT=5000
NODE_ENV=production
```

### Files .env

| File | Mục đích |
|---|---|
| `.env` | File active (được load khi chạy) |
| `.env.local` | Config cho local PostgreSQL |
| `.env.docker` | Config cho Docker PostgreSQL |
| `.env.example` | Template cho setup mới |
