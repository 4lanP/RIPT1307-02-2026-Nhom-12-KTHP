# Features

Danh sách tính năng đã implement trong hệ thống quản lý nhà hàng.

## Authentication & Authorization

- [x] Đăng ký tài khoản (bcrypt hash password)
- [x] Đăng nhập — trả về access token (15m) + refresh token (7d)
- [x] Refresh access token
- [x] Logout — invalidate refresh token
- [x] Role-based access control: `customer`, `staff`, `kds`, `admin`

## Customer (Khách hàng)

- [x] Xem menu (danh sách món, giá, danh mục, trạng thái)
- [x] Đặt món — tạo đơn hàng mới
- [x] Theo dõi trạng thái đơn hàng real-time
- [x] Thanh toán qua VNPay — nhận URL redirect
- [x] Xem lịch sử đơn hàng

## Staff (Nhân viên)

- [x] Xem danh sách đơn hàng theo bàn
- [x] Cập nhật trạng thái đơn hàng
- [x] Quản lý trạng thái bàn (trống / có khách / đang dọn)
- [x] Nhận thông báo real-time khi có đơn mới hoặc món sẵn sàng

## KDS — Kitchen Display System (Bếp)

- [x] Hiển thị queue món cần chế biến
- [x] Xác nhận từng món đã hoàn thành
- [x] Nhận đơn mới real-time qua Socket.IO
- [x] Phát sự kiện `order:item_ready` khi món xong

## Admin

- [x] Xem báo cáo doanh thu (theo ngày / tuần / tháng)
- [x] Export báo cáo ra file Excel (exceljs)
- [x] Quản lý người dùng
- [x] Xem tổng quan hoạt động nhà hàng

## Payment — VNPay

- [x] Tạo URL thanh toán VNPay
- [x] Xử lý webhook callback từ VNPay
- [x] Idempotency — tránh xử lý trùng giao dịch
- [x] Cập nhật trạng thái đơn sau thanh toán thành công

## Real-time (Socket.IO)

- [x] Đơn mới → KDS
- [x] Món sẵn sàng → Staff
- [x] Cập nhật trạng thái đơn → Customer
- [x] Cập nhật trạng thái bàn → Staff

## Infrastructure & DevOps

- [x] Docker multi-stage build
- [x] Docker Compose (postgres, seeder, indexer, backend)
- [x] Health check endpoint `/api/health`
- [x] DB migrations
- [x] DB seed data
- [x] Daily quota reset (node-cron, 00:00 Asia/Ho_Chi_Minh)

## Developer Experience

- [x] Swagger UI tại `/api/docs` (dev only)
- [x] Postman collection
- [x] Structured logging (Winston)
- [x] Request ID tracking
- [x] Environment validation on startup
- [x] Jest test suite (auth, order, kds, vnpay)

## Chưa implement

- [ ] Frontend (React / Vue / Next.js)
- [ ] CI/CD pipeline
- [ ] Reverse proxy (Nginx)
- [ ] Email notifications
- [ ] Push notifications
- [ ] Multi-language support
