# Toolkit Usage Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Toolkit Usage tab that lists every embedded toolkit and shows exactly where the application references its objects, separating confirmed, inferred, and ambiguous evidence.

**Architecture:** The server-side parser will scan application XML and JavaScript while embedded toolkits remain reference targets only. The focused `ToolkitDependencyMapper` will produce one deterministic `toolkit-usage.json` report, `JSONParser` will write it with the other generated files, and the existing single-page viewer will render it as collapsed native `<details>` grouped toolkit → type → object → location.

**Tech Stack:** Node.js, ADM-ZIP, Acorn, acorn-walk, plain JavaScript, native HTML `<details>`, existing CSS and test scripts.

## Global Constraints

- Toolkits improve application analysis; toolkit code itself is never analyzed.
- Show all embedded toolkit snapshots, including unused ones.
- Keep duplicate toolkit versions and short names separate.
- Confirm exact `versionId` and unique stable object `id` matches in application XML.
- Infer only exact, case-sensitive object-name references from valid JavaScript AST nodes.
- Mark matches ambiguous when an ID or name maps to multiple toolkit targets.
- Never use substring, fuzzy, or case-insensitive matching.
- Do not parse HTML, templates, or `text/plain` as JavaScript.
- Keep every nested `<details>` collapsed initially.
- Add no dependency and no new abstraction: reuse the existing mapper, output writer, viewer, and CSS tokens.

## Files

| File | Change |
|---|---|
| `src/parser/toolkit/ToolkitDependencyMapper.js` | Replace the unused generic mapper internals with the focused application-to-toolkit usage report builder. |
| `src/parser/toolkit-extractor.js` | Preserve recoverable embedded-toolkit extraction diagnostics. |
| `src/parser/twx-extractor.js` | Invoke the usage mapper after application and toolkit objects are available. |
| `src/parser/json-parser.js` | Always write `output/toolkit-usage.json`. |
| `twx-viewer-new.js` | Load the report, add the sidebar route, and render nested groups. |
| `twx-viewer-new.css` | Add the minimum layout/status styles for the new tab. |
| `test-toolkit-usage.js` | Cover confirmed structural matching, inference, ambiguity, errors, and output integration. |
| `test-toolkit-usage-ui.js` | Cover grouping, collapsed state, escaping, and empty states. |
| `package.json` | Include the new tests and focused files in existing scripts. |
| `README.md` | Document the feature, generated file, meanings, and limitations. |
| `docs/ARCHITECTURE.md` | Document the report flow and mapper responsibility. |

---

## Task 1: Map confirmed structural toolkit usage

**Files:**

- Replace: `src/parser/toolkit/ToolkitDependencyMapper.js`
- Create: `test-toolkit-usage.js`

- [ ] **Step 1: Write the failing structural-matching test**

Create a small fake ZIP whose `getEntry()` returns application object XML by path. Use one application object plus four toolkit snapshots:

- one target referenced by its exact `versionId`;
- two targets sharing the same stable `id`, referenced once to prove ambiguity;
- one target with no reference;
- duplicate toolkit names with distinct `fileName` values to prove snapshots remain separate.

Exercise this public interface:

```js
const ToolkitDependencyMapper = require('./src/parser/toolkit/ToolkitDependencyMapper');

const report = new ToolkitDependencyMapper().mapApplicationUsage({
  zip,
  appObjectList,
  appObjects,
  toolkits,
  toolkitDiagnostics: []
});
```

Assert:

```js
assert.equal(report.schemaVersion, 1);
assert.equal(report.toolkits.length, 4);
assert.equal(report.summary.toolkitCount, 4);
assert.equal(report.toolkits[0].objects[0].locations[0].confidence, 'confirmed');
assert.equal(report.toolkits[0].objects[0].locations[0].evidence, 'version-id');
assert.equal(ambiguousLocations.length, 2);
assert.equal(unusedToolkit.usageStatus, 'not-detected');
assert.equal(versionLocation.lineBasis, 'xml');
assert.ok(versionLocation.line > 0);
```

- [ ] **Step 2: Run the test and verify the intended failure**

Run:

```powershell
node test-toolkit-usage.js
```

Expected: failure because the focused `mapApplicationUsage()` report does not exist yet.

- [ ] **Step 3: Replace the mapper with the minimum focused implementation**

Keep one class and these public methods only:

```js
class ToolkitDependencyMapper {
  mapApplicationUsage({ zip, appObjectList, appObjects, toolkits, toolkitDiagnostics = [] }) {}

  static emptyReport({ status = 'complete', diagnostics = [] } = {}) {}

  static failedReport(error) {}
}
```

Implementation order:

1. Build one report entry per toolkit using `fileName` as its stable key, falling back to `snapshotId`, then `projectId`.
2. Flatten each toolkit's objects into two maps:
   - `versionId -> one target`;
   - stable `id -> one or more targets`.
3. For each application manifest object, load `objects/<versionId>.xml`, falling back to `objects/<id>.xml`.
4. Scan UUID-shaped tokens from the raw XML.
5. Treat an exact `versionId` match as confirmed.
6. Treat an exact stable `id` match as confirmed only when it maps to one target.
7. Add an ambiguous location to every target when a stable `id` maps to multiple targets.
8. Record the application object identity, XML line, column, and a snippet capped at 240 characters.
9. Deduplicate identical locations.
10. Sort toolkits, types, objects, and locations deterministically before returning.

Use small private helpers inside the same file; do not add files for indexes, collectors, or serializers:

```js
_toolkitResult(toolkit)
_buildIndexes(reportToolkits)
_scanXml(xml, appObject, indexes)
_appendLocation(target, location)
_finalize(report)
```

If an application XML entry is missing, append a diagnostic, set the report to `partial`, and continue scanning the remaining objects.

- [ ] **Step 4: Run the focused test and lint**

Run:

```powershell
node test-toolkit-usage.js
npx eslint src/parser/toolkit/ToolkitDependencyMapper.js test-toolkit-usage.js
```

Expected: both commands exit with code 0.

- [ ] **Step 5: Commit Task 1**

```powershell
git add src/parser/toolkit/ToolkitDependencyMapper.js test-toolkit-usage.js
git commit -m "feat: map confirmed toolkit usage"
```

---

## Task 2: Infer exact JavaScript object-name usage

**Files:**

- Modify: `src/parser/toolkit/ToolkitDependencyMapper.js`
- Modify: `test-toolkit-usage.js`

- [ ] **Step 1: Extend the test with exact positive and negative cases**

Add application server scripts and Coach View JavaScript containing:

```js
new tw.object.CustomerData();
services["Run Service"]();
AccountNumber();
customerdata();
SharedHelper();
```

Also add one malformed script:

```js
var = ;
```

Provide toolkit objects named `CustomerData`, `Run Service`, `Account`, and two objects named `SharedHelper` in different toolkit snapshots.

Assert:

- `CustomerData` and `Run Service` are inferred;
- `AccountNumber` does not match `Account`;
- lowercase `customerdata` does not match `CustomerData`;
- both `SharedHelper` targets receive ambiguous locations;
- malformed JavaScript makes the report `partial` but does not remove structural findings;
- script locations include script/element identity, line, column, and snippet;
- confirmed evidence replaces an otherwise duplicate inferred location for the same target and source.

- [ ] **Step 2: Run the test and verify it fails on inference assertions**

```powershell
node test-toolkit-usage.js
```

Expected: structural assertions pass and new JavaScript inference assertions fail.

- [ ] **Step 3: Add script collection and exact AST matching to the mapper**

Reuse the installed packages:

```js
const acorn = require('acorn');
const walk = require('acorn-walk');
```

Inside the existing mapper:

1. Build an exact, case-sensitive `object name -> targets[]` map.
2. Collect script units from the existing parsed application object shapes:
   - server script tasks;
   - assignment scripts;
   - service scripts;
   - Coach View lifecycle and inline JavaScript fields.
3. Skip empty strings, duplicate units, HTML, templates, and `text/plain` content.
4. Parse each unit with locations enabled.
5. Walk `Identifier` and string `Literal` nodes.
6. Label identifier evidence `script-member` when it is a member property and `script-identifier` otherwise; label string evidence `script-string`.
7. Match only an entire AST token to an entire toolkit object name.
8. One target means `inferred`; multiple targets mean `ambiguous` with `ambiguous-name` evidence.
9. On a parse error, add one diagnostic for the script, mark the report `partial`, and continue.
10. Apply confidence precedence `confirmed > inferred > ambiguous` during deduplication.

Keep the collectors as private methods in this mapper; do not refactor the analyzer or create a general script inventory abstraction.

- [ ] **Step 4: Run focused verification**

```powershell
node test-toolkit-usage.js
npx eslint src/parser/toolkit/ToolkitDependencyMapper.js test-toolkit-usage.js
```

Expected: both commands exit with code 0.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/parser/toolkit/ToolkitDependencyMapper.js test-toolkit-usage.js
git commit -m "feat: infer toolkit use from app scripts"
```

---

## Task 3: Wire extraction and write the report

**Files:**

- Modify: `src/parser/toolkit-extractor.js`
- Modify: `src/parser/twx-extractor.js`
- Modify: `src/parser/json-parser.js`
- Modify: `test-toolkit-usage.js`

- [ ] **Step 1: Add failing integration assertions**

Extend `test-toolkit-usage.js` with three focused checks:

1. A malformed embedded toolkit entry causes `ToolkitExtractor` to retain:

```js
{
  code: 'TOOLKIT_EXTRACTION_FAILED',
  fileName: 'broken.twx',
  message: 'the parser error message'
}
```

2. A tiny valid ADM-ZIP plus stub collaborators proves `TWXExtractor` passes the outer ZIP, application manifest list, parsed application objects, extracted toolkits, and toolkit diagnostics to the mapper.
3. A temporary output directory proves `JSONParser` writes `toolkit-usage.json` and that the parsed file deep-equals the supplied report.

- [ ] **Step 2: Run the test and verify the integration assertions fail**

```powershell
node test-toolkit-usage.js
```

Expected: failure because diagnostics are only logged and the report is not wired or written.

- [ ] **Step 3: Preserve embedded-toolkit diagnostics**

In `ToolkitExtractor`:

- initialize `this.diagnostics = []`;
- reset it at the start of each extraction;
- in the existing per-toolkit `catch`, keep the log and append the structured diagnostic;
- continue extracting other toolkits.

Do not change the existing recovery behavior.

- [ ] **Step 4: Invoke the mapper from `TWXExtractor`**

After application objects are tagged and toolkits are extracted:

```js
let toolkitUsage;
try {
  toolkitUsage = this.toolkitDependencyMapper.mapApplicationUsage({
    zip,
    appObjectList,
    appObjects,
    toolkits,
    toolkitDiagnostics: this.toolkitExtractor.diagnostics
  });
} catch (error) {
  toolkitUsage = ToolkitDependencyMapper.failedReport(error);
}
```

Return `toolkitUsage` with the existing extraction result. For directory extraction, return `ToolkitDependencyMapper.emptyReport()` because there is no outer TWX archive to scan.

- [ ] **Step 5: Always write `toolkit-usage.json`**

In `JSONParser`, call one focused writer alongside the existing generated reports:

```js
generateToolkitUsageFile(
  extractedData.toolkitUsage || ToolkitDependencyMapper.emptyReport()
);
```

The writer should only serialize the supplied report to `output/toolkit-usage.json`; report construction remains in the mapper.

- [ ] **Step 6: Run integration verification**

```powershell
node test-toolkit-usage.js
npx eslint src/parser/toolkit/ToolkitDependencyMapper.js test-toolkit-usage.js
```

Expected: both commands exit with code 0.

- [ ] **Step 7: Commit Task 3**

```powershell
git add src/parser/toolkit-extractor.js src/parser/twx-extractor.js src/parser/json-parser.js test-toolkit-usage.js
git commit -m "feat: generate toolkit usage report"
```

---

## Task 4: Add the Toolkit Usage tab

**Files:**

- Modify: `twx-viewer-new.js`
- Modify: `twx-viewer-new.css`
- Create: `test-toolkit-usage-ui.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing UI rendering test**

Follow the existing `test-analyzer-ui.js` VM pattern. Export only `{ state, viewToolkitUsage }` from the test sandbox and provide a report containing:

- one used toolkit;
- one possible toolkit;
- one unused toolkit;
- confirmed, inferred, and ambiguous locations;
- special characters in toolkit, type, object, element, and snippet text.

Assert the generated markup contains:

```text
Toolkit Usage
Used
Possible usage
No detected usage
No application references were detected. This does not prove that the toolkit can be removed.
```

Also assert:

- grouping order is toolkit → type → object → location;
- group elements use `toolkit-usage-group toolkit`, `type`, and `object` classes;
- no generated `<details>` contains the `open` attribute;
- user-controlled values are HTML escaped;
- exact application object/element/script and line information is visible;
- a missing report renders `Toolkit usage is not available—parse the TWX again.`;
- a report with zero toolkits renders a clear no-toolkit state.

- [ ] **Step 2: Run the UI test and verify the missing-view failure**

```powershell
node test-toolkit-usage-ui.js
```

Expected: failure because `viewToolkitUsage()` is not defined.

- [ ] **Step 3: Load and route the report**

In `twx-viewer-new.js`:

1. Add `toolkitUsage: null` to existing state.
2. Fetch `output/toolkit-usage.json` in `loadAllData()` using the current optional-report failure pattern.
3. Add `Toolkit Usage` under Analyze after Dependencies, reusing the existing toolkit icon.
4. Add one route case in `renderContent()`.

- [ ] **Step 4: Render the nested collapsed hierarchy**

Add one pure `viewToolkitUsage()` function and minimal local rendering helpers. Render:

```text
Toolkit
  Type
    Toolkit object
      Application location
```

Rules:

- use native `<details>` and `<summary>` at toolkit, type, and object levels;
- omit `open` everywhere;
- show status chips for Used, Possible usage, and No detected usage;
- show confidence/evidence on each location;
- show application object, element/script name, line, and snippet when available;
- use the existing `esc()` helper for every report string;
- never infer removal safety from a no-usage result.

Do not add custom expand/collapse state or event listeners.

- [ ] **Step 5: Add minimal CSS using existing design tokens**

Style only:

- hierarchy indentation;
- compact summary rows and counts;
- existing semantic colors for used/possible/not-detected and confidence;
- readable location metadata and code snippet wrapping;
- keyboard focus visibility on `<summary>`.

Avoid a new component system, animation, search, charts, or filters.

- [ ] **Step 6: Add tests to package scripts**

Append the two new test files to the existing `test` script. Add only the focused new mapper/test files to the current lint scope. Do not broaden lint to legacy parser/viewer files with unrelated pre-existing findings.

- [ ] **Step 7: Run focused and project tests**

```powershell
node test-toolkit-usage-ui.js
npm test
npm run lint
```

Expected: all commands exit with code 0.

- [ ] **Step 8: Commit Task 4**

```powershell
git add twx-viewer-new.js twx-viewer-new.css test-toolkit-usage-ui.js package.json
git commit -m "feat: add toolkit usage tab"
```

---

## Task 5: Document and verify the complete feature

**Files:**

- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Update user documentation**

In `README.md`, document:

- what the Toolkit Usage tab answers;
- that every embedded toolkit is listed;
- the meanings of Confirmed, Inferred, Ambiguous, and No detected usage;
- that toolkit code is not analyzed;
- that no detected usage is not proof a toolkit can be removed;
- `output/toolkit-usage.json` in the generated-files table;
- that analysis remains local and source snippets may appear in the generated report.

- [ ] **Step 2: Update the architecture flow**

In `docs/ARCHITECTURE.md`, update the module map and data flow to show:

```text
TWXExtractor
  -> application XML + parsed application scripts
  -> ToolkitDependencyMapper
  -> extractedData.toolkitUsage
  -> JSONParser
  -> output/toolkit-usage.json
  -> Toolkit Usage tab
```

Explain that embedded toolkit objects are the reference index, not scan input.

- [ ] **Step 3: Run the complete release gate**

```powershell
npm ci
npm test
npm run lint
npm audit --omit=dev --audit-level=moderate
.\build.bat --no-pause
git diff --check
git status --short
```

Expected:

- dependencies install successfully;
- all tests and lint pass;
- audit has no moderate-or-higher production vulnerability;
- the Windows standalone build succeeds;
- `git diff --check` prints nothing;
- only `README.md` and `docs/ARCHITECTURE.md` are modified before the documentation commit;
- generated `output/`, build, and private TWX files remain untracked or ignored.

- [ ] **Step 4: Perform one private real-TWX smoke test**

Use a TWX stored outside this repository:

```powershell
$sampleTwx = Read-Host 'Absolute path to a private TWX outside this repository'
node app.js parse $sampleTwx
.\start-server.bat
```

Open the Toolkit Usage tab and verify:

- every embedded toolkit appears separately;
- at least one confirmed location navigates through the collapsed hierarchy;
- inferred and ambiguous labels match their evidence;
- an unused toolkit is clearly marked;
- no toolkit-internal script is reported as application usage;
- `output/toolkit-usage.json` contains no absolute source path.

Stop the local server after the check. Do not copy or commit the private TWX or generated output.

- [ ] **Step 5: Commit documentation**

```powershell
git add README.md docs/ARCHITECTURE.md
git commit -m "docs: explain toolkit usage reporting"
```

- [ ] **Step 6: Verify the branch is ready for review**

```powershell
git status --short --branch
git log --oneline --decorate -6
```

Expected: a clean `codex/toolkit-usage-report` branch containing the design, implementation, tests, and documentation commits.

## Completion Criteria

- All embedded toolkit snapshots are present in the report and UI.
- Confirmed XML references, inferred exact JavaScript references, and ambiguous matches are visibly distinct.
- Each detected use includes an application location and line when available.
- Unused toolkits are clearly marked without claiming they are safe to remove.
- Toolkit scripts are never analyzed.
- Report generation degrades to `partial` rather than hiding recoverable results.
- The UI is nested, escaped, accessible, and collapsed initially.
- Test, lint, audit, build, and private smoke-test gates pass.
