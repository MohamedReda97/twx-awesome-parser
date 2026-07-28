# Standalone Windows Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden `build.bat` so it reliably produces and validates one self-contained Windows x64 executable.

**Architecture:** Keep the installed `pkg` packaging flow and make the root batch file its fail-fast orchestrator. The batch file owns prerequisite checks, locked dependency installation, tests, packaging, artifact validation, smoke testing, and user-facing status; application runtime code remains unchanged.

**Tech Stack:** Windows Batch, npm, Node.js, `pkg` 5.8.1, PowerShell verification commands

## Global Constraints

- Produce `dist\twx-parser.exe` for 64-bit Windows 10 and Windows 11.
- The target PC must not require Node.js, npm, or installation.
- Reuse `pkg` and the existing `node18-win-x64` target; add no packager, installer, archive format, updater, or duplicate builder.
- Preserve the existing double-click UI, CLI parsing, and `--help` runtime behavior.
- Code signing and Windows SmartScreen reputation remain out of scope.

---

### Task 1: Harden and verify the standalone builder

**Files:**
- Modify: `build.bat`
- Modify: `docs/superpowers/plans/2026-07-29-standalone-windows-builder.md`

**Interfaces:**
- Consumes: `package-lock.json`, the `npm test` and `npm run build` scripts, and `dist\twx-parser.exe --help`.
- Produces: `build.bat [--no-pause]`, returning `0` only after a successful verified build and returning nonzero after any failure.

- [ ] **Step 1: Demonstrate the current missing-prerequisite failure**

Run the existing builder with a PATH that contains Windows system tools but not Node.js or npm:

```powershell
cmd /d /c "set PATH=%SystemRoot%\System32&& call build.bat --no-pause < nul"
if ($LASTEXITCODE -eq 0) { throw 'Existing builder incorrectly reported success without Node.js' }
```

Expected before the change: the assertion throws because the current builder prints success and returns `0` after npm is not found.

- [ ] **Step 2: Implement the fail-fast batch flow**

Replace `build.bat` with:

```bat
@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 (
  echo ERROR: Could not open the project directory.
  goto :failed
)

echo Building standalone TWX Parser for Windows x64...
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is required on the build PC.
  goto :failed
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm is required on the build PC.
  goto :failed
)

echo [1/4] Installing locked dependencies...
call npm ci
if errorlevel 1 (
  echo ERROR: Dependency installation failed.
  goto :failed
)

echo [2/4] Running tests...
call npm test
if errorlevel 1 (
  echo ERROR: Tests failed.
  goto :failed
)

echo [3/4] Building executable...
call npm run build
if errorlevel 1 (
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
"dist\twx-parser.exe" --help >nul 2>&1
if errorlevel 1 (
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
```

- [ ] **Step 3: Verify the prerequisite error path**

```powershell
cmd /d /c "set PATH=%SystemRoot%\System32&& call build.bat --no-pause < nul"
if ($LASTEXITCODE -ne 1) { throw "Expected exit 1, got $LASTEXITCODE" }
```

Expected: the builder prints `ERROR: Node.js is required on the build PC.` and returns `1` without running npm.

- [ ] **Step 4: Build from outside the repository**

```powershell
$repo = (git rev-parse --show-toplevel).Trim()
Push-Location $env:TEMP
try { & "$repo\build.bat" --no-pause } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw "Builder failed with exit $LASTEXITCODE" }
```

Expected: dependencies install, both analyzer test scripts pass, `pkg` completes, and the builder prints the absolute executable path.

- [ ] **Step 5: Verify the artifact without Node.js on PATH**

```powershell
$exe = (Resolve-Path 'dist\twx-parser.exe').Path
$savedPath = $env:PATH
try {
  $env:PATH = "$env:SystemRoot\System32"
  $help = & $exe --help
  if ($LASTEXITCODE -ne 0 -or $help -notmatch 'TWX Parser Application') { throw 'Packaged --help smoke test failed' }
} finally {
  $env:PATH = $savedPath
}
if ((Get-Item $exe).Length -le 0) { throw 'Executable is empty' }
```

Expected: the embedded executable prints its help and exits successfully while `node` and `npm` are unavailable through PATH.

- [ ] **Step 6: Verify the web UI manually**

Launch `dist\twx-parser.exe`, confirm the browser opens, parse a TWX file, and confirm the Analyzer page loads its embedded CSS and JavaScript. Stop the executable with Ctrl+C after verification.

- [ ] **Step 7: Run final checks and commit**

```powershell
npm test
git diff --check -- build.bat docs/superpowers/plans/2026-07-29-standalone-windows-builder.md
git add -- build.bat docs/superpowers/plans/2026-07-29-standalone-windows-builder.md
git diff --cached --check
git commit -m "build: harden standalone Windows executable builder"
```
