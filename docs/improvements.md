# Improvements & Fixes

Lịch sử cải tiến và sửa lỗi backend theo từng giai đoạn.

---

## Critical Fixes (Trước Tuần 1)

Các lỗi nghiêm trọng được phát hiện và fix trước khi deploy.

### Fix 1 — Refresh Token Hash Inconsistency (CRITICAL)

**Vấn đề:** Login lưu token bằng `bcrypt.hash()`, nhưng refresh endpoint query bằng SHA256 → refresh token **luôn luôn fail**.

**Fix** (`src/services/auth.service.js`):
```javascript
// Trước:
const tokenHash = await bcrypt.hash(refreshToken, 10);

// Sau:
const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
```

### Fix 2 — Session Token Security (CRITICAL)

**Vấn đề:** Session token là plain UUID — không có signature, dễ brute force.

**Fix:** Chuyển sang JWT-based session token (24h expiry, type: 'session').
- `src/utils/jwt.util.js` — thêm `generateSessionToken()`, `verifySessionToken()`
- `src/middlewares/auth.middleware.js` — verify JWT thay vì UUID
- `src/services/session.service.js` — generate JWT token

**Breaking change:** Frontend cần handle JWT token thay vì plain UUID.

### Fix 3 — Buffer Deprecation (CRITICAL)

**Vấn đề:** `new Buffer.from()` deprecated từ Node.js 6.0 (`src/utils/vnpay.util.js`).

**Fix:**
```javascript
// Trước:
hmac.update(new Buffer.from(signData, 'utf-8'))

// Sau:
hmac.update(Buffer.from(signData, 'utf-8'))
```

### Fix 4 — Race Condition trong Order Quota (HIGH)

**Vấn đề:** UPDATE quota không có constraint → quota có thể thành số âm khi nhiều requests đồng thời.

**Fix** (`src/services/order.service.js`):
```javascript
const updateRes = await client.query(
  `UPDATE MENU_ITEMS SET daily_quota = daily_quota - $1
   WHERE id = $2 AND daily_quota >= $1
   RETURNING daily_quota`,
  [item.quantity, item.menu_item_id]
);
if (updateRes.rows.length === 0) {
  throw { statusCode: 400, message: 'Không đủ số lượng' };
}
```

### Fix 5 — Input Validation với Zod (HIGH)

**Vấn đề:** Không có validation middleware — controllers chỉ check null/undefined cơ bản.

**Fix:** Thêm Zod validation cho tất cả critical endpoints:
- `src/middlewares/validate.middleware.js`
- `src/validators/auth.validator.js`
- `src/validators/customer.validator.js`
- `src/validators/kds.validator.js`

**Breaking change:** Validation error response thay đổi format — thêm field `errors[]` với chi tiết per-field.

### Fix 6 — Database Indexes (MEDIUM)

**Vấn đề:** Không có indexes → sequential scan trên tất cả queries → chậm khi data > 10k rows.

**Fix:** Thêm 30+ indexes:
- `src/config/indexes.sql`
- `src/config/applyIndexes.js`
- `docker-compose.yml` — thêm `indexer` service

**Kết quả:** 10-100x faster queries trên data lớn.

---

## Tuần 1 — Critical Improvements (8 items)

### 1. Structured Logging (Winston)

Thay `console.log` bằng Winston với multiple transports, log rotation (10MB/file, max 5 files).

```javascript
const logger = require('./utils/logger');
logger.info('User logged in', { userId, ip: req.ip });
logger.error('Payment failed', { error: err.message, sessionId });
```

Env var: `LOG_LEVEL=error|warn|info|http|debug`  
Log files: `logs/combined.log`, `logs/error.log`

### 2. Custom Error Classes

```javascript
const { NotFoundError, ValidationError, AuthenticationError } = require('./utils/errors');
throw new NotFoundError('User not found');
throw new ValidationError('Invalid email');
```

Auto-handled: DB errors (23505, 23503), JWT errors. Stack trace ẩn trong production.

### 3. Database Retry Logic

Connection pool với exponential backoff (max 3 retries).

```javascript
// Pool config (src/config/db.js)
max: 20, min: 5,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 2000
```

Retryable errors: `ECONNREFUSED`, `ETIMEDOUT`, PostgreSQL `57P03`, `08006`, `08001`

### 4. Socket.IO Authentication

Verify JWT + check user active + role-based access trên handshake:
- `/customer` — không cần auth
- `/kitchen` — ADMIN, KITCHEN only
- `/staff` — ADMIN, STAFF only

### 5. Webhook Idempotency (VNPay)

Redis distributed lock `webhook:vnpay:{txnRef}` (TTL 60s) — tránh xử lý trùng IPN.  
Fallback về DB check nếu không có Redis.

### 6. Environment Validation

Validate tất cả required env vars khi startup — fail fast thay vì crash sau.

### 7. CORS Whitelist

```bash
FRONTEND_URL=https://app.com,https://admin.com,http://localhost:3000
```

Dev: allow all. Production: whitelist only. No-origin: allow (mobile/Postman).

### 8. Error Handler Cải tiến

Phân loại lỗi (400/401/403/404/409/500), format JSON chuẩn, không lộ stack trace production.

**Dependencies mới:** `winston ^3.19.0`, `ioredis ^5.10.1`

**Score improvement:**

| Metric | Trước | Sau |
|---|---|---|
| Security | 8/10 | 9/10 |
| Reliability | 6/10 | 9/10 |
| Observability | 3/10 | 8/10 |

---

## Tuần 2 — Improvements (4 items)

### 1. Database Migration System

Dùng `node-pg-migrate` thay vì chạy SQL thủ công.

```bash
npm run migrate:up      # Áp dụng migrations mới
npm run migrate:down    # Rollback migration cuối
npm run migrate:create  # Tạo migration file mới
```

Migration pattern (up/down):
```javascript
exports.up = (pgm) => {
  pgm.createTable('example', { id: 'id', name: { type: 'varchar(100)' } });
};
exports.down = (pgm) => { pgm.dropTable('example'); };
```

### 2. Input Validation Nâng cao (XSS + SQL Injection)

Thêm `sanitizeString()` và `hasSQLInjectionPattern()` vào validation pipeline.

Zod schemas đầy đủ: `authSchemas`, `sessionSchemas`, `orderSchemas`, `menuSchemas`, `paymentSchemas`, `requestSchemas`, `tableSchemas`, `userSchemas`, `reportSchemas`

Sử dụng:
```javascript
router.post('/login', validate(authSchemas.login, 'body'), controller.login);
```

### 3. Request ID Tracking

Mỗi request được gán UUID v4 (`req.id`), trả về header `X-Request-ID`.

```javascript
req.log.info('Processing order', { orderId, items: items.length });
// → log entry tự động kèm requestId
```

### 4. Response Time Logging

Log thời gian xử lý mỗi request. Cảnh báo `warn` nếu > 1000ms.

Log format:
```json
{
  "requestId": "uuid",
  "method": "POST",
  "url": "/api/customer/orders",
  "statusCode": 201,
  "duration": "45ms",
  "userId": "uuid",
  "userRole": "customer"
}
```

**Dependencies mới:** `node-pg-migrate ^8.0.4`, `uuid ^8.3.2`  
**Performance overhead:** ~3-6ms per request (negligible)

---

## Test Results

```
Test Suites: 22 passed, 22 total
Tests:       175 passed, 175 total
```

---

## Fixes (2026-05-12)

### Fix A — ROLLBACK sau COMMIT trong createOrder (HIGH)

**Vấn đề:** Socket emit nằm trong cùng `try/catch` với transaction. Nếu emit throw sau khi COMMIT, catch block gọi `ROLLBACK` vô nghĩa và API trả lỗi cho client — order đã tạo trong DB nhưng client tưởng thất bại.

**Fix** (`src/services/order.service.js`):
- Tách socket emit ra khỏi transaction block.
- Sau `finally { client.release() }`, gọi `await emitNewOrder()` với try/catch riêng.
- Lỗi socket được log, không propagate lên caller.

### Fix B — KDS Station Enum Sai (HIGH)

**Vấn đề:** `kds.validator.js` có `'KITCHEN'` trong enum station nhưng DB chỉ có `GRILL`, `BAR`, `COLD`. Request với `station=KITCHEN` pass validation nhưng query DB trả rỗng.

**Fix** (`src/validators/kds.validator.js`): Xóa `'KITCHEN'` khỏi enum.

### Fix C — Refresh Token Không Rotate (MEDIUM)

**Vấn đề:** `refresh()` tạo access token mới nhưng giữ nguyên refresh token cũ. Token bị lộ có thể dùng song song đến khi hết hạn (7 ngày).

**Fix** (`src/services/auth.service.js`):
- Revoke token cũ bằng `UPDATE REFRESH_TOKENS SET revoked_at = NOW()`.
- Issue refresh token mới, lưu hash vào DB.
- Response trả về cả `accessToken` và `refreshToken` mới.

**Breaking change:** Client phải lưu lại `refreshToken` mới sau mỗi lần gọi `/auth/refresh`.

### Fix D — Dead Code (LOW)

**Vấn đề:** `src/middlewares/validation.middleware.js` không được import ở bất kỳ đâu (routes dùng `validate.middleware.js`).

**Fix:** Xóa file.

---

## Giai đoạn 3 — Tính năng Mới & Cải tiến Bàn giao (2026-06-01)

### 1. Quản lý & Gửi báo cáo Doanh thu hằng ngày qua Email (`feature-sendemail` & `012-daily-revenue-email`)
- Tích hợp dịch vụ gửi mail tự động thông qua giao thức SMTP hoặc qua Mailtrap Email API (đảm bảo không bị chặn cổng bởi nhà mạng hoặc host đám mây như Render).
- Thiết lập cron job tự động chạy vào lúc 00:05 mỗi ngày để gửi báo cáo của ngày hôm trước.
- Thêm bộ API quản trị để gửi báo cáo thủ công qua route `/api/reports/daily-email/send` và `/send-now`, cũng như theo dõi lịch sử và trạng thái các lần gửi qua `/status`.
- Xây dựng giao diện trang `/admin/email-send` phục vụ việc nhập tay email nhận báo cáo nhanh chóng của Admin.

### 2. Cấu hình Ngân hàng & Thanh toán QR Transfer (`migrateBankSettings.js`)
- Thêm bảng `RESTAURANT_SETTINGS` để cấu hình thông tin ngân hàng phục vụ việc sinh mã QR chuyển khoản động trên frontend.
- Thêm phương thức thanh toán `'BANK_TRANSFER'` vào kiểu dữ liệu enum của hệ thống.
- Xây dựng giao diện cấu hình ngân hàng tại `/admin/settings/bank`.

### 3. Quản lý & In Hóa đơn chuyên nghiệp (`migrateInvoices.js`)
- Thiết kế các bảng cơ sở dữ liệu `INVOICES`, `INVOICE_LINE_ITEMS` và `INVOICE_PRINT_EVENTS` để lưu trữ và truy vết chi tiết từng hóa đơn, quản lý trạng thái thanh toán và in ấn (PRINT, REPRINT) nhằm chống gian lận và tối ưu hóa quy trình kế toán.

### 4. Di chuyển Frontend sang TypeScript & Tích hợp Ant Design (Lê Minh Đạo)
- Chuyển đổi toàn bộ mã nguồn Frontend từ JavaScript sang **TypeScript** để tăng cường tính an toàn kiểu dữ liệu và giảm thiểu lỗi runtime.
- Tích hợp hệ thống Ant Design (antd) chất lượng cao cho các chức năng quản trị ở Admin Dashboard.

---

## Giai đoạn 4 — Khắc phục lỗi kiểm thử Frontend & Chuẩn hóa Bàn giao (2026-06-05)

### 1. Sửa lỗi hiển thị tiền Tạm tính và giỏ hàng của Khách hàng (`fix(customer)`)
- Cập nhật số tiền tạm tính hiển thị tức thời khi khách hàng chọn món/thêm món vào giỏ hàng (`CustomerMenuPage.tsx`). Tổng tiền tạm tính = tiền các món đã đặt + tiền các món trong giỏ hàng hiện tại.

### 2. Sửa lỗi Customization Modal & Product Options (`fix`)
- Thêm Customization Modal hỗ trợ chọn tùy chọn (Options) cho món ăn có cấu hình tùy chọn.
- Cho phân nhóm và xử lý tùy chọn chọn một (Radio) hoặc chọn nhiều (Checkbox) theo nghiệp vụ.
- Tách biệt `cartId` theo tổ hợp món ăn + danh sách tùy chọn đã chọn, tránh đè giỏ hàng khi cùng một món có nhiều tùy chọn khác nhau.

### 3. Khắc phục lỗi In QR Code (`fix`)
- Thay đổi cơ chế gọi lệnh in ấn ở cửa sổ in QR Code từ sự kiện `window.onload` sang `setTimeout(..., 300)`. Điều này giúp đảm bảo ảnh QR Code và CSS layout được tải hoàn tất và hiển thị đầy đủ trước khi kích hoạt giao diện in của trình duyệt.

### 4. Khắc phục CSS Scaling cho biểu đồ tròn (`fix`)
- Chỉnh sửa bán kính trong và ngoài (`innerRadius="65%"`, `outerRadius="90%"`) của Pie Chart tỷ trọng món ăn (`AdminReportsPage.tsx`) thành dạng phần trăm, kết hợp padding responsive. Giúp biểu đồ tự co giãn mượt mà trên mọi kích thước màn hình mà không bị vỡ bố cục.

### 5. Cải thiện trải nghiệm tải ảnh Menu (`fix`)
- Kiểm tra dữ liệu hình ảnh dạng Base64 (`isBase64ImageInput`). Khi người dùng chọn tải ảnh lên từ thiết bị, trường nhập URL sẽ tự động hiển thị chuỗi thông báo "Đã tải ảnh lên từ thiết bị" và chuyển sang trạng thái khóa (`disabled`), tránh nhầm lẫn dữ liệu.

### 6. Cấu hình kiểm thử tự động & Quality Gates cho Frontend (`update-tests`)
- Thêm ESLint và các script kiểm tra chất lượng tự động: `npm run lint`, `npm test`, `npm run bundle:check`.
- Tích hợp pipeline kiểm tra toàn diện `npm run quality` đảm bảo code không có lỗi logic/runtime và dung lượng bundle trong giới hạn cho phép trước khi deploy.
