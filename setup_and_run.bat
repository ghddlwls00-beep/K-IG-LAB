@echo off
cd /d "%~dp0"
echo ============================
echo  1/2  Installing packages...
echo ============================
call pnpm install
echo.
echo ============================
echo  2/2  Starting the app...
echo  (Ctrl+C to stop, then close this window)
echo ============================
call pnpm dev
pause