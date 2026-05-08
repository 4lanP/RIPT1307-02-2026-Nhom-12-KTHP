@echo off
echo Switching to DOCKER mode...
if exist .env (
    move /Y .env .env.local >nul
)
if exist .env.docker (
    move /Y .env.docker .env >nul
)
echo Done! Now you can run: docker compose up -d
pause
