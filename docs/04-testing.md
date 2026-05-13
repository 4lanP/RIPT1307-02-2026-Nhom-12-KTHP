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
| `__tests__/auth.test.js` | Login, refresh token, lỗi auth |
| `__tests__/order.test.js` | Tạo order, quota, item unavailable, option không hợp lệ, rollback, bill |
| `__tests__/session.test.js` | Scan lock bàn, checkout tiền mặt, session đã đóng |
| `__tests__/kds.test.js` | Cập nhật status item và order status |
| `__tests__/vnpay.test.js` | Tạo URL VNPay và verify IPN signature |
| `__tests__/validation.test.js` | Zod v4 validation, integer ID validators, parsed data write-back to `req` |

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
