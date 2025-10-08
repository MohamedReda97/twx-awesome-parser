@echo off
title TWX Parser - Simple Build
echo ========================================
echo    TWX Parser - Simple Build
echo ========================================
echo.

REM Create dist directory
if not exist "dist" mkdir dist

REM Clean dist directory
echo Cleaning dist directory...
if exist "dist\twx-parser.exe" del /Q "dist\twx-parser.exe"
if exist "dist\*.html" del /Q "dist\*.html"
if exist "dist\*.css" del /Q "dist\*.css"
if exist "dist\*.js" del /Q "dist\*.js"
if exist "dist\*.cjs" del /Q "dist\*.cjs"
if exist "dist\*.txt" del /Q "dist\*.txt"
echo.

REM Build with pkg
echo Building executable...
echo (This may take 2-3 minutes)
echo.
npx pkg . --out-path dist --targets node18-win-x64
echo.

if not exist "dist\twx-parser.exe" (
    echo ERROR: Build failed - twx-parser.exe was not created!
    echo.
    pause
    exit /b 1
)

REM Copy files
echo Copying necessary files...
copy "twx-viewer-new.html" "dist\" >nul 2>&1
copy "twx-viewer-new.css" "dist\" >nul 2>&1
copy "twx-viewer-new.js" "dist\" >nul 2>&1
copy "twx-viewer.html" "dist\" >nul 2>&1
copy ".eslintrc.cjs" "dist\" >nul 2>&1
copy "DIST_README.txt" "dist\README.txt" >nul 2>&1

REM Create output directory
if not exist "dist\output" mkdir "dist\output"

REM Copy node_modules
echo Copying ESLint and dependencies...
echo (This may take a minute)
if not exist "dist\node_modules" mkdir "dist\node_modules"

xcopy "node_modules\eslint" "dist\node_modules\eslint\" /E /I /Q /Y >nul 2>&1
xcopy "node_modules\@eslint" "dist\node_modules\@eslint\" /E /I /Q /Y >nul 2>&1
xcopy "node_modules\@eslint-community" "dist\node_modules\@eslint-community\" /E /I /Q /Y >nul 2>&1
xcopy "node_modules\@humanwhocodes" "dist\node_modules\@humanwhocodes\" /E /I /Q /Y >nul 2>&1
xcopy "node_modules\prettier" "dist\node_modules\prettier\" /E /I /Q /Y >nul 2>&1

REM Copy eslint plugins
for /d %%i in (node_modules\eslint-plugin-*) do (
    xcopy "%%i" "dist\node_modules\%%~nxi\" /E /I /Q /Y >nul 2>&1
)

echo.
echo ========================================
echo    Build Completed Successfully!
echo ========================================
echo.
echo Executable: dist\twx-parser.exe
echo.
echo To test: Navigate to dist folder and double-click twx-parser.exe
echo.
pause

