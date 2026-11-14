@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
    py -3 "tools\launch_presentation.py"
    goto check
)
where python >nul 2>nul
if not errorlevel 1 (
    python "tools\launch_presentation.py"
    goto check
)
echo Python 3 not found. Install Python 3 or open the existing local server URL.
pause
exit /b 1
:check
if errorlevel 1 (
    echo.
    echo The presentation could not start. See the error above.
    pause
    exit /b 1
)
exit /b 0
