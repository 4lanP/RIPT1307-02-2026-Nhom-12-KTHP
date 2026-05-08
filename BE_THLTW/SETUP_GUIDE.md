# Restaurant Backend - Environment Setup

## 📋 Tổng quan

Dự án có 2 môi trường:
- **LOCAL**: Chạy backend trực tiếp với PostgreSQL trên máy (port 5432)
- **DOCKER**: Chạy toàn bộ trong Docker containers (PostgreSQL port 5433)

---

## 🔄 Chuyển đổi môi trường

### Chuyển sang LOCAL mode:
```bash
# Windows
switch-to-local.bat

# Sau đó chạy:
npm start
```

### Chuyển sang DOCKER mode:
```bash
# Windows
switch-to-docker.bat

# Sau đó chạy:
docker compose up -d
```

---

## 🐳 Docker Commands

### Khởi động:
```bash
docker compose up -d
```

### Xem logs:
```bash
docker compose logs -f backend
```

### Dừng:
```bash
docker compose down
```

### Reset hoàn toàn (xóa data):
```bash
docker compose down -v
docker compose up -d --build
```

### Kiểm tra status:
```bash
docker compose ps
```

---

## 🔌 Endpoints

### Docker mode:
- API: http://localhost:5000/api/health
- Swagger: http://localhost:5000/api/docs
- PostgreSQL: localhost:5433

### Local mode:
- API: http://localhost:5000/api/health
- Swagger: http://localhost:5000/api/docs
- PostgreSQL: localhost:5432

---

## 🗄️ Database Setup

### Docker (tự động):
```bash
docker compose up -d
# Seeder và indexer chạy tự động
```

### Local (thủ công):
```bash
# 1. Tạo database
psql -U postgres -c "CREATE DATABASE restaurant_dbs;"

# 2. Import schema
psql -U postgres -d restaurant_dbs -f src/config/schema.sql

# 3. Seed data
node src/config/seed.js

# 4. Apply indexes
node src/config/applyIndexes.js
```

---

## 🔐 Default Credentials

### Staff Login:
- Admin: `admin@restaurant.com` / `admin123`
- Manager: `manager@restaurant.com` / `admin123`
- Cashier: `cashier@restaurant.com` / `admin123`
- Kitchen: `kitchen@restaurant.com` / `admin123`
- Waiter: `waiter@restaurant.com` / `admin123`

### Database (Docker):
- User: `restaurant_user`
- Password: `strongpassword123`
- Database: `restaurant_dbs`

### Database (Local):
- User: `postgres`
- Password: (your PostgreSQL password)
- Database: `restaurant_dbs`

---

## 🧪 Testing

```bash
npm test
```

---

## 📝 Files

- `.env` - Active environment config (auto-switched by scripts)
- `.env.local` - Local PostgreSQL config
- `.env.docker` - Docker PostgreSQL config
- `.env.example` - Template for new setup
