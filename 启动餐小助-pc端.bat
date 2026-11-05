@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-canteen-helper.ps1"

if errorlevel 1 (
  echo.
  echo Startup failed. Please review the message above and try again.
  pause
  exit /b 1
)

endlocal
