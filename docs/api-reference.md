# API Reference

Base URL local:

```text
http://localhost:5000/api
```

Swagger UI khi chạy development:

```text
http://localhost:5000/api/docs
```

Swagger JSON:

```text
http://localhost:5000/api/docs.json
```

## Quy ước chung

Backend hiện dùng PostgreSQL `SERIAL`, nên các ID trong API là số nguyên, không phải UUID. Ví dụ: `session_id`, `menu_item_id`, `order_item_id`, `table_id`, `option_id`.

Response thành công:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

Response lỗi:

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "field": "body.qr_code", "message": "Invalid input: expected string, received undefined" }
  ]
}
```

## Auth

Staff dùng JWT access token:

```text
Authorization: Bearer <accessToken>
```

Customer dùng session token:

```text
Authorization: Bearer <session_token>
```

### Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/auth/login` | None | Đăng nhập nhân viên |
| `POST` | `/auth/refresh` | None | Lấy access token mới |
| `POST` | `/auth/logout` | Staff JWT | Revoke refresh token của user hiện tại |

Login request:

```json
{
  "email": "admin@restaurant.com",
  "password": "Password123!"
}
```

Refresh response trả về cả access token và refresh token mới (token cũ bị revoke):

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

Client phải lưu lại `refreshToken` mới sau mỗi lần gọi `/auth/refresh`.

Login response dùng key camelCase:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": 1,
      "full_name": "Nguyễn Admin",
      "role": "ADMIN"
    }
  }
}
```

## System

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/health` | None | Health check |

Response:

```json
{ "status": "UP", "message": "Hệ thống đang hoạt động" }
```

## Customer

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/customer/scan` | Rate limit | Quét QR để tạo session |
| `GET` | `/customer/session` | Session token | Lấy session hiện tại |
| `GET` | `/customer/menu` | Session token | Lấy menu, hỗ trợ query `station` hoặc `category_id` |
| `POST` | `/customer/orders` | Session token | Tạo order |
| `GET` | `/customer/orders` | Session token | Danh sách order của session |
| `POST` | `/customer/requests` | Session token | Gọi nhân viên hoặc xin thanh toán |
| `POST` | `/customer/payment/vnpay` | Session token | Tạo URL thanh toán VNPay |

Scan QR:

```json
{
  "qr_code": "QR-Bàn-01-ABC123"
}
```

Create order:

```json
{
  "session_version": 1,
  "items": [
    {
      "menu_item_id": 1,
      "quantity": 2,
      "note": "ít cay",
      "options": [
        { "option_id": 1, "quantity": 1 }
      ]
    }
  ]
}
```

Lưu ý:

- `session_version` lấy từ `GET /customer/session`.
- Backend kiểm tra optimistic locking theo `session_version`.
- Backend trừ `daily_quota` trong transaction.
- Option phải thuộc đúng `menu_item_id` và đang available.

Customer request:

```json
{
  "request_type": "CALL_STAFF"
}
```

Giá trị hợp lệ: `CALL_STAFF`, `REQUEST_BILL`, `OTHER`.

## KDS

KDS HTTP endpoints hiện chỉ cho role `KITCHEN`.

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/kds/orders?station=GRILL` | KITCHEN | Lấy queue theo station |
| `PATCH` | `/kds/items/:id/status` | KITCHEN | Cập nhật status item |

Station hợp lệ: `GRILL`, `BAR`, `COLD`.

Update item status:

```json
{
  "new_status": "READY"
}
```

Status hợp lệ: `PREPARING`, `READY`, `SERVED`.

## Staff

Staff endpoints cho role `CASHIER`, `MANAGER`, `ADMIN`.

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/staff/tables` | Staff JWT | Danh sách bàn |
| `GET` | `/staff/tables/:id/session` | Staff JWT | Session active của bàn |
| `POST` | `/staff/sessions/:id/checkout` | Staff JWT | Checkout tiền mặt |
| `GET` | `/staff/requests` | Staff JWT | Danh sách request đang OPEN |
| `PATCH` | `/staff/requests/:id/resolve` | Staff JWT | Resolve request |
| `PATCH` | `/staff/orders/items/:id/cancel` | Staff JWT | Hủy món |
| `POST` | `/staff/sessions/:id/force-close` | MANAGER/ADMIN | Đóng session khẩn cấp |

Checkout tiền mặt:

```json
{
  "amount": 129600
}
```

Backend chỉ cho checkout session `ACTIVE` và `amount >= final_amount`.

## Admin

Admin endpoints đã implement:

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/admin/reports/revenue?from=2026-05-01&to=2026-05-12&group_by=day` | ADMIN | Báo cáo doanh thu |
| `GET` | `/admin/reports/menu` | ADMIN | Báo cáo món bán |
| `GET` | `/admin/reports/kds` | ADMIN | Báo cáo KDS |
| `GET` | `/admin/reports/export` | ADMIN | Export Excel |
| `POST` | `/admin/menu/reset-quota` | ADMIN | Reset quota món |

Chưa implement route thật dù có mô tả trong Swagger comments cũ:

- `/admin/users`
- `/admin/tables`
- `/admin/menu/categories`
- `/admin/menu/items`
- `/admin/qr_codes`

Các route này hiện trả `404` nếu gọi trực tiếp.

## Webhooks

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET/POST` | `/webhooks/vnpay` | VNPay secure hash | Xử lý IPN VNPay |

Lưu ý còn lại: webhook hiện verify checksum và idempotency bằng Redis lock, nhưng chưa đối chiếu `vnp_Amount` với `PAYMENTS.amount`. Nên bổ sung trước production.

## Socket.IO

### `/customer`

Hiện chưa yêu cầu auth khi connect socket.

| Event | Chiều | Payload |
|---|---|---|
| `join_session` | Client -> Server | `{ "session_id": 1 }` |
| `order_status_updated` | Server -> Client | `{ "order_id": 1, "new_status": "READY", "changed_at": "..." }` |
| `session_closed` | Server -> Client | `{ "reason": "PAID" }` |

Rủi ro còn lại: client biết `session_id` có thể join room session khác. Nên xác thực bằng session token trước production.

### `/kitchen`

Yêu cầu access token role `ADMIN` hoặc `KITCHEN` khi kết nối socket. HTTP route `/api/kds` hiện chỉ cho `KITCHEN`.

```js
io('http://localhost:5000/kitchen', {
  auth: { token: accessToken }
});
```

### `/staff`

Yêu cầu access token role `ADMIN`, `CASHIER`, `MANAGER`, hoặc `WAITER`.

```js
io('http://localhost:5000/staff', {
  auth: { token: accessToken }
});
```
