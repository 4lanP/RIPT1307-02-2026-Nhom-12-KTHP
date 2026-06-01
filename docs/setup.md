# Setup Guide

Hướng dẫn chạy backend `src/BE_THLTW`.

> [!NOTE]
> Nếu bạn muốn triển khai dự án lên các dịch vụ Cloud thực tế (Render & Vercel), vui lòng tham khảo **[Hướng dẫn Deploy lên Render & Vercel (Production)](05-deployment.md#deploy-thuc-te-len-render-va-vercel)**.

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
- `DISH_IMAGE_STORAGE_DIR=./uploads/dish-images` cho flow upload file legacy
- `DISH_IMAGE_PUBLIC_BASE_URL=http://localhost:5001/uploads/dish-images` khi chạy Docker Compose và dùng flow upload file legacy
- `DISH_IMAGE_MAX_BYTES=5242880` áp dụng cho cả file upload legacy và Base64 JPG/PNG lưu trực tiếp trong DB

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

Flow ảnh Base64 lưu trực tiếp chuỗi `data:image/...;base64,...` vào
`MENU_ITEMS.image_url`. Backend tự đảm bảo cột này là `TEXT` khi khởi động;
nếu database cũ vẫn còn `VARCHAR(500)`, có thể chạy thủ công:

```powershell
npm run migrate:menu-images
```

### Keepalive bot cho Render Free

Backend có bot keepalive nội bộ để gọi định kỳ public health endpoint khi deploy
demo trên Render Free. Mặc định bot tắt để tránh traffic local/test ngoài ý
muốn:

```env
KEEPALIVE_ENABLED=false
KEEPALIVE_TARGETS=
KEEPALIVE_INTERVAL_SECONDS=600
KEEPALIVE_TIMEOUT_MS=5000
KEEPALIVE_RETRY_LIMIT=1
KEEPALIVE_HISTORY_LIMIT=20
```

Khi cần bật trên Render, trỏ target tới health endpoint public của backend:

```env
KEEPALIVE_ENABLED=true
KEEPALIVE_TARGETS=https://ript1307-02-2026-nhom-12-kth.onrender.com/api/health
KEEPALIVE_INTERVAL_SECONDS=600
KEEPALIVE_TIMEOUT_MS=5000
KEEPALIVE_RETRY_LIMIT=1
KEEPALIVE_HISTORY_LIMIT=20
```

Quy tắc an toàn:

- Interval tối thiểu là `300` giây; mặc định `600` giây.
- Target phải là URL public `http` hoặc `https` tới endpoint health, ví dụ `/api/health`.
- Không dùng URL localhost, private IP, query token, credential trong URL, hoặc endpoint admin/auth/payment/order/session.
- Nếu cấu hình sai, scheduler không chạy và admin có thể xem lỗi tại `GET /api/admin/keepalive/status`.

### Email báo cáo doanh thu hằng ngày

Backend có thể gửi email tổng hợp doanh thu của ngày trước đó cho admin/maintainer. Tính năng này mặc định tắt để tránh gửi email khi chưa cấu hình SMTP:

```env
REPORT_EMAIL_ENABLED=false
REPORT_EMAIL_RECIPIENTS=admin@restaurant.com
REPORT_EMAIL_CRON=5 0 * * *
REPORT_EMAIL_TIMEZONE=Asia/Ho_Chi_Minh
REPORT_EMAIL_HISTORY_LIMIT=20
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_TIMEOUT_MS=15000
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
SMTP_FROM="QR Restaurant <no-reply@example.com>"

# Tùy chọn production qua Mailtrap Email API, tránh SMTP port bị chặn trên một số host
MAILTRAP_API_TOKEN=
MAILTRAP_API_URL=https://send.api.mailtrap.io/api/send
MAILTRAP_FROM_EMAIL=
MAILTRAP_FROM_NAME=QR Restaurant
```

Gợi ý demo an toàn:

- Dùng Mailtrap hoặc inbox sandbox trước khi bật Gmail/SMTP thật.
- Chỉ đặt `REPORT_EMAIL_ENABLED=true` sau khi đã có `REPORT_EMAIL_RECIPIENTS`, `SMTP_HOST`, `SMTP_PORT`, và `SMTP_FROM`.
- `SMTP_TIMEOUT_MS=15000` giúp request gửi email fail nhanh sau khoảng 15 giây nếu Render/provider không kết nối được SMTP.
- Nếu dùng Mailtrap Email API production, đặt `MAILTRAP_API_TOKEN`, `MAILTRAP_FROM_EMAIL`, và `MAILTRAP_FROM_NAME`; khi có token này backend sẽ gửi qua HTTPS API thay vì SMTP.
- Gửi thử bằng tài khoản `ADMIN` qua `POST /api/admin/reports/daily-email/send` với body `{"report_date":"YYYY-MM-DD"}`.
- Admin có thể gửi ngay tới một email nhập tay trong frontend tại `/admin/email-send`, hoặc gọi `POST /api/admin/reports/daily-email/send-now` với body `{"recipient_email":"owner@example.com","report_date":"YYYY-MM-DD"}`. Nếu bỏ `report_date`, backend dùng ngày kinh doanh đã hoàn tất gần nhất.
- Xem trạng thái gần nhất qua `GET /api/admin/reports/daily-email/status`.
- Rollback nhanh bằng `REPORT_EMAIL_ENABLED=false` rồi restart backend.

Tạo DB, schema và áp dụng migrations mới nhất (Hóa đơn & cấu hình ngân hàng):

```powershell
psql -U postgres -f setup_local_db.sql
psql -U restaurant_user -d restaurant_dbs -f src/config/schema.sql
node src/config/migrateInvoices.js
node src/config/migrateBankSettings.js
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
| Upload ảnh món legacy lỗi đường dẫn public | Kiểm tra `DISH_IMAGE_STORAGE_DIR` tồn tại được ghi và `DISH_IMAGE_PUBLIC_BASE_URL` là URL tuyệt đối |
| Lưu ảnh Base64 bị lỗi hoặc không hiển thị | Kiểm tra ảnh là JPEG/PNG, dưới `DISH_IMAGE_MAX_BYTES`, và DB đã dùng schema `MENU_ITEMS.image_url TEXT` |
