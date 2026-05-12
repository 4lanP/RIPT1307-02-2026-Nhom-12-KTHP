# 04 - Testing

## Tổng quan

Backend sử dụng **Jest** với `testEnvironment: node`. Tests chạy tuần tự (`--runInBand`) để tránh race condition trên DB/Redis.

**Thư mục tests:** [src/BE_THLTW/__tests__/](../src/BE_THLTW/__tests__/)

## Chạy tests

```bash
cd src/BE_THLTW
npm test                    # chạy toàn bộ
npm test -- --coverage      # kèm coverage report
npm test -- auth.test.js    # chạy một file cụ thể
```

Coverage output: `src/BE_THLTW/coverage/`

## Test Files

| File | Phạm vi |
|---|---|
| `__tests__/auth.test.js` | Đăng ký, đăng nhập, refresh token, logout |
| `__tests__/order.test.js` | Tạo đơn, cập nhật trạng thái, lấy đơn |
| `__tests__/kds.test.js` | Queue bếp, xác nhận món |
| `__tests__/vnpay.test.js` | Tạo URL thanh toán, xử lý webhook |

## Test Helpers

| File | Mô tả |
|---|---|
| `__tests__/helpers/mockDb.js` | Mock PostgreSQL pool |
| `__tests__/helpers/mockSocket.js` | Mock Socket.IO instance |

## Cấu hình Jest

Trong `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.test.js"],
    "coverageDirectory": "coverage"
  },
  "scripts": {
    "test": "jest --runInBand --forceExit"
  }
}
```

`--runInBand` — chạy tuần tự, tránh conflict khi nhiều test cùng dùng DB mock.  
`--forceExit` — đảm bảo Jest thoát sau khi xong, tránh treo do open handles (Redis/DB connections).

## Lưu ý

- Frontend chưa implement nên chưa có E2E tests.
- Không có CI/CD pipeline — tests chạy thủ công.
- Nếu thêm integration tests thực với DB, cần setup test database riêng và chạy migrations trước.
