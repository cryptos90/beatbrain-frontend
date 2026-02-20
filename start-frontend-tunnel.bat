@echo off
cd /d "%~dp0"
set EXPO_NO_TELEMETRY=1

set BB_HOST_TMP=%TEMP%\beatbrain_host_ip.tmp
powershell -NoProfile -Command "$all=@(); foreach($entry in Get-NetIPAddress -AddressFamily IPv4){$ip=$entry.IPAddress; if($ip -notlike '169.254.*'){$all += $ip}}; $pref=''; foreach($ip in $all){ if($ip -like '192.168.*' -or $ip -like '10.*' -or $ip -like '172.16.*' -or $ip -like '172.17.*' -or $ip -like '172.18.*' -or $ip -like '172.19.*' -or $ip -like '172.2?.*' -or $ip -like '172.30.*' -or $ip -like '172.31.*'){ $pref=$ip; break }}; if(-not $pref -and $all.Count -gt 0){$pref=$all[0]}; Write-Output $pref" > "%BB_HOST_TMP%"
set /p REACT_NATIVE_PACKAGER_HOSTNAME=<"%BB_HOST_TMP%"
del "%BB_HOST_TMP%" >nul 2>&1
if "%REACT_NATIVE_PACKAGER_HOSTNAME%"=="" set REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
echo Using REACT_NATIVE_PACKAGER_HOSTNAME=%REACT_NATIVE_PACKAGER_HOSTNAME%
echo Ensuring port 8081 is free...
for /f %%p in ('powershell -NoProfile -Command "$pids = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach($procId in $pids){ try { Stop-Process -Id $procId -Force -ErrorAction Stop; Write-Output $procId } catch {} }"') do (
  echo Killed process on 8081 with PID %%p
)

npx expo start --tunnel --go --port 8081 --clear
pause
