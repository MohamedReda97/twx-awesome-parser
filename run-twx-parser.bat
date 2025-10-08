@echo off
title TWX Parser
echo ========================================
echo    TWX Parser - Starting Application
echo ========================================
echo.

REM Check if executable exists
if not exist "dist\twx-parser.exe" (
    echo ERROR: twx-parser.exe not found in dist folder!
    echo.
    echo Please run build.bat first to create the executable.
    echo.
    pause
    exit /b 1
)

REM Run the executable and keep console open
echo Starting TWX Parser...
echo.
cd dist
twx-parser.exe
set EXIT_CODE=%ERRORLEVEL%

echo.
echo ========================================
if %EXIT_CODE% EQU 0 (
    echo Application closed normally
) else (
    echo Application exited with error code: %EXIT_CODE%
)
echo ========================================
echo.
pause

