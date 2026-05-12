# 01 - System Design

## Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────┐
│                    Client Layer                      │
│   Customer App │ Staff App │ KDS Screen │ Admin UI  │
└────────────────────────┬────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────┐
│                  Express 5 API Server                │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │  Routes  │  │Middleware│  │   Socket.IO Server  │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
│  ┌──────────────────────────────────────────────┐   │
│  │              Service Layer                    │   │
│  │  auth │ order │ payment │ kds │ report │ session│ │
│  └──────────────────────────────────────────────┘   │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
┌──────────▼──────────┐  ┌────────────▼──────────────┐
│    PostgreSQL 16     │  │          Redis             │
│  (persistent data)  │  │  (sessions, cache, pub/sub)│
└─────────────────────┘  └───────────────────────────┘
           │
┌──────────▼──────────┐
│    VNPay Gateway    │
│  (payment webhook)  │
└─────────────────────┘
```

## Roles & Luồng người dùng

| Role | Quyền truy cập |
|---|---|
| `customer` | Xem menu, đặt món, theo dõi đơn, thanh toán |
| `staff` | Xem đơn hàng, cập nhật trạng thái, quản lý bàn |
| `kds` | Màn hình bếp — nhận và xác nhận món |
| `admin` | Quản lý toàn bộ, xem báo cáo, export Excel |

## Database Schema (tóm tắt)

Schema đầy đủ tại [src/BE_THLTW/src/config/schema.sql](../src/BE_THLTW/src/config/schema.sql).

Các bảng chính:

| Bảng | Mô tả |
|---|---|
| `users` | Tài khoản người dùng, role, refresh token |
| `tables` | Bàn nhà hàng, trạng thái |
| `menu_items` | Món ăn, giá, danh mục, trạng thái |
| `orders` | Đơn hàng, liên kết bàn và khách |
| `order_items` | Chi tiết món trong đơn |
| `payments` | Giao dịch thanh toán, trạng thái VNPay |
| `sessions` | Phiên làm việc của khách tại bàn |

## API Routes

| Prefix | Module | Mô tả |
|---|---|---|
| `/api/auth` | auth.routes.js | Đăng nhập, đăng ký, refresh token, logout |
| `/api/customer` | customer.routes.js | Menu, đặt món, theo dõi đơn, thanh toán |
| `/api/staff` | staff.routes.js | Quản lý đơn, bàn, trạng thái |
| `/api/kds` | kds.routes.js | Màn hình bếp, xác nhận món |
| `/api/admin` | admin.routes.js | Báo cáo, quản lý user, export |
| `/api/webhook` | webhook.routes.js | VNPay payment callback |
| `/api/health` | — | Health check endpoint |
| `/api/docs` | Swagger UI | API documentation (dev only) |

## Real-time Events (Socket.IO)

| Event | Hướng | Mô tả |
|---|---|---|
| `order:new` | Server → KDS | Đơn mới vào bếp |
| `order:item_ready` | KDS → Server → Staff | Món đã sẵn sàng |
| `order:status_update` | Server → Customer | Cập nhật trạng thái đơn |
| `table:status_update` | Server → Staff | Trạng thái bàn thay đổi |

## Bảo mật

- JWT access token (15 phút) + refresh token (7 ngày)
- Helmet — HTTP security headers
- CORS — whitelist origin
- Rate limiting — giới hạn request theo IP
- Zod — validate toàn bộ input tại boundary
- bcrypt — hash password
- VNPay webhook idempotency — tránh xử lý trùng

## Scheduled Jobs

- **Daily quota reset** — chạy lúc 00:00 Asia/Ho_Chi_Minh, reset quota hàng ngày (node-cron)
