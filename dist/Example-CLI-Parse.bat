@echo off
echo ========================================
echo    TWX Parser - CLI Example
echo ========================================
echo.
echo This example shows how to parse a TWX file using the command line.
echo.
echo Usage: twx-parser.exe parse "path\to\your\file.twx"
echo.
echo Please provide the path to your TWX file when prompted.
echo.
set /p twxfile="Enter the path to your TWX file: "

if "%twxfile%"=="" (
    echo No file specified. Exiting.
    pause
    exit /b
)

echo.
echo Running: twx-parser.exe parse "%twxfile%"
echo.

twx-parser.exe parse "%twxfile%"

echo.
echo Parsing completed! Check the 'output' folder for results.
echo.
pause
