# 05 - Deployment

Backend được container hóa bằng Docker.

## Dockerfile

File: [src/BE_THLTW/Dockerfile](../src/BE_THLTW/Dockerfile)

- Base image: `node:20-alpine`
- Cài dependency bằng `npm ci --only=production`
- Chạy bằng non-root user `appuser`
- Entry point: `node src/server.js`
- Expose port `5000`

## Docker Compose Local

File: [src/BE_THLTW/docker-compose.yml](../src/BE_THLTW/docker-compose.yml)

| Service | Port | Mô tả |
|---|---:|---|
| `postgres` | `5433:5432` | PostgreSQL 16 |
| `redis` | `6379:6379` | Redis cho webhook lock |
| `seeder` | none | Seed dữ liệu mẫu rồi thoát |
| `indexer` | none | Áp dụng indexes rồi thoát |
| `backend` | `5000:5000` | Express API |

Chạy:

```powershell
cd src/BE_THLTW
docker compose up -d --build
```

Kiểm tra:

```powershell
docker compose ps
Invoke-WebRequest -UseBasicParsing http://localhost:5000/api/health
```

Reset dữ liệu:

```powershell
docker compose down -v
docker compose up -d --build
```

## Environment

Compose local đã có default để máy mới chạy được ngay cả khi chưa có `.env`.

Production vẫn cần set biến thật:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgres://user:pass@host:5432/restaurant_dbs
REDIS_URL=redis://host:6379
JWT_ACCESS_SECRET=<strong-random-secret-min-32-chars>
JWT_REFRESH_SECRET=<strong-random-secret-min-32-chars>
VNPAY_TMNCODE=<merchant-code>
VNPAY_HASHSECRET=<hash-secret>
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
VNPAY_RETURN_URL=https://your-domain/payment-result
FRONTEND_URL=https://your-frontend-domain
LOG_LEVEL=info
```

Lưu ý:

- `FRONTEND_URL` không được là `*` trong production.
- JWT secrets phải ít nhất 32 ký tự trong production.
- Swagger UI bị tắt khi `NODE_ENV=production`; vẫn có `/api/docs.json`.

## Database

Schema gốc nằm ở:

```text
src/BE_THLTW/src/config/schema.sql
```

Indexes nằm ở:

```text
src/BE_THLTW/src/config/indexes.sql
```

Index đáng chú ý:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sessions_one_active_per_table
ON SESSIONS(table_id)
WHERE status = 'ACTIVE';
```

Index này ngăn 2 session active cùng một bàn.

## Health Check

```text
GET /api/health
```

Response:

```json
{ "status": "UP", "message": "Hệ thống đang hoạt động" }
```

## Production Checklist

1. Set env production đầy đủ.
2. Dùng DB/Redis managed hoặc container production riêng.
3. Chạy migration/schema/index trước khi serve traffic.
4. Bật HTTPS/reverse proxy.
5. Set `FRONTEND_URL` đúng domain frontend.
6. Chạy `npm test`.
7. Smoke test:

```bash
curl https://your-api-domain/api/health
```

## Rủi ro còn lại trước production

- VNPay webhook da check amount; truoc production can test voi sandbox merchant config that.
- `/customer` Socket.IO đã xác thực `session_id` + `session_token` trong `join_session`; trước production vẫn nên test end-to-end với frontend thật.
- Admin CRUD đã có route thật; trước production nên bổ sung integration test và phân quyền chi tiết theo từng thao tác.
- Nên thêm CI để chạy test tự động.

## Troubleshooting

| Lỗi | Cách xử lý |
|---|---|
| Docker không connect engine | Mở Docker Desktop, kiểm tra `docker version` |
| Backend unhealthy | `docker compose logs backend` |
| Postgres unhealthy | `docker compose logs postgres` |
| Seeder/indexer fail | `docker compose logs seeder` hoặc `docker compose logs indexer` |
| Port conflict | Đổi port host trong `docker-compose.yml` |
| Dữ liệu cũ không đổi sau seed | Chạy `docker compose down -v` |

## Backend Security Checklist

- Keep `src/BE_THLTW/.env` and `src/BE_THLTW/.env.local` local only. They must not be tracked by Git.
- Provision production values from the deployment secret store or runtime environment. Do not copy values from local workstations.
- Use `src/BE_THLTW/.env.example` only as a shape reference. Values wrapped in `<...>` are placeholders.

## Credential Rotation

Rotate credentials immediately after removing tracked env files from Git history or after any suspected exposure.

- JWT: replace `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, then force staff login again and allow customer session tokens to expire.
- Database: rotate `DB_PASSWORD` or `DATABASE_URL`, update the deployment secret store, then restart the backend.
- VNPay: rotate `VNPAY_HASHSECRET` and merchant credentials in coordination with the payment provider.
- Redis: rotate `REDIS_URL` credentials when Redis auth is enabled, then restart workers/backends that use webhook locks.
