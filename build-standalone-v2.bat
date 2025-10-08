@echo off
title TWX Parser - Standalone Build v2
color 0B

echo ========================================
echo   TWX Parser - Standalone Build v2
echo ========================================
echo.

REM Check if portable Node.js exists
if not exist "node-portable\node.exe" (
    echo ERROR: Node.js Portable Not Found!
    echo.
    echo Please download Node.js portable:
    echo   https://nodejs.org/dist/v18.20.0/node-v18.20.0-win-x64.zip
    echo.
    echo Extract and rename to "node-portable" in this folder.
    echo.
    pause
    exit /b 1
)

echo Node.js portable found: OK
echo.

REM Create standalone directory
if exist "TWX-Parser-Standalone" (
    echo Removing old build...
    rmdir /S /Q "TWX-Parser-Standalone"
)

echo Creating directories...
mkdir "TWX-Parser-Standalone"
mkdir "TWX-Parser-Standalone\node"
mkdir "TWX-Parser-Standalone\app"
mkdir "TWX-Parser-Standalone\app\src"
mkdir "TWX-Parser-Standalone\app\node_modules"
mkdir "TWX-Parser-Standalone\app\output"
echo.

echo [1/6] Copying Node.js portable...
echo This may take a moment...
xcopy "node-portable\*" "TWX-Parser-Standalone\node\" /E /I /Q /Y
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy Node.js!
    pause
    exit /b 1
)
echo Done!
echo.

echo [2/6] Copying application source files...
xcopy "src\*" "TWX-Parser-Standalone\app\src\" /E /I /Q /Y
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy src folder!
    pause
    exit /b 1
)
echo Done!
echo.

echo [3/6] Copying application files...
copy "app.js" "TWX-Parser-Standalone\app\" >nul
copy "start-viewer.js" "TWX-Parser-Standalone\app\" >nul
copy "package.json" "TWX-Parser-Standalone\app\" >nul
copy "twx-viewer-new.html" "TWX-Parser-Standalone\app\" >nul
copy "twx-viewer-new.css" "TWX-Parser-Standalone\app\" >nul
copy "twx-viewer-new.js" "TWX-Parser-Standalone\app\" >nul
copy "twx-viewer.html" "TWX-Parser-Standalone\app\" >nul
copy ".eslintrc.cjs" "TWX-Parser-Standalone\app\" >nul
copy "README.md" "TWX-Parser-Standalone\app\" >nul
echo Done!
echo.

echo [4/6] Copying dependencies (this will take 2-3 minutes)...
echo Please wait...
xcopy "node_modules\*" "TWX-Parser-Standalone\app\node_modules\" /E /I /Q /Y
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy node_modules!
    pause
    exit /b 1
)
echo Done!
echo.

echo [5/6] Creating launcher script...
(
echo @echo off
echo title TWX Parser
echo color 0A
echo cd /d "%%~dp0"
echo.
echo ========================================
echo        TWX Parser - Web Interface
echo ========================================
echo.
echo Starting application...
echo.
echo set "PATH=%%~dp0node;%%PATH%%"
echo cd app
echo ..\node\node.exe app.js
echo.
echo if %%ERRORLEVEL%% NEQ 0 ^(
echo     echo.
echo     echo ========================================
echo     echo ERROR: Application failed to start
echo     echo ========================================
echo     echo.
echo     pause
echo ^)
) > "TWX-Parser-Standalone\TWX-Parser.bat"
echo Done!
echo.

echo [6/6] Creating README...
(
echo ================================================================================
echo                    TWX Parser - Standalone Version
echo ================================================================================
echo.
echo QUICK START:
echo ------------
echo Simply double-click "TWX-Parser.bat" to start!
echo.
echo NO INSTALLATION REQUIRED!
echo This version includes everything needed to run.
echo.
echo.
echo WHAT'S INCLUDED:
echo ----------------
echo - Node.js runtime ^(embedded^)
echo - Complete TWX Parser application
echo - All dependencies
echo - Static analysis tools
echo - Web interface
echo.
echo.
echo SYSTEM REQUIREMENTS:
echo --------------------
echo - Windows 7 or later
echo - 500 MB free disk space
echo - Web browser ^(Chrome, Firefox, Edge, etc.^)
echo.
echo.
echo HOW TO USE:
echo -----------
echo 1. Double-click "TWX-Parser.bat"
echo 2. A console window will open
echo 3. Your browser will open automatically
echo 4. Start using TWX Parser!
echo 5. Keep the console window open while using the app
echo.
echo.
echo TO STOP:
echo --------
echo Press Ctrl+C in the console window or close it.
echo.
echo.
echo DISTRIBUTION:
echo -------------
echo You can copy this entire folder to any Windows computer
echo and it will work without any installation!
echo.
echo Recommended: Zip the folder for easier distribution.
echo.
echo.
echo FOLDER SIZE:
echo ------------
echo Approximately 400-500 MB ^(includes Node.js + dependencies^)
echo.
echo ================================================================================
) > "TWX-Parser-Standalone\README.txt"
echo Done!
echo.

echo ========================================
echo   Verifying build...
echo ========================================
echo.

if not exist "TWX-Parser-Standalone\node\node.exe" (
    echo ERROR: node.exe not found!
    pause
    exit /b 1
)
echo Node.js: OK

if not exist "TWX-Parser-Standalone\app\app.js" (
    echo ERROR: app.js not found!
    pause
    exit /b 1
)
echo app.js: OK

if not exist "TWX-Parser-Standalone\app\src" (
    echo ERROR: src folder not found!
    pause
    exit /b 1
)
echo src folder: OK

if not exist "TWX-Parser-Standalone\app\node_modules" (
    echo ERROR: node_modules not found!
    pause
    exit /b 1
)
echo node_modules: OK

echo.
echo ========================================
echo   Build Completed Successfully!
echo ========================================
echo.
echo Location: TWX-Parser-Standalone\
echo.
echo TO TEST:
echo   1. Navigate to TWX-Parser-Standalone\
echo   2. Double-click TWX-Parser.bat
echo.
echo TO DISTRIBUTE:
echo   1. Zip the "TWX-Parser-Standalone" folder
echo   2. Send to users
echo   3. Users extract and run "TWX-Parser.bat"
echo.
echo ========================================
echo.
pause

