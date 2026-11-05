@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%smart-update-server.ps1"

if errorlevel 1 (
  echo.
  echo Smart update failed. Please review the message above.
  pause
)

endlocal
