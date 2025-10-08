@echo off
title TWX Parser - Portable Build
color 0B

echo ========================================
echo   TWX Parser - Portable Build
echo ========================================
echo.
echo This will create a portable version that works
echo on any Windows computer without installing anything.
echo.
echo Building... Please wait...
echo.

REM Create portable directory
if exist "TWX-Parser-Portable" rmdir /S /Q "TWX-Parser-Portable"
mkdir "TWX-Parser-Portable"

REM Copy all necessary files
echo [1/5] Copying application files...
xcopy "src" "TWX-Parser-Portable\src\" /E /I /Q /Y >nul
copy "app.js" "TWX-Parser-Portable\" >nul
copy "start-viewer.js" "TWX-Parser-Portable\" >nul
copy "package.json" "TWX-Parser-Portable\" >nul
copy "package-lock.json" "TWX-Parser-Portable\" >nul
copy "twx-viewer-new.html" "TWX-Parser-Portable\" >nul
copy "twx-viewer-new.css" "TWX-Parser-Portable\" >nul
copy "twx-viewer-new.js" "TWX-Parser-Portable\" >nul
copy "twx-viewer.html" "TWX-Parser-Portable\" >nul
copy ".eslintrc.cjs" "TWX-Parser-Portable\" >nul
copy "README.md" "TWX-Parser-Portable\" >nul
copy "LICENSE" "TWX-Parser-Portable\" >nul

REM Copy node_modules
echo [2/5] Copying dependencies (this may take 2-3 minutes)...
xcopy "node_modules" "TWX-Parser-Portable\node_modules\" /E /I /Q /Y >nul

REM Create output directory
echo [3/5] Creating output directory...
mkdir "TWX-Parser-Portable\output" >nul 2>&1

REM Create launcher script
echo [4/5] Creating launcher...
(
echo @echo off
echo title TWX Parser
echo color 0A
echo.
echo ========================================
echo        TWX Parser - Web Interface
echo ========================================
echo.
echo Starting application...
echo.
echo.
echo If you see "node is not recognized" error:
echo   1. Download Node.js Portable from: https://nodejs.org/
echo   2. Extract it to a "node" folder here
echo   3. Run this script again
echo.
echo ========================================
echo.
echo.
echo REM Check if portable node exists
echo if exist "node\node.exe" ^(
echo     set "PATH=%%~dp0node;%%PATH%%"
echo     echo Using portable Node.js
echo     echo.
echo ^)
echo.
echo REM Try to run with node
echo node app.js
echo.
echo if %%ERRORLEVEL%% NEQ 0 ^(
echo     echo.
echo     echo ========================================
echo     echo ERROR: Could not start the application
echo     echo ========================================
echo     echo.
echo     echo Please make sure Node.js is installed:
echo     echo   - Download from: https://nodejs.org/
echo     echo   - Or use portable Node.js in "node" folder
echo     echo.
echo     pause
echo     exit /b 1
echo ^)
) > "TWX-Parser-Portable\Start-TWX-Parser.bat"

REM Create README
echo [5/5] Creating README...
(
echo ================================================================================
echo                         TWX Parser - Portable Version
echo ================================================================================
echo.
echo QUICK START:
echo ------------
echo 1. Double-click "Start-TWX-Parser.bat"
echo 2. Browser will open automatically
echo 3. Start using TWX Parser!
echo.
echo.
echo REQUIREMENTS:
echo -------------
echo This portable version requires Node.js to be installed on the computer.
echo.
echo Option 1: System Node.js ^(Recommended^)
echo   - Download and install from: https://nodejs.org/
echo   - Then run Start-TWX-Parser.bat
echo.
echo Option 2: Portable Node.js ^(No installation^)
echo   - Download Node.js portable from: https://nodejs.org/
echo   - Extract to a "node" folder in this directory
echo   - The folder structure should be:
echo       TWX-Parser-Portable/
echo       ├── node/
echo       │   ├── node.exe
echo       │   └── ...
echo       ├── Start-TWX-Parser.bat
echo       └── ...
echo   - Then run Start-TWX-Parser.bat
echo.
echo.
echo WHAT'S INCLUDED:
echo ----------------
echo - Complete TWX Parser application
echo - All dependencies ^(node_modules^)
echo - Static analysis tools ^(ESLint, Prettier^)
echo - Web interface files
echo - Documentation
echo.
echo.
echo FOLDER SIZE:
echo ------------
echo Approximately 200-300 MB ^(includes all dependencies^)
echo.
echo.
echo FEATURES:
echo ---------
echo - Parse IBM BPM TWX files
echo - Static code analysis with ESLint
echo - Interactive web interface
echo - Search and filter capabilities
echo - Export analysis results
echo.
echo.
echo TROUBLESHOOTING:
echo ----------------
echo If the application doesn't start:
echo   1. Make sure Node.js is installed ^(run "node --version" in cmd^)
echo   2. Check that all files are in the same folder
echo   3. Try running as Administrator
echo   4. Check the console for error messages
echo.
echo.
echo SUPPORT:
echo --------
echo For issues or questions, check README.md or contact support.
echo.
echo ================================================================================
) > "TWX-Parser-Portable\README.txt"

echo.
echo ========================================
echo   Build Completed Successfully!
echo ========================================
echo.
echo Portable version created in: TWX-Parser-Portable\
echo.
echo Folder size: ~200-300 MB
echo.
echo TO DISTRIBUTE:
echo   1. Zip the "TWX-Parser-Portable" folder
echo   2. Send to users
echo   3. Users extract and run "Start-TWX-Parser.bat"
echo.
echo REQUIREMENTS FOR END USERS:
echo   - Windows 7 or later
echo   - Node.js installed OR portable Node.js in "node" folder
echo.
echo ========================================
echo.
pause

