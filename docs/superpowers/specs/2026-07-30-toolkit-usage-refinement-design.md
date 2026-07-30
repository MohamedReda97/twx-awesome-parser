# Toolkit Usage Refinement Design

**Date:** 2026-07-30  
**Status:** Implemented

## Purpose

Make Toolkit Usage concise and trustworthy: one logical row per toolkit, one location per application object, and no false toolkit ownership from ordinary JavaScript variable names.

## UI

- Merge embedded snapshots of the same logical toolkit in a browser view model. Prefer the toolkit `projectId`; fall back to normalized `shortName` and then name when an ID is unavailable. Keep the raw snapshot report unchanged for diagnostics.
- Preserve the existing collapsed hierarchy: toolkit → object type → object.
- An expanded object contains a flat, deduplicated list of application-object locations only, formatted as `Application object name (CSHS|Service|BPD|Coach View|…)`.
- A location is unique per application object. Element, script role, line, column, evidence badge, and code snippet are omitted from this view.
- Add per-toolkit checkboxes, Select used, Select all, and Generate HTML report. The selected toolkits are exported into a self-contained HTML file that can be printed to PDF.

## Evidence rules

- Preserve exact XML `versionId` and unique stable object-ID matches as confirmed usage.
- Remove generic JavaScript identifier, property, key, and string-literal matching.
- Infer usage only from an explicit BAW constructor expression: `new tw.object.<ToolkitObject>()`.
- If that constructor name maps to more than one toolkit object, do not attach the usage to any toolkit. Record a diagnostic instead.

This intentionally favors correct ownership over speculative coverage. In particular, a local parameter such as `Account.Branch` is not a toolkit reference.

## Data and export

- Build one browser view model for the UI summary and export so both use the same merged toolkit, object, and application-object location groups.
- Merge matching toolkit objects by object identity and merge locations before counting them in that view model.
- Generate export HTML in the browser from the loaded report using a Blob download; add no server endpoint or dependency.

## Validation

- Mapper tests cover duplicate toolkit snapshots, location grouping, explicit constructor inference, and rejection of local identifiers.
- UI tests cover concise location output, type labels, checkbox selection, and report HTML generation.
- Run the existing full test suite and lint.
