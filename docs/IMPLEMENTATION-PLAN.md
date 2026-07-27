# Plan A — Fix the 9 issues

> Approved approach: **Phase 0 = B** (delete the dead DB-backed pipeline). The README is the only known caller of the old API and it gets rewritten as part of this plan, so the cost of deletion is small.
>
> **Always-commit rule:** every issue gets its own git commit. Per-issue commits, not one big "issues" commit. Commit messages use the existing `git log` style (short imperative, no scope).

---

## Lane ownership map

Each lane is one Fixer session. File ownership is exclusive — no two lanes edit the same file. Conflicts are impossible by construction.

| Lane | Issues | Files owned |
|---|---|---|
| **F1** | 2 (delete dead pipeline) | `src/parser/object/` (all 25), `src/parser/package/index.js`, `src/parser/index.js`, `src/classes/Workspace.js`, `src/classes/Registry.js`, `src/db/` (all) |
| **F2** | 6 (delete XML.js) + 9 (cleanup) | `src/utils/XML.js` (delete), root `*.md` (delete), root `test-*.html` (delete), `.kiro/` (delete), `.gitignore` (edit) |
| **F3** | 3 (cross-ref) + 7 (filename helper) | `src/parser/json-parser.js`, new `src/utils/file-names.js`, `src/classes/JSONWorkspace.js` |
| **F4** | 4 (pkg clean) + 5 (delete start-viewer) | `package.json`, `start-viewer.js` (delete), `start-viewer.bat` (delete) |
| **F5** | 8 (app.js server) | `app.js` |
| **F6** | 1 (README) | `README.md` (after F1, F3, F4 land) |
| **F7** | 10 (god class refactor) | `src/parser/twx-extractor.js` (split into 3 files), new `src/parser/package-xml-parser.js`, new `src/parser/object-extractor.js`, new `src/parser/toolkit-extractor.js` (after F1 lands) |

---

## Phased dispatch (max parallelism, no write conflicts)

### Phase 1 — 5 agents in parallel

- **F1** runs alone (biggest delete, no shared files)
- **F2** runs alone (different file set entirely)
- **F3** runs alone (json-parser.js untouched by anyone else)
- **F4** runs alone (package.json + start-viewer, not touched by F1/F2/F3)
- **F5** runs alone (app.js not touched by anyone else)

**F6** and **F7** are blocked on Phase 1 commits and run in Phase 2.

### Phase 2 — 3 agents in parallel

- **F6** (README rewrite) — needs F1, F3, F4 commits to know the final API
- **F7** (god class refactor) — needs F1 to have deleted the old pipeline so the touched surface is smaller
- **Fixer-UI** (build the new viewer per Designer-UI's spec)

### Phase 3 — QC

- **QC-A** reviews all 9 issues (after Phase 2)
- **QC-UI-impl** reviews the new viewer (after Phase 2)

---

## Issue details (each lane is a separate Fixer session with its own commit)

### F1 — Issue 2: delete the dead DB-backed pipeline

**Commit message:** `Delete dead DB-backed pipeline (Workspace, Registry, src/db)`

**What to do:**
1. `git rm -r src/parser/object/ src/parser/package/ src/parser/index.js src/classes/Workspace.js src/classes/Registry.js src/db/`
2. `git commit -m "Delete dead DB-backed pipeline (Workspace, Registry, src/db)"`
3. Verify `src/index.js`, `app.js`, `src/parser/json-parser.js`, `src/parser/twx-extractor.js` still parse and don't reference any removed symbols. If they do, fix and amend.
4. `node app.js parse <any small fixture>` succeeds (use `docs/prototype-viewer/`'s fixture if no real .twx available — or write a minimal stub .twx).
5. `git status` clean except for the commit you just made.

**Acceptance:** `git log -1` shows the commit, `git grep Registry` returns nothing under `src/`, `git grep "from.*classes/Workspace"` returns nothing under `src/`, the CLI parse smoke test exits 0.

---

### F2 — Issues 6 + 9: delete `XML.js` and clean up root clutter

**Commit 1 message:** `Remove unused src/utils/XML.js and clean up repo root`

**What to do (commit 1):**
1. `grep -r "utils/XML" src/ docs/ 2>/dev/null` — confirm zero callers. If a caller exists, port the helper inline before deleting.
2. `git rm src/utils/XML.js`
3. `git rm BUILD-SUCCESS-SUMMARY.md BUSINESS-OBJECTS-DISPLAY-IMPLEMENTATION.md IMPLEMENTATION-COMPLETE.md PROJECT-CLEANUP-SUMMARY.md QUICK-START-GUIDE.md test-business-objects-complete.html test-circular-references.html`
4. `git rm -r .kiro`
5. `git commit -m "Remove unused src/utils/XML.js and clean up repo root"`

**Commit 2 message:** `Untrack dist/twx-parser.exe`

**What to do (commit 2):**
1. Edit `.gitignore` to add `dist/twx-parser.exe`
2. `git rm --cached dist/twx-parser.exe`
3. `git commit -m "Untrack dist/twx-parser.exe (build artifact)"`

**Acceptance:** Two commits land, the 9 named files are gone, `git ls-files | grep -E "(BUILD-SUCCESS|BUSINESS-OBJECTS|IMPLEMENTATION-COMPLETE|PROJECT-CLEANUP|QUICK-START|test-business-objects|test-circular|.kiro|utils/XML.js)"` returns nothing, the CLI parse smoke test still exits 0.

---

### F3 — Issues 3 + 7: cross-ref deduplication + shared filename helper

**Commit 1 message:** `Deduplicate business-object cross-reference resolution`

**What to do (commit 1):**
1. Open `src/parser/json-parser.js` lines 36–43 (the `JSONParser#parseTWX` method).
2. Delete the second `resolveBusinessObjectCrossReferences` call. Keep only the one inside `TWXExtractor#extractTWX`.
3. Confirm the CLI parse path (which goes through `extractTWX` then `createJSONOutput`) and the library path (which goes through `JSONParser#parseTWX`) now both run the resolve exactly once, on the combined app+toolkit object set.
4. Verify with a fixture: parse the same `.twx` via `app.js parse` and via `JSONParser`, `diff -r output/ output/`. They should be byte-identical.
5. `git add src/parser/json-parser.js && git commit -m "Deduplicate business-object cross-reference resolution"`

**Commit 2 message:** `Add shared objectTypeFileName helper, use it in JSONParser and JSONWorkspace`

**What to do (commit 2):**
1. Create `src/utils/file-names.js` exporting:
   - `objectTypeFileName(typeName)` → `objects-${typeName.toLowerCase().replace(/\s+/g, '-')}.json`
   - `toolkitObjectTypeFileName(typeName)` → `toolkit-objects-<type>.json`
   - `combinedObjectTypeFileName(typeName)` → `combined-objects-<type>.json`
2. Update `src/parser/json-parser.js` to use `objectTypeFileName` / `combinedObjectTypeFileName` in `generateObjectsByTypeFiles` and `generateCombinedObjectsByTypeFiles`.
3. Update `src/classes/JSONWorkspace.js` to use `objectTypeFileName` in `getObjectDetails`.
4. Add a tiny self-check at the bottom of `file-names.js`:
   ```js
   if (require.main === module) {
     console.assert(objectTypeFileName('Business Object') === 'objects-business-object.json')
     console.assert(toolkitObjectTypeFileName('CSHS') === 'toolkit-objects-cshs.json')
     console.log('file-names: OK')
   }
   ```
5. `git add src/utils/file-names.js src/parser/json-parser.js src/classes/JSONWorkspace.js && git commit -m "Add shared objectTypeFileName helper, use it in JSONParser and JSONWorkspace"`

**Acceptance:** Two commits land, fixture diff is empty, the `file-names.js` self-check prints `OK` when run as `node src/utils/file-names.js`.

---

### F4 — Issues 4 + 5: pkg cleans output before build, delete start-viewer

**Commit 1 message:** `Clean output/ before pkg build, drop output/*.json from assets`

**What to do (commit 1):**
1. Open `package.json`. Find the `build` script: `"build": "pkg . --out-path dist --targets node18-win-x64"`.
2. Replace it with a node command that cleans `output/` then runs `pkg`. Use a cross-platform node one-liner, not `rm -rf`:
   ```json
   "build": "node -e \"require('fs').rmSync('output', { recursive: true, force: true }); require('fs').mkdirSync('output');\" && pkg . --out-path dist --targets node18-win-x64"
   ```
3. Remove `"output/*.json"` from the `pkg.assets` array (the line `      "output/*.json",` and the trailing comma if it leaves a dangling one).
4. `git add package.json && git commit -m "Clean output/ before pkg build, drop output/*.json from assets"`

**Commit 2 message:** `Remove start-viewer.js and start-viewer.bat`

**What to do (commit 2):**
1. `git rm start-viewer.js start-viewer.bat`
2. Update `package.json#scripts.viewer` to be `node app.js --ui` (drop `node start-viewer.js`).
3. Check `dist/*.bat` and any docs that reference `start-viewer.js`; repoint them at `app.js --ui` if needed.
4. `git add package.json && git commit -m "Remove start-viewer.js and start-viewer.bat"`

**Acceptance:** Two commits land, `git ls-files | grep start-viewer` returns nothing, `npm run build` produces a `dist/twx-parser.exe` whose embedded `output/` is empty (or has only the placeholder summary shape).

---

### F5 — Issue 8: `app.js#startWebUI` actually captures the server

**Commit message:** `app.js: capture TWXWebServer instance so graceful shutdown works`

**What to do:**
1. Open `src/server/web-server.js#startServer` (the exported async function). Change it to return both the port and the instance, OR have the caller construct the instance.
2. Simpler path: have `startServer()` return `{ port, server }`. Or change the export to expose the class so `app.js` can construct it directly.
3. In `app.js#startWebUI`, capture the server instance: `const { port, server } = await startServer(); this.server = server;` — and assign before `setupGracefulShutdown`.
4. In `setupGracefulShutdown`, the `this.server.close(...)` call is now real.
5. Smoke test: start the server with `node app.js`, hit Ctrl+C, confirm the "Server closed" log line appears before exit.
6. `git add src/server/web-server.js app.js && git commit -m "app.js: capture TWXWebServer instance so graceful shutdown works"`

**Acceptance:** Commit lands, Ctrl+C shutdown logs "Server closed" and exits 0, no port is left bound.

---

### F6 — Issue 1: rewrite the README

**Commit message:** `Rewrite README against the new public API`

**What to do:**
1. `cat src/index.js` — know exactly what's exported.
2. `cat package.json` — know the package name (`twx-parser`), the bin entry, the scripts.
3. `cat app.js#showHelp` — know the CLI surface.
4. Rewrite `README.md`:
   - Title: `# twx-parser`
   - "What it does" — 2–3 lines, mentions IBM BPM, `.twx` files, JSON output, web UI.
   - Install: `npm install -g twx-parser` (or local).
   - Quick example: using `createWorkspace` / `parseTWX` from the library.
   - CLI section: `twx-parser` (web UI), `twx-parser parse <file>` (CLI), `twx-parser --help`.
   - Link to `docs/ARCHITECTURE.md` for the architecture tour.
   - Drop dead badges (travis-ci, codecov) unless they're still live. (Check by visiting the URLs once.)
   - Drop the `getWorkspace(name, password)` example.
5. `git add README.md && git commit -m "Rewrite README against the new public API"`

**Acceptance:** Commit lands, the README's Quick Example runs end-to-end against `npm install -g .` in a clean shell, no mention of the old `getWorkspace` API.

---

### F7 — Issue 10: split the `twx-extractor.js` god class

**Commit message:** `Split twx-extractor.js into package-xml, object, and toolkit extractors`

**What to do:**
1. `cat src/parser/twx-extractor.js` — identify the four responsibilities:
   - `extractPackageMetadata` / `extractPackageMetadataFromDir` (lines ~155–265)
   - `extractObjects` / `extractObjectsFromDir` (lines ~273–340)
   - `extractToolkits` (find it; probably around lines 940–1010)
   - `extractTWX` / `extractFromDirectory` orchestration (the top-level methods)
2. Extract to:
   - `src/parser/package-xml-parser.js` — `extractPackageMetadata(zip)` and `extractPackageMetadataFromDir(dir)`
   - `src/parser/object-extractor.js` — `extractObjects(zip, objectList)` and `extractObjectsFromDir(...)`
   - `src/parser/toolkit-extractor.js` — `extractToolkits(zip)`
3. The new `src/parser/twx-extractor.js` becomes a thin orchestrator: instantiate the three, call them in order, return the combined result. Aim for ≤ 300 lines.
4. Verify: `node app.js parse <fixture>` produces byte-identical output to before the refactor (compare to the F3 fixture as baseline).
5. `git add src/parser/ && git commit -m "Split twx-extractor.js into package-xml, object, and toolkit extractors"`

**Acceptance:** Commit lands, `twx-extractor.js` is ≤ 300 lines, fixture diff is empty.

---

## QC-A review (after Phase 2)

**Scope:** all 9 commits from F1–F7 + the UI build.

**Checks:**
- `git log --oneline -10` shows each commit with the expected message.
- `git grep Registry` under `src/` returns nothing.
- `git grep "from.*classes/Workspace"` returns nothing.
- `git ls-files | grep -E "(BUILD-SUCCESS|test-business-objects|.kiro|utils/XML.js|start-viewer)"` returns nothing.
- `node app.js parse <fixture>` exits 0 and writes `output/*.json`.
- `node app.js` (web UI mode) starts, the viewer loads (use the QC's playwright/curl checks to confirm the new viewer HTML is served and the new CSS/JS files are linked).
- `node src/utils/file-names.js` prints `OK`.
- `npm run build` cleans `output/` and produces `dist/twx-parser.exe`.

**Verdict:** GREEN / RED / BLOCKED per the standard QC contract.

---

## Risks & mitigations

- **Concurrent commits** — each lane owns disjoint file sets, so no merge conflict is possible. Worst case is two lanes committing at the same time; git handles that with index locking, no data loss.
- **Untested integration** — the F1 (delete) commit might break a reference we didn't see. Mitigation: each F1 commit runs the CLI smoke test before committing.
- **F6 (README) drift** — if the F3 cross-ref change renames an export, F6 needs to know. Mitigation: F6 reads the post-Phase-1 state of `src/index.js` and `app.js`, not the pre-Phase-1 state.
