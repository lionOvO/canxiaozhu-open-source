@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-canteen-helper.ps1"
if errorlevel 1 (
  echo.
  echo Stop failed. Please review the message above.
  pause
  exit /b 1
)
endlocal
