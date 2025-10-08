# TWX Parser - Standalone Build Script (PowerShell)
# This is more reliable than batch files for copying large directories

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TWX Parser - Standalone Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if portable Node.js exists
if (-not (Test-Path "node-portable\node.exe")) {
    Write-Host "ERROR: Node.js Portable Not Found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download Node.js portable:"
    Write-Host "  https://nodejs.org/dist/v18.20.0/node-v18.20.0-win-x64.zip"
    Write-Host ""
    Write-Host "Extract and rename to 'node-portable' in this folder."
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Node.js portable found: OK" -ForegroundColor Green
Write-Host ""

# Remove old build
if (Test-Path "TWX-Parser-Standalone") {
    Write-Host "Removing old build..." -ForegroundColor Yellow
    Remove-Item "TWX-Parser-Standalone" -Recurse -Force
}

# Create directories
Write-Host "Creating directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "TWX-Parser-Standalone" -Force | Out-Null
New-Item -ItemType Directory -Path "TWX-Parser-Standalone\node" -Force | Out-Null
New-Item -ItemType Directory -Path "TWX-Parser-Standalone\app" -Force | Out-Null
New-Item -ItemType Directory -Path "TWX-Parser-Standalone\app\output" -Force | Out-Null
Write-Host "Done!" -ForegroundColor Green
Write-Host ""

# Copy Node.js
Write-Host "[1/6] Copying Node.js portable..." -ForegroundColor Cyan
Write-Host "This may take a moment..." -ForegroundColor Gray
try {
    Copy-Item "node-portable\*" "TWX-Parser-Standalone\node\" -Recurse -Force
    Write-Host "Done!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to copy Node.js!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Copy src folder
Write-Host "[2/6] Copying application source files..." -ForegroundColor Cyan
try {
    Copy-Item "src" "TWX-Parser-Standalone\app\src" -Recurse -Force
    Write-Host "Done!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to copy src folder!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Copy application files
Write-Host "[3/6] Copying application files..." -ForegroundColor Cyan
$files = @(
    "app.js",
    "start-viewer.js",
    "package.json",
    "twx-viewer-new.html",
    "twx-viewer-new.css",
    "twx-viewer-new.js",
    "twx-viewer.html",
    ".eslintrc.cjs",
    "README.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file "TWX-Parser-Standalone\app\" -Force
    }
}
Write-Host "Done!" -ForegroundColor Green
Write-Host ""

# Copy node_modules
Write-Host "[4/6] Copying dependencies..." -ForegroundColor Cyan
Write-Host "This will take 2-3 minutes. Please wait..." -ForegroundColor Gray
try {
    Copy-Item "node_modules" "TWX-Parser-Standalone\app\node_modules" -Recurse -Force
    Write-Host "Done!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to copy node_modules!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Create launcher script
Write-Host "[5/6] Creating launcher script..." -ForegroundColor Cyan
$launcherContent = @'
@echo off
title TWX Parser
color 0A
cd /d "%~dp0"

========================================
       TWX Parser - Web Interface
========================================

Starting application...

set "PATH=%~dp0node;%PATH%"
cd app
..\node\node.exe app.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo ERROR: Application failed to start
    echo ========================================
    echo.
    pause
)
'@

$launcherContent | Out-File "TWX-Parser-Standalone\TWX-Parser.bat" -Encoding ASCII
Write-Host "Done!" -ForegroundColor Green
Write-Host ""

# Create README
Write-Host "[6/6] Creating README..." -ForegroundColor Cyan
$readmeContent = @'
================================================================================
                   TWX Parser - Standalone Version
================================================================================

QUICK START:
------------
Simply double-click "TWX-Parser.bat" to start!

NO INSTALLATION REQUIRED!
This version includes everything needed to run.


WHAT'S INCLUDED:
----------------
- Node.js runtime (embedded)
- Complete TWX Parser application
- All dependencies
- Static analysis tools
- Web interface


SYSTEM REQUIREMENTS:
--------------------
- Windows 7 or later
- 500 MB free disk space
- Web browser (Chrome, Firefox, Edge, etc.)


HOW TO USE:
-----------
1. Double-click "TWX-Parser.bat"
2. A console window will open
3. Your browser will open automatically
4. Start using TWX Parser!
5. Keep the console window open while using the app


TO STOP:
--------
Press Ctrl+C in the console window or close it.


DISTRIBUTION:
-------------
You can copy this entire folder to any Windows computer
and it will work without any installation!

Recommended: Zip the folder for easier distribution.


FOLDER SIZE:
------------
Approximately 400-500 MB (includes Node.js + dependencies)

================================================================================
'@

$readmeContent | Out-File "TWX-Parser-Standalone\README.txt" -Encoding UTF8
Write-Host "Done!" -ForegroundColor Green
Write-Host ""

# Verify build
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verifying build..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

if (Test-Path "TWX-Parser-Standalone\node\node.exe") {
    Write-Host "Node.js: OK" -ForegroundColor Green
} else {
    Write-Host "Node.js: MISSING" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path "TWX-Parser-Standalone\app\app.js") {
    Write-Host "app.js: OK" -ForegroundColor Green
} else {
    Write-Host "app.js: MISSING" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path "TWX-Parser-Standalone\app\src") {
    Write-Host "src folder: OK" -ForegroundColor Green
} else {
    Write-Host "src folder: MISSING" -ForegroundColor Red
    $allGood = $false
}

if (Test-Path "TWX-Parser-Standalone\app\node_modules") {
    Write-Host "node_modules: OK" -ForegroundColor Green
} else {
    Write-Host "node_modules: MISSING" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

if ($allGood) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Build Completed Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Location: TWX-Parser-Standalone\" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "TO TEST:" -ForegroundColor Yellow
    Write-Host "  1. Navigate to TWX-Parser-Standalone\"
    Write-Host "  2. Double-click TWX-Parser.bat"
    Write-Host ""
    Write-Host "TO DISTRIBUTE:" -ForegroundColor Yellow
    Write-Host "  1. Zip the 'TWX-Parser-Standalone' folder"
    Write-Host "  2. Send to users"
    Write-Host "  3. Users extract and run 'TWX-Parser.bat'"
    Write-Host ""
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Build Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Some files are missing. Please check the errors above." -ForegroundColor Red
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"

