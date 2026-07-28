# BAW-aware analyzer v2 implementation plan

> **For Codex:** Execute this plan with the `superpowers:executing-plans` skill, in order. Keep each task red-green and commit logical completed slices.

**Goal:** replace the heuristic analyzer report with an application-only, BAW-version-aware v2 report that uses toolkit declarations as context and presents actionable findings in a triage-oriented Analyzer tab.

**Architecture:** retain `TWXAnalyzer` as the public entry point, but rebuild its report creation around an application-only script inventory and a small symbol index built from app and toolkit objects. Keep the implementation in `src/parser/analyzer.js`: the project is CommonJS, has no test framework, and splitting one analyzer into one-file-per-rule would add indirection without reuse. `JSONParser` supplies app objects, toolkit context, and metadata; the viewer derives its groups from the flat v2 finding list.

**Tech stack:** Node.js CommonJS, Acorn, acorn-loose, acorn-walk, eslint-scope, Node `assert`, existing static viewer CSS/JavaScript.

## Scope boundary

Implement only evidence-backed rules from the current extract model:

- confirmed critical: syntax errors, undefined identifiers, definite division by zero, definite null/undefined dereference, unsafe `eval` with direct `tw.local` input;
- confirmed warning: undeclared `tw.local` variables and unconditional loops without a local exit;
- needs review: empty catches, likely dynamic SQL construction, and secret-looking string literals;
- report the selected BAW version, but do not claim API compatibility violations until the project has a verified BAW API-profile dataset. This prevents false confirmed defects.

## Task 1: establish a real executable analyzer check

**Files:**
- Create: `test-analyzer-v2.js`
- Modify: `package.json`

1. Add a single Node `assert` script with compact synthetic app/toolkit objects. Begin with an assertion that the current v1 result lacks `schemaVersion: 2`; run `node test-analyzer-v2.js` and observe the expected failure.
2. Expand that one script to cover the report contract, strict syntax failure, undefined identifier, declared `tw.local` access, undeclared `tw.local` warning, division by literal and propagated zero, null dereference, unsafe direct `eval`, loop warning, needs-review rules, inventory de-duplication, version override/metadata/unknown behavior, toolkit reference suppression, toolkit-script exclusion, and stable IDs.
3. Change `npm test` to `node test-analyzer-v2.js` only after the script is green.

## Task 2: rebuild analyzer output around app ownership and context

**Files:**
- Modify: `src/parser/analyzer.js`
- Test: `test-analyzer-v2.js`

1. Make `new TWXAnalyzer(appObjects, options)` accept `{ toolkits, metadata, targetBawVersion }` while preserving the one-argument form.
2. Add pure helpers inside the module to classify CSHS/Service/BPD, infer the BAW version from override or `metadata.buildInfo.buildVersion`, collect app variable names, and collect toolkit declaration names. Never insert toolkit scripts into the inventory.
3. Create one inventory entry per non-empty application script role. De-duplicate duplicate extractor representations by object + script source; retain the first element identity.
4. Return schema v2 fields: `status`, `meta`, `coverage`, `summary`, `byAppType`, `diagnostics`, and flat `findings`. Count only inventory entries and only CSHS/Service/BPD application objects.
5. Give each finding a deterministic ID derived from rule, owner identity, role, and source position. Include status, confidence, severity, line/column/snippet, evidence, BAW versions, and remediation.
6. Run `node test-analyzer-v2.js` after each red-green slice; then run `npm test`.

## Task 3: implement precision-first rules in the rebuilt analyzer

**Files:**
- Modify: `src/parser/analyzer.js`
- Test: `test-analyzer-v2.js`

1. Parse strict Acorn first. A strict parse failure becomes one confirmed syntax finding and a skipped coverage entry; only use loose parsing to recover simple needs-review checks.
2. Use eslint-scope unresolved references plus known BAW/Rhino globals, current-object variables, and toolkit declaration names for undefined identifiers. Keep a dedicated member-expression check for `tw.local.<name>` so it emits the requested `undeclared-process-variable` warning rather than a generic identifier error.
3. Track direct local literals in a per-script map. Emit only when a zero/null/undefined value is directly assigned then definitely used as a divisor/dereference; do not infer across conditionals or function calls.
4. Flag `while (true)` / `for (;;)` only when its body has no `break`, `return`, or `throw`; nesting is ignored rather than over-analysed.
5. Emit needs-review findings only for empty catch blocks, string concatenation assigned to an SQL-looking variable or passed to an execute/query-looking method, and secret-looking literals. These are excluded from critical/warning totals.
6. Confirm the toolkit tests prove declarations suppress app false positives while malformed toolkit scripts never produce findings or affect coverage.

## Task 4: wire v2 generation and prevent stale partial output

**Files:**
- Modify: `src/parser/json-parser.js`
- Test: `test-analyzer-v2.js`

1. Pass only `extractedData.objects` as analyzer targets and pass toolkits/metadata as options.
2. Serialize a single fresh report and atomically replace both `output/analysis.json` and root `analysis.json` with temporary sibling files followed by rename.
3. If analyzer construction fails, write a fresh schema-v2 `failed` report with the diagnostic rather than retaining an old successful file; parsing remains non-fatal.
4. Add a temporary-directory integration assertion that both copies are byte-identical and that an injected analyzer failure yields zero findings plus `status: failed`.

## Task 5: replace the Analyzer tab card gallery with triage groups

**Files:**
- Modify: `twx-viewer-new.js`
- Modify: `twx-viewer-new.css`
- Test: `test-analyzer-v2.js` (report-shape rendering helpers) and manual browser check

1. Read the `frontend-design` skill before editing this UI.
2. Render the approved compact header: source, generated time, BAW version/source, `App scripts only`, toolkit-context count, and coverage/status.
3. Render compact confirmed-critical, confirmed-warning, and needs-review summary panels plus CSHS/Service/BPD-only type counts.
4. Group critical findings by application element and warnings/needs-review by rule name. Use native `<details>/<summary>` for keyboard-operable collapsibles.
5. Expanded cards show severity/status text, message, code snippet, evidence, BAW versions, and remediation. Add responsive CSS that wraps snippets and stacks summary cards.
6. Open the local viewer and verify keyboard disclosure and the three groupings against a generated v2 report.

## Task 6: final verification and commit

**Files:** all files above

1. Run `npm test`, `npm run lint`, and the representative parser command if its TWX fixture is available without modifying user data.
2. Inspect `git diff --check` and `git status --short`; keep changes limited to the implementation files and plan.
3. Read and follow `superpowers:verification-before-completion` and `superpowers:finishing-a-development-branch` before claiming completion.
4. Commit the completed implementation on `codex/analyzer-v2` with a concise message.
