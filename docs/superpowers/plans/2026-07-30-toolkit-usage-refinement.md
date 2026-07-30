# Toolkit Usage Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Toolkit Usage deduplicated, concise, and resistant to false ownership caused by ordinary JavaScript names.

**Architecture:** Keep raw snapshot-level usage data unchanged on the server. Tighten script inference in `ToolkitDependencyMapper`, then derive one browser view model that merges duplicate toolkit snapshots, objects, and application-object locations for both the tab and exported HTML.

**Tech Stack:** Node.js, Acorn, native browser `<details>`, Blob download, existing assert/VM test scripts.

## Global Constraints

- Add no npm dependency, server endpoint, or PDF generator.
- Keep toolkit code excluded from usage scanning.
- Retain exact XML `versionId` and unique stable ID evidence.
- Infer script usage only from `new tw.object.<Name>()`; unresolved constructor collisions remain diagnostics, not toolkit locations.
- All disclosures remain collapsed initially.
- Export is self-contained HTML; PDF is supplied by the browser print dialog.

---

## File Structure

- `src/parser/toolkit/ToolkitDependencyMapper.js` owns confirmed XML evidence, narrow constructor inference, diagnostics, and normalized application type labels.
- `twx-viewer-new.js` owns the merged presentation/export view model, selection state, rendering, and browser download.
- `twx-viewer-new.css` owns only the report action and concise location-list styling.
- `test-toolkit-usage.js` tests mapper evidence behavior.
- `test-toolkit-usage-ui.js` tests the pure view-model and HTML rendering helpers.
- `README.md` documents the revised evidence rules and export flow.

### Task 1: Tighten mapper evidence and expose correct application type labels

**Files:**

- Modify: `src/parser/toolkit/ToolkitDependencyMapper.js`
- Modify: `test-toolkit-usage.js`

**Interfaces:**

- Consumes: parsed application scripts and toolkit objects supplied to `mapApplicationUsage`.
- Produces: existing `toolkit-usage.json` shape, with `location.appObjectTypeName` and `ambiguous-script-object-name` diagnostics.

- [ ] **Step 1: Write the failing mapper test**

Add a unique toolkit object named `ConstructorOnly` and a duplicate pair named `Account`. Build scripts containing:

```js
function validate(Account) { return Account.Branch }
const created = new tw.object.ConstructorOnly()
const ambiguous = new tw.object.Account()
```

Assert that the parameter/property script creates no locations, `ConstructorOnly` creates one inferred location, duplicate `Account` creates no toolkit locations, and the report contains `ambiguous-script-object-name`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node test-toolkit-usage.js`

Expected: the generic `Account` identifier assertions fail under the current broad AST matcher.

- [ ] **Step 3: Write the minimal mapper implementation**

In `_scanScript`, remove identifier, property, key, and literal visitors. Visit `NewExpression` nodes only; accept a non-computed member chain exactly shaped as `tw.object.<Name>`. Resolve one candidate as inferred; when two or more candidates exist, append one diagnostic containing the application location, name, and candidate object identifiers without calling `_appendLocation`.

Add a small `appObjectTypeName(appObject)` helper used by both `_scanScript` and `_scanXml`:

```js
if (appObject.type === 'process') return appObject.subType === '10' || appObject.details?.processType === '10' ? 'CSHS' : 'Service'
if (appObject.type === 'bpd') return 'BPD'
if (appObject.type === 'coachView') return 'Coach View'
return getTypeName(appObject.type)
```

Write the result as `location.appObjectTypeName`.

- [ ] **Step 4: Run mapper tests and inspect the regression evidence**

Run: `node test-toolkit-usage.js`

Expected: pass. The ACT01-style `Account.Branch` fixture has no inferred locations; constructor-only unique matches remain inferred; collisions are diagnostics only.

- [ ] **Step 5: Commit**

```powershell
git add src/parser/toolkit/ToolkitDependencyMapper.js test-toolkit-usage.js
git commit -m "fix: narrow toolkit script usage inference"
```

### Task 2: Build the concise, deduplicated Toolkit Usage view and HTML export

**Files:**

- Modify: `twx-viewer-new.js`
- Modify: `twx-viewer-new.css`
- Modify: `test-toolkit-usage-ui.js`

**Interfaces:**

- Consumes: raw `state.toolkitUsage` report.
- Produces: `buildToolkitUsageViewModel(report)`, `buildToolkitUsageExportHtml(viewModel, selectedKeys)`, concise rendered markup, and a downloaded `.html` report.

- [ ] **Step 1: Write the failing UI helper test**

Extend the fixture with two snapshots sharing `projectId`, one shared object ID, repeated locations in the same application object, and `appObjectTypeName: 'CSHS'`. Assert that the view model has one toolkit, one object, and one displayed location named `App <Object> (CSHS)`.

Assert that generated markup contains the selection controls and report helper output contains the selected toolkit but excludes an unselected toolkit.

- [ ] **Step 2: Run the focused UI test and verify failure**

Run: `node test-toolkit-usage-ui.js`

Expected: fail because snapshots and line-level locations are currently rendered independently and no report helper exists.

- [ ] **Step 3: Write the minimal browser view model**

Add pure helpers near `viewToolkitUsage`:

```js
toolkitKey = toolkit => toolkit.projectId || `short:${toolkit.shortName || toolkit.name}`
objectKey = object => object.id || object.versionId || `${object.type || object.typeName}\u0000${object.name}`
locationKey = location => location.appObjectVersionId || location.appObjectId || location.appObjectName
```

`buildToolkitUsageViewModel` groups raw snapshots by toolkit key, groups objects by object key, and retains one location per application-object key. Its summary is calculated from the merged groups. The location label is `${appObjectName} (${appObjectTypeName || appObjectType || 'Unknown'})`.

Render toolkit → type → object disclosures from this model. Render locations as a flat list with only that label; remove confidence, evidence, element, script, line, column, and snippet markup.

- [ ] **Step 4: Add selection and export actions**

Store selected logical toolkit keys in `state.toolkitUsageSelectedKeys`. Render a checkbox in each toolkit summary plus `Select used`, `Select all`, and `Generate HTML report` buttons.

Use delegated `click` and `change` handlers on `#content` to update selection and rerender. `buildToolkitUsageExportHtml` creates escaped standalone HTML with the same toolkit/type/object/location hierarchy. The Generate action downloads it using `new Blob`, `URL.createObjectURL`, and an `<a download>` element; disable the button when nothing is selected.

- [ ] **Step 5: Add minimal CSS and run UI tests**

Style the action row, native checkboxes, disabled button state, and compact location rows using existing colors and spacing. Do not add a component framework.

Run: `node test-toolkit-usage-ui.js`

Expected: pass. Verify every `<details>` remains collapsed by default.

- [ ] **Step 6: Commit**

```powershell
git add twx-viewer-new.js twx-viewer-new.css test-toolkit-usage-ui.js
git commit -m "feat: simplify and export toolkit usage"
```

### Task 3: Document and verify the finished behavior

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-30-toolkit-usage-refinement-design.md`
- Create: `docs/superpowers/plans/2026-07-30-toolkit-usage-refinement.md`

**Interfaces:**

- Consumes: finalized mapper evidence and browser export behavior.
- Produces: accurate user-facing usage/report documentation.

- [ ] **Step 1: Update the README Toolkit Usage table**

Replace the broad JavaScript-name description with explicit constructor-only inference, explain that duplicate snapshots are shown as one logical toolkit, state that locations are grouped by application object, and document **Generate HTML report** plus browser printing to PDF.

- [ ] **Step 2: Update the design status and self-review the docs**

Mark the design as implemented, then run:

```powershell
git diff --check
rg -n "TODO|TBD|generic JavaScript|all identifiers" README.md docs/superpowers/specs/2026-07-30-toolkit-usage-refinement-design.md
```

Expected: no whitespace errors, placeholders, or outdated broad-matching wording.

- [ ] **Step 3: Run final checks**

```powershell
npm test
npm run lint
```

Expected: all seven existing test scripts and lint pass.

- [ ] **Step 4: Commit**

```powershell
git add README.md docs/superpowers/specs/2026-07-30-toolkit-usage-refinement-design.md docs/superpowers/plans/2026-07-30-toolkit-usage-refinement.md
git commit -m "docs: explain toolkit usage export"
```
