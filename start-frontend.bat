@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

REM --- ensure we are in frontend repo
if not exist "package.json" (
  echo [ERROR] Missing package.json in frontend directory.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found in PATH.
  pause
  exit /b 1
)

REM --- ensure metro port free
echo [INFO] Ensuring port 8081 is free...
for /f %%a in ('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue ^| Select-Object -ExpandProperty OwningProcess -Unique"') do (
  echo [INFO] Killing process on :8081 PID=%%a
  taskkill /F /PID %%a >nul 2>nul
)

set EXPO_NO_TELEMETRY=1
set EXPO_PUBLIC_API_BASE_URL=http://192.168.2.237:3000
echo [INFO] EXPO_PUBLIC_API_BASE_URL=%EXPO_PUBLIC_API_BASE_URL%

REM --- install deps if needed
if not exist "node_modules" (
  echo [INFO] Installing frontend deps ^(npm install^)...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed ^(frontend^).
    pause
    exit /b 1
  )
)

set "MODE=%~1"

if /I "%MODE%"=="web" (
  echo [INFO] Starting Expo in WEB mode...
  call npx expo start --web --port 8081 --clear
  set "EXITCODE=!errorlevel!"
  echo [INFO] Expo exited with code !EXITCODE!
  pause
  exit /b !EXITCODE!
)

if /I "%MODE%"=="lan" (
  echo [INFO] Starting Expo in LAN mode...
  call npx expo start --lan --port 8081 --clear
  set "EXITCODE=!errorlevel!"
  echo [INFO] Expo exited with code !EXITCODE!
  pause
  exit /b !EXITCODE!
)

echo [INFO] Trying TUNNEL...
call npx expo start --tunnel --port 8081 --clear
if errorlevel 1 (
  echo [WARN] Tunnel failed ^(ngrok^). Falling back to LAN...
  call npx expo start --lan --port 8081 --clear
)

set "EXITCODE=!errorlevel!"
echo [INFO] Expo exited with code !EXITCODE!
pause
exit /b !EXITCODE!
