@echo off
echo Starting TWX Parser Web Server...
cd /d "%~dp0"
echo.
echo If the browser doesn't open automatically, 
echo manually navigate to the URL shown below:
echo.
node app.js --ui
echo.
echo Press any key to exit...
pause
