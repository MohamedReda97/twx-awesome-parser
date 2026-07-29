# Public Repository Cleanup and README Rebuild Plan

> **Execution note:** Follow this plan in order. Stop if a safety check fails. Do not use `git clean`, recursive wildcard deletion, or forced worktree removal.

**Goal:** Publish a small, understandable GitHub repository containing only the application source, supported launch/build scripts, tests, license, architecture documentation, and a rebuilt README.

**Approach:** Treat parser inputs, extracted TWX contents, generated JSON, executable output, design-session evidence, logs, and one-off diagnostics as local artifacts. Keep the actual Node.js application and the self-contained architecture presentation. Perform cleanup on an isolated branch, verify the app and executable, review the exact staged tree, then fast-forward `main` and push it.

**Current audit:** `main` is 18 commits ahead of `origin/main`. The remote already contains `ODC.twx`, 332 files under `ODC Example twx/`, 1,369 files under `example twx extracted/`, generated `output/`, and old `dist/` documentation. Local Git objects occupy about 287 MB. Deleting these paths from the latest commit will clean the GitHub file tree, but will not remove their old blobs from Git history.

## Final repository shape

Keep:

```text
.
├── .eslintignore
├── .eslintrc.js
├── .gitignore
├── LICENSE
├── README.md
├── app.js
├── build.bat
├── package.json
├── package-lock.json
├── start-server.bat
├── test-analyzer-ui.js
├── test-analyzer-v2.js
├── test-architecture-presentation.js
├── twx-viewer-new.css
├── twx-viewer-new.html
├── twx-viewer-new.js
├── docs/
│   ├── ARCHITECTURE.md
│   └── TWX-Architecture-Presentation.html
└── src/
    ├── classes/
    ├── parser/
    ├── search/
    ├── server/
    └── utils/
```

Do not commit:

- `.twx` packages or extracted TWX contents.
- Generated JSON (`output/`, `analysis.json`, `dependencies.json`).
- `dist/` or `twx-parser.exe`; publish the executable as a GitHub Release asset instead.
- Logs, server output, scratch scripts, copied XML, or captured diffs.
- `.omo/`, `.superdesign/`, `.superpowers/`, `graphify-out/`, `src/graphify-out/`, or local worktrees.
- Internal design plans, implementation plans, screenshot-capture scripts, or screenshots made from real application data.

## Task 1: Protect the current work and create the cleanup branch

**Files:** No file changes.

1. Record the current state without printing all 1,369 deleted paths:

   ```powershell
   git status --short | Group-Object { (($_.Substring(3).Trim('"')) -split '/|\\')[0] } | Select-Object Name, Count
   git log --oneline --decorate -20
   git worktree list --porcelain
   git branch --merged main
   ```

   Expected: `main` is ahead of `origin/main`; the three `codex/*` feature branches are listed as merged; existing modified screenshots and extracted-file deletions remain visible as working-tree changes.

2. Create an isolated cleanup branch while preserving all current working-tree changes:

   ```powershell
   git switch -c codex/public-repository-cleanup
   ```

3. Save a deletion inventory outside the repository so it cannot be accidentally committed:

   ```powershell
   git ls-files | Set-Content -Encoding utf8 "$env:TEMP\twx-parser-tracked-before-cleanup.txt"
   git status --short | Set-Content -Encoding utf8 "$env:TEMP\twx-parser-status-before-cleanup.txt"
   ```

4. Confirm the inventory files exist and the branch is correct:

   ```powershell
   Test-Path "$env:TEMP\twx-parser-tracked-before-cleanup.txt"
   git branch --show-current
   ```

   Expected: `True` and `codex/public-repository-cleanup`.

## Task 2: Replace `.gitignore` with project-specific rules

**Files:**

- Modify: `.gitignore`
- Modify: `.eslintignore`

1. Keep the existing standard Node exclusions that still apply, then add these explicit project rules:

   ```gitignore
   # Dependencies and caches
   node_modules/
   .npm/
   .eslintcache

   # Parser inputs and generated data
   *.twx
   output/
   temp/
   analysis.json
   dependencies.json

   # Build output
   dist/
   *.exe

   # Logs and local server output
   logs/
   *.log
   *.err
   server*.txt
   npm-debug.log*
   yarn-debug.log*
   yarn-error.log*

   # Local tools and agent workspaces
   .worktrees/
   .omo/
   .superdesign/
   .superpowers/
   graphify-out/
   src/graphify-out/
   ```

   Remove obsolete commented rules, duplicate entries, and project-specific names that no longer exist (`TWX example`, `test-output`, `test.js`, `test-remove.js`).

2. Make `.eslintignore` exclude only generated/local paths:

   ```text
   node_modules/
   dist/
   output/
   temp/
   .worktrees/
   .omo/
   .superdesign/
   .superpowers/
   graphify-out/
   src/graphify-out/
   ```

3. Verify representative files are ignored:

   ```powershell
   git check-ignore -v ODC.twx output/analysis.json dist/twx-parser.exe .omo/evidence/test.txt graphify-out/index.html
   ```

   Expected: every path is matched by a rule.

## Task 3: Remove committed inputs, generated output, and obsolete distribution files

**Files:**

- Delete: `ODC.twx`
- Delete: `ODC Example twx/`
- Confirm/stage existing deletion: `example twx extracted/`
- Delete: `output/`
- Delete: `dist/`

1. Verify each tracked target before deletion:

   ```powershell
   git ls-files -- ODC.twx "ODC Example twx" "example twx extracted" output dist | Group-Object { ($_ -split '/')[0] } | Select-Object Name, Count
   ```

   Expected counts from the audit: 1, 332, 1,369, 10, and 11 respectively.

2. Remove only the exact tracked targets:

   ```powershell
   git rm -- ODC.twx
   git rm -r -- "ODC Example twx"
   git add -u -- "example twx extracted"
   git rm -r -- output
   git rm -r -- dist
   ```

3. Verify no tracked artifact remains in the new index:

   ```powershell
   git ls-files | Select-String -Pattern '(^|/)(output|dist|example twx extracted|ODC Example twx)/|\.twx$'
   ```

   Expected: no output.

## Task 4: Remove obsolete root diagnostics and stale generated API documentation

**Files:**

- Delete tracked diagnostics:
  - `_check_cshs.js`
  - `_chk_pkgs.js`
  - `_committed_diff.txt`
  - `_cshs_odc.xml`
  - `_diff.txt`
  - `_head_check.js`
  - `_head_full.js`
  - `_head_orig.js`
  - `_inspect.js`
  - `_pkg.xml`
  - `_test_port.js`
  - `_test_smoke.js`
  - `out2.txt`
  - `server_out.txt`
  - `server-out.txt`
  - `server-output.txt`
  - `server.err`
  - `snip`
  - `temp_check5.js`
  - `test_analysis_fetch.js`
  - `test-final.js`
  - `test-server.ps1`
  - `api.md`
- Delete untracked diagnostics:
  - `check_bytype.js`
  - `check_es6.js`
  - `check_iv.js`
  - `check_removed.js`
  - `f.ruleId`
  - `_server.log`
  - `server.log`

1. Confirm none of the files is referenced by `package.json`, `app.js`, `src/`, the retained tests, or the viewer:

   ```powershell
   $names = @('_check_cshs','_chk_pkgs','_head_check','_head_full','_head_orig','_inspect','_test_port','_test_smoke','temp_check5','test_analysis_fetch','test-final','test-server','api.md')
   foreach ($name in $names) {
     rg -n --fixed-strings --glob '!node_modules/**' --glob '!output/**' --glob '!dist/**' --glob '!example twx extracted/**' --glob '!ODC Example twx/**' $name app.js src package.json test-analyzer-v2.js test-analyzer-ui.js twx-viewer-new.js twx-viewer-new.html
   }
   ```

   Expected: no references. `api.md` is obsolete because it documents the removed `getWorkspace(name, password)` API, while `src/index.js` exports `createWorkspace`, `parseTWX`, and `extractTWX`.

2. Remove tracked files with one exact `git rm` call:

   ```powershell
   git rm -- _check_cshs.js _chk_pkgs.js _committed_diff.txt _cshs_odc.xml _diff.txt _head_check.js _head_full.js _head_orig.js _inspect.js _pkg.xml _test_port.js _test_smoke.js out2.txt server_out.txt server-out.txt server-output.txt server.err snip temp_check5.js test_analysis_fetch.js test-final.js test-server.ps1 api.md
   ```

3. Remove the exact untracked files only when they exist:

   ```powershell
   $scratchFiles = @('check_bytype.js','check_es6.js','check_iv.js','check_removed.js','f.ruleId','_server.log','server.log')
   foreach ($file in $scratchFiles) {
     if (Test-Path -LiteralPath $file -PathType Leaf) { Remove-Item -LiteralPath $file }
   }
   ```

4. Confirm the retained root JavaScript files are only application code and supported tests:

   ```powershell
   Get-ChildItem -File *.js | Select-Object -ExpandProperty Name | Sort-Object
   ```

   Expected: `app.js`, `test-analyzer-ui.js`, `test-analyzer-v2.js`, `test-architecture-presentation.js`, and `twx-viewer-new.js`.

## Task 5: Curate public documentation

**Files:**

- Keep: `docs/ARCHITECTURE.md`
- Move: `TWX-Architecture-Presentation.html` to `docs/TWX-Architecture-Presentation.html`
- Keep and update: `test-architecture-presentation.js`
- Delete:
  - `docs/ANALYZER-PLAN.md`
  - `docs/APPROVED-UI-DESIGN.md`
  - `docs/IMPLEMENTATION-PLAN.md`
  - `docs/UI-DESIGN-SPEC.md`
  - `docs/UI-PROMOTION-PLAN.md`
  - `docs/capture-analyzer.cjs`
  - `docs/capture-new-views.cjs`
  - `docs/capture-screenshots.cjs`
  - `docs/screenshots/`
  - `docs/superpowers/`

1. Move the self-contained presentation under public documentation:

   ```powershell
   git add -- TWX-Architecture-Presentation.html test-architecture-presentation.js
   git mv -- TWX-Architecture-Presentation.html docs/TWX-Architecture-Presentation.html
   ```

2. Update `test-architecture-presentation.js` so its path is:

   ```js
   const file = path.join(__dirname, 'docs', 'TWX-Architecture-Presentation.html')
   ```

3. Remove internal plans, capture automation, and screenshots. Existing screenshots were created from real analyzed packages and are unsuitable for a public repository; the README will not embed them.

   ```powershell
   git rm -- docs/ANALYZER-PLAN.md docs/APPROVED-UI-DESIGN.md docs/IMPLEMENTATION-PLAN.md docs/UI-DESIGN-SPEC.md docs/UI-PROMOTION-PLAN.md docs/capture-analyzer.cjs docs/capture-new-views.cjs docs/capture-screenshots.cjs
   git rm -r -- docs/screenshots docs/superpowers
   if (Test-Path -LiteralPath docs/superpowers) { Remove-Item -LiteralPath docs/superpowers -Recurse }
   ```

   The final line removes this untracked execution plan after it has served its purpose; `docs/superpowers/` is intentionally absent from the public tree.

4. Validate the retained documentation:

   ```powershell
   Get-ChildItem docs -Recurse -File | Select-Object -ExpandProperty FullName
   node test-architecture-presentation.js
   ```

   Expected: only `ARCHITECTURE.md` and `TWX-Architecture-Presentation.html` remain under `docs/`; the presentation test passes.

## Task 6: Remove local-only tool output and safely retire merged worktrees

**Files:** Local-only cleanup; no tracked changes.

1. Remove exact local tool-output directories, excluding `.worktrees/`:

   ```powershell
   $localDirs = @('.omo','.superdesign','.superpowers','graphify-out','src/graphify-out','temp')
   foreach ($dir in $localDirs) {
     if (Test-Path -LiteralPath $dir -PathType Container) { Remove-Item -LiteralPath $dir -Recurse }
   }
   ```

2. Verify every linked worktree branch is merged and every worktree is clean:

   ```powershell
   git branch --merged main
   git -C .worktrees/codex-analyzer-findings-hierarchy status --short
   git -C .worktrees/codex-analyzer-v2 status --short
   git -C .worktrees/codex-hardcoded-value-review status --short
   ```

   Expected: all three branches are merged and all three status commands produce no output. If any worktree is dirty, stop and preserve its changes before continuing.

3. Remove linked worktrees with Git, never with recursive filesystem deletion:

   ```powershell
   git worktree remove .worktrees/codex-analyzer-findings-hierarchy
   git worktree remove .worktrees/codex-analyzer-v2
   git worktree remove .worktrees/codex-hardcoded-value-review
   git worktree prune
   ```

4. Delete only the already-merged local branches:

   ```powershell
   git branch -d codex/analyzer-findings-hierarchy codex/analyzer-v2 codex/hardcoded-value-review
   ```

5. Verify `.worktrees/` is absent or empty:

   ```powershell
   git worktree list
   Test-Path -LiteralPath .worktrees
   ```

## Task 7: Rebuild `README.md` and correct public package metadata

**Files:**

- Replace: `README.md`
- Modify: `package.json`
- Modify: `package-lock.json`

1. Replace `README.md` completely. Do not retain the npm badge or the obsolete UI-promotion-plan link. Use this section order:

   1. **TWX Awesome Parser** — one paragraph: a local Node.js/Windows tool for inspecting IBM BAW `.twx` process applications.
   2. **What it offers** — object inventory and type grouping, object details, search, dependency/where-used views, toolkit-aware resolution, and server-side script analysis.
   3. **How object types are identified** — explain that `META-INF/package.xml` supplies manifest object IDs/types, each `objects/<versionId>.xml` supplies details, numeric types are mapped through `src/utils/type-mappings.js` and registries, and process subtype `10` is grouped as CSHS while other process scripts are grouped as Service.
   4. **How the analyzer works** — app-owned server-side CSHS/Service/BPD scripts only; BAW 19/20/21/23/24 awareness; syntax/scope/control-flow checks; findings grouped as Confirmed critical, Confirmed warnings, and Needs review; UI nesting is finding type → element → details.
   5. **Toolkit behavior** — prominently state: toolkits are context that improves application-analysis accuracy; toolkit objects and services can satisfy app references, but toolkit code is not itself analyzed.
   6. **Architecture and call order** — include a compact Mermaid diagram: `app.js` → `src/server/web-server.js` → `src/parser/twx-extractor.js` → object/toolkit extractors → `src/parser/json-parser.js` → `src/parser/analyzer.js` → generated JSON → `twx-viewer-new.js`.
   7. **Quick start from source** — prerequisites Node.js `20.19+`, `npm ci`, then `start-server.bat` on Windows or `npm start`; explain that the browser opens on a random localhost port.
   8. **CLI usage** — `node app.js parse C:\path\to\application.twx`, output goes to `output/`.
   9. **Standalone Windows build** — run `build.bat`; output is `dist/twx-parser.exe`; the build machine needs Node/npm, while the resulting executable targets Windows x64 and does not require Node on the target PC. Do not claim support for every operating system or CPU.
   10. **Generated files** — briefly name `twx-summary.json`, grouped object JSON, toolkit/combined object JSON, `dependencies.json`, and `analysis.json`; state they are local and intentionally ignored.
   11. **Project structure** — describe `app.js`, `src/parser`, `src/server`, `src/search`, viewer assets, tests, and `docs/ARCHITECTURE.md`.
   12. **Testing** — `npm test`, `npm run lint`, `build.bat --no-pause`.
   13. **Scope and limitations** — static analysis is advisory, only supported server-side BAW scripts are analyzed, and version-specific checks may be skipped when BAW version metadata is unavailable.
   14. **Privacy** — parsing runs locally; users should not commit TWX packages or generated output because they may contain proprietary process definitions.
   15. **Documentation and license** — link `docs/ARCHITECTURE.md`, `docs/TWX-Architecture-Presentation.html`, and `LICENSE`.

2. Ensure every command and claim matches the current code:

   ```powershell
   node app.js --help
   rg -n "case '/api/|module\.exports|listen\(" src/server/web-server.js
   rg -n "module\.exports|parseTWX|extractTWX|createWorkspace" src/index.js
   ```

3. Correct `package.json` public metadata:

   - Repository: `https://github.com/MohamedReda97/twx-awesome-parser.git`
   - Bugs: `https://github.com/MohamedReda97/twx-awesome-parser/issues`
   - Homepage: `https://github.com/MohamedReda97/twx-awesome-parser#readme`
   - Node engine: `>=20.19.0`, matching the installed `eslint-scope` runtime requirement.
   - Add `node test-architecture-presentation.js` to the existing `npm test` chain.
   - Preserve the existing MIT license and original author attribution.

4. Refresh the lockfile metadata without changing dependency versions:

   ```powershell
   npm install --package-lock-only --ignore-scripts
   ```

5. Verify the README contains required facts and no stale links:

   ```powershell
   rg -n "toolkit|server-side|BAW 19|Windows x64|Node\.js 20\.19|ARCHITECTURE|Architecture-Presentation" README.md
   rg -n "tigermarques|UI-PROMOTION-PLAN|works on any pc|works on any PC" README.md package.json
   ```

   Expected: the first search finds all required topics; the second search returns no results.

## Task 8: Run release verification

**Files:** No intended source changes. `npm run build` creates ignored `dist/twx-parser.exe` and generated local output.

1. Reinstall exactly the locked dependencies:

   ```powershell
   npm ci
   ```

2. Run automated tests and lint:

   ```powershell
   npm test
   npm run lint
   ```

   Expected: all analyzer, analyzer UI, and architecture-presentation checks pass; ESLint exits zero.

3. Build and smoke-test the standalone executable:

   ```powershell
   .\build.bat --no-pause
   .\dist\twx-parser.exe --help
   ```

   Expected: `dist\twx-parser.exe` exists, is non-empty, and prints usage successfully.

4. Verify the executable is ignored and no generated output is staged:

   ```powershell
   git check-ignore -v dist/twx-parser.exe output/analysis.json analysis.json dependencies.json
   git status --short
   ```

5. Remove generated verification output locally, but leave the ignored executable available for manual testing:

   ```powershell
   foreach ($path in @('output','analysis.json','dependencies.json')) {
     if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse }
   }
   ```

## Task 9: Audit and commit the final tree

**Files:** All intended cleanup, documentation, metadata, and README changes.

1. List the final tracked tree and scan for forbidden paths:

   ```powershell
   git ls-files
   git ls-files | Select-String -Pattern '(^|/)(output|dist|temp|graphify-out|\.omo|\.superdesign|\.superpowers|\.worktrees)/|\.twx$|server.*\.(txt|log|err)$'
   ```

   Expected: the first list matches the final repository shape; the second command returns no output.

2. Check repository size and largest files in the proposed commit:

   ```powershell
   git ls-files | ForEach-Object {
     if (Test-Path -LiteralPath $_ -PathType Leaf) {
       $item = Get-Item -LiteralPath $_
       [pscustomobject]@{ KB=[math]::Round($item.Length/1KB,1); Path=$_ }
     }
   } | Sort-Object KB -Descending | Select-Object -First 20
   ```

   Expected: no TWX, ZIP, generated JSON, executable, or real-application screenshot is present.

3. Stage intentionally; do not use `git add .`:

   ```powershell
   git add -u
   git add -- .gitignore .eslintignore README.md package.json package-lock.json docs/TWX-Architecture-Presentation.html test-architecture-presentation.js
   ```

4. Review the exact staged result:

   ```powershell
   git diff --cached --stat
   git diff --cached --check
   git status --short
   ```

5. Commit the atomic public-release cleanup:

   ```powershell
   git commit -m "chore: prepare repository for public release"
   ```

6. Re-run the core checks from the committed tree:

   ```powershell
   npm test
   npm run lint
   git status --short
   ```

   Expected: tests and lint pass; only ignored local build output may remain, and `git status --short` is empty.

## Task 10: Decide whether to rewrite old large-file history

**Files:** Git history only. This is intentionally separate from normal cleanup.

The current remote already contains about 287 MB of historical packed objects, including the TWX packages and extracted data. A normal deletion commit removes them from the visible latest tree but not from clone history.

Default, safe choice: preserve history and skip this task. Use this if the repository has collaborators, tags, forks, or published commit links.

Only with explicit approval, and only if the repository can tolerate a force-push:

1. Make a full backup clone outside the working repository.
2. Install and use `git filter-repo` in a fresh clone to remove these exact historical paths:

   ```powershell
   git filter-repo --path ODC.twx --path "ODC Example twx" --path "example twx extracted" --path output --path dist --invert-paths
   ```

3. Verify the rewritten clone with `git fsck --full`, `git count-objects -vH`, `npm ci`, `npm test`, and `npm run lint`.
4. Force-push only after confirming no collaborator depends on the old commit IDs.

Do not run history rewriting as part of ordinary plan execution without a separate user decision.

## Task 11: Fast-forward `main` and publish

**Files:** No new changes after the cleanup commit.

1. Fast-forward local `main`:

   ```powershell
   git switch main
   git merge --ff-only codex/public-repository-cleanup
   ```

2. Confirm the branch and final commit:

   ```powershell
   git status --short
   git log --oneline --decorate -3
   git diff --stat origin/main...main
   ```

3. Push the reviewed final tree:

   ```powershell
   git push origin main
   ```

4. Verify GitHub shows only the intended source tree and that the README renders correctly.

5. If distributing the executable, create a GitHub Release and attach `dist/twx-parser.exe`; do not add the binary back to Git.

## Completion criteria

- The GitHub default branch contains no TWX package, extracted app/toolkit data, generated JSON, executable, log, scratch script, internal plan, agent output, or real-data screenshot.
- `README.md` accurately describes capabilities, type identification, analyzer scope, toolkit context, architecture, launch/build commands, limitations, and privacy.
- Repository links point to `MohamedReda97/twx-awesome-parser` and original MIT attribution remains intact.
- `npm test`, `npm run lint`, `build.bat --no-pause`, and the executable help smoke test pass.
- Local `main` is clean and pushed only after staged-diff review.
- History rewriting is performed only after separate explicit approval.
