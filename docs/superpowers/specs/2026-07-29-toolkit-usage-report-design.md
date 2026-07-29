# Toolkit Usage Report Design

**Date:** 2026-07-29
**Status:** Approved for implementation planning

## Purpose

Add a new **Toolkit Usage** tab that shows every toolkit embedded in an IBM BAW application package and identifies which toolkit objects the application uses.

The report must distinguish reliable structural references from lower-confidence JavaScript name matches. It must also show where each reference occurs in application-owned content.

## Goals

- Show every embedded toolkit, including toolkits with no detected application usage.
- Identify toolkit objects referenced by application XML using exact IBM object or version identifiers.
- Identify additional toolkit objects mentioned by exact name in application JavaScript.
- Show the application object, element or script, and line where available.
- Keep confirmed, inferred, and ambiguous evidence visibly separate.
- Keep toolkit code out of the scan. Toolkits are reference targets and analyzer context, not analysis targets.
- Generate a compact report during parsing so the browser only renders prepared data.

## Non-goals

- A general-purpose dependency graph.
- Analysis of dependencies between toolkits.
- Declaring that a toolkit is safe to remove.
- Loose substring or fuzzy-name matching.
- Searching HTML, templates, or non-JavaScript content as JavaScript.
- Charts, graph visualization, report export, or advanced filtering in the first version.

## Terminology

- **Toolkit:** An embedded toolkit snapshot found under `toolkits/` in the outer TWX archive.
- **Toolkit object:** An object declared by an embedded toolkit.
- **Application object:** An object owned by the outer process application.
- **Confirmed reference:** An exact toolkit object `versionId`, or an exact stable `id` that maps to one toolkit object.
- **Inferred reference:** An exact toolkit object name found as a JavaScript identifier, member name, or complete string literal.
- **Ambiguous reference:** An exact ID or name that maps to more than one toolkit object or toolkit snapshot.
- **No detected usage:** The scanner found no confirmed, inferred, or ambiguous application reference. This is not proof that the toolkit can be removed.

## Architecture

The feature extends the existing parsing pipeline:

1. `TWXExtractor` reads the outer application package, application objects, and embedded toolkits as it does today.
2. The existing unused `ToolkitDependencyMapper` is reduced to a focused toolkit-usage mapper. It receives the outer ZIP, application manifest entries, parsed application objects, extracted toolkit descriptors, and any toolkit extraction diagnostics.
3. The mapper scans raw application object XML for structural identifiers and parsed application JavaScript for exact object-name matches.
4. `TWXExtractor` returns the usage report as `toolkitUsage` alongside `objects`, `toolkits`, and `allObjects`.
5. `JSONParser` writes `output/toolkit-usage.json`.
6. The browser loads that file and renders the new **Toolkit Usage** tab.

The report remains separate from `dependencies.json`. The existing dependency file describes toolkit packages included by the application; `toolkit-usage.json` describes object-level evidence inside those packages.

No new npm dependency is required. The implementation reuses `adm-zip`, `acorn`, and the existing parsed object structures.

## Component Responsibilities

### `src/parser/toolkit/ToolkitDependencyMapper.js`

Replace the unused generic graph implementation with the focused report builder. Its public operation accepts:

```js
mapApplicationUsage({ zip, appObjectList, appObjects, toolkits, toolkitDiagnostics })
```

and returns the complete report described below.

The mapper owns:

- Toolkit and toolkit-object lookup indexes.
- Raw XML identifier scanning.
- Application script-unit collection.
- Exact JavaScript name matching.
- Evidence classification, deduplication, sorting, and summary counts.
- Non-fatal diagnostics.

It does not write files or render HTML.

### `src/parser/toolkit-extractor.js`

Reset a small `diagnostics` array at the start of each extraction. When an embedded toolkit ZIP cannot be read, add `{ code, fileName, message }` while preserving the current non-fatal behavior. `TWXExtractor` passes these diagnostics into the usage mapper without changing the toolkit array contract.

### `src/parser/twx-extractor.js`

Call the mapper after application objects and toolkits are available. Add the returned report to the extraction result as `toolkitUsage`.

If usage mapping fails unexpectedly, extraction still succeeds with a partial usage report containing a diagnostic.

### `src/parser/json-parser.js`

Write `output/toolkit-usage.json` from `extractedData.toolkitUsage`. An application with no toolkits still receives a valid empty report so the UI does not need a missing-file special case.

### `twx-viewer-new.js`

- Load `output/toolkit-usage.json` into dedicated state.
- Add **Toolkit Usage** under the **Analyze** sidebar section.
- Render the summary and nested disclosures.
- Keep all disclosures collapsed on initial load.

### `twx-viewer-new.css`

Add only the status badges and nested-row styles needed by the new tab. Reuse existing cards, typography, colors, and `<details>` disclosure patterns.

## Report Contract

`output/toolkit-usage.json` has this shape:

```json
{
  "schemaVersion": 1,
  "status": "complete",
  "generatedAt": "2026-07-29T00:00:00.000Z",
  "summary": {
    "toolkitCount": 3,
    "usedToolkitCount": 1,
    "possibleToolkitCount": 1,
    "unusedToolkitCount": 1,
    "usedObjectCount": 4,
    "confirmedLocationCount": 5,
    "inferredLocationCount": 2,
    "ambiguousLocationCount": 1
  },
  "diagnostics": [],
  "toolkits": [
    {
      "key": "2064.example.zip",
      "name": "Example Toolkit",
      "shortName": "EXTK",
      "projectId": "project-id",
      "snapshotId": "snapshot-id",
      "snapshotName": "1.0.0",
      "fileName": "2064.example.zip",
      "totalObjectCount": 25,
      "usageStatus": "used",
      "counts": {
        "usedObjects": 1,
        "confirmedLocations": 1,
        "inferredLocations": 1,
        "ambiguousLocations": 0
      },
      "objects": [
        {
          "id": "12.object-id",
          "versionId": "object-version-id",
          "name": "CustomerData",
          "type": "twClass",
          "typeName": "Business Object",
          "locations": [
            {
              "confidence": "confirmed",
              "evidence": "version-id",
              "appObjectId": "app-object-id",
              "appObjectVersionId": "app-object-version-id",
              "appObjectName": "Create Customer",
              "appObjectType": "process",
              "elementId": "script-task-id",
              "elementName": "Prepare Data",
              "elementType": "scriptTask",
              "scriptRole": "script-task",
              "lineBasis": "script",
              "line": 4,
              "column": 12,
              "snippet": "tw.local.data = new tw.object.CustomerData();"
            }
          ]
        }
      ]
    }
  ]
}
```

Allowed top-level `status` values are `complete` and `partial`.

Allowed toolkit `usageStatus` values are:

- `used`: at least one confirmed or uniquely inferred location exists.
- `possible`: only ambiguous locations exist.
- `not-detected`: no locations exist.

Allowed location `confidence` values are `confirmed`, `inferred`, and `ambiguous`.

Allowed location `evidence` values are:

- `version-id`
- `object-id`
- `script-identifier`
- `script-member`
- `script-string`
- `ambiguous-id`
- `ambiguous-name`

`elementId`, `elementName`, `elementType`, `scriptRole`, `line`, and `column` are optional because raw XML sometimes exposes only the owning application object. `lineBasis` is `xml` for raw structural matches and `script` for JavaScript matches.

Toolkit `key` uses the embedded ZIP file name. If it is unavailable, the mapper falls back to snapshot ID, then project ID. This keeps multiple snapshots with the same toolkit short name separate.

## Structural Reference Matching

The mapper builds these indexes before scanning application XML:

- `versionId -> one toolkit object`
- `stable id -> one or more toolkit objects`
- `toolkit key -> toolkit descriptor`

For each application manifest object, it reads `objects/<versionId>.xml`, falling back to `objects/<id>.xml`, exactly as `ObjectExtractor` does.

Matching rules:

1. An exact `versionId` match is confirmed.
2. An exact stable object `id` match is confirmed only when the ID maps to one toolkit object.
3. An exact stable ID shared by multiple toolkit objects or snapshots produces ambiguous locations for the candidates.
4. When the same XML occurrence matches both an object ID and a version ID, the version-ID result wins.
5. Only application object XML is scanned. Embedded toolkit XML is never scanned as source content.

The scanner extracts IBM identifier-shaped tokens and resolves them through lookup maps rather than comparing every toolkit object with every application string. Nonstandard IDs that do not follow the usual IBM identifier shape are handled by exact matching against the small nonstandard-ID set.

For each occurrence, the mapper records the owning application object, XML line, column, and a short single-line snippet. When the parsed application object exposes the same reference through a known field such as `callsTargetId`, `classRef`, or Coach View layout metadata, the corresponding element information is added. Otherwise the location remains object-level.

## JavaScript Name Matching

The mapper collects JavaScript only from application-owned parsed objects:

- Script tasks.
- Pre- and post-assignments.
- Service implementation scripts.
- Coach View lifecycle functions.
- Coach View inline JavaScript blocks.

HTML, layout markup, templates, and fields declared as `text/plain` are not parsed as JavaScript.

Each JavaScript unit is parsed with Acorn using the same ECMAScript level as the analyzer. Matching is case-sensitive and exact:

- Identifier node name equals a toolkit object name.
- Non-computed member property name equals a toolkit object name.
- Computed string property or string literal value equals a toolkit object name.

No substring, fuzzy, or case-insensitive match is allowed. For example, toolkit object `Account` does not match `AccountNumber`.

If one exact name identifies one toolkit object, the location is inferred. If it identifies multiple toolkit objects, each candidate receives an ambiguous location. A confirmed location for the same toolkit object, application object, element, and line takes precedence over an inferred duplicate.

If a JavaScript unit cannot be parsed, the mapper skips name inference for that unit, adds a diagnostic, and continues. It does not fall back to substring matching.

## Deduplication and Ordering

A logical location is unique by:

```text
toolkit key + toolkit object versionId/id + app object versionId/id + element/script role + line basis + line
```

Confirmed evidence replaces inferred evidence at the same logical source location. Repeated identical matches do not inflate counts.

Output order is deterministic:

1. Toolkits remain in embedded package order.
2. Used objects are grouped by `typeName` in the UI.
3. Types and objects sort alphabetically within a toolkit.
4. Locations sort by application object name, element name, then line.

## User Interface

Add **Toolkit Usage** after **Dependencies** in the **Analyze** sidebar section.

The tab begins with four compact summary values:

- Available toolkits
- Used toolkits
- No detected usage
- Used toolkit objects

Below the summary, render one collapsed `<details>` row per toolkit. The row shows toolkit name, short name, snapshot/version, total objects, used objects, and one of:

- **Used**
- **Possible usage**
- **No detected usage**

Expanding a used or possible toolkit shows:

1. Object type disclosures.
2. Toolkit object disclosures with confirmed, inferred, and ambiguous counts.
3. Where-used rows containing:
   - Application object name and type.
   - Element or script name when available.
   - Line and column when available.
   - Evidence badge.
   - Compact evidence snippet.

A `not-detected` toolkit expands to a short explanation: “No application references were detected. This does not prove that the toolkit can be removed.”

No disclosure is open initially. No search, chart, graph, export, or confidence filter is included in the first version.

## Error Handling and Diagnostics

- No toolkits: produce a complete report with zero counts and an empty toolkit list.
- Toolkit extraction failure: preserve the existing extraction warning and add a usage diagnostic when identifying information is available.
- Missing application object XML: add an object-scoped diagnostic and continue.
- Malformed JavaScript: skip only that script unit, mark the report partial, and retain all structural matches.
- Unexpected mapper failure: `TWXExtractor` returns a partial empty usage report; the main parse and analyzer output still complete.
- Missing report in an older output directory: the UI shows “Toolkit usage is not available—parse the TWX again.”

Diagnostics contain identifiers and technical reasons only. They do not copy complete scripts or XML.

## Performance and Privacy

- Identifier resolution uses lookup maps and a single scan of each application XML document.
- JavaScript matching uses a name index and one AST walk per script unit.
- Toolkit object bodies are not scanned.
- The report stores only short evidence snippets, never complete source XML.
- Analysis remains local; the feature adds no network request or external service.

## Testing

Add focused automated coverage using small synthetic application objects, toolkit descriptors, XML strings, and JavaScript units. Tests must cover:

- Exact version-ID confirmation.
- Unique stable-ID confirmation.
- Stable IDs shared by multiple toolkit snapshots.
- Exact JavaScript identifiers, member names, computed string properties, and string literals.
- Rejection of substring and case-insensitive matches.
- Duplicate-name ambiguity.
- Confirmed evidence replacing an inferred duplicate.
- XML and script line locations.
- All toolkits appearing, including `not-detected` toolkits.
- A malformed script producing a partial report while structural results remain.
- Deterministic grouping, ordering, and counts.
- Generation of `output/toolkit-usage.json`.
- The new tab, collapsed toolkit/type/object hierarchy, badges, and empty states.
- Existing analyzer tests, lint, and standalone executable build remaining green.

No real customer TWX file is committed as a fixture. Tests construct the minimum data needed in temporary directories and remove it afterward.

## Acceptance Criteria

The feature is complete when:

1. Parsing a TWX always generates `output/toolkit-usage.json`.
2. Every successfully extracted embedded toolkit appears exactly once, including duplicate short names from different snapshots.
3. Exact structural references and exact JavaScript-name references are separately labeled.
4. Every reference identifies its owning application object and includes element/script and line information when available.
5. Toolkits without matches are clearly marked **No detected usage** with a removal disclaimer.
6. The new tab is initially collapsed and remains responsive for a large application package.
7. Malformed scripts or missing object XML produce partial diagnostics without failing the main parse.
8. All automated checks, production dependency audit, and Windows executable build pass.
