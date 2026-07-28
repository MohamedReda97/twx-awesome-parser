# Analyzer Precision Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove demonstrated IBM BAW analyzer false positives and add only correctness checks that found actionable issues in the latest ODC run.

**Architecture:** Preserve BAW declaration and script-format metadata in `ObjectExtractor`, then let the existing `TWXAnalyzer` inventory and Acorn pass make context-aware decisions. Keep the browser report as a thin renderer of the analyzer's location data. No new runtime dependency or abstraction is required.

**Tech Stack:** Node.js, `xml2js`, installed `fast-xml-parser`, Acorn/Acorn Walk, browser JavaScript, Node `assert` tests.

## Global Constraints

- Analyze application-owned server-side JavaScript only; toolkits remain resolution context.
- Support BAW 19, 20, 21, 23, and 24.
- Exclude `text/plain` BAW tasks from JavaScript analysis entirely.
- Do not enable the ESLint recommended preset or add ESLint as a runtime dependency.
- Preserve distinct elements even when their JavaScript source is identical.
- Do not commit generated `output/*.json` or `analysis.json` changes.

---

### Task 1: Preserve BAW script and variable metadata

**Files:**
- Modify: `src/parser/object-extractor.js`
- Test: `test-analyzer-v2.js`

**Interfaces:**
- Produces: `details.elements.scriptTasks[].scriptFormat: string`
- Produces: BPMN data-object names in `details.variables.private[]` as `{ name, type, hasDefault }`

- [x] **Step 1: Write failing extractor tests**

Add real `ObjectExtractor` tests that call `extractServiceDetails()` with a `text/plain` script task and `extractBPDDetails()` with this literal BPMN payload:

```js
const bpmnXml = '<definitions><process><dataObject id="v1" name="declaredOnBpd" itemSubjectRef="String" /></process></definitions>'
```

Assert that `scriptFormat === 'text/plain'` survives and that `declaredOnBpd` appears in `details.variables.private`.

- [x] **Step 2: Run the test and verify RED**

Run: `node test-analyzer-v2.js`

Expected: failure because `scriptFormat` and BPD `dataObject` declarations are absent.

- [x] **Step 3: Implement the minimum extraction change**

Use the installed synchronous `fast-xml-parser` for the embedded `bpmn2Data` string. Preserve `st.scriptFormat`, initialize BPD `details.variables`, and append unique process `dataObject` names to `private`.

- [x] **Step 4: Run the test and verify GREEN**

Run: `node test-analyzer-v2.js`

Expected: `analyzer v2 checks passed`.

### Task 2: Make analyzer inventory and findings precise

**Files:**
- Modify: `src/parser/analyzer.js`
- Test: `test-analyzer-v2.js`

**Interfaces:**
- Consumes: `scriptTask.scriptFormat` and `details.variables.*[].name`
- Produces: rules `debugger-statement` and `parse-int-missing-radix`
- Produces: `{ line, column, snippet }` for CRLF, LF, CR, U+2028, and U+2029

- [x] **Step 1: Write failing analyzer tests**

Add behavior assertions for:

```js
alert('x');
resetDataSyncronizationVariables();
initializeDataSyncronizationVariables();
require('x');
window.value;
page.value;
```

Assert no `undefined-identifier`; assert a `text/plain` SQL/HTML task is excluded from eligible coverage; assert a matching extracted variable suppresses `undeclared-process-variable`; assert the service `scriptTasks`/`scripts` duplicate is counted once while two distinct element IDs remain two; assert `debugger;` and `parseInt(value)` create warnings; and assert a warning after CR-only separators reports the correct line, column, and snippet.

- [x] **Step 2: Run the test and verify RED**

Run: `node test-analyzer-v2.js`

Expected: failures for missing globals, format exclusion, cross-representation deduplication, new rules, or CR location.

- [x] **Step 3: Implement minimal analyzer changes**

Add the six names to `KNOWN_GLOBALS`; pass `scriptFormat` into inventory units; skip `text/plain` units; suppress only exact declared variable names; deduplicate `details.scripts` only when the same object already has a script task with the same name and source; replace `lineAt()` with a universal line-terminator calculation; and add Acorn visitors for `DebuggerStatement` and one-argument global `parseInt()` calls.

- [x] **Step 4: Run the test and verify GREEN**

Run: `node test-analyzer-v2.js`

Expected: `analyzer v2 checks passed` with no assertion failures.

### Task 3: Display complete warning locations

**Files:**
- Modify: `twx-viewer-new.js`

**Interfaces:**
- Consumes: finding `objectName`, `elementName`, and `location.{line,column}`
- Produces: visible `Object › Element · Line N, Column M` metadata on every expanded finding card

- [x] **Step 1: Verify the current UI is RED**

Open the local Analyzer tab and inspect a confirmed warning. Confirm the expanded card shows only `Line N`, without object, element, or column.

- [x] **Step 2: Implement the one-template change**

Update `renderFindingCard()` to render escaped object and element names followed by line and column in the header. Retain the snippet and grouped warning layout.

- [x] **Step 3: Verify the UI is GREEN**

Reload the Analyzer tab, expand a warning group, and confirm each card visibly includes object, element, line, and column.

### Task 4: Re-run ODC and commit verified source changes

**Files:**
- Regenerate locally, but do not commit: `analysis.json`, `output/*.json`
- Commit: `src/parser/object-extractor.js`, `src/parser/analyzer.js`, `twx-viewer-new.js`, `test-analyzer-v2.js`, this plan

- [x] **Step 1: Run focused checks**

Run:

```powershell
npm test
npx eslint src/parser/analyzer.js test-analyzer-v2.js
```

Expected: exit code 0 for both commands.

- [x] **Step 2: Reparse the real application**

Run the existing parser against `ODC.twx`, then inspect `analysis.json`.

Expected: no named-global criticals, no `text/plain` SQL/HTML syntax findings, no declaration-backed BPD warnings, no duplicate service findings, retained genuine JavaScript syntax findings, and located debugger/radix warnings.

- [x] **Step 3: Review the diff and commit only intended files**

Run `git diff --check`, inspect `git diff --stat`, stage only the five source/test/plan files listed above, then commit:

```powershell
git commit -m "fix: improve BAW analyzer precision"
```
