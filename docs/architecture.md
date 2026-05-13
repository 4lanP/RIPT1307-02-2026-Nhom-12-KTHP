# Architecture

Tài liệu thiết kế kiến trúc backend — Hệ thống gọi món QR & KDS.

## Kiến trúc tổng thể

Áp dụng **Layered Architecture** (Controller → Service → Data Access) để tách biệt logic và dễ phân chia task.

```
┌─────────────────────────────────────────────────────────┐
│                      Client Layer                        │
│  Customer App │ Staff App │ KDS Screen │ Admin Dashboard │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP / WebSocket
┌───────────────────────────▼─────────────────────────────┐
│                   Express 5 API Server                   │
│                                                          │
│  helmet → cors → json → requestTracker → rateLimiter     │
│                    ↓                                     │
│              Routes / Controllers                        │
│                    ↓                                     │
│              Service Layer                               │
│   auth │ order │ payment │ kds │ report │ session        │
│                    ↓                                     │
│              Socket.IO Server                            │
│   /customer │ /kitchen │ /staff                          │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
┌──────────────▼──────────┐  ┌────────────▼──────────────┐
│     PostgreSQL 16        │  │          Redis             │
│  (persistent data)       │  │  (sessions, webhook lock)  │
└─────────────────────────┘  └───────────────────────────┘
               │
┌──────────────▼──────────┐
│     VNPay Gateway        │
│  (payment IPN webhook)   │
└─────────────────────────┘
```

## Cấu trúc thư mục

```
src/
├── config/
│   ├── db.js            # PostgreSQL connection pool (pg), retry logic
│   ├── redis.js         # Redis client (ioredis)
│   ├── swagger.js       # Swagger spec config
│   ├── vnpay.js         # VNPay parameters
│   ├── schema.sql       # Database schema
│   ├── seed.js          # Seed data
│   ├── indexes.sql      # 30+ performance indexes
│   └── applyIndexes.js  # Script áp dụng indexes
│
├── controllers/         # Xử lý Request/Response — không chứa business logic
│   ├── auth.controller.js
│   ├── customer.controller.js
│   ├── kds.controller.js
│   ├── staff.controller.js
│   ├── admin.controller.js
│   └── webhook.controller.js
│
├── services/            # Business logic & SQL queries
│   ├── auth.service.js
│   ├── session.service.js   # QR scan, session, bill calculation
│   ├── order.service.js     # Đặt món, quota check, optimistic locking
│   ├── kds.service.js       # Queue bếp, xác nhận món
│   ├── payment.service.js   # VNPay URL, webhook idempotency
│   ├── report.service.js    # Thống kê, export Excel
│   └── admin.service.js     # Admin CRUD users/tables/QR/menu
│
├── middlewares/
│   ├── auth.middleware.js         # JWT verify, session token verify
│   ├── validate.middleware.js     # Zod validation wrapper
│   ├── rateLimit.middleware.js    # Rate limiting theo IP
│   ├── requestTracking.middleware.js # Request ID (UUID v4), response time
│   └── error.middleware.js        # Global error handler
│
├── validators/          # Zod schemas
│   ├── auth.validator.js
│   ├── customer.validator.js
│   ├── kds.validator.js
│   └── admin.validator.js
│
├── routes/
│   ├── index.js         # Master router
│   ├── auth.routes.js
│   ├── customer.routes.js
│   ├── kds.routes.js
│   ├── staff.routes.js
│   ├── admin.routes.js
│   └── webhook.routes.js
│
├── sockets/
│   ├── index.js         # Setup namespaces, auth middleware
│   └── io.js            # Socket.IO instance export
│
├── utils/
│   ├── jwt.util.js      # Sign/verify access token + session token
│   ├── vnpay.util.js    # Tạo URL, verify HMAC signature
│   ├── logger.js        # Winston logger
│   ├── errors.js        # Custom error classes
│   ├── validateEnv.js   # Env validation on startup
│   └── response.util.js # Chuẩn hóa format API response
│
├── app.js               # Express app, middleware chain, Swagger UI
└── server.js            # HTTP server, Socket.IO attach, cron job
```

## Middleware Chain

Thứ tự xử lý mỗi request:

```
helmet()
  → cors()
  → express.json()
  → requestTracker (gán req.id UUID v4, log incoming)
  → rateLimiter
  → Routes
    → authMiddleware (verify JWT / session token)
    → validate(schema) (Zod)
    → controller
  → errorHandler (global)
```

## Database Design

Schema đầy đủ: [src/BE_THLTW/src/config/schema.sql](../src/BE_THLTW/src/config/schema.sql)

### Bảng chính

| Bảng | Mô tả |
|---|---|
| `users` | Tài khoản nhân viên, role, trạng thái |
| `refresh_tokens` | Refresh token (SHA256 hash), expires_at, revoked_at |
| `tables` | Bàn nhà hàng, trạng thái (AVAILABLE/OCCUPIED) |
| `menu_items` | Món ăn, giá, danh mục, daily_quota, is_available |
| `sessions` | Phiên khách tại bàn, subtotal, version (optimistic lock) |
| `orders` | Đơn hàng trong session, status |
| `order_items` | Chi tiết món, status (PENDING/PREPARING/READY/SERVED/CANCELLED) |
| `payments` | Giao dịch thanh toán, transaction_id, status |
| `customer_requests` | Yêu cầu gọi nhân viên / xin thanh toán |

Lưu ý schema hiện tại dùng PostgreSQL `SERIAL`, nên API IDs là integer. `tables.status` chỉ có `AVAILABLE` và `OCCUPIED`; không có `CLEANING`/`RESERVED`.

### Indexes (30+)

Áp dụng index cho tất cả cột thường query:
- `orders`: session_id, table_id, status, created_at
- `order_items`: order_id, menu_item_id, status
- `sessions`: table_id, status, started_at
- `refresh_tokens`: user_id, token, expires_at
- `payments`: session_id, transaction_id, status
- Composite indexes cho common join queries

## Authentication

### Staff (JWT)
```
POST /api/auth/login
  → bcrypt.compare password
  → sign accessToken (15m) + refreshToken (7d)
  → store SHA256(refreshToken) in refresh_tokens table

POST /api/auth/refresh
  → verify refreshToken signature
  → check SHA256(token) in DB (not revoked, not expired)
  → issue new accessToken

POST /api/auth/logout
  → mark refresh_token as revoked in DB
```

### Customer (Session Token)
```
POST /api/customer/scan { qr_code }
  → validate QR, check table status
  → create session record
  → sign session_token (JWT, 24h, type: 'session')
  → return session_token

Subsequent requests:
  Authorization: Bearer <session_token>
  → verifySessionToken() → req.session
```

## Key Business Logic

### createOrder (transaction)
1. `BEGIN`
2. Lock SESSION với `FOR UPDATE`, kiểm tra version (optimistic locking)
3. Với mỗi item: kiểm tra `is_available` và `daily_quota >= quantity`
4. Trừ `daily_quota` với constraint: `WHERE daily_quota >= $1` (tránh race condition)
5. Insert ORDERS + ORDER_ITEMS
6. `calculateSessionBill()` — tính lại subtotal trong cùng transaction
7. Tăng `session.version`
8. `COMMIT`
9. Emit socket `new_order` → `/kitchen`

### processVNPayWebhook (idempotent)
1. Verify HMAC signature
2. Kiểm tra Redis lock `webhook:vnpay:{txnRef}` (TTL 60s)
3. Nếu đã xử lý → return `RspCode: '02'`
4. `BEGIN` → update PAYMENT, SESSION, TABLE → `COMMIT`
5. Emit `session_closed` → `/customer`, `table_freed` → `/staff`

## Scheduled Jobs

- **Daily quota reset** — `0 0 * * *` (Asia/Ho_Chi_Minh)
  - Reset `daily_quota = daily_quota_default` cho tất cả menu items

## Deployment Notes (Render.com)

- **Cold start**: Set `idleTimeoutMillis` và `connectionTimeoutMillis` hợp lý để tránh rớt connection khi app thức dậy sau 15 phút idle
- **Stateless**: Không lưu state trong memory — danh sách bàn/session luôn lấy từ DB
- **Health check**: `GET /api/health` → 200 OK — Render dùng để biết app đã sẵn sàng
- **Timezone**: Cron job dùng `Asia/Ho_Chi_Minh` — đảm bảo DB và app cùng timezone
