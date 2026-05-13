# 02 - Backend

Backend nằm trong:

```text
src/BE_THLTW
```

Stack chính:

- Node.js 20
- Express 5
- PostgreSQL 16 qua `pg`
- Redis qua `ioredis`
- Socket.IO
- Jest
- Swagger/OpenAPI

Entry points:

- App Express: [src/BE_THLTW/src/app.js](../src/BE_THLTW/src/app.js)
- HTTP server + Socket.IO + cron: [src/BE_THLTW/src/server.js](../src/BE_THLTW/src/server.js)

## Cấu trúc

```text
src/BE_THLTW/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middlewares/
│   ├── validators/
│   ├── sockets/
│   ├── config/
│   └── utils/
├── __tests__/
├── Dockerfile
├── docker-compose.yml
├── package.json
└── postman_collection.json
```

## Middleware Chain

Trong `app.js`:

1. `helmet()`
2. request id + response time tracking
3. `cors()`
4. `express.json()`
5. `express.urlencoded()`
6. routes dưới `/api`
7. Swagger UI nếu không phải production
8. global error handler

Request ID dùng `crypto.randomUUID()` để tránh lỗi `uuid@14` ESM-only trong CommonJS.

## Routes Thật Đang Có

| Prefix | File | Ghi chú |
|---|---|---|
| `/api/auth` | `routes/auth.routes.js` | Login, refresh, logout |
| `/api/customer` | `routes/customer.routes.js` | Scan QR, menu, session, order, request, VNPay URL |
| `/api/kds` | `routes/kds.routes.js` | Chỉ role `KITCHEN` cho HTTP endpoints |
| `/api/staff` | `routes/staff.routes.js` | WAITER/CASHIER/MANAGER/ADMIN for table/session/request handling; CASHIER/MANAGER/ADMIN for checkout/cancel; MANAGER/ADMIN for force-close |
| `/api/admin` | `routes/admin.routes.js` | Report, export, reset quota, CRUD users/tables/QR/menu |
| `/api/webhooks` | `routes/webhook.routes.js` | VNPay IPN |

## Services

| Service | File | Chức năng |
|---|---|---|
| Auth | `services/auth.service.js` | Login, refresh token, logout |
| Session | `services/session.service.js` | Scan QR, session, menu, staff table/session, checkout, request |
| Order | `services/order.service.js` | Tạo order, quota, option validation, bill update, emit KDS |
| KDS | `services/kds.service.js` | Queue theo station, cập nhật item/order status |
| Payment | `services/payment.service.js` | Tạo VNPay URL, xử lý webhook |
| Report | `services/report.service.js` | Revenue/menu/KDS report, Excel export, reset quota |
| Admin | `services/admin.service.js` | CRUD users, tables, QR codes, menu categories/items/options |

## Database

Schema: [src/BE_THLTW/src/config/schema.sql](../src/BE_THLTW/src/config/schema.sql)

Quan trọng:

- ID dùng `SERIAL` integer, không phải UUID.
- `TABLES.status`: `AVAILABLE`, `OCCUPIED`.
- `SESSIONS.status`: `ACTIVE`, `CLOSED`.
- `MENU_CATEGORIES.station`: `GRILL`, `BAR`, `COLD`.
- `ORDER_ITEMS.status`: `PENDING`, `PREPARING`, `READY`, `SERVED`, `CANCELLED`.

Indexes: [src/BE_THLTW/src/config/indexes.sql](../src/BE_THLTW/src/config/indexes.sql)

Đã có unique index để chống nhiều session active cùng bàn:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sessions_one_active_per_table
ON SESSIONS(table_id)
WHERE status = 'ACTIVE';
```

## Luồng Customer

### Scan QR

`POST /api/customer/scan`

Service lock row bàn bằng `FOR UPDATE`, kiểm tra bàn chưa `OCCUPIED`, tạo session, rồi cập nhật bàn thành `OCCUPIED`.

Response trả `session_token` JWT 24h.

### Create Order

`POST /api/customer/orders`

Backend:

1. Lock session theo `id` và `session_version`.
2. Kiểm tra session còn `ACTIVE`.
3. Lock từng menu item.
4. Kiểm tra `is_available` và `daily_quota`.
5. Trừ quota bằng `UPDATE ... WHERE daily_quota >= quantity`.
6. Insert order và order items.
7. Kiểm tra option phải thuộc đúng món và đang available.
8. Tính lại bill.
9. Tăng `session.version`.
10. Commit transaction, release DB client.
11. Emit socket `new_order` sang `/kitchen` (sau khi release — lỗi socket không rollback order).

## Luồng Staff Checkout

`POST /api/staff/sessions/:id/checkout`

Backend hiện kiểm tra:

- Session tồn tại.
- Session còn `ACTIVE`.
- `amount` là số hợp lệ.
- `amount >= final_amount`.

Sau đó tạo payment `CASH`, đóng session và giải phóng bàn.

## Admin CRUD

Tất cả Admin CRUD endpoints yêu cầu access token role `ADMIN`.

| Resource | Endpoints | Hành vi xóa |
|---|---|---|
| Users | `GET/POST /api/admin/users`, `PUT/DELETE /api/admin/users/:id` | Soft delete bằng `is_active = false` |
| Tables | `GET/POST /api/admin/tables`, `PUT/DELETE /api/admin/tables/:id` | Chỉ xóa bàn `AVAILABLE`, đồng thời xóa QR của bàn |
| QR codes | `GET/POST /api/admin/qr_codes`, `PATCH /api/admin/qr_codes/:id/toggle`, `DELETE /api/admin/qr_codes/:id` | Hard delete QR |
| Categories | `GET/POST /api/admin/menu/categories`, `PUT/DELETE /api/admin/menu/categories/:id` | Soft delete bằng `is_active = false`; không cho xóa nếu còn item active |
| Items | `GET/POST /api/admin/menu/items`, `PUT/DELETE /api/admin/menu/items/:id` | Soft delete bằng `is_available = false` |
| Options | `GET/POST /api/admin/menu/items/:id/options`, `PUT/DELETE /api/admin/menu/options/:id` | Soft delete bằng `is_available = false` |

Validator: `src/validators/admin.validator.js`. Service cast enum PostgreSQL rõ ràng (`user_role`, `table_status`, `kds_station`) để tránh lỗi node-postgres gửi enum dưới dạng text.

## Auth

Staff access token dùng `JWT_ACCESS_SECRET`.

Refresh token:

- Được sign bằng `JWT_REFRESH_SECRET`.
- Lưu DB dưới dạng SHA-256 hash.
- Mỗi lần gọi `/auth/refresh`, token cũ bị revoke và token mới được issue (rotation).
- `logout` revoke toàn bộ refresh token active của user.

Customer session token dùng JWT access secret và payload:

```json
{
  "session_id": 1,
  "type": "session"
}
```

## Validation

Validators dùng Zod v4. Error middleware đọc `error.issues`.

Do DB dung `SERIAL`, cac validator customer/KDS/staff/admin nhan positive integer cho cac ID. `GET /customer/menu` validate `station` chi nhan `GRILL`, `BAR`, `COLD`.

Middleware validation: `src/middlewares/validate.middleware.js`. File `validation.middleware.js` đã bị xóa (dead code).

## Socket.IO

Namespaces:

- `/customer`: client kết nối namespace rồi gọi `join_session` với `session_id` và `session_token`; backend chỉ join room khi token thuộc đúng session đang active.
- `/kitchen`: auth access token, role `ADMIN` hoặc `KITCHEN`.
- `/staff`: auth access token, role `ADMIN`, `CASHIER`, `MANAGER`, `WAITER`.

## VNPay

Files:

- Config: [src/BE_THLTW/src/config/vnpay.js](../src/BE_THLTW/src/config/vnpay.js)
- Utils: [src/BE_THLTW/src/utils/vnpay.util.js](../src/BE_THLTW/src/utils/vnpay.util.js)
- Service: [src/BE_THLTW/src/services/payment.service.js](../src/BE_THLTW/src/services/payment.service.js)

Webhook:

- Verify secure hash.
- Dùng Redis lock để tránh xử lý trùng.
- Doi chieu `vnp_Amount` voi `PAYMENTS.amount`.
- Update `PAYMENTS`, `SESSIONS`, `TABLES`.


## API Docs

Swagger UI:

```text
http://localhost:5000/api/docs
```

Swagger JSON:

```text
http://localhost:5000/api/docs.json
```

Swagger UI chỉ bật khi `NODE_ENV !== production`.

## Scripts

```powershell
npm run dev
npm start
npm test
npm run seed
docker compose up -d --build
docker compose down
```
