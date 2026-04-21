@echo off
echo ===================================================
echo   🌾  Sustainable Farming Platform - Startup
echo ===================================================
echo.

REM --- Start Node.js Backend (port 5000) ---
echo [1/2] Starting Node.js Backend on port 5000...
start "Node Backend" cmd /k "cd /d "%~dp0backend" && node server.js"

REM --- Start Python Flask AI Backend (port 5001) ---
echo [2/2] Starting Flask AI Backend on port 5001...
start "Flask AI Backend" cmd /k "cd /d "%~dp0" && .venv\Scripts\python backend\app.py"

echo.
echo ✅ Both servers are starting in separate windows.
echo    Node.js  → http://localhost:5000
echo    Flask AI → http://localhost:5001
echo.
echo Open frontend\newsignin.html in your browser to get started.
pause
