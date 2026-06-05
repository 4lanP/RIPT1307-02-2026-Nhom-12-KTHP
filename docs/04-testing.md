# 04 - Testing

Backend dùng Jest với `testEnvironment: node`.

Chạy test:

```powershell
cd src/BE_THLTW
npm test
```

Kết quả hiện tại sau các sửa backend:

```text
Test Suites: 22 passed, 22 total
Tests:       175 passed, 175 total
```

Không còn test `.skip`.

## Test Files

| File | Phạm vi kiểm thử |
|---|---|
| `__tests__/auth.test.js` | Quy trình đăng nhập, xoay vòng (rotation) refresh token và đăng xuất của nhân viên. |
| `__tests__/order.test.js` | Luồng đặt món, transaction rollback, trừ daily quota món ăn đồng thời chống race conditions bằng optimistic locking. |
| `__tests__/session.test.js` | Kiểm tra quản lý phiên (session) quét mã QR khách hàng và mở/khóa bàn. |
| `__tests__/kds.test.js` | Kiểm tra luồng trạng thái món ăn trong bếp KDS (PENDING -> PREPARING -> READY -> SERVED). |
| `__tests__/vnpay.test.js` | Tích hợp VNPay, chữ ký HMAC bảo mật và chống trùng lặp webhook xử lý giao dịch. |
| `__tests__/validation.test.js` | Đảm bảo Zod validators chặn đứng các dữ liệu đầu vào không hợp lệ tại ranh giới của API. |
| `__tests__/manager-permissions.test.js` | Ma trận phân quyền kiểm soát vai trò của MANAGER, ADMIN, CASHIER, WAITER, và KITCHEN. |
| `__tests__/dish-image-upload.test.js` | Kiểm thử tải lên ảnh món ăn (dạng multipart file hoặc Base64), kiểm tra kích thước tối đa và phân quyền vai trò. |
| `__tests__/admin-report-sync.test.js` | Đảm bảo định dạng dữ liệu trả về của báo cáo doanh thu (`date`, `total`, `order_count`) và báo cáo món bán chạy (`name`, `total_quantity`). |
| `__tests__/admin-email-send.test.js` | Kiểm thử tích hợp gửi email báo cáo ngay lập tức và phân quyền gửi email của vai trò Admin. |
| `__tests__/daily-revenue-email.test.js` | Dịch vụ gửi email báo cáo doanh thu tự động qua SMTP/Mailtrap, xử lý lỗi cấu hình và chống trùng lặp báo cáo. |
| `__tests__/app-static.test.js` | Kiểm tra việc phục vụ tệp tĩnh (như uploads ảnh món ăn) và định tuyến trang Swagger UI. |
| `__tests__/auth-middleware.test.js` | Kiểm tra hoạt động của Middleware xác thực, bao gồm xác thực Token Staff và xác thực Session Token của khách hàng. |
| `__tests__/checkout-bank.test.js` | Luồng thanh toán tiền mặt/chuyển khoản ngân hàng (`BANK_TRANSFER`) của nhân viên, đối chiếu và đóng bàn. |
| `__tests__/error-response.test.js` | Đảm bảo cấu trúc phản hồi lỗi của hệ thống đồng bộ (`{ success, message, errors }`) ở các môi trường. |
| `__tests__/invoice.test.js` | Luồng quản lý hóa đơn (In hóa đơn mới, in đè hóa đơn bị thay đổi, in lại REPRINT, ghi vết audit trail chống thất thoát tài chính). |
| `__tests__/keepalive-bot.test.js` | Kiểm tra hoạt động của keepalive bot gọi định kỳ public health endpoint để chống Render spin down. |
| `__tests__/migration-history.test.js` | Kiểm tra tính toàn vẹn của lịch sử các migrations cơ sở dữ liệu. |
| `__tests__/secret-hygiene.test.js` | Kiểm tra an toàn bảo mật, đảm bảo không có file cấu hình nhạy cảm `.env` bị track trong Git. |
| `__tests__/socket-notification.test.js` | Đảm bảo server phát các sự kiện socket thông báo tới staff khi có bàn thay đổi trạng thái hoặc khách gọi hỗ trợ. |
| `__tests__/socket-session.test.js` | Xác thực và kết nối thời gian thực theo từng phiên cụ thể của khách hàng, phòng chống join bừa phòng. |
| `__tests__/staff-table-contract.test.js` | Đảm bảo cấu trúc dữ liệu trả về cho sơ đồ bàn ăn của nhân viên vận hành đồng bộ. |

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

## Frontend Quality Gate

Run the complete frontend handoff gate from `src/FE_THLTW`:

```powershell
cd src/FE_THLTW
npm run quality
```

The quality gate runs:

- `npm run lint` for frontend source lint validation;
- `npm test` for API wrapper, layout, contract fixture, and user-facing behavior checks;
- `npm run bundle:check` for a production build plus bundle warning validation.

Frontend tests must not require live backend services. Contract fixtures should
use the standard response envelope:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {}
}
```

For errors, tests should use safe categories and avoid secrets or raw provider
diagnostics:

```json
{
  "success": false,
  "message": "Operation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "category": "provider-timeout"
  }
}
```

Expected frontend coverage now includes:

- admin daily revenue email validation, duplicate-submit guard, success state,
  unavailable/configuration state, provider failure state, and authorization
  status messaging;
- HTTP envelope and safe error category fixture assertions;
- route lazy-loading and bundle policy assertions.

Before handoff, run:

```powershell
cd src/FE_THLTW
npm run lint
npm test
npm run build
npm run quality
```

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
2. Open admin menu, create or edit a dish, upload JPEG/PNG under 5 MB.
3. Confirm the preview appears, save the dish, refresh, and verify the Base64 `image_url` renders in admin and customer menu views.
4. Try missing Base64 data, text file/content, WebP, oversized file, mismatched MIME type, malformed image bytes, `CASHIER`, `WAITER`, `KITCHEN`, and no token; all must fail without changing the dish image.

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

## Daily Revenue Email Verification

Run focused daily revenue email tests:

```powershell
cd src/BE_THLTW
npm test -- --runInBand --forceExit daily-revenue-email.test.js
npm test -- --runInBand --forceExit admin-email-send.test.js
```

Expected coverage:

- `REPORT_EMAIL_ENABLED=false` skips scheduled delivery safely.
- Invalid enabled SMTP/recipient config reports `configuration-error` without exposing `SMTP_PASS`.
- Scheduled delivery sends the previous-day revenue summary with total revenue, transaction count, and payment-method breakdown.
- `POST /admin/reports/daily-email/send` works for `ADMIN`, rejects `MANAGER`, and rejects future `report_date` values.
- Provider failures return the unified error response and do not break existing report/payment workflows.
- `GET /admin/reports/daily-email/status` exposes state and recipient counts without leaking addresses or SMTP credentials.
- `POST /admin/reports/daily-email/send-now` sends to one entered email for `ADMIN`, trims/normalizes that email, rejects invalid email/future date/non-admin users before delivery, and does not mutate scheduled recipients.
- Frontend checks for the admin immediate-send page run through `cd src/FE_THLTW && npm test`, covering the API wrapper, ADMIN-only route/sidebar entry, loading state, validation state, unavailable/provider failure text, and duplicate-submit guard.

## Backend Hardening Test Scope

- Secret hygiene tests verify tracked files do not include local `.env` files and that `.env.example` contains placeholders only.
- Socket.IO tests verify `/customer` only joins a session room when `session_id` and a matching `session_token` are supplied and the session is active.
- Migration tests verify split historical migrations are no-ops and that payment transaction IDs are protected by a unique constraint.
- Validation/error tests verify invalid API input reaches the shared validation middleware and returns the standard error response shape.
