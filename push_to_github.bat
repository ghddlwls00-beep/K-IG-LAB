@echo off
cd /d "%~dp0"
echo === adding files ===
git add -A -- . ":!check_git.bat"
echo === committing ===
git commit -m "Connect frontend to Cloudflare R2 for audio/video playback"
echo === pushing to GitHub ===
git push origin main
echo.
echo === done ===
pause
