# Plan B — Promote the Linear-density prototype to production

> The new viewer **replaces** `twx-viewer-new.html`, `twx-viewer-new.js`, and `twx-viewer-new.css` in the repo root. The prototype in `docs/prototype-viewer/` is the design reference; it gets deleted after the production build lands.
>
> **Hard requirement from the user:** every functionality, logic, and use case present in the old UI must be present in the new UI — done better, in the Linear-density minimalism design language.

---

## Phase 0 — Feature inventory (old viewer)

The old `twx-viewer-new.js` is 1,636 lines and exposes **25+ distinct features** grouped below. The Designer-UI pass must specify a new design for each, and the Fixer-UI pass must implement each. QC-UI-impl must verify each.

| # | Old feature | Source lines | Used by |
|---|---|---|---|
| 1 | File selection (`selectTWXFile`, `clearSelectedFile`) | 26–61 | header |
| 2 | File upload + parse via `/api/parse` (`parseTWXFile`) | 63–113 | header |
| 3 | Parsing status / progress bar | 114–146 | header |
| 4 | Collapsible panels (togglePanel) | 148–164 | chrome |
| 5 | Load all object data via `/api/objects` (`loadObjectData`) | 166–280 | sidebar |
| 6 | Display object types as cards (`displayObjectTypes`) | 282–358 | sidebar |
| 7 | Type selection + filter (`selectObjectType`, `getFilteredObjects`) | 360–418 | sidebar |
| 8 | Toggle toolkit objects (`toggleToolkitObjects`) | 384–403 | sidebar |
| 9 | Display objects list (`displayObjectsList`) | 420–508 | middle pane |
| 10 | Select + display object details (`selectObject`, `displayObjectDetails`) | 510–575 | right pane |
| 11 | Detail sections (collapsible) | 578–621 | right pane |
| 12 | Basic info display (`generateBasicInfo`) | 623–658 | right pane |
| 13 | Variables display (`generateVariablesDisplay`, `generateVariablesBoxDisplay`, `generateVariableTypeSection`, `generateVariableBox`) | 660–743 | right pane |
| 14 | Scripts display (`generateScriptsDisplay`, `generateInlineScriptsDisplay`) | 745–806 | right pane |
| 15 | Elements display (`generateElementsDisplay`, `generateElementScriptDisplay`) | 808–890 | right pane |
| 16 | Show/hide panels (`showPanel`) | 891–904 | chrome |
| 17 | Deep search input + button (`handleSearchKeyup`, `performSearch`) | 906–998 | chrome |
| 18 | Client-side search fallback (`performClientSideSearch`, `createSnippet`, `displaySearchResults`, `highlightSearchTerm`, `showSearchResultDetails`) | 1000–1339 | chrome |
| 19 | Toolkit search test (`testToolkitSearch`) | 915–963 | chrome |
| 20 | Status bar (`updateStatus`, `updateObjectCount`) | 1342–1393 | footer |
| 21 | Display name / description (`getDisplayName`, `getTypeDescription`) | 1395–1426 | chrome |
| 22 | Object lookup (`findObjectInCurrentData`) | 1428–1443 | chrome |
| 23 | Business object schema summary (`generateBusinessObjectSummary`) | 1445–1479 | right pane |
| 24 | Business object schema display (`generateBusinessObjectSchemaDisplay`, `generatePropertyDisplay`, `toggleResolvedType`) | 1481–1618 | right pane |
| 25 | Statistics (`loadAndDisplayStatistics`, `displayEnhancedStatistics`) | 1620–end | footer / sidebar |

**Plus the server API (3 endpoints):** `/api/parse` (POST upload), `/api/objects` (GET all), `/api/search` (GET).

---

## Phase 1 — Designer-UI (des-1 reused)

**Reuse `des-1` (designer session).** This session has the prototype context — they know the design tokens, the layout, the component vocabulary.

**Inputs to read:**
- `docs/prototype-viewer/index.html`, `styles.css`, `app.js` — the design vocabulary
- `twx-viewer-new.html`, `twx-viewer-new.js`, `twx-viewer-new.css` — the feature inventory
- `src/server/web-server.js` — the 3 API endpoints and the static-file serving

**Output:** `docs/UI-DESIGN-SPEC.md` — a feature-by-feature design specification. One section per feature (#1–#25), plus an architecture section that maps sidebar tabs to feature groups. Each section describes:
- Where the feature lives in the new design (which sidebar tab, which pane)
- How the user triggers it (click target, keyboard shortcut if any)
- What data it reads (which API endpoint or which local file)
- What the empty/loading/error states look like
- Any new design patterns introduced (e.g. "right pane is now a 2-column card grid instead of a vertical stack of details panels")

**Design constraints (locked, from the prototype):**
- 220px sidebar, 48px topbar, 6px cards, indigo-600 accent, slate palette, Inter, 32px row tables
- Vertical tabs: BROWSE (Summary, By Type, Toolkits), ANALYZE (Search, Dependencies), APP (Settings)
- No emojis in chrome
- Inline SVG icons only
- Plain HTML + CSS + JS, no build step

**Required groupings in the spec:**
- **Summary tab:** features 20, 25, plus a "Recent Objects" table
- **By Type tab:** features 5, 6, 7, 8, 9 (the type browser) — re-imagined as a two-pane (type list left, object list right)
- **Toolkits tab:** feature 25 toolkit-specific subset
- **Object detail:** a **right-pane drawer** that slides in when an object is selected, hosting features 10–15 and 23–24. This is the biggest design change from the prototype.
- **Search tab:** features 17, 18 — kept as a sidebar tab since the topbar search is for quick filter, deep search is a tab
- **Empty states:** all features must have an empty state, including a "no .twx parsed yet" global state shown before the user uploads anything

**Acceptance for the spec:** a Fixer-UI reading the spec alone (without reading the old viewer) could implement the new viewer. No "see old viewer for context" allowed.

**Status to return:** `READY_FOR_QC`.

---

## Phase 2 — QC-UI-design (validates the spec)

**Scope:** `docs/UI-DESIGN-SPEC.md` only.

**Checks:**
- All 25 features from the inventory have a design section.
- All 3 API endpoints are referenced (at least the consumer side).
- The "right-pane drawer" pattern is described with enough detail to implement (width, slide animation, dismissal behavior, where the close button goes, how it coexists with the by-type view).
- Empty / loading / error states are specified for each feature.
- Sidebar tab mapping is consistent (no feature mapped to two tabs).
- The spec is self-contained — no "see old viewer" hand-waves.

**Verdict:** GREEN if all 25 features have design sections and the spec is implementable. RED with concrete gaps otherwise.

---

## Phase 3 — Fixer-UI (builds the production viewer)

**Inputs:**
- `docs/UI-DESIGN-SPEC.md` (the design)
- `docs/prototype-viewer/` (the design vocabulary reference)
- `twx-viewer-new.html`, `twx-viewer-new.js`, `twx-viewer-new.css` (the features being replaced)
- `src/server/web-server.js` (the API contract)

**Files to write:**
- `twx-viewer-new.html` (replace)
- `twx-viewer-new.css` (replace)
- `twx-viewer-new.js` (replace; aim for ≤ 1500 lines, ideally less)

**File to delete after build:**
- `docs/prototype-viewer/` (the prototype is now redundant; the design lives in the spec + the production viewer)

**Implementation rules (locked):**
- Plain HTML + CSS + JS, no build step.
- No external icon font, no CSS framework, no emoji.
- Use `fetch` to call `/api/parse` (POST), `/api/objects` (GET), `/api/search` (GET). No client-side fallback that re-implements search; use what the server provides.
- For object details, fetch the per-type file via the static endpoint (e.g. `/objects-twclass.json`) and look up the object by ID. Same as the old viewer did.
- Right-pane drawer is a new component. Use a CSS class toggle for show/hide; no external animation library.
- Loading states: every async fetch shows a skeleton or spinner, never a blank panel.
- Errors: every async fetch has an error path that shows a slate-500 message inline. No `alert()`.

**Commit message:** `Promote Linear-density prototype to production viewer (feature parity)`

**Smoke test before commit:**
- `node app.js` starts, browser opens.
- The viewer renders the empty state (no .twx yet).
- Upload a `.twx`, parsing completes, summary view shows KPI values, by-type view shows the type list, toolkits view shows the toolkits.
- Click a type, object list appears, click an object, right-pane drawer opens with details.
- Search tab returns results from `/api/search`.
- Ctrl+C shuts the server down cleanly.
- `git status` clean except for the commit.

**Acceptance:** Commit lands, all 25 features work, no `console.error` in the browser console during the smoke test, the right-pane drawer is implemented (not stubbed).

---

## Phase 4 — QC-UI-impl (validates the production build)

**Scope:** `twx-viewer-new.html`, `twx-viewer-new.js`, `twx-viewer-new.css`, and the deleted `docs/prototype-viewer/`.

**Checks per feature (1–25 from the inventory):**
- For each feature: does it exist in the new viewer? Does it match the design spec? Does it handle empty / loading / error states?
- Sidebar tabs match the design (BROWSE / ANALYZE / APP, 6 tabs total).
- Right-pane drawer exists and works (open, scroll, close, doesn't break the by-type view).
- `git grep` shows no dead references to the old viewer's element IDs (`object-types-list`, `search-results`, `objects-list`, etc. — the new IDs are in the design spec).
- `docs/prototype-viewer/` is deleted (`git status` shows the deletion in the commit or as a separate cleanup).
- The old viewer's collapsible-panel DOM pattern is gone.
- `twx-viewer-new.js` ≤ 1500 lines (if over, ask why; the user wants a lean UI).
- `git log -1` shows the expected commit message.

**Verdict:** GREEN if all 25 features work and match the spec. RED with per-feature gaps otherwise.

---

## Risks & mitigations

- **Feature parity risk** — the user said "all functionalities, logic, use cases." A small feature in the old viewer (e.g. `testToolkitSearch`) is easy to miss. Mitigation: the inventory table is the source of truth; the Designer's spec must cover all 25, and QC verifies all 25.
- **Design scope creep** — Designer might invent patterns not in the prototype. Mitigation: spec must use only the design tokens from `docs/prototype-viewer/styles.css`; QC checks for new colour names.
- **Old viewer still has bugs** — feature parity does not mean bug parity. If a feature in the old viewer was buggy, the new one should be **correct**, not identical. The user explicitly said "in a better way."
