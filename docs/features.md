# Features

Danh sách tính năng đã implement trong hệ thống quản lý nhà hàng.

## Authentication & Authorization

- [x] Đăng nhập — trả về access token (15m) + refresh token (7d)
- [x] Refresh access token với token rotation
- [x] Logout — invalidate refresh token
- [x] Role-based access control: `CUSTOMER`, `WAITER`, `CASHIER`, `KITCHEN`, `MANAGER`, `ADMIN`
- [x] JWT-based session tokens cho customer (24h expiry)

## Customer (Khách hàng)

- [x] Quét QR code để tạo session (JWT-based session token)
- [x] Xem menu theo station (GRILL/BAR/COLD) hoặc category
- [x] Đặt món với options và note
- [x] Theo dõi trạng thái đơn hàng real-time qua Socket.IO
- [x] Gọi nhân viên hoặc yêu cầu thanh toán
- [x] Tạo URL thanh toán VNPay
- [x] Frontend: React + Vite với customer scan và menu pages

## Staff (Nhân viên)

- [x] Xem danh sách bàn và trạng thái (AVAILABLE/OCCUPIED)
- [x] Xem chi tiết session của bàn
- [x] Xử lý yêu cầu khách hàng (gọi nhân viên, thanh toán)
- [x] Checkout tiền mặt (CASHIER/MANAGER/ADMIN)
- [x] Hủy món (CASHIER/MANAGER/ADMIN)
- [x] Force close session (MANAGER/ADMIN)
- [x] Nhận thông báo real-time qua Socket.IO
- [x] Frontend: Staff tables, table detail, requests pages

## KDS — Kitchen Display System (Bếp)

- [x] Hiển thị queue món theo station (GRILL/BAR/COLD)
- [x] Cập nhật trạng thái món: PENDING → PREPARING → READY → SERVED
- [x] Nhận đơn mới real-time qua Socket.IO namespace `/kitchen`
- [x] Phát sự kiện khi món sẵn sàng
- [x] Frontend: KDS page với realtime updates

## Admin & Manager

- [x] Dashboard với tổng quan hoạt động
- [x] Báo cáo doanh thu, menu, KDS performance
- [x] Export báo cáo Excel (exceljs)
- [x] CRUD users (ADMIN only)
- [x] CRUD tables, QR codes (MANAGER/ADMIN)
- [x] CRUD menu categories, items, options (MANAGER/ADMIN)
- [x] Reset daily quota (MANAGER/ADMIN)
- [x] Frontend: Admin dashboard, reports, users, tables, QR, menu pages

## Payment — VNPay

- [x] Tạo URL thanh toán VNPay
- [x] Xử lý webhook callback từ VNPay
- [x] Idempotency — tránh xử lý trùng giao dịch
- [x] Cập nhật trạng thái đơn sau thanh toán thành công

## Real-time (Socket.IO)

- [x] Customer namespace `/customer` — order updates, session closed
- [x] Kitchen namespace `/kitchen` — new orders by station
- [x] Staff namespace `/staff` — table status, customer requests
- [x] Socket authentication với JWT/session tokens
- [x] Room-based event routing

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
- [x] Jest test suite: 6 suites, 27 tests (auth, order, session, kds, vnpay, validation, manager-permissions)
- [x] Backend hardening: secret hygiene, socket auth, migration safety

## Frontend (React + Vite)

- [x] Customer: QR scan, menu browsing, ordering
- [x] Staff: Table management, session detail, request handling
- [x] KDS: Kitchen display with realtime updates
- [x] Admin: Dashboard, reports, users, tables, QR, menu management
- [x] Auth: Login, token refresh, protected routes
- [x] Socket.IO integration cho realtime updates
- [x] Tailwind CSS styling
- [x] React Router v6

## Chưa implement / Cần cải thiện

- [ ] Frontend: ESLint, tests, bundle optimization
- [ ] Frontend: Form validation, error handling improvements
- [ ] Frontend: API/socket contract alignment với backend
- [ ] CI/CD pipeline
- [ ] Reverse proxy (Nginx)
- [ ] Email notifications
- [ ] Push notifications
- [ ] Multi-language support
