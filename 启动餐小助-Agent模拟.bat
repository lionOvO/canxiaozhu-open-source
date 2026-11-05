@echo off
setlocal
cd /d "%~dp0backend"
call npm run demo:agent
if errorlevel 1 pause
endlocal
