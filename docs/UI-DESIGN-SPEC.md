# UI Design Specification — Production Viewer

> **Status:** READY_FOR_QC  
> **Design language:** Linear-density minimalism (see `docs/prototype-viewer/` for the design vocabulary)  
> **Replaces:** `twx-viewer-new.html`, `twx-viewer-new.css`, `twx-viewer-new.js` (repo root)  
> **Design tokens:** All colours, spacing, typography, and radii are defined in `docs/prototype-viewer/styles.css` (`:root` block). This spec references those tokens — it does not redefine them.

---

## Section 1 — Global layout

```
+------------------+------------------------------------------------+
|                  |  TOPBAR (48px)                                  |
|  SIDEBAR         |  [filename.twx · subtitle]    [search] [gear]   |
|  (220px)         +------------------------------------------------+
|                  |                                                 |
|  T·W·X wordmark  |  MAIN CONTENT AREA                              |
|                  |  (32px padding, scrollable)                     |
|  BROWSE          |                                                 |
|   • Summary      |  Content changes per active tab.                |
|   • By Type      |  When the object-detail drawer is open, it      |
|   • Toolkits     |  overlays the right 520px of this area.         |
|                  |                                                 |
|  ANALYZE         |                                                 |
|   • Search       |                                                 |
|   • Dependencies |                                                 |
|                  |                                                 |
|  APP             |                                                 |
|   • Settings     |                                                 |
|                  |                                                 |
+------------------+------------------------------------------------+
```

**Layers (back to front):**
1. Sidebar — fixed, 220px, full viewport height, `--bg-sidebar`, 1px `--border` right edge.
2. Topbar — fixed, 48px tall, full remaining width, `--bg-page`, 1px `--border` bottom edge.
3. Main content — fills remaining space, 32px padding, scrollable independently.
4. Right-pane drawer — overlays the right side of the main content area (does not push content). 520px wide, full main-area height, slides in from the right. Has its own 1px `--border` left edge and a subtle `shadow-sm` (`0 1px 3px rgba(0,0,0,0.08)`) to lift it above the content.

**Design tokens reference:** `docs/prototype-viewer/styles.css` lines 4–19 define all colour, font, and spacing tokens. The production CSS must import or duplicate this `:root` block verbatim.

---

## Section 2 — Sidebar tabs

Six tabs in three groups. Each tab has a 16px inline SVG icon (Lucide-style line art) and a 13px/500 label.

| Group | Tab | Icon (described) | Features hosted |
|-------|-----|-----------------|----------------|
| **BROWSE** | **Summary** | 4-square grid | #20 (statistics/status), #25 (KPI stats), Recent Objects table |
| **BROWSE** | **By Type** | Horizontal-list (3 lines, dots) | #5 (load data), #6 (type cards), #7 (type selection/filter), #8 (toolkit toggle), #9 (object list) |
| **BROWSE** | **Toolkits** | 3D-box / package | #25 toolkit subset (toolkit list with counts) |
| **ANALYZE** | **Search** | Magnifying glass | #17 (deep search input), #18 (client-side search), #19 (toolkit search coverage) |
| **ANALYZE** | **Dependencies** | Chevrons `</>` | Dependency graph (stub in v1 — empty state) |
| **APP** | **Settings** | Gear / cog | User preferences (stub in v1 — empty state) |

**No feature is mapped to two tabs.** Features #4 (collapsible panels) and #16 (show/hide panels) are **removed** — tabs replace them. Features #21 (`getDisplayName`), #22 (`findObjectInCurrentData`) are utility functions, not UI features; they are used internally by the views that need them.

**Active state:** 2px `--accent` bar on the left edge of the tab item, `--active-bg` background, `--accent`-tinted icon. Transition: 120ms ease-out on background colour.

---

## Section 3 — Top bar

```
+-----------------------------------------------------------+
|  MyApp.twx                   [Search objects…]  [⚙]       |
|  Snapshot 2024-01-15 · v1.0                               |
+-----------------------------------------------------------+
```

**Left side:**
- **Filename** — 14px/600 `--text-primary`. Shows the parsed `.twx` filename. Before any file is parsed, shows "TWX Parser" with the subtitle "Upload a .twx file to begin".
- **Subtitle** — 12px/400 `--text-secondary`. Shows snapshot date and version from `/metadata.json` or the parse response. Hidden before first parse.

**Right side:**
- **Quick-filter search** — 240px wide, 28px tall, `--hover-bg` background, 1px `--border` border, 4px radius. Placeholder: "Search objects…". This is a **client-side filter** over the currently loaded objects — it filters the active tab's list in real time (300ms debounce). It is NOT the deep search; deep search lives in the Search tab.
- **Settings gear** — 28px icon button, `--border` border, 4px radius. Opens the Settings tab on click.

**Upload trigger:** When no `.twx` has been parsed yet (the global empty state), the topbar left side shows an "Upload .twx" primary button (indigo-600 bg, white text, 28px tall, 4px radius) instead of the filename. Clicking it opens a file picker.

---

## Section 4 — Right-pane drawer (NEW pattern)

This is the largest design change from the old viewer and the prototype. The old viewer used a third collapsible panel for object details. The new viewer uses a slide-in drawer that overlays the right side of the main content area.

### Dimensions & position
- **Width:** 520px (fits within the 600px max; leaves ≥400px for the by-type list on a 1280px viewport).
- **Height:** Full main-area height (below the topbar).
- **Position:** Fixed to the right edge of the main content area. Overlays the content (does not push or reflow it). The by-type list remains visible behind the drawer at reduced width.

### Open trigger
- Clicking any object row in the By Type object list, or clicking a search result in the Search tab, or clicking "View all →" on a type card in the By Type tab and then clicking an object in the resulting list.

### Close trigger
- **X button** — 28px icon button in the drawer header (top-right). Inline SVG: X mark.
- **Esc key** — Global keydown listener. Closes the drawer if it is open.
- **Click outside** — Clicking on the main content area outside the drawer closes it. The drawer has a 1px `--border` left edge that acts as a visual boundary; clicking to its left closes it.

### Slide animation
- **Open:** `transform: translateX(100%)` → `translateX(0)`, 200ms ease-out, CSS transition on the drawer container.
- **Close:** Reverse, 200ms ease-out.
- **No JavaScript animation library** — pure CSS `transition` on `transform`.

### Internal layout

```
+---------------------------------------------------+
|  Object Name                              [X]     |  ← Header: 56px
|  bpd · 2064.xxxx · v1.2                           |     56px tall, 1px --border bottom
+---------------------------------------------------+
|  [ Info ] [ Variables ] [ Scripts ] [ Elements ]   |  ← Sub-nav: 40px
|  [ Schema ]                                        |     horizontal tabs, 40px tall
+---------------------------------------------------+
|                                                    |
|  Scrollable content area                           |  ← Body: flex-1, overflow-y: auto
|  (content depends on active sub-nav tab)           |     20px padding
|                                                    |
+---------------------------------------------------+
```

**Header (56px):**
- Object name — 14px/600 `--text-primary`.
- Second line — type badge (11px uppercase `--text-secondary`), ID in monospace (12px `--text-secondary`), version in monospace.
- Close button — 28px icon button, top-right.

**Sub-nav (40px):**
- Horizontal tab bar. Each tab is a text label (13px/500), `--text-secondary` by default, `--text-primary` when active, with a 2px `--accent` bottom bar on the active tab.
- Tabs shown depend on the object type:
  - **All types:** Info
  - **BPD, CSHS, Process, Service:** + Variables, + Scripts, + Elements (if data exists)
  - **Business Object:** + Schema
  - **Coach View:** + Scripts (if data exists)
- Tabs with no data are hidden (not shown as disabled). If the object has no data for any sub-tab beyond Info, only Info is shown.

**Body (scrollable):**
- 20px padding.
- Content depends on the active sub-nav tab (see feature sections below).
- Only the body scrolls; the header and sub-nav stay fixed.

### Coexistence with the by-type list
- When the drawer opens, the by-type list **does not reflow**. It remains at its full width; the drawer simply overlays the right 520px of it. Object rows behind the drawer are visually dimmed (the drawer has a white background, so they're hidden behind it).
- The selected object row in the list gets the `--active-bg` background and a 1px `--accent` left border to show which object the drawer is displaying.
- If the user clicks a different object in the list, the drawer content updates in place (no close/reopen animation).

---

## Section 5 — Features

### Feature #1 — File selection

- **What it does:** Opens a file picker for `.twx` files.
- **Where it lives:** Topbar (upload button in the empty state) and the global empty state in the main content area.
- **Trigger:** Click the "Upload .twx" button in the topbar, or the upload affordance in the global empty state.
- **Data source:** Local file picker (`<input type="file" accept=".twx">`).
- **Visual:** Primary button — indigo-600 bg, white text, 13px/500, 28px tall, 4px radius. In the global empty state: a larger 36px button centered in an upload zone (dashed 1px `--border` border, 6px radius, `--hover-bg` bg).
- **Empty state:** This IS the empty state. Before any file is parsed, the entire main content area shows: centered upload zone with a cloud-upload inline SVG (48px, `--text-tertiary`), heading "No TWX file loaded" (14px/600), subtext "Upload a .twx file to browse its objects" (13px `--text-secondary`), and the upload button.
- **Loading state:** N/A (file picker is instant).
- **Error state:** If the selected file doesn't end in `.twx`, show an inline error below the upload zone: "Please select a valid .twx file" (13px, red-600 text — `#dc2626`, a new token only for errors). No `alert()`.

### Feature #2 — File upload + parse

- **What it does:** Uploads the selected `.twx` file to the server and triggers parsing.
- **Where it lives:** Triggered from the upload button (feature #1). Response consumed globally.
- **Trigger:** Automatic after file selection (no separate "Parse" button — the old viewer had one, the new one merges select + parse into a single action).
- **Data source:** `POST /api/parse` with `FormData` containing the file.
- **Visual:** The upload button enters a loading state: text changes to "Parsing…", a 2px-tall indeterminate progress bar appears at the top of the main content area (indigo-600 fill on slate-200 track, full width, animated shimmer).
- **Empty state:** N/A.
- **Loading state:** Indeterminate progress bar at top of main area. Upload button disabled, opacity 0.6.
- **Error state:** Progress bar turns red (`#dc2626`). Upload zone shows: "Parse failed: [error message]" with a "Retry" link (13px, `--accent`). The upload zone remains visible so the user can try again.

### Feature #3 — Parsing status / progress

- **What it does:** Shows the user that parsing is in progress and when it completes.
- **Where it lives:** Top of main content area (progress bar) and topbar subtitle (status text).
- **Trigger:** Begins when feature #2 fires. Ends on response.
- **Data source:** `POST /api/parse` response: `{ success, fileName, objectCount, message }`.
- **Visual:** During parse: 2px indeterminate progress bar (indigo-600). On success: the progress bar fills to 100% over 300ms, then fades out. Topbar subtitle updates to "MyApp.twx · 142 objects parsed". On the Summary tab, the KPI cards populate.
- **Empty state:** N/A.
- **Loading state:** Indeterminate progress bar.
- **Error state:** Progress bar turns `#dc2626`, holds for 3 seconds, then fades. Error message shown in the upload zone.

### Feature #4 — Collapsible panels (REMOVED)

- **What it did:** Toggled visibility of content sections via click on a header.
- **New design:** Tabs replace collapsible panels. Each tab shows/hides its content by switching the main content area. No collapse/expand UI.
- **Migration note:** The old viewer's `togglePanel()`, `.collapsible-panel`, `.panel-header`, `.panel-toggle` CSS classes are all removed.

### Feature #5 — Load all object data

- **What it does:** Fetches parsed object data from the server after a successful parse (or on initial load if data already exists).
- **Where it lives:** Called automatically after parse success or on page load. Data is held in a `currentObjects` state object.
- **Trigger:** Automatic (after parse, or on DOMContentLoaded).
- **Data source:** `GET /api/objects` returns all object types. Fallback: per-type static files (`/objects-<type>.json`, `/combined-objects-<type>.json`). Also fetches `/twx-summary.json` for statistics and `/metadata.json` for file metadata.
- **Visual:** No direct visual — this is a data-loading function. The views that consume the data show their own loading states.
- **Empty state:** If `/api/objects` returns an empty object, the Summary tab shows "No objects found" empty state.
- **Loading state:** Summary tab shows skeleton KPI cards (3 pulsing `--hover-bg` rectangles). By Type tab shows skeleton type cards.
- **Error state:** If the fetch fails, a 1px `--border` card with centered text: "Could not load object data. [Retry]" (13px `--text-secondary`, Retry as `--accent` link). The error card appears in whichever tab the user is on.

### Feature #6 — Display object types as cards

- **What it does:** Shows the available object types with counts.
- **Where it lives:** By Type tab, left column.
- **Trigger:** After feature #5 loads data.
- **Data source:** `currentObjects` state (populated by feature #5).
- **Visual:** A vertical list of type rows (not the prototype's 2-column grid — redesigned for the two-pane layout). Each row: 40px tall, 12px vertical padding. Left: type display name (13px/500 `--text-primary`). Right: count in tabular-nums (13px `--text-secondary`). Hover: `--hover-bg`. Active (selected): `--active-bg` + 2px `--accent` left bar. When toolkit toggle is on, shows app count + toolkit count as two small badges (11px, slate-100 bg, slate-500 text).
- **Empty state:** "No object types found. Parse a .twx file to see types." (13px `--text-secondary`, centered in the left column).
- **Loading state:** 5 skeleton rows (pulsing `--hover-bg` rectangles, 40px tall).
- **Error state:** Same as feature #5 error state.

### Feature #7 — Type selection + filter

- **What it does:** Clicking a type row filters the object list to show only objects of that type.
- **Where it lives:** By Type tab, left column (click target) → right column (result).
- **Trigger:** Click on a type row.
- **Data source:** `currentObjects[selectedType].objects`.
- **Visual:** The selected type row gets `--active-bg` + 2px `--accent` left bar. The right column populates with the object list (feature #9). If a drawer is open, it closes (the user is switching context).
- **Empty state:** If the selected type has 0 objects (after toolkit filtering), the right column shows: "No objects of this type. [Try including toolkit objects]" (13px `--text-secondary`, link in `--accent`).
- **Loading state:** N/A (data is already loaded by feature #5).
- **Error state:** N/A.

### Feature #8 — Toggle toolkit objects

- **What it does:** Toggles whether toolkit-sourced objects are included in the type counts and object lists.
- **Where it lives:** By Type tab, above the type list. A small toggle control in the left-column header area.
- **Trigger:** Click the toggle.
- **Data source:** Filters `currentObjects` data by `obj.source !== 'toolkit'` (when off) or all objects (when on).
- **Visual:** A label "Include toolkits" (12px `--text-secondary`) with a small toggle switch (28px wide, 16px tall, `--border` track, indigo-600 fill when on, 12px white knob). Placed in a 32px header bar above the type list, right-aligned.
- **Empty state:** N/A.
- **Loading state:** N/A (instant filter).
- **Error state:** N/A.

### Feature #9 — Display objects list

- **What it does:** Shows the objects of the selected type as a dense, scrollable list.
- **Where it lives:** By Type tab, right column.
- **Trigger:** After a type is selected (feature #7).
- **Data source:** `currentObjects[selectedType].objects`, filtered by toolkit toggle (feature #8).
- **Visual:** A dense table-style list. Header row: "Name" (left), "Source" (left), "ID" (left, monospace). Each row: 32px tall, 1px `--divider` bottom border. Name: 13px/500 `--text-primary`. Source: small badge — "APP" (slate-100 bg, slate-500 text) or toolkit short name (indigo-50 bg, indigo-600 text). ID: 12px monospace `--text-secondary`. Hover: `--hover-bg`. Selected: `--active-bg` + 1px `--accent` left border. The list is wrapped in a card (1px `--border`, 6px radius).
- **Empty state:** "No objects found. [Try including toolkit objects]" (13px `--text-secondary`).
- **Loading state:** 8 skeleton rows (pulsing `--hover-bg`, 32px tall).
- **Error state:** "Error loading objects. [Retry]" (13px `--text-secondary`, Retry as `--accent`).

### Feature #10 — Select + display object details

- **What it does:** Opens the right-pane drawer showing the selected object's details.
- **Where it lives:** Triggered from the object list (feature #9), search results (feature #18), or anywhere an object is clickable.
- **Trigger:** Click an object row.
- **Data source:** The object data already in `currentObjects`. If the full details are not in the loaded data, fetches from the per-type static file (`/objects-<type>.json`).
- **Visual:** The right-pane drawer slides in (see Section 4). The header shows the object name, type badge, ID, and version. The "Info" sub-tab is active by default.
- **Empty state:** N/A (drawer only opens when an object is selected).
- **Loading state:** If details need to be fetched, the drawer body shows a skeleton (3 pulsing rectangles). If data is already loaded, no loading state — instant render.
- **Error state:** If the fetch fails, the drawer body shows: "Could not load object details. [Retry]" (13px `--text-secondary`).

### Feature #11 — Detail sections (collapsible → sub-nav tabs)

- **What it does:** Organizes the object's details into navigable sections.
- **Where it lives:** Right-pane drawer, sub-nav bar.
- **Trigger:** Click a sub-nav tab.
- **Data source:** `selectedObject.details` (already loaded).
- **Visual:** The sub-nav tabs are described in Section 4. Each tab shows the corresponding section's content in the drawer body. No collapsible accordions — the old viewer's `createDetailSection` / `toggleDetailSection` pattern is removed.
- **Empty state:** If a sub-tab has no data, it is hidden (not shown as empty). If the object has no details at all, only the "Info" tab is shown.
- **Loading state:** N/A (data is already loaded).
- **Error state:** N/A.

### Feature #12 — Basic info display

- **What it does:** Shows the object's core properties: name, ID, version, type, source, toolkit info.
- **Where it lives:** Right-pane drawer, "Info" sub-tab.
- **Trigger:** Drawer opens with Info active by default.
- **Data source:** `selectedObject` fields: `name`, `id`, `versionId`, `type`/`typeName`, `subType`, `source`, `toolkitInfo`, `details.displayName`, `details.description`.
- **Visual:** A key-value table within the drawer body. Two columns: "Property" (11px uppercase `--text-secondary`, 120px wide) and "Value" (13px `--text-primary`). Rows: Name, ID (monospace), Version ID (monospace), Type, Sub Type (if present), Display Name (if present), Description (if present), Source (badge: "APP" or "TOOLKIT"), Toolkit Name / Short Name / ID / File (if source is toolkit). Rows separated by 1px `--divider`. 32px row height.
- **Empty state:** If the object has no basic info (shouldn't happen), shows "No information available" (13px `--text-secondary`).
- **Loading state:** N/A.
- **Error state:** N/A.

### Feature #13 — Variables display

- **What it does:** Shows the object's input, output, and private variables.
- **Where it lives:** Right-pane drawer, "Variables" sub-tab.
- **Trigger:** Click the "Variables" sub-nav tab.
- **Data source:** `selectedObject.details.variables` — `{ input: [...], output: [...], private: [...] }`.
- **Visual:** Three sections (Input, Output, Private), each with a section header (11px uppercase `--text-secondary`, 8px bottom margin). Variables displayed as a dense table: "Name" (13px/500), "Type" (13px `--text-secondary`), "Default" (checkmark icon if `hasDefault`, else "—"). For CSHS and Service types, variables are displayed as a flow of small chips (like the old viewer's box layout): each chip is a 12px-tall pill with the variable name, `--hover-bg` background, 1px `--border`, 4px radius. A green dot (4px, `#22c55e`) on the left of the chip indicates `hasDefault`.
- **Empty state:** "No variables defined" (13px `--text-secondary`, centered in the drawer body).
- **Loading state:** N/A.
- **Error state:** N/A.

### Feature #14 — Scripts display

- **What it does:** Shows the object's scripts and inline scripts with syntax-highlighted code blocks.
- **Where it lives:** Right-pane drawer, "Scripts" sub-tab.
- **Trigger:** Click the "Scripts" sub-nav tab.
- **Data source:** `selectedObject.details.scripts` and `selectedObject.details.inlineScripts`.
- **Visual:** A list of script blocks. Each block has a header (32px, 1px `--divider` bottom): script name (13px/500 `--text-primary`) + type badge (11px, `--hover-bg` bg). Below the header: a code block (`--hover-bg` background, 1px `--border`, 6px radius, 12px padding, monospace font 12px, `white-space: pre-wrap`, `overflow-x: auto`). Scripts are collapsed by default — clicking the header expands them (chevron rotates, 120ms ease-out). For inline scripts: shows `scriptBlock` content, plus `preScript` and `postScript` as separate sub-blocks if present. The `loadJsFunction` (for coach views) is shown as a separate code block at the bottom.
- **Empty state:** "No scripts found" (13px `--text-secondary`).
- **Loading state:** N/A.
- **Error state:** N/A.

### Feature #15 — Elements display

- **What it does:** Shows process elements (script tasks, form tasks, call activities) with their scripts.
- **Where it lives:** Right-pane drawer, "Elements" sub-tab.
- **Trigger:** Click the "Elements" sub-nav tab.
- **Data source:** `selectedObject.details.elements` — `{ scriptTasks: [...], formTasks: [...], callActivities: [...] }`.
- **Visual:** Three sections (Script Tasks, Form Tasks, Call Activities), each with a section header. Each element is a row: name (13px/500), type badge (11px, `--hover-bg`), ID (12px monospace `--text-secondary`). If the element has scripts (pre/post/main), it's expandable — clicking the row reveals the code blocks (same style as feature #14).
- **Empty state:** "No process elements found" (13px `--text-secondary`).
- **Loading state:** N/A.
- **Error state:** N/A.

### Feature #16 — Show/hide panels (REMOVED)

- **What it did:** Programmatically showed panels and expanded them if collapsed.
- **New design:** Tabs handle visibility. The drawer handles detail visibility. No programmatic panel show/hide needed.
- **Migration note:** The old `showPanel()` function is removed.

### Feature #17 — Deep search input

- **What it does:** Provides a full-text search across all object data (names, scripts, variables, properties).
- **Where it lives:** Search tab.
- **Trigger:** User types in the search input and presses Enter or clicks the Search button.
- **Data source:** `GET /api/search?q=<term>` — the server searches XML files first, then falls back to JSON files.
- **Visual:** The Search tab has a search input (full width of the content area minus buttons, 36px tall, `--hover-bg` bg, 1px `--border`, 6px radius) + a "Search" button (indigo-600 bg, white text, 36px tall, 4px radius) + a "Clear" button (slate-100 bg, slate-500 text, 36px tall, 4px radius). Below: a results summary ("Found 12 results for 'xyz'") in 13px `--text-secondary`. Below that: a list of result cards.
- **Empty state (before search):** Centered empty state: search icon (48px, `--text-tertiary`) + "Type a term above to search across all objects" (13px `--text-secondary`).
- **Loading state:** The search button shows "Searching…" and is disabled. A skeleton list of 5 result cards appears below.
- **Error state:** "Search failed: [error message]. [Retry]" (13px `--text-secondary`, Retry as `--accent`).

### Feature #18 — Client-side search + result display

- **What it does:** Displays search results grouped by object, with snippet previews and navigation to object details.
- **Where it lives:** Search tab, below the search input.
- **Trigger:** After a successful search (feature #17).
- **Data source:** Response from `/api/search` — array of `{ objectName, objectType, objectId, preview, matchCount, fileName }`.
- **Visual:** Each result is a card (1px `--border`, 6px radius, 12px padding). Card header: object name (13px/500 `--text-primary`) + type badge (11px, `--hover-bg`) + match count (12px `--text-secondary`, tabular-nums). Source badge if toolkit. Below: preview snippet (13px `--text-secondary`, monospace, `--hover-bg` bg, 4px radius, 8px padding). The search term is highlighted in the snippet with `--accent` colour and a subtle `rgba(79,70,229,0.08)` background. Clicking a result opens the right-pane drawer (feature #10) with the matching object.
- **Empty state (no results):** "No results found for '[term]'. Try a different search term." (13px `--text-secondary`, centered).
- **Loading state:** N/A (results appear after the search completes).
- **Error state:** N/A (errors handled by feature #17).

### Feature #19 — Toolkit search test

- **What it does:** Ensures toolkit objects are included in search results when the toolkit toggle is enabled.
- **Where it lives:** Not a separate UI element. Integrated into the search logic.
- **Trigger:** Automatic — when the user searches, the search covers toolkit objects if the toolkit toggle (feature #8) is on.
- **Data source:** Same as feature #17/#18. The client-side search fallback (if `/api/search` returns nothing) respects the toolkit toggle state.
- **Visual:** No separate UI. The search results include toolkit objects when appropriate, marked with the toolkit source badge.
- **Empty state:** N/A.
- **Loading state:** N/A.
- **Error state:** N/A.

### Feature #20 — Status bar / statistics summary

- **What it does:** Shows aggregate statistics about the parsed TWX file.
- **Where it lives:** Summary tab, as the 4 KPI cards at the top of the content area.
- **Trigger:** After data loads (feature #5).
- **Data source:** `/twx-summary.json` → `statistics` object: `{ totalObjects, applicationObjects, toolkitObjects, toolkits, objectTypes, extractedAt, sourceFile }`.
- **Visual:** 4 KPI cards in a row (see prototype). Cards: "Total Objects" (totalObjects), "Application Objects" (applicationObjects), "Toolkit Objects" (toolkitObjects), "Object Types" (objectTypes). Each card: 24px padding, `--bg-card` bg, 1px `--border`, 6px radius. Label: 11px uppercase `--text-secondary`. Value: 28px/600 `--text-primary` with `tabular-nums`. Delta line: 12px `--text-secondary` (e.g., "Across all types", "From 3 toolkits").
- **Empty state:** Skeleton cards (pulsing `--hover-bg` rectangles) while loading. If the summary file doesn't exist, the KPI cards show "—" as the value.
- **Loading state:** Skeleton cards.
- **Error state:** If the summary file fails to load, the KPI cards show "—" with a subtle "Data unavailable" note in 11px `--text-tertiary`.

### Feature #21 — Display name / type description

- **What it does:** Maps internal type codes to human-readable names.
- **Where it lives:** Utility function used across all views.
- **Trigger:** Called whenever a type name needs to be displayed.
- **Data source:** Hardcoded mapping: `{ 'process': 'Services', 'coach-view': 'Coach Views', 'cshs': 'CSHS', 'business-process-definition': 'Business Process Definitions', 'participant': 'Participants', 'managed-asset': 'Managed Assets', 'business-object': 'Business Objects' }`.
- **Visual:** N/A (utility function). The display names appear in type cards, table cells, drawer headers, breadcrumbs.
- **Empty state:** N/A.
- **Loading state:** N/A.
- **Error state:** N/A.

### Feature #22 — Object lookup by ID

- **What it does:** Finds an object in the loaded data by its ID.
- **Where it lives:** Utility function used by search result navigation (feature #18) and any cross-reference.
- **Trigger:** Called when a search result is clicked.
- **Data source:** `currentObjects` state — iterates all types to find the matching object.
- **Visual:** N/A (utility function).
- **Empty state:** If the object is not found, the search result click shows a toast or inline message: "Could not find object details" (13px `--text-secondary`).
- **Loading state:** N/A.
- **Error state:** N/A.

### Feature #23 — Business object schema summary

- **What it does:** Shows a high-level summary of a business object's schema: property count, system vs. custom types, cross-references, circular references.
- **Where it lives:** Right-pane drawer, "Schema" sub-tab, top section.
- **Trigger:** Click the "Schema" sub-nav tab on a business object.
- **Data source:** `selectedObject.details.schema` — `{ properties: [...], systemTypesCount, customTypesCount, namespace, error }`.
- **Visual:** A summary bar at the top of the Schema tab: 4 stat pills in a row — "Total: N" (13px `--text-primary`), "System: N" (13px `--text-secondary`), "Custom: N" (13px `--text-secondary`), "Namespace: [value]" (12px monospace `--text-secondary`). Each pill is a small badge (`--hover-bg` bg, 1px `--border`, 4px radius, 4px 8px padding). If `schema.error` is present, shows an error banner: 1px `#fecaca` border, `#fef2f2` bg, "Schema error: [message]" (13px `#dc2626`).
- **Empty state:** "No schema information available" (13px `--text-secondary`).
- **Loading state:** N/A.
- **Error state:** The schema error banner (see above).

### Feature #24 — Business object schema display

- **What it does:** Shows the full list of schema properties with their types, nested resolved types, and cross-reference indicators.
- **Where it lives:** Right-pane drawer, "Schema" sub-tab, below the summary.
- **Trigger:** Click the "Schema" sub-nav tab on a business object.
- **Data source:** `selectedObject.details.schema.properties` — array of `{ name, type, isSystemType, required, isArray, hasDefault, circularReference, unresolvedReference, resolvedType }`.
- **Visual:** A tree-style property list. Each property is a row (32px tall): name (13px/500 `--text-primary`), type badge (11px — system types: `#dcfce7` bg `#166534` text; custom types: `#fef9c3` bg `#854d0e` text), plus indicator badges: "Required" (`#fecaca` bg, `#dc2626` text), "Array" (indigo-50 bg, indigo-600 text), "Has Default" (cyan-50 bg, cyan-600 text), "Circular" (amber-50 bg, amber-600 text), "Unresolved" (red-50 bg, red-600 text). If the property has a `resolvedType`, the row is expandable — clicking it reveals the nested properties indented by 20px, with a 2px `--accent` left border on the nested block. Circular references show a note: "This type references back to itself or an ancestor" (12px italic `--text-tertiary`).
- **Empty state:** "No properties defined" (13px `--text-secondary`).
- **Loading state:** N/A.
- **Error state:** N/A (errors shown in the summary bar, feature #23).

### Feature #25 — Statistics (toolkit subset)

- **What it does:** Shows toolkit-specific statistics in the Toolkits tab.
- **Where it lives:** Toolkits tab.
- **Trigger:** After data loads (feature #5).
- **Data source:** `/toolkits.json` (if available) or derived from `currentObjects` by filtering `obj.source === 'toolkit'` and grouping by `toolkitInfo.shortName`.
- **Visual:** A dense table (same style as the Recent Objects table in the Summary tab). Columns: "Toolkit" (name + full name, 13px/500), "Version" (12px monospace `--text-secondary`), "Objects" (tabular-nums, right-aligned), "Used by" (12px `--text-secondary`). Each row: 32px tall, 1px `--divider` bottom border. Right-aligned "Open →" link (13px `--text-secondary`, hover `--accent`). Wrapped in a card (1px `--border`, 6px radius).
- **Empty state:** "No toolkits found in this TWX file." (13px `--text-secondary`, centered).
- **Loading state:** Skeleton table (5 pulsing rows).
- **Error state:** "Could not load toolkit data. [Retry]" (13px `--text-secondary`).

---

## Section 6 — End-to-end flows

### Flow 1 — Cold start

1. User navigates to the app URL. The page loads. No `.twx` has been parsed yet.
2. The sidebar renders with all 6 tabs. The Summary tab is active.
3. The topbar shows "TWX Parser" as the title (no filename yet) and "Upload a .twx file to begin" as the subtitle. The right side shows the quick-filter search (disabled, opacity 0.5) and the settings gear.
4. The main content area shows the global empty state: centered upload zone with cloud-upload icon, heading "No TWX file loaded", subtext "Upload a .twx file to browse its objects", and an "Upload .twx" primary button.
5. User clicks "Upload .twx". The file picker opens. User selects `MyApp.twx`.
6. The button text changes to "Parsing…". A 2px indeterminate progress bar appears at the top of the main content area. The button is disabled (opacity 0.6).
7. The server parses the file. On success, the response returns `{ success: true, fileName: "MyApp.twx", objectCount: 142 }`.
8. The progress bar fills to 100% and fades out. The topbar updates to "MyApp.twx · 142 objects parsed". The app calls `GET /api/objects` and `GET /twx-summary.json` to load all data.
9. The Summary tab populates: 4 KPI cards show real values (Total Objects: 142, Application Objects: 95, Toolkit Objects: 47, Object Types: 7). The "Recent Objects" table shows the first 8 objects.
10. The sidebar's By Type and Toolkits tabs are now populated with data (but the user is still on Summary).

### Flow 2 — Browse → detail

1. User is on the Summary tab. They click "By Type" in the sidebar.
2. The main content area switches to the By Type view. The left column shows the type list (7 rows: Services, Coach Views, CSHS, Business Process Definitions, Participants, Managed Assets, Business Objects). Each row shows the type name and count. The right column shows a placeholder: "Select a type to view objects" (13px `--text-tertiary`, centered).
3. User clicks "Business Objects" in the type list. The row gets the active state (slate-100 bg + indigo left bar). The right column populates with a dense table of business objects (e.g., 12 rows). Columns: Name, Source, ID.
4. User clicks "CustomerAccount" in the object list. The right-pane drawer slides in from the right (200ms ease-out). The drawer header shows "CustomerAccount" + "business-object · 2062.xxxx · v4.1". The "Info" sub-tab is active, showing the basic info table (Name, ID, Version ID, Type, Source: APP, etc.).
5. User clicks the "Schema" sub-nav tab. The drawer body updates to show the schema summary bar (Total: 8, System: 3, Custom: 5, Namespace: com.example) and the property list (8 rows, each with name, type badge, and indicator badges).
6. User clicks on a property row "address" that has a resolved type. The row expands to show nested properties indented with a left accent border.
7. User presses Esc. The drawer slides out (200ms ease-out). The by-type view is still visible, with "CustomerAccount" still selected in the object list.

### Flow 3 — Deep search

1. User clicks "Search" in the sidebar (under ANALYZE).
2. The Search tab shows: search input (full width), Search button, Clear button. Below: the empty state — search icon + "Type a term above to search across all objects".
3. User types "validateEmail" in the search input and presses Enter.
4. The Search button shows "Searching…" and is disabled. Skeleton result cards appear below.
5. The app calls `GET /api/search?q=validateEmail`. The server searches XML files, then JSON files. It returns 3 results.
6. The results appear: 3 result cards. Each shows: object name ("ValidateEmail Service", "Email Validation BPD", "Notification Script"), type badge, match count, source badge, and a preview snippet with the search term highlighted in indigo.
7. User clicks "Notification Script". The right-pane drawer slides in, showing the Scripts sub-tab (since the search matched a script). The matching script is expanded, and the search term "validateEmail" is highlighted in the code block.
8. User presses Esc to close the drawer. They're back on the Search tab with the results still visible.
9. User clicks "Clear". The search input empties, the results disappear, and the empty state returns.

---

## Section 7 — File layout

```
twx-viewer-new.html    — DOM skeleton (sidebar, topbar, main area, drawer container)
twx-viewer-new.css     — Design system tokens + all component styles
twx-viewer-new.js      — State management, render functions, API calls, event handlers
```

**Target:** Single JS file, ≤ 1500 lines. If the implementation exceeds 1500 lines, split into:
```
twx-viewer-new/
  state.js     — State object, mutations, subscriptions
  api.js       — Fetch wrappers for /api/parse, /api/objects, /api/search, static files
  views.js     — Render functions for each tab and the drawer
  app.js       — Boot, event listeners, routing
```
…but only split if the single file genuinely exceeds 1500 lines. Prefer one file.

**`twx-viewer-new.html`** structure:
- `<link>` to `twx-viewer-new.css` and Google Fonts (Inter, with system fallback).
- `<aside class="sidebar">` — wordmark + nav container (populated by JS).
- `<div class="main-area">` — `<header class="topbar">` + `<main class="content">`.
- `<div class="drawer" id="drawer">` — the right-pane drawer container (hidden by default, populated by JS when opened).
- `<script src="twx-viewer-new.js">` at end of body.

**`twx-viewer-new.css`** structure:
- `:root` block — all design tokens (copied from `docs/prototype-viewer/styles.css`).
- Reset + base styles.
- Sidebar styles.
- Topbar styles.
- Content area styles.
- KPI cards.
- Tables.
- Type list + object list (By Type tab).
- Toolkit table.
- Search tab.
- Drawer (open/close animation, header, sub-nav, body).
- Object detail components (info table, variables, scripts, elements, schema).
- Empty states.
- Loading skeletons.
- Error states.
- Responsive breakpoints.

**`twx-viewer-new.js`** structure:
- State object: `{ activeTab, currentObjects, selectedType, selectedObject, drawerOpen, searchResults, toolkitToggle, metadata }`.
- Boot: `DOMContentLoaded` → render sidebar, render topbar, check for existing data, show empty state or Summary.
- Navigation: sidebar click → update `activeTab`, re-render content.
- API functions: `parseTWXFile(file)`, `loadObjectData()`, `searchObjects(term)`.
- Render functions: `renderSummary()`, `renderByType()`, `renderToolkits()`, `renderSearch()`, `renderEmptyState()`.
- Drawer functions: `openDrawer(object)`, `closeDrawer()`, `renderDrawerContent()`.
- Utility functions: `getDisplayName(type)`, `findObjectById(id)`, `escapeHtml(text)`.

**No external dependencies.** No build step. No CSS framework. No icon font. Inline SVG only.

---

## Appendix — New components not in the prototype

The following components are described in this spec but do not exist in the prototype. They must be implemented using only the prototype's design tokens.

### 1. Right-pane drawer
- Described in Section 4. Width: 520px. Slide animation: 200ms ease-out on `transform`. Internal layout: 56px header, 40px sub-nav, scrollable body.

### 2. Sub-nav tabs (inside drawer)
- Horizontal tab bar, 40px tall. Tab labels: 13px/500. Active tab: `--text-primary` + 2px `--accent` bottom bar. Inactive: `--text-secondary`.

### 3. Global empty state (pre-parse)
- Centered in main content area. Cloud-upload icon (48px, `--text-tertiary`). Heading: 14px/600 `--text-primary`. Subtext: 13px `--text-secondary`. Upload button: 36px tall, indigo-600 bg.

### 4. Upload zone (dashed border)
- 200px × 240px centered card. Dashed 1px `--border` border, 6px radius, `--hover-bg` bg. Contains the empty state content.

### 5. Indeterminate progress bar
- 2px tall, full width of main content area. `--border` track, indigo-600 fill. CSS animation: `@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`, 1.5s linear infinite.

### 6. Skeleton loading placeholders
- Rectangles with `--hover-bg` background, 6px radius. CSS animation: `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`, 1.5s ease-in-out infinite.

### 7. Expandable code block (scripts)
- Collapsible section. Header: 32px, 1px `--divider` bottom, chevron icon (rotates 90° on expand, 120ms ease-out). Body: code block (`--hover-bg` bg, 1px `--border`, 6px radius, monospace 12px).

### 8. Schema property tree
- Indented rows. Each nesting level: 20px left margin, 2px `--accent` left border on the nested block. Property rows: 32px tall, badges as described in feature #24.

### 9. Toggle switch (toolkit toggle)
- 28px wide, 16px tall. Track: `--border` (off), indigo-600 (on). Knob: 12px white circle, slides left/right (120ms ease-out).

### 10. Source badge
- Small inline badge. "APP": `--hover-bg` bg, `--text-secondary` text, 4px 6px padding, 3px radius, 11px. Toolkit short name: indigo-50 bg (`#eef2ff`), indigo-600 text, same sizing.

### New token (if needed)
- **`--error: #dc2626`** — Used only for error messages and error-state progress bars. Justification: the prototype's palette has no error colour; the production UI needs one for error states. This is a standard red-600 from the Tailwind slate palette family, consistent with the design system's approach of using semantic Tailwind colours.
