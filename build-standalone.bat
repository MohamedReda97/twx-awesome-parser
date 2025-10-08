@echo off
title TWX Parser - Standalone Build
color 0B

echo ========================================
echo   TWX Parser - Standalone Build
echo ========================================
echo.
echo This creates a version that works on ANY Windows
echo computer without requiring Node.js installation.
echo.
echo NOTE: You need to download Node.js portable first!
echo.
pause
echo.

REM Check if portable Node.js exists
if not exist "node-portable\node.exe" (
    echo ========================================
    echo   Node.js Portable Not Found!
    echo ========================================
    echo.
    echo Please download Node.js portable:
    echo.
    echo 1. Go to: https://nodejs.org/dist/v18.20.0/node-v18.20.0-win-x64.zip
    echo 2. Download and extract the ZIP file
    echo 3. Rename the extracted folder to "node-portable"
    echo 4. Place it in this project directory
    echo.
    echo The folder structure should be:
    echo   twx-awesome-parser/
    echo   ├── node-portable/
    echo   │   ├── node.exe
    echo   │   ├── npm
    echo   │   └── ...
    echo   ├── build-standalone.bat
    echo   └── ...
    echo.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo Node.js portable found!
echo.

REM Create standalone directory
if exist "TWX-Parser-Standalone" rmdir /S /Q "TWX-Parser-Standalone"
mkdir "TWX-Parser-Standalone"

REM Copy Node.js portable
echo [1/6] Copying Node.js portable...
xcopy "node-portable" "TWX-Parser-Standalone\node\" /E /I /Q /Y >nul

REM Copy application files
echo [2/6] Copying application files...
xcopy "src" "TWX-Parser-Standalone\app\src\" /E /I /Q /Y >nul
copy "app.js" "TWX-Parser-Standalone\app\" >nul
copy "start-viewer.js" "TWX-Parser-Standalone\app\" >nul
copy "package.json" "TWX-Parser-Standalone\app\" >nul
copy "twx-viewer-new.html" "TWX-Parser-Standalone\app\" >nul
copy "twx-viewer-new.css" "TWX-Parser-Standalone\app\" >nul
copy "twx-viewer-new.js" "TWX-Parser-Standalone\app\" >nul
copy "twx-viewer.html" "TWX-Parser-Standalone\app\" >nul
copy ".eslintrc.cjs" "TWX-Parser-Standalone\app\" >nul
copy "README.md" "TWX-Parser-Standalone\app\" >nul

REM Copy node_modules
echo [3/6] Copying dependencies (this may take 2-3 minutes)...
xcopy "node_modules" "TWX-Parser-Standalone\app\node_modules\" /E /I /Q /Y >nul

REM Create output directory
echo [4/6] Creating output directory...
mkdir "TWX-Parser-Standalone\app\output" >nul 2>&1

REM Create launcher
echo [5/6] Creating launcher...
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

REM Create README
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

echo.
echo ========================================
echo   Build Completed Successfully!
echo ========================================
echo.
echo Standalone version created in: TWX-Parser-Standalone\
echo.
echo This version includes Node.js and works on ANY Windows computer!
echo.
echo Folder size: ~400-500 MB
echo.
echo TO TEST:
echo   1. Navigate to TWX-Parser-Standalone\
echo   2. Double-click TWX-Parser.bat
echo.
echo TO DISTRIBUTE:
echo   1. Zip the "TWX-Parser-Standalone" folder
echo   2. Send to users
echo   3. Users extract and run "TWX-Parser.bat"
echo   4. NO installation needed!
echo.
echo ========================================
echo.
pause

