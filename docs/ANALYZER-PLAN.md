# TWX Analyzer — Implementation Plan

> Source: discussion on 2026-07-28. Approved by user. This is the contract for the Fixer, Designer, and QC agents.

---

## 1. Scope (v1)

### In scope
- Parser-side analyzer engine (new `src/parser/analyzer.js`)
- Integration with the parse pipeline (writes `output/analysis.json`)
- New "Analyzer" tab in the viewer (sidebar ANALYZE group)
- 6 rules across 2 severity levels
- Known-globals whitelist so BPM built-in variables don't false-positive

### Out of scope (v1)
- `empty-script` rule — removed (user note: "empty-scripts is not a critical Severity")
- `todo-comment` rule — removed (user note: "for now, we will talk about them later")
- `deprecated-api` rule — removed (user note: same)
- Recommended enhancements (3rd severity tier) — future
- Custom rule configuration UI — future
- Click-through navigation from findings → element details — v1 simple, v2 enhanced
- ESLint Linter API integration — only if rule count > 10

---

## 2. Libraries (install first)

```bash
npm install acorn acorn-walk acorn-loose eslint-scope
```

All pure JS, MIT/BSD-licensed, Windows-compatible, ~700KB unpacked total. No native modules.

### Why these 4
| Library | Purpose |
|---|---|
| `acorn` | Parse JS → ESTree AST. Fast, mainstream, 237M weekly downloads. |
| `acorn-loose` | Error-tolerant parser. Use as fallback when `acorn.parse()` throws `SyntaxError`. Critical for TWX fragments that may be incomplete. |
| `acorn-walk` | AST traversal with visitor API. Perfect for custom rules (loops, calls, comments). |
| `eslint-scope` | Scope analysis. `scope.through` gives unresolved references directly. Pre-register `tw` and globals, then any through-reference is a real undefined variable. |

### Architecture

```
TWX file → xml2js → extract JS string
                         ↓
              try acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true })
              catch → acorn-loose.parse(code, ...)
                         ↓
                   ESTree AST
                         ↓
              ┌──────────┼──────────┐
              ↓          ↓          ↓
        acorn-walk   eslint-scope  manual checks
        (loops, calls, (scope.through →  (empty script
         comments)   undefined vars)  length check)
              ↓          ↓          ↓
              └──────────┼──────────┘
                         ↓
                   Finding[] → output/analysis.json
```

---

## 3. Known globals & namespaces (CRITICAL — prevents false positives)

### Root globals (register with `eslint-scope`)

```js
const KNOWN_GLOBALS = new Set([
  // === Root BPM ===
  'tw',                          // Root — everything else is a property chain

  // === BPM logger ===
  'log',                         // TWLogger alias (server-side)

  // === Standard ECMAScript (Rhino/ES5) ===
  'Object', 'Array', 'Function', 'String', 'Number', 'Boolean',
  'Date', 'Math', 'RegExp', 'Error',
  'TypeError', 'RangeError', 'EvalError', 'ReferenceError', 'SyntaxError', 'URIError',
  'NaN', 'Infinity', 'undefined',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
  'eval', 'JSON',

  // === Rhino Java interop ===
  'Packages', 'java', 'javax', 'com', 'org',
  'importPackage', 'importClass', 'JavaImporter',

  // === BPM constructor globals (key ones) ===
  'TWDate', 'TWSearch', 'TWSearchColumn', 'TWSearchCondition', 'TWSearchOrdering',
  'TWProcessInstance', 'TWProcess', 'TWProcessApp', 'TWProcessAppSnapshot',
  'TWTask', 'TWUser', 'TWRole', 'TWParticipantGroup', 'TWTeam',
  'TWDocument', 'TWManagedFile', 'TWLink', 'TWEvent',
  'TWHolidaySchedule', 'TWTimeSchedule', 'TWTimePeriod', 'TWWorkSchedule',
  'TWTimerInstance', 'BPMRESTRequest', 'BPMRESTResponse',
  'TWObject', 'TWMap', 'XMLDocument', 'XMLElement', 'XMLNodeList', 'XMLNodelist',
  'Serializer', 'Map', 'Record', 'IndexedMap', 'JSONObject',
  'SLAViolationRecord', 'TWUserLocalePreferences',
  'Step', 'ConditionalActivity',
  'Boolean', 'Integer', 'Decimal', 'Time', 'URL', 'ANY',

  // Legacy (BPM 7/8 heritage)
  'TW', 'TWLogger', 'ic', 'listOf', 'Alert', 'Event',
  'TWScoreboard', 'TWChart', 'TWReport', 'TWReportFilter',
  'TWAdhocStartingPoint', 'TWSavedSearch',
]);
```

### Namespace prefix whitelist (for property chains)

These are intermediate segments after `tw`. Once any of these is reached, **any further property access is legitimate** (it's either a known sub-property or user-defined).

```js
const KNOWN_NAMESPACES = new Set([
  'tw.object',          // BO types: new tw.object.Foo(), new tw.object.listOf.String()
  'tw.local',           // user-defined process variables
  'tw.env',             // user-defined environment variables
  'tw.epv',             // exposed process values
  'tw.system',          // system features
  'tw.system.user',
  'tw.system.process',
  'tw.system.processApp',
  'tw.system.model',
  'tw.system.org',
  'tw.system.bpd',      // BPD context only
  'tw.system.step',     // BPD context only
  'tw.system.install',
  'tw.system.serializer',
  'tw.system.environment',
  'tw.perf',            // deprecated in BAW 24.x but still works
]);
```

### Heuristic

```
Access pattern                    → Verdict
─────────────────────────────────────────────────────────────
tw                                → KNOWN (root)
tw.system                         → KNOWN (intermediate namespace)
tw.system.user.name               → KNOWN (leaf under known namespace)
tw.local.myVar                    → UNDEFINED if myVar not in process vars (warn only, not critical)
tw.env.myEnv                      → UNDEFINED if myEnv not in env vars (warn only, not critical)
tw.epv.myEpv.myVar                → UNDEFINED if not in EPV definition (warn only)
console.log                       → KNOWN (console is a global)
Math.random()                     → KNOWN
JSON.parse('x')                   → KNOWN
TWSearch                          → KNOWN (constructor global)
log.info()                        → KNOWN (log is a global)
randomUnknownVar                  → UNDEFINED (CRITICAL)
Packages.java.util.Date           → KNOWN (Packages is a global, chain follows)
```

---

## 4. Rule set (v1 — 6 rules)

### Critical (3 rules)

| Rule ID | What it checks | Implementation |
|---|---|---|
| `undefined-variable` | References to undeclared variables (e.g., `tw.local.foo` where `foo` isn't declared in input/private variables) | `eslint-scope` `scope.through` after registering globals. Cross-reference `tw.local.*` against the process's declared input/private variables. |
| `infinite-loop` | `while(true) { }` or `for(;;) { }` without `break` inside | `acorn-walk` visitor on `WhileStatement` and `ForStatement` — check if body contains a `BreakStatement` |
| `division-by-zero` | Division by literal 0 or a known-zero constant | `acorn-walk` visitor on `BinaryExpression` where `operator` is `/` or `/=` and `right` is `Literal(0)` or `Identifier('zero')` |

### Warning (3 rules)

| Rule ID | What it checks | Implementation |
|---|---|---|
| `aggressive-log` | `console.log`, `log.info`, `log.debug`, `alert()` in production scripts | `acorn-walk` visitor on `CallExpression` where callee matches patterns: `console.log/debug/info`, `log.info/debug/warn`, `alert` |
| `hardcoded-value` | String literals < 8 chars that look like business constants (e.g., `"S"`, `"R"`, `"C"`, `"Y"`, `"N"`) | `acorn-walk` visitor on `Literal` where value is a string, length < 8, and looks like a status code (heuristic: all caps, length 1-3) |
| `long-script` | Script body > 100 lines | Simple line count check on the raw script string before parsing |

### Removed from v1 (per user notes)
- ~~`empty-script`~~ — removed
- ~~`todo-comment`~~ — removed
- ~~`deprecated-api`~~ — removed

---

## 5. Data shape: `output/analysis.json`

```json
{
  "summary": {
    "totalElements": 31,
    "totalCritical": 5,
    "totalWarnings": 12,
    "elementsWithCritical": 3,
    "elementsWithWarnings": 8,
    "generatedAt": "2026-01-15T10:30:00Z"
  },
  "byType": {
    "CSHS": { "elements": 27, "critical": 5, "warnings": 12 },
    "BPD": { "elements": 2, "critical": 0, "warnings": 0 },
    "Service": { "elements": 2, "critical": 0, "warnings": 0 }
  },
  "findings": [
    {
      "id": "act01-inittask-1",
      "objectId": "1.b1c1ff54-ed9e-4a3e-9cad-934dea1b2fd1",
      "objectName": "Act01 - Create or Amend ODC Request",
      "objectType": "CSHS",
      "elementType": "scriptTask",
      "elementName": "Init",
      "elementId": "2025.c7d2e6d8-3fa9-493d-8f15-cf442d90eefa",
      "severity": "critical",
      "ruleId": "undefined-variable",
      "ruleName": "Undefined variable reference",
      "message": "tw.local.tableVis is referenced but never declared in input/private variables",
      "line": 3,
      "snippet": "tw.local.tableVis = 'Editable';"
    }
  ]
}
```

---

## 6. File ownership & lanes

### Lane A — Fixer (analyzer engine)
**File:** `src/parser/analyzer.js` (NEW) + `src/parser/json-parser.js` (call analyzer + write analysis.json)

**Scope:**
- Create `TWXAnalyzer` class with `analyze(parsedObjects)` method
- Implement the 6 rules (3 critical, 3 warning)
- Use the `KNOWN_GLOBALS` and `KNOWN_NAMESPACES` lists from §3
- Use the parser config: `acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true })` with `acorn-loose` fallback
- Cross-reference `tw.local.*` references against the process's declared variables (input + private)
- Update `json-parser.js#createJSONOutput` to call the analyzer after generating the output files and write `output/analysis.json`
- Smoke test: parse example TWX and ODC.twx, verify `output/analysis.json` exists and has the expected shape

**Commit message:** `Add TWX Analyzer: rule engine for finding undefined variables, infinite loops, aggressive logs in element scripts`

### Lane B — Designer (Analyzer tab UI)
**File:** `twx-viewer-new.js` + `twx-viewer-new.css`

**Scope:**
- Add "Analyzer" to the sidebar nav in the ANALYZE group (between Search and Dependencies)
- Add `viewAnalyzer()` function that:
  - Fetches `/analysis.json`
  - Renders summary cards (Critical count, Warnings count) at the top
  - Renders per-type breakdown (CSHS, BPD, Service) with counts
  - Renders findings grouped by severity (Critical first, then Warning)
  - Each finding card shows: object name, element name, rule name, message, line number, code snippet
- CSS: critical = red, warning = yellow/amber, consistent with existing card styles
- Empty state: "No issues found" when analysis.json has 0 findings
- Error state: "Analysis not available" when analysis.json is missing

**Commit message:** `Add Analyzer tab with summary cards and per-element findings list`

### Lane C — QC
Independent review of both lanes. Verify the analyzer output is correct, the UI renders it properly, no regressions in other tabs.

---

## 7. UI design (designer brief)

The approved design from the previous discussion:

```
┌──────────┬──────────────────────────────────────────────────┐
│ sidebar  │  ANALYZER                                          │
│          │                                                    │
│ BROWSE   │  ┌────────────┬────────────┐                      │
│  Summary │  │ 5          │ 12         │                      │
│  By Type │  │ CRITICAL   │ WARNINGS   │                      │
│  Toolkits│  └────────────┴────────────┘                      │
│          │                                                    │
│ ANALYZE  │  By Type:                                          │
│  Search  │  ┌──────────────────────────────────────────────┐  │
│  Deps    │  │ CSHS  (27 elements)                          │  │
│  Analyzer│  │   3 critical · 8 warnings                   │  │
│          │  ├──────────────────────────────────────────────┤  │
│ APP      │  │ BPD  (2 elements)                           │  │
│  Settings│  │   0 critical · 1 warning                    │  │
│          │  └──────────────────────────────────────────────┘  │
│          │                                                    │
│          │  Findings (17)                                     │
│          │                                                    │
│          │  ┌─ CRITICAL (5) ─────────────────────────────┐  │
│          │  │ Act01 (CSHS) > Init [scriptTask]            │  │
│          │  │   Undefined variable: tw.local.tableVis     │  │
│          │  │   line 3:  tw.local.tableVis = 'Editable';  │  │
│          │  ├──────────────────────────────────────────────┤  │
│          │  │ Sum Orders (Service) > menu [scriptTask]   │  │
│          │  │   Infinite loop: while(true) without break  │  │
│          │  └──────────────────────────────────────────────┘  │
│          │                                                    │
│          │  ┌─ WARNINGS (12) ────────────────────────────┐  │
│          │  │ Act01 (CSHS) > Init [scriptTask]           │  │
│          │  │   Aggressive log: console.log(...)          │  │
│          │  └──────────────────────────────────────────────┘  │
│          │                                                    │
└──────────┴──────────────────────────────────────────────────┘
```

**Per the user's notes: empty-script, todo-comment, and deprecated-api are NOT in the rule set for v1.** Do not render findings for these rule IDs.

---

## 8. Acceptance criteria

After all 3 lanes finish (Fixer + Designer + QC GREEN):

1. **Parser side:**
   - `npm install acorn acorn-walk acorn-loose eslint-scope` succeeds
   - `node app.js parse "example twx extracted"` runs to completion, produces `output/analysis.json`
   - `node app.js parse "C:/Users/Admin/Documents/twx-awesome-parser/ODC.twx"` runs to completion, produces `output/analysis.json`
   - `output/analysis.json` has the `summary`, `byType`, and `findings` keys with the right shape
   - The example CSHS (OrderDetailsCSHS) shows at least 1 finding (e.g., aggressive-log for the `console.log` calls)
   - The ODC.twx CSHS (Act01) shows findings for its scripts
   - NO finding has `ruleId` of `empty-script`, `todo-comment`, or `deprecated-api` (these are removed)

2. **No false positives on BPM built-ins:**
   - A script with `log.info("hello")` does NOT generate an undefined-variable finding
   - A script with `tw.system.user.name` does NOT generate an undefined-variable finding
   - A script with `Math.random()` does NOT generate an undefined-variable finding
   - A script with `new TWDate()` does NOT generate an undefined-variable finding

3. **No false negatives for real undefined variables:**
   - A script with `tw.local.foo` where `foo` is not declared → produces a finding
   - A script with `randomUnknownVar` → produces a finding
   - A script with `while(true) { }` (no break) → produces a finding

4. **UI side:**
   - "Analyzer" tab visible in sidebar (ANALYZE group)
   - Clicking the tab shows the summary cards, per-type breakdown, and findings
   - Critical findings are red, warnings are yellow
   - Each finding shows object name, element name, rule, message, line, snippet
   - Empty state shows "No issues found" when no findings
   - No regressions in existing tabs (Summary, By Type, Toolkits, Search, Dependencies, Settings)

5. **Performance:**
   - Parsing ODC.twx with 306 objects completes in < 10 seconds total (parsing + analysis)
   - The analysis step itself takes < 3 seconds for 300 objects

---

## 9. Test plan (QC brief)

The QC should verify all 8 items in the acceptance criteria above. Suggested checks:

1. **Static checks:**
   - `npm ls acorn acorn-walk acorn-loose eslint-scope` shows all 4 installed
   - `git log --oneline -5` shows the Fixer and Designer commits
   - `src/parser/analyzer.js` exists and exports a usable class
   - `viewAnalyzer` function exists in `twx-viewer-new.js`
   - CSS for analyzer cards exists in `twx-viewer-new.css`

2. **Parser behavior:**
   - `output/analysis.json` has correct shape (summary, byType, findings)
   - Example TWX CSHS finds at least 1 aggressive-log
   - ODC.twx CSHS finds at least 1 finding
   - No finding has ruleId of `empty-script`, `todo-comment`, or `deprecated-api`
   - No false positives on BPM built-ins (test with a script that uses `tw.system.user.name`, `log.info`, `Math.random()`)

3. **UI behavior:**
   - "Analyzer" tab visible in sidebar
   - Clicking it shows the summary + findings
   - Critical = red, Warning = yellow (check CSS)
   - No regressions in other tabs

4. **End-to-end:**
   - Parse ODC.twx, open browser, navigate to Analyzer tab, verify the data displays correctly

---

## 10. Open questions for the user

1. **Click-through navigation** — should clicking an element name in the findings switch to the By Type tab and pre-select that element? My recommendation: yes for v1 (small addition, big usability win).

2. **Analysis refresh** — should the analyzer re-run when the user changes the "Include toolkits" toggle, or is it a one-shot at parse time? My recommendation: one-shot at parse time (simpler, data is always available).

3. **Performance budget** — 300 objects in < 3 seconds is the target. If the actual run is slower, we can optimize later (e.g., skip elements with no script body before AST parsing).
