@echo off
title TWX Parser - Build Script
color 0B

echo ========================================
echo    TWX Parser - Build Script
echo ========================================
echo.

REM Check if node_modules exists (skip Node.js check if already installed)
if not exist "node_modules" (
    echo ERROR: node_modules folder not found!
    echo Please run "npm install" first.
    echo.
    pause
    exit /b 1
)

REM Create dist directory if it doesn't exist
if not exist "dist" mkdir dist

REM Clean dist directory
echo Cleaning dist directory...
if exist "dist\*" del /Q "dist\*"
if exist "dist\output" rmdir /S /Q "dist\output"
if exist "dist\node_modules" rmdir /S /Q "dist\node_modules"
echo.

REM Run pkg to build the executable
echo Building executable with pkg...
echo This may take a few minutes...
echo.
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    echo.
    echo If you see "pkg: command not found" or similar error,
    echo make sure you have run "npm install" first.
    echo.
    pause
    exit /b 1
)
echo.

REM Copy necessary files to dist folder
echo Copying necessary files...

REM Copy HTML/CSS/JS files
copy "twx-viewer-new.html" "dist\" >nul
copy "twx-viewer-new.css" "dist\" >nul
copy "twx-viewer-new.js" "dist\" >nul
copy "twx-viewer.html" "dist\" >nul
copy ".eslintrc.cjs" "dist\" >nul
copy "DIST_README.txt" "dist\README.txt" >nul

REM Create output directory
if not exist "dist\output" mkdir "dist\output"

REM Copy node_modules (ESLint and dependencies)
echo Copying ESLint and dependencies (this may take a moment)...
if not exist "dist\node_modules" mkdir "dist\node_modules"

REM Copy only essential node_modules
xcopy "node_modules\eslint" "dist\node_modules\eslint\" /E /I /Q /Y >nul
xcopy "node_modules\@eslint" "dist\node_modules\@eslint\" /E /I /Q /Y >nul
xcopy "node_modules\@eslint-community" "dist\node_modules\@eslint-community\" /E /I /Q /Y >nul
xcopy "node_modules\eslint-plugin-*" "dist\node_modules\" /E /I /Q /Y >nul
xcopy "node_modules\prettier" "dist\node_modules\prettier\" /E /I /Q /Y >nul
xcopy "node_modules\@humanwhocodes" "dist\node_modules\@humanwhocodes\" /E /I /Q /Y >nul

echo.
echo ========================================
echo    Build Completed Successfully!
echo ========================================
echo.
echo Executable location: dist\twx-parser.exe
echo.
echo To run the application:
echo   1. Navigate to the dist folder
echo   2. Double-click twx-parser.exe
echo.
echo Note: Keep all files in the dist folder together!
echo ========================================
echo.
pause
