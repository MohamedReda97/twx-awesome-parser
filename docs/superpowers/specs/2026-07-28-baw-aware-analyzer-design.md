# BAW-Aware Server-Side Analyzer Design

**Status:** Approved design

**Date:** 2026-07-28

## Goal

Replace the current heuristic-heavy analyzer with a precision-first, BAW-aware static analyzer that reports actionable runtime, correctness, security, and reliability issues in application-owned server-side scripts.

The report must distinguish confirmed findings from uncertain review candidates, explain the evidence behind each finding, and avoid flooding users with style or maintainability warnings.

## Product decisions

- Analyze server-side application scripts only.
- Include application CSHS, Service, and BPD objects.
- Exclude Coach View and other browser-side JavaScript.
- Support BAW 19, 20, 21, 23, and 24.
- Infer the target BAW version from TWX metadata and allow a manual override.
- Use toolkit contents only as reference context for application analysis.
- Never analyze toolkit scripts, emit findings against toolkit objects, or include toolkit objects in coverage and severity totals.
- Separate finding certainty from severity.
- Show confirmed critical issues, confirmed warnings, and needs-review candidates as distinct report sections.

## Non-goals

- Full path-sensitive or interprocedural static analysis.
- Browser or Coach View analysis.
- Reporting defects inside toolkits.
- Style, formatting, complexity, TODO, ordinary logging, long-script, or generic hardcoded-constant findings.
- A configurable rule-plugin framework.
- Automatic source-code modification.

## Analysis model

The analyzer uses a BAW-aware two-pass design.

### Context pass

Build one indexed application model before evaluating scripts. The model contains:

- Application objects and their server-side script elements.
- Process input, output, and private variables with declared types.
- Business Object schemas and property types.
- Service contracts, including declared inputs and outputs.
- Application-to-service and object references.
- Toolkit-provided Business Objects and service contracts.
- Toolkit dependency identity and version information.
- The inferred or manually selected BAW target version.

Application and toolkit declarations must retain an ownership marker. Ownership controls reporting:

- `app`: declarations and scripts may produce findings.
- `toolkit`: declarations may resolve application references but may never produce findings.

If an application references a Business Object, service, or other declaration supplied by a referenced toolkit, that reference is valid when its toolkit contract matches the usage.

If toolkit metadata is incomplete, the analyzer must not claim that an application reference is undefined merely because it cannot resolve it. It should either omit the finding or emit a needs-review candidate that states which context was unavailable.

### Script pass

Create a deduplicated inventory of application-owned script units. Each unit records:

- Application object ID, name, and type.
- Element ID, name, and type.
- Script role, such as script task, pre-assignment, post-assignment, or service implementation.
- Source text and stable source identity.
- Declared process variables and service contract context.

Analyze every unique script once. A script duplicated between `details.elements.scriptTasks` and `details.scripts` must not create duplicate findings.

Parse with strict Acorn first. Loose Acorn parsing is recovery-only. Rules that require reliable scopes or control flow cannot produce confirmed findings from a loose AST.

### Rule pass

Run rules against the strict AST and the indexed BAW context. Rules may perform bounded, lightweight local flow tracking but must not attempt a general abstract interpreter.

## Finding classification

Certainty and severity are separate fields.

### Certainty

- `confirmed`: supported by strict syntax analysis or an exact TWX/BAW model contradiction.
- `needs-review`: plausible issue whose outcome depends on runtime values or incomplete metadata.

Findings below the needs-review evidence threshold are omitted.

### Severity

- `critical`: likely runtime failure, incorrect result, exploitable data flow, or definite target-version incompatibility.
- `warning`: confirmed concern that deserves attention but is not a proven immediate runtime failure.

The summary must not mix needs-review candidates into confirmed critical or warning totals.

## Rule catalog

### Confirmed critical findings

1. **JavaScript syntax error**
   - Strict parsing fails because the script contains invalid JavaScript rather than an accepted BAW fragment.

2. **Undefined identifier**
   - A referenced identifier is absent from local declarations, parameters, application declarations, toolkit context, BAW globals, and supported Java/Rhino globals.

3. **Invalid Business Object property**
   - A statically known Business Object is accessed through a property absent from the application or toolkit schema.

4. **Service contract violation**
   - An application call omits a required input, supplies an unknown parameter, or uses a definitely incompatible input/output type.

5. **Definite assignment type mismatch**
   - A statically known value is assigned to an incompatible process variable or Business Object property.

6. **Unsupported syntax or API**
   - The selected BAW target version definitely does not support the syntax or BAW API being used.

7. **Definite division by zero**
   - The divisor is a zero literal or a locally propagated constant zero.

8. **Definite null or undefined access**
   - A value proven null or undefined on the evaluated local path is dereferenced.

9. **Proven unsafe dynamic execution or query construction**
   - Locally tracked untrusted input reaches `eval` or a dynamic SQL sink without an intervening safe operation.

### Confirmed warnings

1. **Undeclared process variable**
   - A `tw.local` member is absent from the application process-variable model and cannot be resolved through valid context.

2. **Loop with no demonstrable exit**
   - An unconditional loop has no reachable `break`, `return`, or `throw` in the supported local control-flow model.

3. **BAW compatibility warning**
   - The API exists in the target version, but known behavior or availability differs across supported BAW versions.

### Needs-review candidates

1. Possible use before assignment.
2. Possible null or undefined access.
3. Empty `catch` block or caught error silently discarded.
4. Dynamic SQL construction with incomplete input provenance.
5. Literal that resembles an embedded password, token, or secret.
6. Application reference that cannot be resolved because required toolkit metadata is incomplete or ambiguous.

## BAW version handling

The analyzer supports BAW 19, 20, 21, 23, and 24 through explicit version profiles.

Version selection order:

1. Manual analysis override, when supplied.
2. Version inferred from TWX package metadata.
3. Unknown-version mode when metadata is absent or unsupported.

Unknown-version mode must not emit confirmed version-compatibility findings. It may emit a single analysis-status notice explaining that version-specific checks were skipped.

The report records both the selected version and its source: `override`, `metadata`, or `unknown`.

## Toolkit context behavior

Toolkits improve application analysis quality without becoming analysis targets.

Toolkit context may provide:

- Business Object declarations and property schemas.
- Service declarations and input/output contracts.
- Toolkit version and dependency metadata.
- Other statically extractable declarations required to resolve application references.

Toolkit context must follow these rules:

- Toolkit scripts are never added to the script inventory.
- Toolkit objects never appear as finding owners.
- Toolkit objects never contribute to analyzed-element counts.
- Toolkit findings are never generated, even when toolkit source is malformed.
- A valid toolkit declaration suppresses an otherwise false undefined-reference finding in application code.
- Conflicting toolkit declarations make the application reference ambiguous and eligible only for needs review.
- The report records how many toolkits and toolkit contracts were used as context.

## Report contract

`analysis.json` uses a versioned schema and remains the single source for the Analyzer tab.

```json
{
  "schemaVersion": 2,
  "status": "complete",
  "meta": {
    "sourceFile": "ODC.twx",
    "generatedAt": "2026-07-28T18:46:00.000Z",
    "targetBawVersion": "24",
    "targetVersionSource": "metadata",
    "scope": "app-server-side",
    "toolkitsUsedAsContext": 13,
    "toolkitContractsUsed": 184
  },
  "coverage": {
    "eligibleAppElements": 2036,
    "analyzedAppElements": 2036,
    "skippedAppElements": 0,
    "skipped": []
  },
  "summary": {
    "critical": 9,
    "warnings": 16,
    "needsReview": 12,
    "elementsWithCritical": 6,
    "elementsWithWarnings": 12
  },
  "byAppType": {
    "CSHS": { "elements": 42, "critical": 7, "warnings": 8, "needsReview": 3 },
    "Service": { "elements": 582, "critical": 2, "warnings": 8, "needsReview": 9 },
    "BPD": { "elements": 8, "critical": 0, "warnings": 0, "needsReview": 0 }
  },
  "diagnostics": [],
  "findings": []
}
```

Each diagnostic contains a stable code, a human-readable message, and optional application object/element identity. Failed reports include at least one diagnostic explaining the analyzer failure; partial reports include diagnostics for checks that could not run.

Each finding contains:

```json
{
  "id": "stable-finding-id",
  "status": "confirmed",
  "severity": "critical",
  "confidence": "high",
  "ruleId": "undefined-identifier",
  "ruleName": "Undefined identifier",
  "objectId": "1.example",
  "objectName": "Update Customer",
  "objectType": "Service",
  "elementId": "script.example",
  "elementName": "Map customer",
  "elementType": "scriptTask",
  "scriptRole": "implementation",
  "message": "customerMapper is called but never declared",
  "location": {
    "line": 18,
    "column": 3,
    "snippet": "customerMapper(tw.local.customer);"
  },
  "evidence": [
    "No local declaration or parameter matches customerMapper",
    "No BAW global or referenced toolkit contract matches customerMapper"
  ],
  "affectedBawVersions": ["19", "20", "21", "23", "24"],
  "remediation": "Define or import the function, or correct the identifier."
}
```

Finding IDs must be stable across unchanged parses and unique per source location. The canonical JSON remains a flat finding list; UI grouping is derived without duplicating report data.

## Partial and failed analysis

Analysis remains non-fatal to TWX parsing, but failure must never leave a stale successful report visible.

- A single unparseable script produces a skipped coverage entry and analysis continues.
- Missing optional context downgrades affected checks instead of producing false confirmed findings.
- A completely failed analyzer writes a fresh report with `status: "failed"`, zero findings, and a concise failure reason.
- A partially completed analyzer writes `status: "partial"` and lists every skipped application element with a reason.
- Output and root-level `analysis.json` copies are written atomically from the same serialized report.

## Analyzer tab design

The Analyzer tab is a triage report rather than a card gallery.

### Header

- Title: `Server-side analysis`.
- Source TWX name and analysis timestamp.
- BAW target version and whether it came from metadata or an override.
- Explicit `App scripts only` scope label.
- Toolkit context label such as `13 toolkits used as context`.

### Compact summary

- Analysis coverage: analyzed application elements, eligible application elements, and skipped count.
- Confirmed critical count and affected application elements.
- Confirmed warning count and affected application elements.
- Needs-review count, explicitly excluded from confirmed totals.
- Compact application-only type counts for CSHS, Services, and BPD.

Coach View, Other, and toolkit objects do not appear in analyzed-scope counts.

### Critical section

- Group critical findings by application element.
- Render every element group as a keyboard-accessible collapsible section.
- Show object name, object type, element name/type, source location, and finding count in the collapsed row.
- Expanded findings show rule name, message, source snippet, evidence, affected BAW versions, and suggested correction.

### Warnings section

- Group confirmed warnings by finding type.
- Example groups include `Undeclared process variable` and `Loop with no demonstrable exit`.
- Each group shows finding and affected-element counts and expands to its application findings.

### Needs-review section

- Keep candidates visually and numerically separate from confirmed findings.
- Group candidates by finding type.
- Explain which runtime value or missing context prevents confirmation.

### Visual direction

- Preserve the existing TWX viewer navigation and overall design language.
- Replace the oversized red and yellow banners with compact neutral summary panels.
- Reserve saturated red, amber, and indigo for severity/status indicators rather than large surfaces.
- Use native collapsible disclosure behavior where practical.
- The signature expanded-finding layout answers three questions together: what failed, why the analyzer believes it, and the smallest useful correction.

## Accessibility and responsive behavior

- Collapsible groups must be keyboard operable and expose expanded state.
- Severity must be conveyed by text and labels, not color alone.
- Code snippets must wrap safely without forcing page-wide horizontal scrolling.
- At narrow widths, summary panels stack and the existing application sidebar follows its current responsive behavior.
- Mixed Arabic and Latin object names must remain readable without corrupting the surrounding layout direction.

## Validation strategy

Use the existing Node runtime and installed parser dependencies. Do not add a test framework solely for this feature.

Required automated coverage:

- Synthetic application scripts for every confirmed critical rule.
- Synthetic application scripts for every confirmed warning rule.
- Synthetic application scripts for every needs-review rule.
- Strict-parse versus loose-parse behavior.
- Script deduplication across extractor representations.
- BAW version inference, override, and unknown-version behavior.
- Application reference resolved by a toolkit declaration produces no finding.
- Equivalent application reference without app or toolkit declaration produces the appropriate finding.
- A defect inside a toolkit script produces no finding.
- Toolkit objects do not affect coverage or severity totals.
- Partial and failed analysis reports cannot expose stale prior findings.
- Report schema and stable finding IDs.

Required integration coverage:

- Parse a representative TWX with referenced toolkits.
- Verify `output/analysis.json` and root `analysis.json` are identical.
- Verify every finding owner belongs to the application.
- Verify the Analyzer tab renders critical-by-element, warnings-by-rule, and needs-review-by-rule groupings.

## Rollout

- Replace analyzer v1 in place and emit `schemaVersion: 2`.
- Update the Analyzer tab in the same release so it does not interpret v2 totals using v1 assumptions.
- Keep analysis non-fatal to TWX parsing while making partial or failed status visible.
- Reuse Acorn, acorn-loose, acorn-walk, and eslint-scope already installed in the project.
- Add no new production dependency unless an approved rule cannot be implemented correctly with the current stack.
