@echo off
title TWX Parser - Web Interface
color 0A

echo.
echo ========================================
echo    TWX Parser - Web Interface
echo ========================================
echo.
echo Starting application...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install dependencies!
        echo.
        pause
        exit /b 1
    )
    echo.
)

REM Start the application
echo.
echo ========================================
echo    Starting TWX Parser Web Server
echo ========================================
echo.

node app.js

REM Capture exit code
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
echo Press any key to exit...
pause >nul

