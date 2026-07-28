# Analyzer Three-Level Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every Analyzer status as a collapsed status → finding type → element → finding hierarchy.

**Architecture:** Keep the analysis JSON unchanged. Reuse `viewAnalyzer`, `renderFindingCard`, and native `<details>` elements; add a Node VM regression test that executes the real browser renderer with a minimal document stub.

**Tech Stack:** Browser JavaScript, native HTML `<details>/<summary>`, CSS, Node.js `assert` and `vm`.

## Global Constraints

- Confirmed critical, Confirmed warnings, and Needs review use the same hierarchy.
- All status sections start collapsed.
- Finding type uses `ruleName`, then `ruleId`, then `Other finding`.
- Element identity uses object ID/name plus element ID/name.
- Status and type summaries show finding and affected-element counts; element summaries show finding counts.
- Existing finding cards, escaping, and severity colors remain.
- Add no dependency and no custom accordion state.

---

### Task 1: Render and verify the nested findings hierarchy

**Files:**
- Modify: `twx-viewer-new.js`
- Modify: `twx-viewer-new.css`
- Modify: `package.json`
- Create: `test-analyzer-ui.js`

**Interfaces:**
- Consumes: `state.analysisData`, `viewAnalyzer()`, `renderFindingCard(finding)`, and existing finding fields.
- Produces: collapsed `.analyzer-group.section` disclosures containing `.analyzer-group.rule`, then `.analyzer-group.element`, then `.analyzer-finding` cards.

- [x] **Step 1: Write the failing renderer test**

Create `test-analyzer-ui.js`. Load `twx-viewer-new.js` through `vm.runInNewContext`, append exports for `state` and `viewAnalyzer`, and provide a document stub whose `createElement` escapes text and whose `addEventListener` is inert. Supply one critical, one warning, and one needs-review finding with deliberately unsafe display names.

```js
const assert = require('assert')
const fs = require('fs')
const vm = require('vm')

const document = {
  addEventListener: () => {},
  createElement: () => {
    const node = { innerHTML: '' }
    Object.defineProperty(node, 'textContent', { set: value => { node.innerHTML = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') } })
    return node
  }
}
const source = `${fs.readFileSync('twx-viewer-new.js', 'utf8')}\nthis.__viewer = { state, viewAnalyzer };`
const context = { document, window: {}, console, fetch: async () => ({ ok: false }) }
vm.runInNewContext(source, context)
const { state, viewAnalyzer } = context.__viewer
const finding = (status, severity, ruleName, suffix) => ({
  id: suffix,
  status,
  severity,
  ruleName,
  objectId: `object-${suffix}`,
  objectName: `Object <${suffix}>`,
  objectType: 'Service',
  elementId: `element-${suffix}`,
  elementName: `Element <${suffix}>`,
  elementType: 'scriptTask',
  message: `Message ${suffix}`,
  location: { line: 1, column: 1, snippet: 'var x = 1;' }
})
state.analysisData = {
  status: 'complete', meta: {}, summary: {}, coverage: {}, byAppType: {},
  findings: [
    finding('confirmed', 'critical', 'Syntax rule', 'critical'),
    finding('confirmed', 'warning', 'Warning rule', 'warning'),
    finding('needs-review', null, 'Review rule', 'review')
  ]
}
const html = viewAnalyzer()
for (const [tone, label, rule, element] of [
  ['critical', 'Confirmed critical', 'Syntax rule', 'Element &lt;critical&gt;'],
  ['warning', 'Confirmed warnings', 'Warning rule', 'Element &lt;warning&gt;'],
  ['review', 'Needs review', 'Review rule', 'Element &lt;review&gt;']
]) {
  const section = html.indexOf(`<details class="analyzer-group ${tone} section">`)
  const type = html.indexOf(`<details class="analyzer-group ${tone} rule">`, section)
  const item = html.indexOf(`<details class="analyzer-group ${tone} element">`, type)
  const card = html.indexOf('<article class="analyzer-finding', item)
  assert.ok(section >= 0 && type > section && item > type && card > item, `${label} must nest rule, element, and finding levels`)
  assert.ok(html.indexOf(label, section) > section)
  assert.ok(html.indexOf(rule, type) > type)
  assert.ok(html.indexOf(element, item) > item)
}
assert.ok(!/<details[^>]*\sopen(?:\s|>)/.test(html), 'all disclosures must start collapsed')
assert.ok(!html.includes('Object <critical>'), 'display names must remain escaped')
console.log('analyzer UI checks passed')
```

Change `package.json` so `npm test` runs both existing analyzer tests and this renderer test:

```json
"test": "node test-analyzer-v2.js && node test-analyzer-ui.js"
```

- [x] **Step 2: Run the renderer test and verify it fails**

Run: `node test-analyzer-ui.js`

Expected: FAIL because the current critical section groups by element directly and the three status sections are not `<details>` elements.

- [x] **Step 3: Implement the minimal nested renderer**

In `viewAnalyzer`, replace the separate critical-element and warning/review-rule render paths with shared helpers:

```js
const elementKey = f => `${f.objectId || f.objectName}|${f.elementId || f.elementName}`
const elementCount = items => new Set(items.map(elementKey)).size
const disclosure = (title, meta, tone, level, body) => `<details class="analyzer-group ${tone} ${level}">
  <summary><span class="analyzer-group-title">${title}</span><span class="analyzer-group-meta">${meta}</span></summary>
  <div class="analyzer-group-body">${body}</div>
</details>`
const elementHtml = (items, tone) => Object.values(groupBy(items, elementKey)).map(groupItems => {
  const f = groupItems[0]
  const title = `${esc(f.objectName || 'Unnamed')} <span>${esc(f.objectType || '')}</span> <b>›</b> ${esc(f.elementName || 'Unnamed')} <span>${esc(f.elementType || '')}</span>`
  return disclosure(title, `${groupItems.length} finding${groupItems.length === 1 ? '' : 's'}`, tone, 'element', groupItems.map(renderFindingCard).join(''))
}).join('')
const ruleHtml = (items, tone) => Object.entries(groupBy(items, f => f.ruleName || f.ruleId || 'Other finding')).map(([name, groupItems]) => disclosure(esc(name), `${groupItems.length} finding${groupItems.length === 1 ? '' : 's'} · ${elementCount(groupItems)} element${elementCount(groupItems) === 1 ? '' : 's'}`, tone, 'rule', elementHtml(groupItems, tone))).join('')
const sectionHtml = (title, items, tone) => disclosure(esc(title), `${items.length} finding${items.length === 1 ? '' : 's'} · ${elementCount(items)} element${elementCount(items) === 1 ? '' : 's'}`, tone, 'section', ruleHtml(items, tone))
```

Render each non-empty status with `sectionHtml(...)`. Do not add `open` attributes.

Update CSS to style `.section`, `.rule`, and `.element` using the existing disclosure colors, with nested groups receiving compact spacing and indentation. Remove obsolete status `<h3>` rules.

- [x] **Step 4: Run automated verification**

Run:

```powershell
npm test
npx eslint --no-eslintrc --config .eslintrc.js test-analyzer-ui.js
node --check twx-viewer-new.js
node --check test-analyzer-ui.js
git diff --check
```

Expected: all commands exit 0; tests print `analyzer v2 checks passed` and `analyzer UI checks passed`.

- [x] **Step 5: Verify the local Analyzer tab**

Start the worktree server, load a real analysis report, and confirm:

- all three non-empty status sections start collapsed;
- status expands to finding types;
- finding type expands to elements;
- element expands to issue cards;
- counts and colors match the report.

- [x] **Step 6: Commit**

```powershell
git add -- twx-viewer-new.js twx-viewer-new.css package.json test-analyzer-ui.js docs/superpowers/plans/2026-07-29-analyzer-three-level-findings.md
git commit -m "feat: group analyzer findings by type and element"
```
