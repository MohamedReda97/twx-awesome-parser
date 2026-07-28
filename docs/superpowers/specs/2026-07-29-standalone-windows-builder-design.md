# Standalone Windows Builder Design

## Goal

Harden the existing `build.bat` so a developer can produce one self-contained `dist\twx-parser.exe`. The executable must run on 64-bit Windows 10 and Windows 11 without Node.js, npm, or installation on the target PC.

## Scope

Reuse the repository's existing `pkg` configuration and `node18-win-x64` target. Do not add another packager, installer, archive format, updater, or duplicate build script. Code signing and Windows SmartScreen reputation are outside this change.

The build PC requires Node.js, npm, and network access when npm must download dependencies. The target PC requires a browser and a writable launch directory because the application creates an `output` directory.

## Builder flow

Update the root `build.bat` to:

1. Change to the directory containing the batch file so it works when launched from another directory.
2. Fail with a clear message when Node.js or npm is unavailable.
3. Run `npm ci` to install the locked dependency tree.
4. Run `npm test` and stop if a test fails.
5. Run `npm run build`, which packages the application and embedded viewer assets.
6. Verify that `dist\twx-parser.exe` exists.
7. Run `dist\twx-parser.exe --help` as a non-interactive executable smoke test.
8. Print the absolute output path on success and return a nonzero exit code on failure.

Every external batch or npm command must use `call` where required so control returns to the builder. The script must preserve the failing command's nonzero result.

## Runtime behavior

No application runtime behavior changes are required. Double-clicking the executable continues to start the local web server and open the default browser. CLI parsing and `--help` continue to use the existing entry point.

The executable is portable across supported Windows x64 machines, not across operating systems or CPU architectures.

## Verification

Implementation is complete when:

- `npm test` passes;
- the batch file completes successfully from a working directory other than the repository root;
- `dist\twx-parser.exe` exists and is nonempty;
- `dist\twx-parser.exe --help` exits successfully without a system Node.js runtime;
- launching the executable starts the web UI and serves the embedded Analyzer assets.
