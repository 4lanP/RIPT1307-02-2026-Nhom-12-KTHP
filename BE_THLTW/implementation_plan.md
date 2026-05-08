# Thiết Kế Khung Backend — Hệ Thống Gọi Món QR & KDS

Tài liệu này trình bày thiết kế kiến trúc backend cho hệ thống gọi món nhà hàng qua mã QR tích hợp KDS (Kitchen Display System) theo thời gian thực. Hệ thống sử dụng Node.js, Express.js, Socket.io và PostgreSQL (với raw query qua `pg`).

## User Review Required

> [!IMPORTANT]
> - **Authentication Flow**: Xác nhận việc sử dụng `session_token` lưu ở phía client (Local Storage / Session Storage) cho luồng của khách hàng là phù hợp với Next.js frontend.
> - **Transaction Management**: Do không sử dụng ORM phức tạp, toàn bộ các luồng liên quan đến payment và đặt món sẽ dùng `BEGIN`, `COMMIT`, `ROLLBACK` qua `pg` pool client. Xin vui lòng kiểm tra thiết kế của `createOrder` và `calculateSessionBill`.
> - **VNPay Flow**: Webhook của VNPay thường gọi qua GET thay vì POST, hệ thống sẽ hỗ trợ cả hai cho endpoint `/api/webhooks/vnpay`.

---

## 1. Project Structure

Áp dụng mô hình Layered Architecture (Controller - Service - Data Access) để dễ dàng chia task cho nhóm 3 sinh viên và độc lập hóa logic.

```text
backend/
├── src/
│   ├── config/              # Cấu hình tĩnh
│   │   ├── db.js            # Khởi tạo PostgreSQL connection pool (pg)
│   │   └── vnpay.js         # Cấu hình tham số VNPay
│   │
│   ├── controllers/         # Xử lý Request/Response (Không chứa business logic)
│   │   ├── auth.controller.js
│   │   ├── customer.controller.js
│   │   ├── kds.controller.js
│   │   ├── staff.controller.js
│   │   ├── admin.controller.js
│   │   └── webhook.controller.js
│   │
│   ├── middlewares/         # Middleware pipeline
│   │   ├── auth.middleware.js       # authenticateStaff, authenticateSession
│   │   ├── validate.middleware.js   # Validate input/body
│   │   ├── rateLimit.middleware.js  # Chống spam scan QR
│   │   └── error.middleware.js      # Global error handler
│   │
│   ├── routes/              # Định nghĩa API Endpoints
│   │   ├── index.js         # Master router
│   │   ├── auth.routes.js
│   │   ├── customer.routes.js
│   │   ├── kds.routes.js
│   │   ├── staff.routes.js
│   │   ├── admin.routes.js
│   │   └── webhook.routes.js
│   │
│   ├── services/            # Business Logic & SQL Queries (Trọng tâm)
│   │   ├── session.service.js       # Logic QR, Session, Bill
│   │   ├── order.service.js         # Đặt món, optimistic locking, quota
│   │   ├── kds.service.js           # Logic hiển thị & cập nhật món ở bếp
│   │   ├── payment.service.js       # Logic VNPay, Cash checkout
│   │   └── report.service.js        # Thống kê, xuất Excel
│   │
│   ├── sockets/             # Socket.io Event Handlers  
│   │   ├── index.js         # Setup socket server & namespace + Auth middleware
│   │   ├── customer.socket.js
│   │   ├── kds.socket.js
│   │   └── staff.socket.js
│   │
│   ├── utils/               # Các hàm helper dùng chung
│   │   ├── jwt.util.js      # Sign/Verify JWT
│   │   ├── excel.util.js    # Xuất file Excel
│   │   ├── vnpay.util.js    # Hàm tạo URL và verify chữ ký HMAC
│   │   └── response.util.js # Chuẩn hóa format API trả về
│   │
│   ├── app.js               # Khởi tạo Express, cài đặt global middleware
│   └── server.js            # Entry point: Chạy HTTP Server, Cron jobs và gắn Socket.io
│
├── .env.example             # Template biến môi trường
├── package.json
└── README.md
```

### 1.1 Database Schema Updates & Indexing
- Bổ sung bảng `REFRESH_TOKENS` (id(UUID), user_id(FK->USERS), token, expires_at, created_at, revoked_at) để quản lý, revoke session khi cần thiết.
- Chạy các `CREATE INDEX` cho các cột thường xuyên query như `session_id`, `table_id`, `status` trên bảng `ORDERS` và `ORDER_ITEMS`.

---

## 2. API Endpoints Table

### System
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/health` | None | Health check endpoint cho Render (chống sleep và báo server UP). |

### Khách Hàng (Customer - Yêu cầu `authenticateSession`)
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/customer/scan` | Rate Limit | Gửi `qr_code`. Validate QR. Nếu bàn có session ACTIVE, kiểm tra IP/passcode hoặc từ chối tạo mới để tránh khách khác join vào bàn. Trả về `session_token`. |
| GET | `/api/customer/menu` | Session | Lấy menu. Hỗ trợ query `?station=...` hoặc `?category=...`. |
| GET | `/api/customer/session` | Session | Lấy thông tin SESSION hiện tại (subtotal, status). |
| POST | `/api/customer/orders` | Session | Đặt món. Payload: danh sách items & options. Trigger `createOrder()`. |
| GET | `/api/customer/orders` | Session | Lấy danh sách các đơn hàng và trạng thái trong session hiện tại. |
| POST | `/api/customer/requests` | Session | Tạo yêu cầu (Gọi nhân viên, Xin thanh toán). Emit socket `new_customer_request`. |
| POST | `/api/customer/payment/vnpay` | Session | Tạo link thanh toán VNPay cho SESSION hiện tại. |

### Auth & Nhân viên (Yêu cầu JWT)
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/login` | None | Đăng nhập bằng `email` + `password`. Sinh và lưu `refresh_token` vào DB, trả về JWT `access_token` và `refresh_token`. |
| POST | `/api/auth/refresh` | None | Kiểm tra `refresh_token` trong DB (còn hạn, chưa bị revoke) để lấy `access_token` mới. |
| POST | `/api/auth/logout` | JWT | Đánh dấu revoke `refresh_token` trong DB. |

### KDS (Kitchen Display - Yêu cầu `KITCHEN` role)
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/kds/orders` | KITCHEN | Lấy các ORDER_ITEMS trạng thái `PENDING`/`PREPARING` theo `station`. |
| PATCH | `/api/kds/items/:id/status`| KITCHEN | Cập nhật item status (`PREPARING` -> `READY`). Tự động check chuyển Order status. |

### Thu Ngân / Quản Lý Bàn (Staff - Yêu cầu `CASHIER`, `MANAGER`, `ADMIN`)
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/staff/tables` | Staff | Lấy danh sách trạng thái tất cả các bàn. |
| GET | `/api/staff/tables/:id/session`| Staff | Xem SESSION đang ACTIVE của một bàn (chi tiết bill, order items). |
| POST | `/api/staff/sessions/:id/checkout`| Staff | Thu tiền mặt, cập nhật PAYMENT, đóng SESSION, giải phóng bàn. |
| GET | `/api/staff/requests` | Staff | Lấy danh sách CUSTOMER_REQUESTS đang `OPEN`. |
| PATCH | `/api/staff/requests/:id/resolve`| Staff | Đánh dấu request là `RESOLVED`. |
| PATCH | `/api/staff/orders/items/:id/cancel`| Staff | Hủy món do hết nguyên liệu, trigger tính toán lại bill trong transaction. |

### Quản Trị (Admin - Yêu cầu `ADMIN` role)
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| CRUD | `/api/admin/users`, `tables`, `qr_codes`, `menu` | ADMIN | Các API tiêu chuẩn quản lý danh mục hệ thống. |
| POST | `/api/admin/menu/reset-quota`| ADMIN | Reset `daily_quota` = `daily_quota_default` cho tất cả menu items (kết hợp với Node-cron chạy lúc 00:00). |
| GET | `/api/admin/reports/revenue` | ADMIN | Thống kê doanh thu theo thời gian, phương thức thanh toán. |
| GET | `/api/admin/reports/menu` | ADMIN | Top món bán chạy (Order item status = SERVED). |
| GET | `/api/admin/reports/kds` | ADMIN | Đo lường thời gian chế biến (từ ORDER created -> READY). |
| GET | `/api/admin/reports/export` | ADMIN | Trả về stream file Excel tổng hợp Sessions & Payments. |

### Webhooks
| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET/POST| `/api/webhooks/vnpay` | VNPay | Nhận IPN từ VNPay, xác thực HMAC, cập nhật PAYMENT, đóng Session. |

---

## 3. Socket.io Events Table

| Namespace | Event Name | Chiều | Payload Mẫu | Trigger Khi Nào |
|---|---|---|---|---|
| `/customer` | `join_session` | Client -> Server | `{ session_id }` | Khách mở app, join vào room của session. |
| `/customer` | `order_status_updated` | Server -> Client | `{ order_id, new_status, changed_at }` | Bếp hoặc staff cập nhật trạng thái đơn hàng. |
| `/customer` | `session_closed` | Server -> Client | `{ session_id, reason: "PAID" }` | Khi thanh toán thành công (Cash/VNPay). |
| `/kitchen` | `join_station` | Client -> Server | `{ station: "GRILL" }` | Màn hình bếp kết nối, join room theo station. |
| `/kitchen` | `new_order` | Server -> Client | `{ order_id, table_name, items: [...] }` | Khách tạo order mới thành công. Kèm alert audio ở frontend. |
| `/kitchen` | `item_cancelled` | Server -> Client | `{ order_item_id, cancel_reason }` | Staff hủy món sau khi khách đặt. |
| `/staff` | `table_status_changed` | Server -> Client | `{ table_id, status: "OCCUPIED" }` | Bàn có khách scan QR hoặc khách đã thanh toán rời đi. |
| `/staff` | `new_customer_request` | Server -> Client | `{ request_id, table_name, request_type }` | Khách nhấn gọi nhân viên hoặc xin thanh toán. |

---

## 4. Middleware Stack

1. **Global Middleware:**
   - `helmet()`: Bảo mật HTTP headers.
   - `cors()`: Cấu hình origin cho Netlify (Next.js).
   - `express.json()` & `express.urlencoded()`: Parse body.
2. **Rate Limit:**
   - `scanRateLimiter`: Áp dụng cho `/api/customer/scan` (VD: 5 requests / phút / IP) chống brute-force bảng QR.
3. **Authentication & Authorization:**
   - `authenticateStaff`: Verify JWT Access Token -> Lấy `req.user`. Kiểm tra mảng role cho phép (VD: `['ADMIN', 'MANAGER']`).
   - `authenticateSession`: Kiểm tra `Authorization: Bearer <session_token>`, verify UUID, fetch DB kiểm tra `SESSION.status === 'ACTIVE'`, gán `req.session`.
4. **Socket.io Auth Middleware:**
   - Cài đặt xác thực qua `socket.handshake.auth.token`. Bắt buộc kiểm tra JWT đối với namespace `/kitchen` và `/staff` để ngăn client ngoài kết nối.
5. **Validation:**
   - Sử dụng thư viện như `Zod` hoặc `Joi` để bắt lỗi validate input ngay trước controller.
6. **Global Error Handler:**
   - `errorHandler`: Bắt toàn bộ lỗi từ `next(err)`. Phân loại lỗi (400, 401, 403, 404, 409) và trả về format JSON chuẩn, không lộ stack trace ra ngoài production.

---

## 5. Key Service Functions (Business Logic)

> Các hàm dưới đây thao tác trên DB qua `pg` pool với transaction quản lý cẩn thận.

```javascript
/**
 * Tạo đơn hàng mới trong một transaction an toàn.
 * Hỗ trợ Optimistic Locking & Daily Quota check.
 * 
 * @param {string} session_id 
 * @param {Array} items - [{ menu_item_id, quantity, note, options: [{option_id, qty}] }]
 * @param {number} session_version - Dùng cho optimistic locking
 */
async function createOrder(session_id, items, session_version) {
  // 1. Get pg transaction client: const client = await pool.connect()
  // 2. BEGIN TRANSACTION
  // 3. Lấy & lock SESSION: SELECT ... FROM sessions WHERE id = $1 AND version = $2 FOR UPDATE
  //    -> Nếu không có -> THROW 409 Conflict (version mismatch hoặc session closed)
  // 4. Với mỗi item: 
  //    - Lấy MENU_ITEMS hiện tại. Kiểm tra `is_available = true` và `daily_quota >= quantity`.
  //    - Trừ daily_quota.
  // 5. Tạo bản ghi ORDERS mới (status = PENDING).
  // 6. Bulk insert ORDER_ITEMS và ORDER_ITEM_OPTIONS.
  // 7. await calculateSessionBill(session_id, client); // TRUYỀN CLIENT ĐỂ NẰM TRONG TRANSACTION
  // 8. Cập nhật SESSION version = version + 1.
  // 9. COMMIT TRANSACTION
  // 10. Bắn sự kiện socket `new_order` tới namespace `/kitchen` (chia theo station).
}

/**
 * Tạo yêu cầu gọi phục vụ / thanh toán.
 */
async function createCustomerRequest(session_id, request_type) {
  // 1. Insert bản ghi vào bảng CUSTOMER_REQUESTS
  // 2. Lấy thông tin table_name tương ứng với session
  // 3. Bắn event socket `new_customer_request` tới namespace `/staff`
  //    io.of('/staff').emit('new_customer_request', { request_id, table_name, request_type })
}

/**
 * Cập nhật trạng thái một Order Item và tự động tính toán trạng thái Order tổng.
 */
async function updateOrderItemStatus(order_item_id, new_status, user_id) {
  // 1. UPDATE order_items SET status = new_status WHERE id = $1 RETURNING order_id
  // 2. Kiểm tra tất cả các items của order_id đó:
  //    - Nếu TẤT CẢ items đều = READY hoặc SERVED hoặc CANCELLED -> update ORDERS status = READY/SERVED.
  // 3. Nếu ORDER status thay đổi -> ghi log vào ORDER_STATUS_LOGS.
  // 4. Bắn sự kiện socket `order_status_updated` tới `/customer`.
}

/**
 * Xử lý IPN Webhook từ VNPay (Idempotent).
 */
async function processVNPayWebhook(queryData) {
  // 1. Verify chữ ký HMAC (vnp_SecureHash) bằng VNPAY_HASHSECRET. Nếu sai -> THROW.
  // 2. Trích xuất transaction_id (vnp_TxnRef), mã phản hồi (vnp_ResponseCode).
  // 3. SELECT * FROM PAYMENTS WHERE transaction_id = vnp_TxnRef
  // 4. Kiểm tra Idempotent: Nếu PAYMENT.status đã là COMPLETED hoặc FAILED -> return OK (tránh xử lý lặp).
  // 5. Nếu vnp_ResponseCode == '00':
  //    - Get pg client & BEGIN TRANSACTION
  //    - Cập nhật PAYMENT.status = 'COMPLETED', paid_at = NOW()
  //    - Cập nhật SESSION.status = 'CLOSED', ended_at = NOW()
  //    - Giải phóng bàn: UPDATE TABLES SET status = 'AVAILABLE'
  //    - COMMIT TRANSACTION
  //    - Emit socket `table_freed` lên `/staff` & `session_closed` lên `/customer`
  // 6. Trả về mã thành công cho VNPay theo tài liệu (RspCode: '00').
}

/**
 * Tính toán và cập nhật lại subtotal của Session (Bill Aggregation).
 * Được gọi khi: Khách tạo Order, hoặc Staff hủy một món (CANCELLED).
 * @param {object} client - pg transaction client
 */
async function calculateSessionBill(session_id, client) {
  // 1. JOIN order_items, menu_items, order_item_options sử dụng `client.query`
  // 2. Tính tổng tiền: SUM(quantity * unit_price + option_extra_price)
  //    Điều kiện: ORDER_ITEMS.status != 'CANCELLED'
  // 3. Cập nhật subtotal, tính tax_amount, tính discount (nếu có), tính final_amount vào SESSIONS.
}
```

---

## 6. Environment Variables (`.env.example`)

```env
# Server
PORT=5000
NODE_ENV=development # development | production

# Database (PostgreSQL)
DATABASE_URL=postgres://user:pass@host:port/dbname?sslmode=require

# Authentication
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_REFRESH_EXPIRES_IN=7d

# VNPay Config
VNPAY_TMNCODE=your_tmn_code
VNPAY_HASHSECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-frontend-domain.com/payment-result

# Frontend Origin (Cho CORS)
FRONTEND_URL=https://your-nextjs-app.netlify.app
```

---

## 7. Ghi Chú Triển Khai (Deployment trên Render.com)

1. **Cold Start & Connection Pooling**: 
   Vì dùng Render Free Tier, máy chủ sẽ bị sleep nếu không có request sau 15p. Do đó, PostgreSQL connection pool (`pg`) cần cấu hình cẩn thận (set `idleTimeoutMillis` và `connectionTimeoutMillis` hợp lý) để tránh rớt connection khi app thức dậy.
2. **Stateless WebSockets**: 
   Không lưu bất kỳ state nào trong memory của Node.js server. Danh sách "bàn đang mở" phải lấy từ database. Điều này giúp hệ thống chịu lỗi khi Render restart server.
3. **Health Check Endpoint**: 
   Cần tạo một endpoint GET `/api/health` trả về 200 OK. Render sẽ sử dụng endpoint này để biết app đã khởi động xong. Hữu ích để chống sleep bằng cronjob gọi health check 14 phút/lần.
4. **Timezone & Cron Jobs**: 
   Cấu hình cơ sở dữ liệu và app server sử dụng UTC hoặc timezone chuẩn xác (Asia/Ho_Chi_Minh) để lưu ngày tháng cho đúng. Các Node-cron job (như reset daily_quota lúc nửa đêm) cần set đúng timezone.
5. **Database Indexing**:
   Hãy đảm bảo chạy đầy đủ lệnh `CREATE INDEX` cho các trường frequently-searched để tăng tốc xử lý concurrent requests.
