# 05 - Deployment

## Tổng quan

Backend được container hóa bằng **Docker** với multi-stage build. Orchestration qua **Docker Compose** với 4 services.

## Docker

**Dockerfile:** [src/BE_THLTW/Dockerfile](../src/BE_THLTW/Dockerfile)

- Base image: `node:20-alpine`
- Multi-stage build (builder → production)
- Chạy với non-root user (bảo mật)
- Expose port `5000`

## Docker Compose

**File:** [src/BE_THLTW/docker-compose.yml](../src/BE_THLTW/docker-compose.yml)

| Service | Image | Port | Mô tả |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5433 | Database chính |
| `seeder` | (build local) | — | Chạy seed.js một lần rồi thoát |
| `indexer` | (build local) | — | Áp dụng DB indexes một lần rồi thoát |
| `backend` | (build local) | 5000 | API server, health check tại `/api/health` |

## Chạy với Docker

```bash
cd src/BE_THLTW

# Build và khởi động toàn bộ stack
docker-compose up --build

# Chạy nền
docker-compose up -d --build

# Dừng
docker-compose down

# Dừng và xóa volumes (reset DB)
docker-compose down -v
```

## Helper Scripts (Windows)

| Script | Mô tả |
|---|---|
| `docker-setup.bat` | Setup lần đầu — build, seed, index |
| `switch-to-docker.bat` | Chuyển sang dùng Docker DB |
| `switch-to-local.bat` | Chuyển sang dùng local DB |

## Chạy Local (không Docker)

```bash
cd src/BE_THLTW
npm install

# Setup DB local
psql -U postgres -f setup_local_db.sql

# Chạy migrations
npm run migrate

# Seed dữ liệu
npm run seed

# Start server
npm run dev
```

## Health Check

```
GET /api/health
→ 200 OK { status: "ok", timestamp: "..." }
```

Docker Compose dùng endpoint này để kiểm tra backend đã sẵn sàng trước khi các service khác kết nối.

## Biến môi trường Production

Tạo file `.env` từ `.env.example` và điền đầy đủ:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname
REDIS_URL=redis://redis:6379
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
VNPAY_TMN_CODE=<merchant-code>
VNPAY_HASH_SECRET=<hash-secret>
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
VNPAY_RETURN_URL=https://yourdomain.com/payment/return
```

## Production Deployment (Step-by-step)

### Bước 1: Backup
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
cp .env .env.backup
```

### Bước 2: Update code
```bash
git pull origin main
npm install
```

### Bước 3: Update và validate env
```bash
# Thêm biến mới nếu cần
echo "REDIS_URL=redis://your-redis:6379" >> .env
echo "LOG_LEVEL=info" >> .env

# Validate
node -e "require('dotenv').config(); require('./src/utils/validateEnv').validateEnv()"
```

### Bước 4: Dry run
```bash
NODE_ENV=production npm start &
sleep 5
curl http://localhost:5000/api/health
kill %1
```

### Bước 5: Deploy
```bash
# Docker
docker compose down
docker compose up --build -d

# PM2
pm2 restart all && pm2 logs
```

### Bước 6: Monitor
```bash
tail -f logs/combined.log
curl http://your-domain.com/api/health
```

## Rollback

```bash
# Git revert
git log --oneline
git revert <commit-hash>

# Nếu dùng PM2
pm2 stop all
npm run migrate:down   # nếu có migration mới
git revert <commit>
pm2 start all

# Restore DB nếu cần
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

## Troubleshooting

| Lỗi | Giải pháp |
|---|---|
| "Missing required environment variables" | `cat .env \| grep -E "DATABASE_URL\|JWT\|VNPAY"` |
| "Redis connection failed" | Chạy `redis-cli ping` hoặc xóa `REDIS_URL` (fallback về DB) |
| "CORS blocked" | Thêm origin vào `FRONTEND_URL=https://app.com,https://new.com` |
| "Socket.IO auth failed" | Kiểm tra token valid, user active, đúng role |
| "Logs permission denied" | `mkdir -p logs && chmod 755 logs` |

## Performance Benchmarks

| Metric | Trước | Sau | Impact |
|---|---|---|---|
| Login latency | 120ms | 125ms | +4% |
| Order creation | 250ms | 255ms | +2% |
| Webhook processing | 180ms | 190ms | +5% (Redis lock) |
| Memory | 150MB | 165MB | +10% (Winston) |
| CPU | 5% | 5.5% | +10% (logging) |

## Log Locations

```bash
logs/combined.log       # Tất cả logs
logs/error.log          # Errors only
docker logs restaurant_backend
pm2 logs
```

## Lưu ý

- Chưa có CI/CD pipeline (GitHub Actions, GitLab CI, v.v.).
- Chưa có reverse proxy config (Nginx/Caddy) cho production.
- Swagger UI tự động tắt khi `NODE_ENV=production`.
- `LOG_LEVEL=info` trong production — không log debug.
- JWT secrets phải >= 32 ký tự trong production.
- `FRONTEND_URL` không được là `*` trong production.
