# 05 - Deployment

Backend được container hóa bằng Docker.

## Dockerfile

File: [src/BE_THLTW/Dockerfile](../src/BE_THLTW/Dockerfile)

- Base image: `node:20-alpine`
- Cài dependency bằng `npm ci --only=production`
- Chạy bằng non-root user `appuser`
- Entry point: `node src/server.js`
- Expose port `5000`

## Docker Compose Local

File: [src/BE_THLTW/docker-compose.yml](../src/BE_THLTW/docker-compose.yml)

| Service | Port | Mô tả |
|---|---:|---|
| `postgres` | `5433:5432` | PostgreSQL 16 |
| `redis` | `6379:6379` | Redis cho webhook lock |
| `seeder` | none | Seed dữ liệu mẫu rồi thoát |
| `indexer` | none | Áp dụng indexes rồi thoát |
| `backend` | `5000:5000` | Express API |

Chạy:

```powershell
cd src/BE_THLTW
docker compose up -d --build
```

Kiểm tra:

```powershell
docker compose ps
Invoke-WebRequest -UseBasicParsing http://localhost:5000/api/health
```

Reset dữ liệu:

```powershell
docker compose down -v
docker compose up -d --build
```

## Environment

Compose local đã có default để máy mới chạy được ngay cả khi chưa có `.env`.

Production vẫn cần set biến thật:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgres://user:pass@host:5432/restaurant_dbs
REDIS_URL=redis://host:6379
JWT_ACCESS_SECRET=<strong-random-secret-min-32-chars>
JWT_REFRESH_SECRET=<strong-random-secret-min-32-chars>
VNPAY_TMNCODE=<merchant-code>
VNPAY_HASHSECRET=<hash-secret>
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
VNPAY_RETURN_URL=https://your-domain/payment-result
FRONTEND_URL=https://your-frontend-domain
LOG_LEVEL=info
```

Lưu ý:

- `FRONTEND_URL` không được là `*` trong production.
- JWT secrets phải ít nhất 32 ký tự trong production.
- Swagger UI bị tắt khi `NODE_ENV=production`; vẫn có `/api/docs.json`.

## Database

Schema gốc nằm ở:

```text
src/BE_THLTW/src/config/schema.sql
```

Indexes nằm ở:

```text
src/BE_THLTW/src/config/indexes.sql
```

Index đáng chú ý:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sessions_one_active_per_table
ON SESSIONS(table_id)
WHERE status = 'ACTIVE';
```

Index này ngăn 2 session active cùng một bàn.

## Health Check

```text
GET /api/health
```

Response:

```json
{ "status": "UP", "message": "Hệ thống đang hoạt động" }
```

## Production Checklist

1. Set env production đầy đủ.
2. Dùng DB/Redis managed hoặc container production riêng.
3. Chạy migration/schema/index trước khi serve traffic.
4. Bật HTTPS/reverse proxy.
5. Set `FRONTEND_URL` đúng domain frontend.
6. Chạy `npm test`.
7. Smoke test:

```bash
curl https://your-api-domain/api/health
```

## Deploy thực tế lên Render và Netlify

Dự án đã được cấu hình và kiểm thử thành công khi deploy **Backend + PostgreSQL + Redis lên Render** và **Frontend (React + Vite) lên Netlify**. Dưới đây là hướng dẫn cấu hình chi tiết cho từng dịch vụ:

### 1. Cấu hình Cơ sở dữ liệu & Caching trên Render

Trước tiên, cần tạo các tài nguyên lưu trữ trên Render để lấy thông tin kết nối cung cấp cho Backend.

#### a. PostgreSQL Database
1. Truy cập Render Dashboard, chọn **New** -> **PostgreSQL**.
2. Thiết lập thông tin cơ bản:
   - **Name**: `restaurant-db` (hoặc tên tùy chọn)
   - **Region**: Chọn khu vực gần người dùng nhất (ví dụ: `Singapore` để có latency tốt nhất về Việt Nam)
3. Sau khi khởi tạo thành công, sao chép:
   - **Internal Database URL**: Dùng để cấu hình cho Web Service của Backend chạy cùng trên Render (kết nối nội bộ nhanh và bảo mật).
   - **External Database URL**: Dùng để kết nối từ local phục vụ việc khởi tạo database (schema, seed, index).

#### b. Redis Cache (Webhook Lock)
1. Chọn **New** -> **Redis**.
2. Thiết lập tên (ví dụ: `restaurant-redis`) và chọn Region giống PostgreSQL.
3. Sau khi khởi tạo thành công, sao chép **Internal Redis Connection String** (ví dụ: `redis://red-...:6379`).

---

### 2. Cấu hình Backend (Web Service) trên Render

1. Chọn **New** -> **Web Service**, liên kết với repository của dự án.
2. Thiết lập các thông số chính:
   - **Name**: `ript1307-02-2026-nhom-12-kthp` (trùng với tên miền backend của bạn)
   - **Region**: Chọn khu vực giống Database & Redis.
   - **Root Directory**: `src/BE_THLTW`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js` (hoặc `npm start`)
3. Vào tab **Environment** để cấu hình các biến môi trường bắt buộc:

| Tên biến | Giá trị mẫu/Mô tả |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render mặc định hoặc tự động binding) |
| `DATABASE_URL` | *Dán **Internal Database URL** từ bước 1.a* |
| `REDIS_URL` | *Dán **Internal Redis Connection String** từ bước 1.b* |
| `JWT_ACCESS_SECRET` | *Chuỗi mã khóa ngẫu nhiên bảo mật cao (tối thiểu 32 ký tự)* |
| `JWT_REFRESH_SECRET` | *Chuỗi mã khóa ngẫu nhiên bảo mật cao (tối thiểu 32 ký tự)* |
| `FRONTEND_URL` | `https://[your-app-name].netlify.app` (URL Frontend Netlify của bạn) |
| `DISH_IMAGE_STORAGE_DIR` | `./uploads/dish-images` cho flow upload file legacy |
| `DISH_IMAGE_PUBLIC_BASE_URL` | `https://ript1307-02-2026-nhom-12-kthp.onrender.com/uploads/dish-images` cho ảnh file legacy |
| `DISH_IMAGE_MAX_BYTES` | `5242880`; áp dụng cho cả Base64 JPG/PNG lưu DB và upload file legacy |
| `VNPAY_TMNCODE` | *Mã Merchant VNPay Sandbox của bạn* |
| `VNPAY_HASHSECRET` | *Chuỗi Hash Secret VNPay Sandbox của bạn* |
| `VNPAY_URL` | `https://sandbox.vnpay.vn/paymentv2/vpcpay.html` |
| `VNPAY_RETURN_URL` | `https://[your-app-name].netlify.app/payment-result` |

> [!NOTE]
> Vì Render Web Service dạng Free sẽ bị xóa các file upload cục bộ khi container restart hoặc redeploy, ảnh món ăn (`dish-images`) tải lên dạng file thông thường sẽ bị mất. Hệ thống đã hỗ trợ upload và lưu trữ ảnh món ăn dưới dạng Base64 trực tiếp vào database giúp dữ liệu ảnh luôn được bảo toàn ổn định trên cloud.

---

### 3. Khởi tạo Cơ sở dữ liệu (Database Schema, Seeds & Indexes)

Do Render PostgreSQL khi mới tạo là DB trống, ta cần nạp cấu trúc bảng và dữ liệu mẫu từ local. Thực hiện các bước sau từ máy cá nhân của bạn:

1. Lấy **External Database URL** của Render PostgreSQL (URL này cho phép kết nối từ bên ngoài).
2. Mở Terminal tại thư mục `src/BE_THLTW` của dự án và chạy các lệnh sau:

**Trên Windows (PowerShell):**
```powershell
$env:DATABASE_URL="[Dán External Database URL ở đây]"
psql $env:DATABASE_URL -f src/config/schema.sql
node src/config/seed.js
node src/config/applyIndexes.js
```

**Trên macOS/Linux (Bash):**
```bash
export DATABASE_URL="[Dán External Database URL ở đây]"
psql $DATABASE_URL -f src/config/schema.sql
node src/config/seed.js
node src/config/applyIndexes.js
```

---

### 4. Cấu hình Frontend (Static Site) trên Netlify

1. Đăng nhập Netlify, chọn **Add new site** -> **Import an existing project** và liên kết với repo GitHub của dự án.
2. Cấu hình các thông số build:
   - **Base directory**: `src/FE_THLTW`
   - **Build command**: `npm run build`
   - **Publish directory**: `src/FE_THLTW/dist`
3. Cấu hình biến môi trường tại **Site settings** -> **Environment variables**:
   - `VITE_API_URL`: `https://ript1307-02-2026-nhom-12-kthp.onrender.com/api` (hoặc để trống/mặc định `/api` nhờ cơ chế proxy)
   - `VITE_SOCKET_URL`: `https://ript1307-02-2026-nhom-12-kthp.onrender.com`

#### Cơ chế Single Page Application (SPA) Routing & Proxy trên Netlify
Trong thư mục `src/FE_THLTW/public/_redirects` đã có sẵn cấu hình giúp Netlify chuyển tiếp request API và tránh lỗi reload trang 404 của React Router:
```text
/api/*  https://ript1307-02-2026-nhom-12-kthp.onrender.com/api/:splat  200
/socket.io/*  https://ript1307-02-2026-nhom-12-kthp.onrender.com/socket.io/:splat  200
/* /index.html 200
```
> [!TIP]
> Việc cấu hình proxy này giúp frontend gọi trực tiếp tới `/api` hoặc `/socket.io` của chính tên miền Netlify. Netlify sẽ tự động chuyển tiếp request sang backend Render dưới nền, tránh hoàn toàn lỗi CORS và tối ưu bảo mật.

## Rủi ro còn lại trước production

- VNPay webhook da check amount; truoc production can test voi sandbox merchant config that.
- `/customer` Socket.IO đã xác thực `session_id` + `session_token` trong `join_session`; trước production vẫn nên test end-to-end với frontend thật.
- Admin CRUD đã có route thật; trước production nên bổ sung integration test và phân quyền chi tiết theo từng thao tác.
- Nên thêm CI để chạy test tự động.

## Troubleshooting

| Lỗi | Cách xử lý |
|---|---|
| Docker không connect engine | Mở Docker Desktop, kiểm tra `docker version` |
| Backend unhealthy | `docker compose logs backend` |
| Postgres unhealthy | `docker compose logs postgres` |
| Seeder/indexer fail | `docker compose logs seeder` hoặc `docker compose logs indexer` |
| Port conflict | Đổi port host trong `docker-compose.yml` |
| Dữ liệu cũ không đổi sau seed | Chạy `docker compose down -v` |

## Backend Security Checklist

- Keep `src/BE_THLTW/.env` and `src/BE_THLTW/.env.local` local only. They must not be tracked by Git.
- Provision production values from the deployment secret store or runtime environment. Do not copy values from local workstations.
- Use `src/BE_THLTW/.env.example` only as a shape reference. Values wrapped in `<...>` are placeholders.

## Credential Rotation

Rotate credentials immediately after removing tracked env files from Git history or after any suspected exposure.

- JWT: replace `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, then force staff login again and allow customer session tokens to expire.
- Database: rotate `DB_PASSWORD` or `DATABASE_URL`, update the deployment secret store, then restart the backend.
- VNPay: rotate `VNPAY_HASHSECRET` and merchant credentials in coordination with the payment provider.
- Redis: rotate `REDIS_URL` credentials when Redis auth is enabled, then restart workers/backends that use webhook locks.
