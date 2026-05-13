# 🍽️ KTHP-LTW — Hệ thống Quản lý Nhà hàng

> Đồ án môn Lập trình Web — Hệ thống quản lý nhà hàng full-stack với đặt món QR, Kitchen Display System (KDS), thanh toán VNPay, và báo cáo quản trị.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Express](https://img.shields.io/badge/Express-5.2-lightgrey.svg)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)

## 📋 Tổng quan

Hệ thống quản lý nhà hàng hiện đại với các tính năng:

- **🔐 Xác thực & Phân quyền**: JWT-based authentication với 4 roles (Customer, Staff, KDS, Admin)
- **📱 Đặt món QR**: Khách quét mã QR tại bàn để xem menu và đặt món
- **👨‍🍳 Kitchen Display System**: Màn hình bếp hiển thị queue món cần chế biến
- **💳 Thanh toán VNPay**: Tích hợp cổng thanh toán VNPay với webhook idempotency
- **📊 Báo cáo & Thống kê**: Dashboard admin với export Excel
- **⚡ Real-time Updates**: Socket.IO cho cập nhật trạng thái đơn hàng, bàn, và món ăn

## 🏗️ Kiến trúc

```text
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

## 🛠️ Tech Stack

| Layer | Công nghệ |
| ----- | --------- |
| **Backend** | Node.js 20 + Express 5 |
| **Database** | PostgreSQL 16 |
| **Cache/Session** | Redis (ioredis) |
| **Real-time** | Socket.IO 4.8 |
| **Authentication** | JWT (access 15m / refresh 7d) + bcrypt |
| **Payment** | VNPay |
| **Validation** | Zod 4.4 |
| **Logging** | Winston |
| **API Docs** | Swagger UI (swagger-jsdoc) |
| **Testing** | Jest |
| **Container** | Docker + Docker Compose |
| **Frontend** | *Chưa implement* |

## 📁 Cấu trúc dự án

```text
KTHP-LTW/
├── docs/                    # Tài liệu dự án
│   ├── 00-project-init.md
│   ├── 01-system-design.md
│   ├── 02-backend.md
│   ├── 03-frontend.md
│   ├── 04-testing.md
│   ├── 05-deployment.md
│   ├── setup.md
│   ├── features.md
│   ├── architecture.md
│   └── api-reference.md
├── src/
│   ├── BE_THLTW/            # Backend (Node.js/Express)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── middlewares/
│   │   │   ├── validators/
│   │   │   ├── sockets/
│   │   │   ├── config/
│   │   │   └── utils/
│   │   ├── __tests__/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── package.json
│   └── FE_THLTW/            # Frontend (chưa implement)
└── agent-skills/            # AI agent skill definitions
```

## ✨ Tính năng

### 🔐 Authentication & Authorization

- ✅ Đăng ký tài khoản (bcrypt hash password)
- ✅ Đăng nhập — trả về access token (15m) + refresh token (7d)
- ✅ Refresh access token
- ✅ Logout — invalidate refresh token
- ✅ Role-based access control: `customer`, `staff`, `kds`, `admin`

### 👥 Customer (Khách hàng)

- ✅ Xem menu (danh sách món, giá, danh mục, trạng thái)
- ✅ Đặt món — tạo đơn hàng mới
- ✅ Theo dõi trạng thái đơn hàng real-time
- ✅ Thanh toán qua VNPay — nhận URL redirect
- ✅ Xem lịch sử đơn hàng

### 👔 Staff (Nhân viên)

- ✅ Xem danh sách đơn hàng theo bàn
- ✅ Cập nhật trạng thái đơn hàng
- ✅ Quản lý trạng thái bàn (trống / có khách / đang dọn)
- ✅ Nhận thông báo real-time khi có đơn mới hoặc món sẵn sàng

### 👨‍🍳 KDS — Kitchen Display System (Bếp)

- ✅ Hiển thị queue món cần chế biến
- ✅ Xác nhận từng món đã hoàn thành
- ✅ Nhận đơn mới real-time qua Socket.IO
- ✅ Phát sự kiện `order:item_ready` khi món xong

### 🔧 Admin

- ✅ CRUD users, tables, QR codes
- ✅ CRUD menu categories, items, options
- ✅ Xem báo cáo doanh thu (theo ngày / tuần / tháng)
- ✅ Export báo cáo ra file Excel (exceljs)

### 💳 Payment — VNPay

- ✅ Tạo URL thanh toán VNPay
- ✅ Xử lý webhook callback từ VNPay
- ✅ Idempotency — tránh xử lý trùng giao dịch
- ✅ Cập nhật trạng thái đơn sau thanh toán thành công

### ⚡ Real-time (Socket.IO)

- ✅ Đơn mới → KDS
- ✅ Món sẵn sàng → Staff
- ✅ Cập nhật trạng thái đơn → Customer
- ✅ Cập nhật trạng thái bàn → Staff

### 🏗️ Infrastructure & DevOps

- ✅ Docker multi-stage build
- ✅ Docker Compose (postgres, seeder, indexer, backend)
- ✅ Health check endpoint `/api/health`
- ✅ DB migrations
- ✅ DB seed data
- ✅ Daily quota reset (node-cron, 00:00 Asia/Ho_Chi_Minh)

### 🧪 Developer Experience

- ✅ Swagger UI tại `/api/docs` (dev only)
- ✅ Postman collection
- ✅ Structured logging (Winston)
- ✅ Request ID tracking
- ✅ Environment validation on startup
- ✅ Jest test suite (auth, order, kds, vnpay)

## 🚀 Khởi động nhanh

### Yêu cầu hệ thống

- Node.js >= 20
- PostgreSQL 16
- Redis (optional, cho webhook lock)
- Docker & Docker Compose (khuyến nghị)

### Chạy bằng Docker (Khuyến nghị)

```bash
cd src/BE_THLTW
docker compose up -d --build
```

Docker Compose sẽ tự động:

1. Khởi động PostgreSQL 16 (port 5433)
2. Khởi động Redis (port 6379)
3. Chạy seeder để nạp dữ liệu mẫu
4. Áp dụng indexes
5. Khởi động backend (port 5000)

### Truy cập ứng dụng

- **API**: <http://localhost:5000/api>
- **Health Check**: <http://localhost:5000/api/health>
- **Swagger UI**: <http://localhost:5000/api/docs>
- **Database**: `localhost:5433`

### Tài khoản mẫu

Mật khẩu chung: `Password123!`

| Role | Email |
| ---- | ----- |
| ADMIN | admin@restaurant.com |
| MANAGER | manager@restaurant.com |
| CASHIER | cashier@restaurant.com |
| KITCHEN | kitchen@restaurant.com |
| WAITER | waiter@restaurant.com |

### Chạy local không Docker

```bash
cd src/BE_THLTW
npm install
cp .env.example .env
# Chỉnh DATABASE_URL, JWT secrets, VNPay keys trong .env

# Tạo database
psql -U postgres -f setup_local_db.sql
psql -U restaurant_user -d restaurant_dbs -f src/config/schema.sql
node src/config/seed.js
node src/config/applyIndexes.js

# Chạy server
npm run dev
```

### Reset database Docker

```bash
docker compose down -v
docker compose up -d --build
```

## 📚 API Documentation

### Base URL

```text
http://localhost:5000/api
```

### Swagger UI (Development)

<http://localhost:5000/api/docs>

### API Routes

| Prefix | Module | Mô tả |
| ------ | ------ | ----- |
| `/api/auth` | auth.routes.js | Đăng nhập, đăng ký, refresh token, logout |
| `/api/customer` | customer.routes.js | Menu, đặt món, theo dõi đơn, thanh toán |
| `/api/staff` | staff.routes.js | Quản lý đơn, bàn, trạng thái |
| `/api/kds` | kds.routes.js | Màn hình bếp, xác nhận món |
| `/api/admin` | admin.routes.js | Báo cáo, quản lý user, export |
| `/api/webhooks` | webhook.routes.js | VNPay payment callback |
| `/api/health` | — | Health check endpoint |

### Authentication

**Staff** dùng JWT access token:

```text
Authorization: Bearer <accessToken>
```

**Customer** dùng session token:

```text
Authorization: Bearer <session_token>
```

## 🧪 Testing

```bash
cd src/BE_THLTW
npm test
```

Test coverage:

- ✅ Auth (login, refresh, logout)
- ✅ Order creation & quota management
- ✅ KDS queue & item status updates
- ✅ VNPay webhook idempotency
- ✅ Session management

## 🔒 Bảo mật

- **JWT**: Access token (15 phút) + Refresh token (7 ngày)
- **Helmet**: HTTP security headers
- **CORS**: Whitelist origin
- **Rate limiting**: Giới hạn request theo IP
- **Zod**: Validate toàn bộ input tại boundary
- **bcrypt**: Hash password
- **VNPay webhook idempotency**: Tránh xử lý trùng giao dịch
- **Optimistic locking**: Session version để tránh race condition

## 📊 Database Schema

Schema đầy đủ: [src/BE_THLTW/src/config/schema.sql](src/BE_THLTW/src/config/schema.sql)

Các bảng chính:

| Bảng | Mô tả |
| ---- | ----- |
| `users` | Tài khoản người dùng, role, refresh token |
| `tables` | Bàn nhà hàng, trạng thái |
| `menu_items` | Món ăn, giá, danh mục, trạng thái |
| `orders` | Đơn hàng, liên kết bàn và khách |
| `order_items` | Chi tiết món trong đơn |
| `payments` | Giao dịch thanh toán, trạng thái VNPay |
| `sessions` | Phiên làm việc của khách tại bàn |

## 🔌 Socket.IO Events

### Namespaces

- `/customer`: Không cần auth khi connect, client gọi `join_session`
- `/kitchen`: Auth access token, role `ADMIN` hoặc `KITCHEN`
- `/staff`: Auth access token, role `ADMIN`, `CASHIER`, `MANAGER`, `WAITER`

### Events

| Event | Hướng | Mô tả |
| ----- | ----- | ----- |
| `order:new` | Server → KDS | Đơn mới vào bếp |
| `order:item_ready` | KDS → Server → Staff | Món đã sẵn sàng |
| `order:status_update` | Server → Customer | Cập nhật trạng thái đơn |
| `table:status_update` | Server → Staff | Trạng thái bàn thay đổi |

## 📦 Scripts

```bash
npm run dev              # Development (hot reload)
npm start                # Production
npm test                 # Jest
npm run seed             # Seed database
npm run docker:up        # Docker Compose up
npm run docker:down      # Docker Compose down
npm run docker:reset     # Reset DB và rebuild
```

## 🐛 Troubleshooting

| Lỗi | Cách xử lý |
| --- | ---------- |
| "Missing required env vars" | Kiểm tra `.env` có đầy đủ `DATABASE_URL`, `JWT_*`, `VNPAY_*` |
| "Redis connection failed" | Chạy `redis-cli ping` hoặc xóa `REDIS_URL` khỏi `.env` |
| "CORS blocked" | Thêm origin vào `FRONTEND_URL` trong `.env` |
| "Socket auth failed" | Kiểm tra token valid, user active, đúng role |
| Port bị chiếm | Đổi port trong `docker-compose.yml` hoặc tắt service đang chiếm |
| Backend unhealthy | Chạy `docker compose up -d --build` |

## 📖 Tài liệu chi tiết

- [Setup Guide](docs/setup.md) — Hướng dẫn cài đặt chi tiết
- [System Design](docs/01-system-design.md) — Thiết kế hệ thống
- [Backend Documentation](docs/02-backend.md) — Chi tiết backend
- [Architecture](docs/architecture.md) — Kiến trúc hệ thống
- [API Reference](docs/api-reference.md) — Tài liệu API đầy đủ
- [Features](docs/features.md) — Danh sách tính năng
- [Testing](docs/04-testing.md) — Hướng dẫn testing
- [Deployment](docs/05-deployment.md) — Hướng dẫn deploy

## 🤝 Contributing

Dự án này là đồ án môn học. Mọi đóng góp và góp ý xin gửi qua Issues hoặc Pull Requests.

## 📝 License

ISC

## 👥 Team

Đồ án môn Lập trình Web (LTW) — KTHP

---

**Made with ❤️ by  SucTeam**
