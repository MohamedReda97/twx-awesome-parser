@echo off
echo Building TWX Parser executable...
echo.

REM Create dist directory if it doesn't exist
if not exist "dist" mkdir dist

REM Run pkg to build the executable
echo Running pkg build...
npm run build

echo.
echo Build completed! Check the dist folder for the executable.
pause
