# API Reference

Tài liệu đầy đủ các API endpoints và Socket.IO events.

Swagger UI (dev): http://localhost:5000/api/docs  
Postman collection: [src/BE_THLTW/postman_collection.json](../src/BE_THLTW/postman_collection.json)

---

## Authentication

Có 2 loại auth:

**Staff** — JWT Bearer token:
```
Authorization: Bearer <access_token>
```

**Customer** — Session token (JWT, 24h):
```
Authorization: Bearer <session_token>
```

---

## System

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/health` | None | Health check — trả về `{ status: "UP" }` |

---

## Auth (`/api/auth`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | None | Đăng nhập — trả về `access_token` (15m) + `refresh_token` (7d) |
| POST | `/api/auth/refresh` | None | Lấy `access_token` mới từ `refresh_token` |
| POST | `/api/auth/logout` | JWT | Revoke `refresh_token` |

**Login request:**
```json
{ "email": "admin@restaurant.com", "password": "Password123!" }
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ..."
  }
}
```

---

## Customer (`/api/customer`) — Yêu cầu Session Token

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/customer/scan` | Rate Limit | Quét QR bàn — trả về `session_token` |
| GET | `/api/customer/menu` | Session | Lấy menu. Query: `?category=GRILL` hoặc `?station=...` |
| GET | `/api/customer/session` | Session | Thông tin session hiện tại (subtotal, status) |
| POST | `/api/customer/orders` | Session | Đặt món |
| GET | `/api/customer/orders` | Session | Danh sách đơn hàng trong session |
| POST | `/api/customer/requests` | Session | Gọi nhân viên hoặc xin thanh toán |
| POST | `/api/customer/payment/vnpay` | Session | Tạo link thanh toán VNPay |

**Scan QR:**
```json
POST /api/customer/scan
{ "qr_code": "QR-Bàn-01" }
→ { "session_token": "eyJ..." }
```

**Đặt món:**
```json
POST /api/customer/orders
{
  "items": [
    { "menu_item_id": "uuid", "quantity": 2, "note": "ít cay" }
  ]
}
```

**Gọi nhân viên:**
```json
POST /api/customer/requests
{ "request_type": "CALL_STAFF" }  // hoặc "REQUEST_BILL"
```

---

## KDS — Kitchen Display (`/api/kds`) — Yêu cầu role KITCHEN

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/kds/orders` | KITCHEN | Lấy ORDER_ITEMS trạng thái PENDING/PREPARING theo station |
| PATCH | `/api/kds/items/:id/status` | KITCHEN | Cập nhật item status (PREPARING → READY) |

---

## Staff (`/api/staff`) — Yêu cầu role CASHIER/MANAGER/ADMIN

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/staff/tables` | Staff | Danh sách trạng thái tất cả bàn |
| GET | `/api/staff/tables/:id/session` | Staff | Chi tiết session đang ACTIVE của bàn |
| POST | `/api/staff/sessions/:id/checkout` | Staff | Thu tiền mặt, đóng session, giải phóng bàn |
| GET | `/api/staff/requests` | Staff | Danh sách CUSTOMER_REQUESTS đang OPEN |
| PATCH | `/api/staff/requests/:id/resolve` | Staff | Đánh dấu request là RESOLVED |
| PATCH | `/api/staff/orders/items/:id/cancel` | Staff | Hủy món (hết nguyên liệu), tính lại bill |

---

## Admin (`/api/admin`) — Yêu cầu role ADMIN

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| CRUD | `/api/admin/users` | ADMIN | Quản lý tài khoản nhân viên |
| CRUD | `/api/admin/tables` | ADMIN | Quản lý bàn |
| CRUD | `/api/admin/menu` | ADMIN | Quản lý menu items |
| CRUD | `/api/admin/qr_codes` | ADMIN | Quản lý mã QR |
| POST | `/api/admin/menu/reset-quota` | ADMIN | Reset daily_quota cho tất cả món |
| GET | `/api/admin/reports/revenue` | ADMIN | Thống kê doanh thu theo thời gian |
| GET | `/api/admin/reports/menu` | ADMIN | Top món bán chạy |
| GET | `/api/admin/reports/kds` | ADMIN | Thời gian chế biến trung bình |
| GET | `/api/admin/reports/export` | ADMIN | Export Excel tổng hợp |

---

## Webhooks

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET/POST | `/api/webhooks/vnpay` | VNPay HMAC | Nhận IPN từ VNPay, verify HMAC, cập nhật payment |

---

## Error Response Format

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "field": "body.email", "message": "Email không hợp lệ" }
  ]
}
```

| HTTP Status | Ý nghĩa |
|---|---|
| 400 | Validation error, bad request |
| 401 | Chưa xác thực (token thiếu/hết hạn) |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 409 | Conflict (quota hết, session version mismatch) |
| 500 | Server error |

---

## Socket.IO Events

### Namespace `/customer` — Không cần auth

| Event | Chiều | Payload | Trigger |
|---|---|---|---|
| `join_session` | Client → Server | `{ session_id }` | Khách mở app, join room session |
| `order_status_updated` | Server → Client | `{ order_id, new_status, changed_at }` | Bếp/staff cập nhật trạng thái đơn |
| `session_closed` | Server → Client | `{ session_id, reason: "PAID" }` | Thanh toán thành công |

### Namespace `/kitchen` — Yêu cầu role ADMIN hoặc KITCHEN

```javascript
// Client kết nối
const socket = io('http://localhost:5000/kitchen', {
  auth: { token: accessToken }
});
```

| Event | Chiều | Payload | Trigger |
|---|---|---|---|
| `join_station` | Client → Server | `{ station: "GRILL" }` | Màn hình bếp join room theo station |
| `new_order` | Server → Client | `{ order_id, table_name, items: [...] }` | Khách tạo order mới |
| `item_cancelled` | Server → Client | `{ order_item_id, cancel_reason }` | Staff hủy món |

### Namespace `/staff` — Yêu cầu role ADMIN hoặc STAFF

```javascript
const socket = io('http://localhost:5000/staff', {
  auth: { token: accessToken }
});
```

| Event | Chiều | Payload | Trigger |
|---|---|---|---|
| `table_status_changed` | Server → Client | `{ table_id, status: "OCCUPIED" }` | Khách scan QR hoặc thanh toán xong |
| `new_customer_request` | Server → Client | `{ request_id, table_name, request_type }` | Khách gọi nhân viên/xin thanh toán |

### Namespace `/customer` — Không cần auth

Không cần token khi kết nối, nhưng cần gọi `join_session` để nhận events của session cụ thể.
