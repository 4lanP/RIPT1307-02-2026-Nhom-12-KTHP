# 02 - Backend

## Tổng quan

Backend được xây dựng bằng **Node.js v20 + Express 5**, theo kiến trúc phân lớp: Routes → Controllers → Services → Database.

**Entry point:** [src/BE_THLTW/src/server.js](../src/BE_THLTW/src/server.js)  
**App config:** [src/BE_THLTW/src/app.js](../src/BE_THLTW/src/app.js)

## Cấu trúc thư mục

```
src/BE_THLTW/
├── src/
│   ├── server.js           # HTTP server, Socket.IO, cron job
│   ├── app.js              # Express app, middleware, Swagger
│   ├── routes/             # Route definitions
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   ├── middlewares/        # Auth, error, rate limit, validation
│   ├── validators/         # Zod schemas
│   ├── sockets/            # Socket.IO handlers
│   ├── config/             # DB, Redis, Swagger, VNPay, schema.sql
│   └── utils/              # JWT, logger, response, env validator, VNPay
├── migrations/             # DB migration files
├── __tests__/              # Jest test files
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Middleware Chain

Thứ tự middleware trong `app.js`:

1. `helmet` — security headers
2. `cors` — cross-origin policy
3. `express.json` — parse JSON body
4. `requestTracker` — gán request ID, log incoming
5. `rateLimiter` — giới hạn request theo IP
6. Routes
7. `errorHandler` — xử lý lỗi tập trung

## Services

| Service | File | Chức năng |
|---|---|---|
| `authService` | services/auth.js | Đăng ký, đăng nhập, refresh token, logout |
| `orderService` | services/order.js | Tạo đơn, cập nhật trạng thái, lấy đơn |
| `paymentService` | services/payment.js | Tạo URL VNPay, xử lý webhook |
| `kdsService` | services/kds.js | Lấy queue bếp, xác nhận món |
| `reportService` | services/report.js | Tổng hợp doanh thu, export Excel |
| `sessionService` | services/session.js | Quản lý phiên khách tại bàn |

## Authentication Flow

```
POST /api/auth/login
  → validate (Zod)
  → bcrypt.compare password
  → sign accessToken (15m) + refreshToken (7d)
  → store refreshToken hash in DB

POST /api/auth/refresh
  → verify refreshToken
  → issue new accessToken

POST /api/auth/logout
  → invalidate refreshToken in DB
```

Middleware `authMiddleware` verify JWT trên mọi route cần bảo vệ, gắn `req.user` với `{ id, role }`.

## Validation

Tất cả input từ client được validate bằng **Zod** trước khi vào controller:

- [src/BE_THLTW/src/validators/auth.validator.js](../src/BE_THLTW/src/validators/auth.validator.js)
- [src/BE_THLTW/src/validators/customer.validator.js](../src/BE_THLTW/src/validators/customer.validator.js)
- [src/BE_THLTW/src/validators/kds.validator.js](../src/BE_THLTW/src/validators/kds.validator.js)

## Logging

Winston logger tại [src/BE_THLTW/src/utils/logger.js](../src/BE_THLTW/src/utils/logger.js):

- `info` — request/response, business events
- `warn` — validation failures, rate limit hits
- `error` — unhandled errors, DB failures

## Database

- **PostgreSQL 16** qua `pg` pool
- Config: [src/BE_THLTW/src/config/db.js](../src/BE_THLTW/src/config/db.js)
- Schema: [src/BE_THLTW/src/config/schema.sql](../src/BE_THLTW/src/config/schema.sql)
- Migrations: [src/BE_THLTW/migrations/](../src/BE_THLTW/migrations/)
- Seed data: [src/BE_THLTW/src/config/seed.js](../src/BE_THLTW/src/config/seed.js)

## Redis

- **ioredis** — session storage, caching, pub/sub cho Socket.IO
- Config: [src/BE_THLTW/src/config/redis.js](../src/BE_THLTW/src/config/redis.js)

## VNPay Integration

- Tạo URL thanh toán: `paymentService.createPaymentUrl()`
- Webhook nhận callback: `POST /api/webhook/vnpay`
- Idempotency: kiểm tra `txn_ref` đã xử lý chưa trước khi update DB
- Config & utils: [src/BE_THLTW/src/config/vnpay.js](../src/BE_THLTW/src/config/vnpay.js), [src/BE_THLTW/src/utils/vnpay.js](../src/BE_THLTW/src/utils/vnpay.js)

## API Documentation

Swagger UI tại `/api/docs` (chỉ chạy khi `NODE_ENV=development`).  
Config: [src/BE_THLTW/src/config/swagger.js](../src/BE_THLTW/src/config/swagger.js)

Postman collection: [src/BE_THLTW/postman_collection.json](../src/BE_THLTW/postman_collection.json)

## Scripts

```bash
npm run dev       # nodemon, hot reload
npm start         # production
npm test          # Jest
npm run migrate   # chạy migrations
npm run seed      # seed dữ liệu mẫu
```
