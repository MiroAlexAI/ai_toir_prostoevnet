@echo off
TITLE Next.js App Launcher
:: Переходим в директорию проекта
cd /d "%~dp0"

echo ==========================================
echo    ЗАПУСК ПРИЛОЖЕНИЯ (LOCAL DEV)
echo ==========================================
echo.

:: Запуск браузера через 3 секунды (даем время серверу начать инициализацию)
start powershell -Command "Start-Sleep -s 3; Start-Process 'http://localhost:3000'"

:: Запуск сервера
npm run dev

pause
