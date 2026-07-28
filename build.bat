@echo off
setlocal
cd /d "%~dp0" || (
  echo ERROR: Could not open the project directory.
  goto :failed
)

echo Building standalone TWX Parser for Windows x64...
echo.

where node >nul 2>&1 || (
  echo ERROR: Node.js is required on the build PC.
  goto :failed
)

where npm >nul 2>&1 || (
  echo ERROR: npm is required on the build PC.
  goto :failed
)

echo [1/4] Installing locked dependencies...
call npm ci || (
  echo ERROR: Dependency installation failed.
  goto :failed
)

echo [2/4] Running tests...
call npm test || (
  echo ERROR: Tests failed.
  goto :failed
)

echo [3/4] Building executable...
call npm run build || (
  echo ERROR: Executable build failed.
  goto :failed
)

if not exist "dist\twx-parser.exe" (
  echo ERROR: dist\twx-parser.exe was not created.
  goto :failed
)

for %%I in ("dist\twx-parser.exe") do if %%~zI LEQ 0 (
  echo ERROR: dist\twx-parser.exe is empty.
  goto :failed
)

echo [4/4] Smoke-testing executable...
"dist\twx-parser.exe" --help >nul 2>&1 || (
  echo ERROR: Executable smoke test failed.
  goto :failed
)

for %%I in ("dist\twx-parser.exe") do echo SUCCESS: %%~fI
if /i not "%~1"=="--no-pause" pause
exit /b 0

:failed
echo.
echo BUILD FAILED.
if /i not "%~1"=="--no-pause" pause
exit /b 1
