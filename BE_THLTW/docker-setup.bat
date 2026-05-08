@echo off
echo ========================================
echo Docker Setup for Restaurant Backend
echo ========================================
echo.

echo [1/5] Stopping existing containers...
docker compose down

echo.
echo [2/5] Removing old volumes (this will delete all data)...
docker volume rm be_thltw_postgres_data 2>nul

echo.
echo [3/5] Building images...
docker compose build --no-cache

echo.
echo [4/5] Starting services...
docker compose --env-file .env.docker up -d

echo.
echo [5/5] Checking status...
timeout /t 5 >nul
docker compose ps

echo.
echo ========================================
echo Setup completed!
echo.
echo Access points:
echo - API: http://localhost:5000/api/health
echo - Swagger: http://localhost:5000/api/docs
echo - PostgreSQL: localhost:5433
echo.
echo Check logs: docker compose logs -f backend
echo ========================================
pause
