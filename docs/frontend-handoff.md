# Bàn Giao Frontend

URL cơ sở backend local:

```text
http://localhost:5000/api
```

Swagger:

```text
http://localhost:5000/api/docs
http://localhost:5000/api/docs.json
```

## Trạng Thái Backend

Đã kiểm tra trên Docker Compose:

- `backend`, `postgres`, `redis`: healthy.
- `npm test -- --detectOpenHandles`: 6 test suites passed, 27 tests passed.
- Luồng smoke test đã pass: đăng nhập admin/kitchen, quét QR, lấy session/menu, tạo order, KDS cập nhật item sang `PREPARING` -> `READY` -> `SERVED`, nhân viên thanh toán tiền mặt, admin reset quota.

Quy ước quan trọng:

- Tất cả ID trong DB là integer (`SERIAL`), không phải UUID.
- Response đăng nhập nhân viên dùng camelCase: `data.accessToken`, `data.refreshToken`.
- Request body refresh dùng snake_case: `{ "refresh_token": "..." }`.
- Quét QR khách hàng trả về `data.session_token`; sử dụng như `Authorization: Bearer <session_token>`.
- Gửi JSON dưới dạng UTF-8. Mã QR seed chứa tên bàn tiếng Việt.

## Tài Khoản Seed

Tất cả user seed đều dùng mật khẩu:

```text
Password123!
```

| Vai trò | Email |
|---|---|
| ADMIN | `admin@restaurant.com` |
| MANAGER | `manager@restaurant.com` |
| CASHIER | `cashier@restaurant.com` |
| KITCHEN | `kitchen@restaurant.com` |
| WAITER | `waiter@restaurant.com` |

## Ma Trận Vai Trò

| Khu vực | Xác thực | Vai trò |
|---|---|---|
| Auth login/refresh | không | tất cả tài khoản nhân viên |
| API khách hàng | session token | session khách hàng từ quét QR |
| KDS HTTP | staff access token | chỉ `KITCHEN` |
| Staff HTTP: tables/sessions/requests | staff access token | `WAITER`, `CASHIER`, `MANAGER`, `ADMIN` |
| Staff HTTP: checkout/cancel item | staff access token | `CASHIER`, `MANAGER`, `ADMIN` |
| Staff force close | staff access token | `MANAGER`, `ADMIN` |
| Admin operational HTTP: dashboard/reports/menu/tables/QR | staff access token | `MANAGER`, `ADMIN` |
| Admin user-management HTTP: users/roles | staff access token | `ADMIN` |
| Kitchen socket | staff access token | `ADMIN`, `KITCHEN` |
| Staff socket | staff access token | `ADMIN`, `CASHIER`, `MANAGER`, `WAITER` |
| Customer socket | session token trong `join_session` | chỉ session đang active của khách |

## Luồng Chính FE

Khách hàng:

1. `POST /customer/scan` với `{ "qr_code": "..." }`.
2. Lưu `session_token`.
3. `GET /customer/session` để đọc `id`, `version`, tổng tiền.
4. `GET /customer/menu?station=GRILL|BAR|COLD` hoặc `?category_id=1`.
5. `POST /customer/orders` với `session_version` mới nhất.
6. Lắng nghe trên `/customer`, emit `join_session` với cả `session_id` hiện tại và `session_token`.
7. Với VNPay, gọi `POST /customer/payment/vnpay`, chuyển hướng đến `payment_url` trả về, sau đó hiển thị trang kết quả trên URL return của frontend.

KDS:

1. Đăng nhập với tài khoản kitchen.
2. Kết nối socket `/kitchen` với `auth.token = accessToken`.
3. Emit `join_station` với `GRILL`, `BAR`, hoặc `COLD`.
4. Poll/load `GET /kds/orders?station=...`.
5. Cập nhật trạng thái item với `PATCH /kds/items/{id}/status`.

Nhân viên/Thu ngân:

1. Đăng nhập với waiter/cashier/manager/admin.
2. `GET /staff/tables`.
3. `GET /staff/tables/{id}/session` cho các bàn đang có khách.
4. `POST /staff/sessions/{id}/checkout` với `{ "amount": final_amount }` cho cashier/manager/admin.
5. `GET /staff/requests`, `PATCH /staff/requests/{id}/resolve`.
6. Tùy chọn: `PATCH /staff/orders/items/{id}/cancel` cho cashier/manager/admin.

Admin/Manager vận hành:

- Báo cáo: `/admin/reports/revenue`, `/admin/reports/menu`, `/admin/reports/kds`, `/admin/reports/export`.
- Reset quota: `POST /admin/menu/reset-quota`.
- CRUD tables/QR/menu qua `/admin/tables`, `/admin/qr_codes`, `/admin/menu/categories`, `/admin/menu/items`, `/admin/menu/options`.
- Manager sau đăng nhập vào `/admin/dashboard`, thấy dashboard/reports/menu/tables/QR, staff tables, và requests.
- Manager không thấy `/admin/users`; truy cập trực tiếp `/admin/users` phải bị từ chối hoặc chuyển về route phù hợp.

Admin-only:

- CRUD users qua `/admin/users` chỉ dành cho `ADMIN`.

## FE Phải Xử Lý

- Hết hạn token: access token có thời gian sống ngắn; gọi `/auth/refresh` và thay thế cả `accessToken` và `refreshToken`.
- Xung đột phiên bản session: `POST /customer/orders` có thể trả về `409`; FE nên fetch lại session và yêu cầu người dùng thử lại.
- Xung đột quét QR: bàn đang có khách trả về `409`.
- Lỗi quota order/item không khả dụng trả về `400`.
- Lỗi validation sử dụng:

```json
{
  "success": false,
  "message": "Du lieu khong hop le",
  "errors": [{ "field": "body.items.0.menu_item_id", "message": "..." }]
}
```

- `GET /customer/menu` chỉ chấp nhận station `GRILL`, `BAR`, `COLD`.
- Backend KDS cho phép nhảy trạng thái; FE nên hiển thị các nút bị ràng buộc (`PENDING -> PREPARING -> READY -> SERVED`) để tránh nhảy trạng thái ngoài ý muốn.
- Thanh toán tiền mặt chấp nhận `amount >= final_amount`; FE nên tính/hiển thị tiền thừa cục bộ nếu cần.

## Khoảng Trống / Rủi Ro Backend Đã Biết

Đây không phải là blocker cho phát triển FE, nhưng nên được theo dõi trước khi production:

- Hủy item của nhân viên hiện cho phép hủy rộng rãi; FE nên tránh hiển thị nút hủy cho các item đã served/cancelled cho đến khi backend thực thi chuyển đổi trạng thái.
- Xóa table/QR của admin có thể gặp ràng buộc FK nếu các bản ghi có session lịch sử. Ưu tiên UX toggle/deactivate nếu có thể.
- Các endpoint list của admin chưa hỗ trợ phân trang/tìm kiếm/sắp xếp; FE có thể bắt đầu với client-side cho quy mô seed/demo.
- Chưa có endpoint reset mật khẩu admin.
- VNPay vẫn nên được test end-to-end với cài đặt merchant sandbox thực tế.
- Một số docs/comments cũ vẫn chứa text mojibake; dựa vào tên endpoint, schema, và tài liệu bàn giao này cho chi tiết tích hợp.

## Kiểm Tra Lần Cuối

Ngày: 2026-05-13

Lệnh/kết quả:

```text
npm test -- --detectOpenHandles
Test Suites: 6 passed, 6 total
Tests:       27 passed, 27 total

docker compose ps
backend/postgres/redis healthy
```

## Backend Hardening Notes

- Do not send local env values to the frontend. Frontend config should use public frontend variables only.
- When opening a customer socket, pass both `session_id` and `session_token` in `join_session`; do not join arbitrary rooms by ID.
- Treat validation errors as the standard `{ success, message, errors }` response. VNPay webhook responses are the exception because they are provider-facing.
- Payment redirects use a unique backend-generated transaction reference. The frontend should treat it as opaque.
