@echo off
REM Serve the site from THIS folder. Opens at http://localhost:8080
cd /d "%~dp0"

echo.
echo Open in your browser:
echo   http://localhost:8080
echo   http://localhost:8080/visualiser2.html
echo.
echo Close this window to stop the server.
echo.

REM These scripts always serve THIS folder (no matter where you run from)
node serve.js 2>nul
if %errorlevel% neq 0 (
  py serve.py 2>nul
)
if %errorlevel% neq 0 (
  python serve.py 2>nul
)
if %errorlevel% neq 0 (
  echo Need Node or Python. Install Node from https://nodejs.org
  pause
  exit /b 1
)

pause
