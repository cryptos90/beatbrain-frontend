@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "MODE=%~1"
set "API_BASE_OVERRIDE=%~2"

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
if defined EXPO_PUBLIC_API_BASE_URL (
  echo [INFO] Using existing EXPO_PUBLIC_API_BASE_URL=%EXPO_PUBLIC_API_BASE_URL%
) else (
  call :resolve_api_base_url "%API_BASE_OVERRIDE%"
  if errorlevel 1 (
    echo [ERROR] Could not resolve backend API base URL.
    pause
    exit /b 1
  )
)

if not defined REACT_NATIVE_PACKAGER_HOSTNAME (
  for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "try { $uri = [System.Uri]::new('%EXPO_PUBLIC_API_BASE_URL%'); if ($uri.Host -and $uri.Host -notmatch '^(127\\.0\\.0\\.1|localhost)$') { $uri.Host } } catch {}"`) do (
    set "REACT_NATIVE_PACKAGER_HOSTNAME=%%a"
  )
)

echo [INFO] EXPO_PUBLIC_API_BASE_URL=%EXPO_PUBLIC_API_BASE_URL%
if defined REACT_NATIVE_PACKAGER_HOSTNAME (
  echo [INFO] REACT_NATIVE_PACKAGER_HOSTNAME=%REACT_NATIVE_PACKAGER_HOSTNAME%
)

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

if /I "%MODE%"=="tunnel" (
  echo [INFO] Starting Expo in TUNNEL mode...
  call npx expo start --tunnel --port 8081 --clear
  if errorlevel 1 (
    echo [WARN] Tunnel failed ^(ngrok^). Falling back to LAN...
    call npx expo start --lan --port 8081 --clear
  )
  set "EXITCODE=!errorlevel!"
  echo [INFO] Expo exited with code !EXITCODE!
  pause
  exit /b !EXITCODE!
)

echo [INFO] Starting Expo in default LAN mode...
call npx expo start --lan --port 8081 --clear

set "EXITCODE=!errorlevel!"
echo [INFO] Expo exited with code !EXITCODE!
pause
exit /b !EXITCODE!

:resolve_api_base_url
set "EXPO_PUBLIC_API_BASE_URL="
set "REACT_NATIVE_PACKAGER_HOSTNAME="
set "RESOLVED_LAN_IP="
set "RAW_OVERRIDE=%~1"

if defined RAW_OVERRIDE (
  echo %RAW_OVERRIDE% | findstr /b /c:"http://" /c:"https://" >nul
  if not errorlevel 1 (
    set "EXPO_PUBLIC_API_BASE_URL=%RAW_OVERRIDE%"
  ) else (
    set "EXPO_PUBLIC_API_BASE_URL=http://%RAW_OVERRIDE%:3000"
  )
  exit /b 0
)

for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "$socket = New-Object System.Net.Sockets.Socket([System.Net.Sockets.AddressFamily]::InterNetwork, [System.Net.Sockets.SocketType]::Dgram, [System.Net.Sockets.ProtocolType]::Udp); try { $socket.Connect('8.8.8.8', 80); ($socket.LocalEndPoint).Address.IPAddressToString } catch {} finally { $socket.Close() }"`) do (
  set "RESOLVED_LAN_IP=%%a"
)

if not defined RESOLVED_LAN_IP (
  for /f "usebackq delims=" %%a in (`powershell -NoProfile -Command "[System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and $_.IPAddressToString -notmatch '^(127|169\\.254)\\.' } | Select-Object -First 1 -ExpandProperty IPAddressToString"`) do (
    set "RESOLVED_LAN_IP=%%a"
  )
)

if defined RESOLVED_LAN_IP (
  set "REACT_NATIVE_PACKAGER_HOSTNAME=%RESOLVED_LAN_IP%"
  set "EXPO_PUBLIC_API_BASE_URL=http://%RESOLVED_LAN_IP%:3000"
  echo [INFO] Auto-detected LAN IP %RESOLVED_LAN_IP%
  exit /b 0
)

echo [WARN] Could not auto-detect LAN IP. Falling back to loopback backend URL.
set "EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000"
exit /b 0
