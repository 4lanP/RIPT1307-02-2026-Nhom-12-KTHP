# Hướng Dẫn Cải Tiến Backend - Tuần 1 (Critical)

## Tổng Quan
Đã hoàn thành 8 cải tiến quan trọng để tăng cường bảo mật, độ tin cậy và khả năng giám sát của hệ thống.

---

## 1. ✅ Structured Logging với Winston

### Thay đổi
- Thay thế `console.log/error` bằng Winston logger
- Hỗ trợ multiple transports (console, file)
- Log rotation tự động (10MB/file, max 5 files)
- Structured logging với metadata

### File mới
- `src/utils/logger.js`

### Cách sử dụng
```javascript
const logger = require('./utils/logger');

logger.info('User logged in', { userId: user.id, ip: req.ip });
logger.error('Payment failed', { 
  error: err.message, 
  sessionId: session_id 
});
```

### Environment Variables
```bash
LOG_LEVEL=debug  # error | warn | info | http | debug
```

---

## 2. ✅ Error Handling Classes

### Thay đổi
- Custom error classes cho từng loại lỗi
- Tự động xử lý database errors (23505, 23503, etc.)
- JWT error handling
- Production mode ẩn stack traces

### File mới
- `src/utils/errors.js`

### File cập nhật
- `src/middlewares/error.middleware.js`

### Cách sử dụng
```javascript
const { NotFoundError, ValidationError } = require('../utils/errors');

if (!user) {
  throw new NotFoundError('Người dùng không tồn tại');
}

if (age < 18) {
  throw new ValidationError('Tuổi phải >= 18');
}
```

---

## 3. ✅ Database Retry Logic

### Thay đổi
- Connection pool với retry mechanism
- Exponential backoff cho failed queries
- Graceful reconnection (max 5 attempts)
- Connection monitoring

### File cập nhật
- `src/config/db.js`

### Cấu hình
```javascript
// Pool settings
max: 20,           // Max connections
min: 5,            // Min connections
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 2000
```

### Retryable Errors
- `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`
- PostgreSQL: `57P03`, `08006`, `08001`

---

## 4. ✅ Socket.IO Authentication

### Thay đổi
- Verify JWT token
- Query database để check user status
- Role-based access control
- Disconnect unauthorized users
- Structured logging cho socket events

### File cập nhật
- `src/sockets/index.js`

### Security
```javascript
// Kitchen namespace - chỉ ADMIN và KITCHEN
if (!['ADMIN', 'KITCHEN'].includes(socket.user.role)) {
  socket.disconnect(true);
}

// Staff namespace - chỉ ADMIN và STAFF
if (!['ADMIN', 'STAFF'].includes(socket.user.role)) {
  socket.disconnect(true);
}
```

---

## 5. ✅ Webhook Idempotency với Redis

### Thay đổi
- Distributed lock với Redis
- Fallback to database nếu Redis không available
- Prevent duplicate webhook processing
- Enhanced logging

### File mới
- `src/config/redis.js`

### File cập nhật
- `src/services/payment.service.js`

### Environment Variables
```bash
REDIS_URL=redis://localhost:6379  # Optional
```

### Cách hoạt động
```javascript
// Acquire lock trước khi process webhook
const lockKey = `webhook:vnpay:${txnRef}`;
const lockAcquired = await acquireLock(lockKey, 60);

if (lockAcquired === false) {
  return { RspCode: '02', Message: 'Webhook already processing' };
}

// Process webhook...

// Release lock sau khi xong
await releaseLock(lockKey);
```

---

## 6. ✅ Environment Validation

### Thay đổi
- Validate required env vars khi startup
- Production security checks
- Warning cho optional vars

### File mới
- `src/utils/validateEnv.js`

### File cập nhật
- `src/server.js`

### Required Variables
```bash
DATABASE_URL
JWT_ACCESS_SECRET      # Min 32 chars in production
JWT_REFRESH_SECRET     # Min 32 chars in production
VNPAY_TMNCODE
VNPAY_HASHSECRET
VNPAY_URL
VNPAY_RETURN_URL
```

### Production Checks
- JWT secrets >= 32 characters
- FRONTEND_URL không được là `*`

---

## 7. ✅ Cron Job Alerting

### Thay đổi
- Replace `console.log` với structured logging
- Error logging với stack trace
- Metadata cho debugging

### File cập nhật
- `src/server.js`

### Logging
```javascript
logger.info('Running daily quota reset...');
logger.error('Error resetting daily quota', {
  error: error.message,
  stack: error.stack,
});
```

---

## 8. ✅ CORS Whitelist

### Thay đổi
- Whitelist-based CORS thay vì `*`
- Support multiple origins (comma-separated)
- Development mode bypass
- Log blocked requests

### File cập nhật
- `src/app.js`

### Environment Variables
```bash
# Multiple origins
FRONTEND_URL=https://app.example.com,https://admin.example.com,http://localhost:3000
```

### Behavior
- **Development:** Allow all origins
- **Production:** Only whitelisted origins
- **No origin header:** Allow (for mobile apps, Postman)

---

## Cài Đặt

### 1. Install Dependencies
```bash
npm install
```

### 2. Update .env
```bash
cp .env.example .env
# Edit .env với values thực tế
```

### 3. Optional: Setup Redis
```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Hoặc cài đặt local
# https://redis.io/docs/getting-started/
```

### 4. Start Server
```bash
npm run dev
```

---

## Testing

### Test Logging
```bash
# Check logs/combined.log và logs/error.log
tail -f logs/combined.log
```

### Test Error Handling
```bash
# Trigger validation error
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"123"}'
```

### Test Socket.IO Auth
```javascript
// Frontend
const socket = io('http://localhost:5000/kitchen', {
  auth: { token: 'invalid_token' }
});
// Should disconnect with auth error
```

### Test Webhook Idempotency
```bash
# Send duplicate webhooks
curl -X GET "http://localhost:5000/api/webhooks/vnpay?vnp_TxnRef=TEST123&..."
curl -X GET "http://localhost:5000/api/webhooks/vnpay?vnp_TxnRef=TEST123&..."
# Second request should return "Webhook already processing"
```

---

## Monitoring

### Log Levels
- **error:** Critical errors cần immediate action
- **warn:** Warnings (CORS blocked, auth failed)
- **info:** Important events (server start, payments)
- **http:** HTTP requests (optional)
- **debug:** Detailed debugging info

### Production Recommendations
```bash
LOG_LEVEL=info
NODE_ENV=production
```

### Log Aggregation
Tích hợp với:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **New Relic**
- **CloudWatch** (AWS)

---

## Rollback Plan

Nếu gặp vấn đề, revert các file sau:

```bash
git checkout HEAD -- \
  src/utils/logger.js \
  src/utils/errors.js \
  src/utils/validateEnv.js \
  src/config/redis.js \
  src/config/db.js \
  src/middlewares/error.middleware.js \
  src/services/payment.service.js \
  src/sockets/index.js \
  src/app.js \
  src/server.js \
  .env.example
```

---

## Next Steps (Tuần 2-3)

### Tuần 2 - High Priority
- [ ] Database migrations system
- [ ] Redis caching cho menu items
- [ ] Global rate limiting
- [ ] Request ID tracking

### Tuần 3 - Medium Priority
- [ ] APM integration (New Relic/Datadog)
- [ ] Prometheus metrics
- [ ] Load testing
- [ ] CI/CD pipeline

---

## Support

Nếu gặp vấn đề:
1. Check logs: `tail -f logs/combined.log`
2. Verify env vars: `npm run start` (sẽ fail nếu thiếu vars)
3. Test Redis connection: `redis-cli ping`
4. Check database: `psql $DATABASE_URL -c "SELECT 1"`

---

**Tác giả:** Kiro AI  
**Ngày:** 2026-05-09  
**Version:** 1.0.0
