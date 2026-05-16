# Setup Guide

Hướng dẫn chạy backend `src/BE_THLTW`.

## Yêu cầu

| Môi trường | Yêu cầu |
|---|---|
| Docker | Docker Desktop đang chạy Linux engine |
| Local | Node.js 20+, PostgreSQL 16, Redis nếu cần webhook lock |

## Chạy bằng Docker

Docker là cách khuyến nghị cho máy mới.

```powershell
cd src/BE_THLTW
docker compose up -d --build
docker compose ps
```

Compose sẽ chạy:

1. PostgreSQL 16 trên host port `5433`.
2. Redis trên host port `6379`.
3. `seeder` để nạp dữ liệu mẫu.
4. `indexer` để áp dụng indexes.
5. Backend trên host port `5000`.

Các URL chính:

```text
API:     http://localhost:5000/api
Health:  http://localhost:5000/api/health
Swagger: http://localhost:5000/api/docs
DB:      localhost:5433
```

### Tạo `.env` local trước khi chạy

`docker-compose.yml` không chứa secret mặc định. Copy file ví dụ và thay placeholder bằng giá trị local riêng:

```powershell
Copy-Item .env.example .env
```

Các biến local tối thiểu:

- `DB_USER=restaurant_user`
- `DB_PASSWORD=<local-db-password>`
- JWT dev secrets
- VNPay placeholder
- `FRONTEND_URL=http://localhost:3000`
- `DISH_IMAGE_STORAGE_DIR=./uploads/dish-images`
- `DISH_IMAGE_PUBLIC_BASE_URL=http://localhost:5001/uploads/dish-images` khi chạy Docker Compose
- `DISH_IMAGE_MAX_BYTES=5242880`

### Reset DB Docker

Seeder chỉ chạy lại dữ liệu sạch khi volume bị xóa:

```powershell
docker compose down -v
docker compose up -d --build
```

### Xem log

```powershell
docker compose logs backend
docker compose logs postgres
docker compose logs seeder
docker compose logs indexer
```

## Chạy local không Docker

```powershell
cd src/BE_THLTW
npm install
Copy-Item .env.example .env
```

Chỉnh `.env` để dùng PostgreSQL local, thường là:

```env
DATABASE_URL=postgres://restaurant_user:<local-db-password>@localhost:5432/restaurant_dbs
REDIS_URL=redis://localhost:6379
DISH_IMAGE_STORAGE_DIR=./uploads/dish-images
DISH_IMAGE_PUBLIC_BASE_URL=http://localhost:5000/uploads/dish-images
DISH_IMAGE_MAX_BYTES=5242880
```

Tạo DB và schema:

```powershell
psql -U postgres -f setup_local_db.sql
psql -U restaurant_user -d restaurant_dbs -f src/config/schema.sql
node src/config/seed.js
node src/config/applyIndexes.js
```

Chạy server:

```powershell
npm run dev
```

## Tài khoản mẫu

Mật khẩu chung:

```text
Password123!
```

| Role | Email |
|---|---|
| ADMIN | `admin@restaurant.com` |
| MANAGER | `manager@restaurant.com` |
| CASHIER | `cashier@restaurant.com` |
| KITCHEN | `kitchen@restaurant.com` |
| WAITER | `waiter@restaurant.com` |

## QR mẫu

QR code được seed có suffix random, ví dụ `QR-Bàn-01-ABC123`. Lấy QR hiện có bằng:

```powershell
docker compose exec -T postgres psql -U restaurant_user -d restaurant_dbs -c "SELECT id, code, table_id FROM qr_codes ORDER BY id;"
```

## Kiểm tra nhanh

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:5000/api/health
```

Login:

```powershell
Invoke-RestMethod -Method Post http://localhost:5000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"admin@restaurant.com","password":"Password123!"}'
```

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| Không connect Docker engine | Mở Docker Desktop và chờ engine chạy xong |
| Port `5000`, `5433`, `6379` bị chiếm | Đổi port trong `docker-compose.yml` hoặc tắt service đang chiếm |
| Backend unhealthy sau khi sửa code | Chạy `docker compose up -d --build` |
| Seeder/indexer không chạy lại | Chạy `docker compose down -v` để xóa volume DB |
| Swagger không mở | Đảm bảo backend `NODE_ENV=development` trong compose |
| Frontend CORS lỗi | Thêm origin vào `FRONTEND_URL` |
| Upload ảnh món lỗi đường dẫn public | Kiểm tra `DISH_IMAGE_STORAGE_DIR` tồn tại được ghi và `DISH_IMAGE_PUBLIC_BASE_URL` là URL tuyệt đối |
