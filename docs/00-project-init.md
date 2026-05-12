# 00 - Project Init

## Tổng quan

**Tên dự án:** KTHP-LTW — Hệ thống quản lý nhà hàng  
**Loại:** Đồ án môn Lập trình Web (LTW)  
**Mục tiêu:** Xây dựng hệ thống quản lý nhà hàng full-stack gồm đặt món, hiển thị bếp (KDS), thanh toán, và báo cáo quản trị.

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Backend | Node.js v20 + Express 5 |
| Database | PostgreSQL 16 |
| Cache / Session | Redis (ioredis) |
| Real-time | Socket.IO |
| Auth | JWT (access 15m / refresh 7d) + bcrypt |
| Payment | VNPay |
| Validation | Zod |
| Logging | Winston |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Testing | Jest |
| Container | Docker + Docker Compose |
| Frontend | Chưa implement |

## Cấu trúc thư mục

```
KTHP-LTW/
├── docs/               # Tài liệu dự án
├── src/
│   ├── BE_THLTW/       # Backend (Node.js/Express)
│   └── FE_THLTW/       # Frontend (chưa implement)
└── agent-skills/       # AI agent skill definitions
```

## Yêu cầu môi trường

- Node.js >= 20
- PostgreSQL 16
- Redis
- Docker & Docker Compose (tuỳ chọn)

## Khởi động nhanh

```bash
cd src/BE_THLTW
npm install
cp .env.example .env
# Điền DATABASE_URL, JWT secrets, VNPay keys

node -e "require('dotenv').config(); require('./src/utils/validateEnv').validateEnv()"
npm run dev

# Hoặc chạy bằng Docker
docker compose up --build -d
```

## Biến môi trường

### Bắt buộc
```bash
DATABASE_URL=postgres://...
JWT_ACCESS_SECRET=min_32_chars
JWT_REFRESH_SECRET=min_32_chars
VNPAY_TMNCODE=...
VNPAY_HASHSECRET=...
VNPAY_URL=...
VNPAY_RETURN_URL=...
FRONTEND_URL=https://...   # Không được là "*" trong production
```

### Tuỳ chọn
```bash
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
PORT=5000
NODE_ENV=production
```

## Scripts

```bash
npm run dev             # Development (hot reload)
npm start               # Production
npm test                # Jest
npm run migrate:up      # Áp dụng migrations mới
npm run migrate:down    # Rollback migration cuối
npm run migrate:create  # Tạo migration file mới
```

## Docker

```bash
docker compose up --build -d    # Start
docker compose logs -f backend  # Logs
docker compose down             # Stop
docker compose down -v          # Reset DB
docker compose ps               # Status
```

## Monitoring

```bash
tail -f logs/combined.log
tail -f logs/error.log
curl http://localhost:5000/api/health
LOG_LEVEL=debug npm run dev
```

## Logging

```javascript
const logger = require('./utils/logger');

logger.info('User action', { userId, action });
logger.warn('Rate limit exceeded', { ip, endpoint });
logger.error('Payment failed', { error: err.message, sessionId });
```

Levels: `error` | `warn` | `info` | `http` | `debug`

## Error Classes

```javascript
const { NotFoundError, ValidationError, AuthenticationError } = require('./utils/errors');

throw new NotFoundError('User not found');
throw new ValidationError('Invalid email');
throw new AuthenticationError();
```

## Validation (Zod)

```javascript
const { validate } = require('./middlewares/validate.middleware');
const { loginSchema } = require('./validators/auth.validator');

router.post('/login', validate(loginSchema, 'body'), controller.login);
```

## Socket.IO Client

```javascript
// Kitchen / Staff (cần auth)
const socket = io('http://localhost:5000/kitchen', {
  auth: { token: accessToken }
});

// Customer (không cần auth)
const socket = io('http://localhost:5000/customer');
socket.emit('join_session', { session_id });
```

Namespaces: `/customer` (no auth) | `/kitchen` (ADMIN, KITCHEN) | `/staff` (ADMIN, STAFF)

## Test Commands

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@restaurant.com","password":"Password123!"}'

# Scan QR (customer)
curl -X POST http://localhost:5000/api/customer/scan \
  -H "Content-Type: application/json" \
  -d '{"qr_code":"QR-Bàn-01"}'
```

## Troubleshooting

| Lỗi | Fix |
|---|---|
| "Missing required env vars" | `cat .env \| grep -E "DATABASE_URL\|JWT\|VNPAY"` |
| "Redis connection failed" | `redis-cli ping` hoặc xóa `REDIS_URL` |
| "CORS blocked" | Thêm origin vào `FRONTEND_URL` |
| "Socket auth failed" | Kiểm tra token valid, user active, đúng role |
