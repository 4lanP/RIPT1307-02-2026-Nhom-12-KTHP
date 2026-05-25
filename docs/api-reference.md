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

Staff HTTP access:

- `WAITER`, `CASHIER`, `MANAGER`, `ADMIN`: table/session lookup and customer request handling.
- `CASHIER`, `MANAGER`, `ADMIN`: cash checkout and order item cancellation.
- `MANAGER`, `ADMIN`: force-close session.

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
| `GET` | `/admin/reports/revenue?from=2026-05-01&to=2026-05-12&group_by=day` | ADMIN/MANAGER | Báo cáo doanh thu |
| `GET` | `/admin/reports/menu` | ADMIN/MANAGER | Báo cáo món bán |
| `GET` | `/admin/reports/kds` | ADMIN/MANAGER | Báo cáo KDS |
| `GET` | `/admin/reports/export` | ADMIN/MANAGER | Export Excel vận hành |
| `POST` | `/admin/menu/reset-quota` | ADMIN/MANAGER | Reset quota món |

Revenue report response data:

```json
[
  {
    "date": "2026-05-24T00:00:00.000Z",
    "method": "CASH",
    "total": "450000",
    "order_count": "9"
  }
]
```

Menu report response data:

```json
[
  {
    "name": "Ca phe sua da",
    "total_quantity": "32"
  }
]
```

Contract notes:

- `/admin/reports/revenue` supports `group_by=day|week|month` and requires `from`/`to` as `YYYY-MM-DD`.
- Revenue rows use `date`, `total`, and `order_count`; old aliases such as `period` and `total_amount` are not part of the admin chart contract.
- `/admin/reports/menu` returns top served menu items using `name` and `total_quantity`; old aliases such as `total_sold` are not part of the admin chart contract.

Admin CRUD endpoints:

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET/POST` | `/admin/users` | ADMIN | Danh sách / tạo nhân viên |
| `PUT/DELETE` | `/admin/users/{id}` | ADMIN | Cập nhật / vô hiệu hóa nhân viên |
| `GET/POST` | `/admin/tables` | ADMIN/MANAGER | Danh sách / tạo bàn |
| `PUT/DELETE` | `/admin/tables/{id}` | ADMIN/MANAGER | Cập nhật / xóa bàn khả dụng |
| `GET/POST` | `/admin/qr_codes` | ADMIN/MANAGER | Danh sách / tạo QR |
| `PATCH/DELETE` | `/admin/qr_codes/{id}/toggle`, `/admin/qr_codes/{id}` | ADMIN/MANAGER | Bật/tắt / xóa QR |
| `GET/POST` | `/admin/menu/categories` | ADMIN/MANAGER | Danh sách / tạo category |
| `PUT/DELETE` | `/admin/menu/categories/{id}` | ADMIN/MANAGER | Cập nhật / vô hiệu hóa category |
| `POST` | `/admin/menu/images` | ADMIN/MANAGER | Upload ảnh món, trả về URL và object key |
| `GET/POST` | `/admin/menu/items` | ADMIN/MANAGER | Danh sách / tạo món |
| `PUT/DELETE` | `/admin/menu/items/{id}` | ADMIN/MANAGER | Cập nhật / vô hiệu hóa món |
| `GET/POST` | `/admin/menu/items/{id}/options` | ADMIN/MANAGER | Danh sách / tạo option |
| `PUT/DELETE` | `/admin/menu/options/{id}` | ADMIN/MANAGER | Cập nhật / vô hiệu hóa option |

Upload ảnh món:

```text
POST /api/admin/menu/images
Content-Type: multipart/form-data
Authorization: Bearer <accessToken>
```

Form field:

| Field | Type | Bắt buộc | Ghi chú |
|---|---|---|---|
| `image` | File | Có | JPEG, PNG, hoặc WebP; mặc định tối đa 5 MB |

Response thành công:

```json
{
  "success": true,
  "message": "Upload dish image successfully",
  "data": {
    "url": "http://localhost:5000/uploads/dish-images/menu-items/2026/05/object-key.png",
    "object_key": "menu-items/2026/05/object-key.png",
    "mime_type": "image/png",
    "size_bytes": 245120
  }
}
```

Frontend lưu `data.url` vào `image_url` khi tạo hoặc cập nhật món. Backend
reject file thiếu, quá dung lượng, không đúng loại, hoặc nội dung ảnh không
hợp lệ bằng response lỗi chuẩn.

Manager được phép dùng các endpoint vận hành phía trên nhưng luôn nhận `403`
ở user-management (`/admin/users`) và không được truy cập dữ liệu tài khoản,
role, security config, hoặc secret.

## Webhooks

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET/POST` | `/webhooks/vnpay` | VNPay secure hash | Xử lý IPN VNPay |

Luu y: webhook verify checksum, dung Redis lock de idempotency, va doi chieu `vnp_Amount` voi `PAYMENTS.amount` truoc khi dong session.

## Socket.IO

### `/customer`

Hiện chưa yêu cầu auth khi connect socket.

| Event | Chiều | Payload |
|---|---|---|
| `join_session` | Client -> Server | `{ "session_id": 1, "session_token": "<session_token>" }` |
| `order_status_updated` | Server -> Client | `{ "order_id": 1, "new_status": "READY", "changed_at": "..." }` |
| `session_closed` | Server -> Client | `{ "reason": "PAID" }` |

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

## Error Response Shape

All validation and application errors should use the shared JSON shape:

```json
{
  "success": false,
  "message": "Human readable error",
  "errors": []
}
```

Provider-specific callbacks such as VNPay IPN still return the provider contract (`RspCode` and `Message`) so the payment provider can interpret the result.

## Customer Socket Session Join

The `/customer` namespace requires an explicit `join_session` event after connection:

```js
socket.emit('join_session', {
  session_id: activeSessionId,
  session_token: sessionToken
});
```

The backend verifies that the token is a session token, that it belongs to the requested session, and that the session is still active before joining the room.
