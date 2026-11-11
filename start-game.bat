@echo off
title Mind Game Launcher
cd /d "%~dp0"

rem Launcher for Cognitive Training Lab (full Persian guide: docs/DESKTOP-LAUNCHER.md)
rem ASCII-only on purpose: `chcp 65001` mid-file corrupts cmd's read offset with UTF-8 text.

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install the LTS version from nodejs.org first.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo First run: installing dependencies, please wait...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
  )
)

rem Dev server in a minimized window. If port 5173 is already serving, the new
rem instance exits immediately (strictPort) and the browser opens the running one.
start "Mind Game Server" /min cmd /c "npm run dev -- --port 5173 --strictPort"

rem Wait until the server answers (max ~30s). Delay via ping: `timeout` breaks
rem when stdin is redirected (scheduled tasks, CI shells).
set /a TRIES=0
:waitloop
curl -s -o nul http://localhost:5173
if not errorlevel 1 goto ready
set /a TRIES+=1
if %TRIES% geq 30 goto ready
ping -n 2 127.0.0.1 >nul
goto waitloop

:ready
start "" "http://localhost:5173"
echo The game is ready and should have opened in your browser.
echo To stop the server: close the minimized "Mind Game Server" window.
ping -n 11 127.0.0.1 >nul
exit /b 0
