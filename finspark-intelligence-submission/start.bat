@echo off
echo.
echo  ========================================
echo   FinSpark Intelligence — Starting up
echo  ========================================
echo.

:: Start the server in a new window
echo  [1/2] Starting backend server on port 4000...
start "FinSpark Server" cmd /k "cd /d %~dp0server && npm install && node index.js"

:: Wait 3 seconds for server to boot
timeout /t 3 /nobreak > nul

:: Start the dashboard in a new window
echo  [2/2] Starting dashboard on port 3000...
start "FinSpark Dashboard" cmd /k "cd /d %~dp0dashboard && npm install && npm start"

echo.
echo  Both windows are starting...
echo  Dashboard will open at http://localhost:3000
echo  Server running at http://localhost:4000
echo.
pause
