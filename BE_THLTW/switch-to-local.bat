@echo off
echo Switching to LOCAL mode...
if exist .env (
    move /Y .env .env.docker >nul
)
if exist .env.local (
    move /Y .env.local .env >nul
)
echo Done! Now you can run: npm start
pause
