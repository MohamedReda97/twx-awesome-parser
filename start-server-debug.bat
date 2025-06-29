@echo off
echo Starting TWX Parser Web Server with Enhanced Logging...
cd /d "%~dp0"
echo.
echo Server will start shortly. Watch for any error messages.
echo If the browser doesn't open automatically, manually navigate to the URL shown.
echo.
node app.js --ui 2>&1
echo.
echo Server has stopped. Check above for any error messages.
pause
