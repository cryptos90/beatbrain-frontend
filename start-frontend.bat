@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
set EXPO_NO_TELEMETRY=1

if not exist "node_modules" (
  echo [Frontend] node_modules not found. Running npm install...
  call npm install
  if errorlevel 1 (
    echo [Frontend] npm install failed.
    exit /b 1
  )
)

echo Ensuring port 8081 is free...
for /f "tokens=5" %%p in ('netstat -aon ^| find ":8081" ^| find "LISTENING"') do (
  echo Killed process on 8081 with PID %%p
  taskkill /F /PID %%p >nul 2>&1
)

for /f %%p in ('powershell -NoProfile -Command "$pids = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach($procId in $pids){ Write-Output $procId }"') do (
  taskkill /F /PID %%p >nul 2>&1
)

if /I "%~1"=="lan" (
  echo Starting Expo in LAN mode on port 8081...
  call npm run start:lan
) else (
  echo Starting Expo in TUNNEL mode on port 8081...
  call npm run start:tunnel
)

endlocal
