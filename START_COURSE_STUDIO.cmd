@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
    py -3 "course-studio\tools\launch_studio.py"
    goto check
)
where python >nul 2>nul
if not errorlevel 1 (
    python "course-studio\tools\launch_studio.py"
    goto check
)
echo Python 3 not found. Install Python or use: py -m http.server 8000 --bind 127.0.0.1
pause
exit /b 1
:check
if errorlevel 1 (
    echo.
    echo Course Studio could not start. See the message above.
    pause
    exit /b 1
)
exit /b 0
