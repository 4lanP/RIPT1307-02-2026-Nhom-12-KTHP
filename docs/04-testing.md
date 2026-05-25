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
| `__tests__/manager-permissions.test.js` | Role matrix for manager operational admin access, admin-only users, staff operations, and KDS HTTP denial |
| `__tests__/dish-image-upload.test.js` | Upload ảnh món, validate file, lưu storage, `image_url`, và role ADMIN/MANAGER |
| `__tests__/admin-report-sync.test.js` | Regression contract cho báo cáo admin: revenue `date`/`total`/`order_count`, menu `name`/`total_quantity`, empty result và SQL intent |

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

## Manager Permissions Verification Matrix

Run the focused backend authorization suite:

```powershell
cd src/BE_THLTW
npm test -- manager-permissions.test.js
```

Expected coverage:

| Role | Allowed checks | Denied checks |
|---|---|---|
| ADMIN | Admin operational endpoints, user-management endpoints | KDS HTTP unless explicitly changed |
| MANAGER | Admin operational endpoints, staff tables/requests, checkout/cancel/force-close | `/admin/users`, KDS HTTP |
| CASHIER | Staff tables/requests, checkout/cancel | Admin operational endpoints, user management, force-close, KDS HTTP |
| WAITER | Staff tables/requests | Checkout/cancel, admin operational endpoints, user management, KDS HTTP |
| KITCHEN | KDS HTTP endpoints | Staff/admin operational endpoints and user management |

Frontend validation remains `npm run build` in `src/FE_THLTW`, followed by
manual route checks for manager default routing, hidden user management, and
role-appropriate redirects on direct URLs.

## Dish Image Upload Verification

Run focused upload tests:

```powershell
cd src/BE_THLTW
npm test -- dish-image-upload.test.js
```

Run authorization regression after upload route changes:

```powershell
cd src/BE_THLTW
npm test -- manager-permissions.test.js
```

Manual checks:

1. Login as `ADMIN` or `MANAGER`.
2. Open admin menu, create or edit a dish, upload JPEG/PNG/WebP under 5 MB.
3. Confirm the preview appears, save the dish, and verify `image_url` renders in the menu.
4. Try missing file, text file, oversized file, malformed image bytes, `CASHIER`, `WAITER`, `KITCHEN`, and no token; all must fail without changing the dish image.

## Admin Report Sync Verification

Run focused report contract tests:

```powershell
cd src/BE_THLTW
npm test -- admin-report-sync.test.js
```

Run report validation and authorization regression together:

```powershell
cd src/BE_THLTW
npm test -- --runInBand --forceExit admin-report-sync.test.js validation.test.js manager-permissions.test.js
```

Expected coverage:

- Revenue report rows expose `date`, `method`, `total`, and `order_count`.
- Revenue calculations use completed payments within the selected inclusive date range.
- Menu report rows expose `name` and `total_quantity`.
- Menu calculations use served order items and return the top 20 by quantity.
- Empty revenue/menu datasets return empty arrays rather than undefined chart values.
- Admin report routes keep existing ADMIN/MANAGER access and reject non-operational roles.

## Backend Hardening Test Scope

- Secret hygiene tests verify tracked files do not include local `.env` files and that `.env.example` contains placeholders only.
- Socket.IO tests verify `/customer` only joins a session room when `session_id` and a matching `session_token` are supplied and the session is active.
- Migration tests verify split historical migrations are no-ops and that payment transaction IDs are protected by a unique constraint.
- Validation/error tests verify invalid API input reaches the shared validation middleware and returns the standard error response shape.
