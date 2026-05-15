# 🍽️ KTHP-LTW — Hệ thống Quản lý Nhà hàng

> Đồ án môn Lập trình Web — Hệ thống quản lý nhà hàng full-stack với đặt món QR, Kitchen Display System (KDS), thanh toán VNPay, và báo cáo quản trị.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Express](https://img.shields.io/badge/Express-5.2-lightgrey.svg)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)

## 📋 Tổng quan

Hệ thống quản lý nhà hàng hiện đại với các tính năng:

- **🔐 Xác thực & Phân quyền**: JWT-based authentication với 6 roles (CUSTOMER, WAITER, CASHIER, KITCHEN, MANAGER, ADMIN)
- **📱 Đặt món QR**: Khách quét mã QR tại bàn để xem menu và đặt món
- **👨‍🍳 Kitchen Display System**: Màn hình bếp hiển thị queue món theo station (GRILL/BAR/COLD)
- **💳 Thanh toán VNPay**: Tích hợp cổng thanh toán VNPay với webhook idempotency
- **📊 Báo cáo & Thống kê**: Dashboard admin/manager với export Excel
- **⚡ Real-time Updates**: Socket.IO cho cập nhật trạng thái đơn hàng, bàn, và món ăn
- **🎨 Frontend**: React + Vite với Tailwind CSS

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
| **Frontend** | React 18 + Vite 5 + Tailwind CSS |
| **Database** | PostgreSQL 16 |
| **Cache/Session** | Redis (ioredis) |
| **Real-time** | Socket.IO 4.8 |
| **Authentication** | JWT (access 15m / refresh 7d) + bcrypt |
| **Payment** | VNPay |
| **Validation** | Zod 4.4 |
| **Logging** | Winston |
| **API Docs** | Swagger UI (swagger-jsdoc) |
| **Testing** | Jest (27 tests, 6 suites) |
| **Container** | Docker + Docker Compose |

## 📁 Cấu trúc dự án

```text
KTHP-LTW/
├── docs/                    # Tài liệu dự án
│   ├── 01-system-design.md
│   ├── 02-backend.md
│   ├── 04-testing.md
│   ├── 05-deployment.md
│   ├── 07-bug-after-test(FE).md
│   ├── setup.md
│   ├── features.md
│   ├── improvements.md
│   ├── architecture.md
│   ├── api-reference.md
│   └── frontend-handoff.md
├── specs/                   # Feature specifications
│   ├── 001-backend-hardening/
│   ├── 002-manager-permissions/
│   └── frontend-handoff/
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
│   │   ├── __tests__/       # Jest tests (27 tests)
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── package.json
│   └── FE_THLTW/            # Frontend (React + Vite)
│       ├── src/
│       │   ├── pages/       # Customer, Staff, KDS, Admin, Auth
│       │   ├── layouts/
│       │   ├── contexts/
│       │   └── utils/
│       └── package.json
└── README.md
```

## ✨ Tính năng

Xem chi tiết tại [docs/features.md](docs/features.md)

### Highlights

- ✅ **Backend**: Express 5 API với JWT auth, Socket.IO realtime, VNPay integration
- ✅ **Frontend**: React + Vite với customer, staff, KDS, admin interfaces
- ✅ **Database**: PostgreSQL với 30+ indexes, optimistic locking, quota management
- ✅ **Testing**: 27 Jest tests covering auth, orders, sessions, KDS, payments, permissions
- ✅ **Security**: Token rotation, session tokens, webhook idempotency, role-based access
- ✅ **DevOps**: Docker Compose, health checks, structured logging, seed data

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
| `/api/auth` | auth.routes.js | Login, refresh token, logout |
| `/api/customer` | customer.routes.js | QR scan, menu, orders, requests, VNPay |
| `/api/staff` | staff.routes.js | Tables, sessions, requests, checkout, cancel |
| `/api/kds` | kds.routes.js | Kitchen queue, item status updates |
| `/api/admin` | admin.routes.js | Dashboard, reports, CRUD users/tables/menu/QR |
| `/api/webhooks` | webhook.routes.js | VNPay IPN callback |
| `/api/health` | — | Health check endpoint |

### Authentication

**Staff** dùng JWT access token (15m expiry):

```text
Authorization: Bearer <accessToken>
```

**Customer** dùng JWT session token (24h expiry):

```text
Authorization: Bearer <session_token>
```
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
- [Improvements](docs/improvements.md) — Lịch sử fixes và improvements
- [Frontend Handoff](docs/frontend-handoff.md) — Tài liệu bàn giao frontend
- [Frontend Issues](docs/07-bug-after-test(FE).md) — Known issues frontend cần fix

## 🤝 Contributing

- Đoàn Vũ Phúc 
- Lê Minh Đạo
- Trần Minh Trí

## 📝 License

ISC

## 👥 Team

Đồ án môn Lập trình Web (LTW) — KTHP

---

**Made with ❤️ by  SucTeam**
