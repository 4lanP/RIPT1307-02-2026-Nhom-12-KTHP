# 04 - Testing

Backend dùng Jest với `testEnvironment: node`.

Chạy test:

```powershell
cd src/BE_THLTW
npm test
```

Kết quả hiện tại sau các sửa backend:

```text
Test Suites: 6 passed, 6 total
Tests:       27 passed, 27 total
```

Không còn test `.skip`.

## Test Files

| File | Phạm vi |
|---|---|
| `__tests__/auth.test.js` | Login, refresh token rotation, logout, lỗi auth |
| `__tests__/order.test.js` | Tạo order, quota check, item unavailable, option validation, transaction rollback, bill calculation |
| `__tests__/session.test.js` | QR scan (customer), table lock, checkout tiền mặt (staff), force close session |
| `__tests__/kds.test.js` | Cập nhật item status, order status transitions |
| `__tests__/vnpay.test.js` | Tạo payment URL, verify webhook signature, idempotency |
| `__tests__/validation.test.js` | Zod v4 validation, integer ID validators, enum validation, parsed data write-back to `req` |

## Test Helpers

| File | Mô tả |
|---|---|
| `__tests__/helpers/mockDb.js` | Mock PostgreSQL pool/client |
| `__tests__/helpers/mockSocket.js` | Mock Socket.IO instance |

`mockDb.js` dùng `mockReset()` trong `beforeEach` để tránh `mockResolvedValueOnce` rò giữa các test.

## Cấu hình Jest

Trong `package.json`:

```json
{
  "scripts": {
    "test": "jest --runInBand --forceExit"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.test.js"]
  }
}
```

`--runInBand` giúp mock DB/socket ổn định hơn vì test chạy tuần tự.

`--forceExit` đang dùng vì một số module runtime có thể mở handle DB/Redis/logger. Nếu muốn làm sạch hơn, chạy:

```powershell
npm test -- --detectOpenHandles
```

## Coverage nên bổ sung tiếp

- Integration tests chạy với PostgreSQL test container riêng.
- API tests cho route thật bằng `supertest`.
- Bo sung unit/integration test rieng cho VNPay webhook amount mismatch va Redis fallback.
- Socket.IO auth tests cho `/customer`, `/kitchen`, `/staff`.

## Backend Hardening Test Scope

- Secret hygiene tests verify tracked files do not include local `.env` files and that `.env.example` contains placeholders only.
- Socket.IO tests verify `/customer` only joins a session room when `session_id` and a matching `session_token` are supplied and the session is active.
- Migration tests verify split historical migrations are no-ops and that payment transaction IDs are protected by a unique constraint.
- Validation/error tests verify invalid API input reaches the shared validation middleware and returns the standard error response shape.
