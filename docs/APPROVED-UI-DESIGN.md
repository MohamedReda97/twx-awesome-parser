# Approved UI Design — Parser Extraction + Viewer Display

> Source: discussion on 2026-07-28. Approved by user. This is the contract between the parser fixers and the UI designer.

## Scope

Two layers of work, running in parallel:

1. **Parser fixers** — extract new data from `.twx` object XMLs in `src/parser/object-extractor.js`
2. **UI designer** — render the new data in Section 3 of the viewer (`twx-viewer-new.js` / `.css`)

Both layers must agree on the **data shape** below. The parser produces data in these shapes; the UI renders them.

---

## Data shapes (parser output → UI input)

### BPD — `details.elements`

```js
{
  scriptTasks: [
    {
      name: "Process Script",
      id: "3f706d7c-877d-40cb-88d0-54cd99e84652",
      script: "// inside process script\ntw.local.orderSumarry = \"SUMMARY\"",
      lane: "Maker",  // from <flowObject> > <lane> ancestor
      preAssignment: null,  // or script body string
      postAssignment: null
    }
  ],
  callActivities: [
    {
      name: "Order Maker",
      id: "...",
      callsTarget: "OrderDetailsCSHS",  // from <attachedActivityId> resolved to name
      callsTargetId: "1.9f33dd07-...",
      lane: "Maker",
      preAssignment: null,
      postAssignment: null
    }
  ],
  exclusiveGateways: [
    { name: "Submit?", id: "..." }
  ],
  events: [
    { name: "Start", id: "...", eventType: "start" },  // eventType: start | end | intermediate
    { name: "End", id: "...", eventType: "end" }
  ]
}
```

### Service — `details.elements` (subType=12, 13)

```js
{
  scriptTasks: [
    {
      name: "Process Script",
      id: "...",
      script: "tw.local.orderSumarry = \"SUMMARY\"",
      preAssignment: null,
      postAssignment: null
    }
  ]
}
```

### CSHS — `details.elements` (enhanced — pre/post now populated)

```js
{
  formTasks: [
    {
      name: "Order Details Coach",
      id: "...",
      coaches: ["orderDetailsView", "orderSumarry"],  // viewUUIDs resolved to names
      coachEvents: ["okbutton", "Button1", "Button2"],
      preAssignment: "console.log(\"PRE COACH\")",  // from <ns3:preAssignmentScript>
      postAssignment: "console.log(\"POST COACH\")"  // from <ns3:postAssignmentScript>
    }
  ],
  scriptTasks: [
    {
      name: "Init",
      id: "...",
      script: "// stepName? make -> editable : readonly\nif(tw.local.stepName == \"maker\"){...}",
      preAssignment: "console.log(\"PRE INIT SCRIPT\")",  // from <ns3:userTaskImplementation> > <ns3:preAssignmentScript>
      postAssignment: null
    }
  ],
  callActivities: [...],  // same shape as BPD
  exclusiveGateways: [...]  // same shape as BPD
}
```

### Coach View — `details.scripts` (all 6 JS functions + inline scripts)

```js
{
  // All 6 possible — only populate if non-empty
  loadJsFunction: "console.log('loading...');",
  unloadJsFunction: null,        // not present → UI skips
  viewJsFunction: "this.context.applyData();",
  changeJsFunction: "if (this.context.binding) { ... }",
  collaborationJsFunction: null, // not present → UI skips
  validateJsFunction: null,      // not present → UI skips

  // Inline scripts extracted from the layout XML
  inlineScripts: [
    {
      context: "orderDetailsView1 > okbutton (preAssignment)",
      script: "console.log('OK clicked');"
    },
    {
      context: "orderDetailsView1 > okbutton (postAssignment)",
      script: "tw.local.ordersDetails = this.context.orders;"
    },
    {
      context: "orderSumarry1 > preAssignment",
      script: "this.context.summary = 'ready';"
    }
  ]
}
```

---

## UI rendering (Section 3 sub-tabs)

### Elements sub-tab — BPD / Service / CSHS

Group order (confirmed by user): **Script Tasks → Call Activities → Gateways → Events**

Each element is a card:
- Header: element name (slate-900, 14px, weight 600)
- Body: script content (monospace, 12px) if present
- Footer: PRE / POST assignment scripts (only if present, 12px, monospace)
- Collapsed sections show count: `▸ CALL ACTIVITIES (2)`

```
┌─ Process Script ──────────────────────────────────┐
│ // inside process script                           │
│ tw.local.orderSumarry = "SUMMARY"                  │
├───────────────────────────────────────────────────┤
│ Lane: Maker                                        │
│ PRE:  (none)                                      │
│ POST: (none)                                      │
└───────────────────────────────────────────────────┘
```

For call activities, the body shows the target:
```
┌─ Order Maker ─────────────────────────────────────┐
│ Calls: OrderDetailsCSHS (CSHS)                    │
│ Lane: Maker                                        │
│ PRE:  tw.local.orderSumarry → "PRE"                │
│ POST: (none)                                      │
└───────────────────────────────────────────────────┘
```

### Scripts sub-tab — Coach View

Two sections:

1. **JS FUNCTIONS** — shows ONLY the 6 function types that have content. Empty ones are completely hidden.
2. **INLINE SCRIPTS** — separate section, each script shows its `context` label.

```
JS FUNCTIONS

  ▾ LOAD
    [code block]
  ▾ VIEW
    [code block]
  ▸ CHANGE
    [code block]

  (Unload, Collaboration, Validate — hidden, not present)

─────────────────────────────────────────────────────

INLINE SCRIPTS  (3)

  ▾ orderDetailsView1 > okbutton (preAssignment)
    [code block]
  ▸ orderDetailsView1 > okbutton (postAssignment)
    [code block]
  ▸ orderSumarry1 > preAssignment
    [code block]
```

---

## Where to put the data in each object

For every type, the parser populates `baseObject.details` with:

| Type | `details.elements` | `details.scripts` |
|---|---|---|
| `bpd` | BPD elements (above) | — |
| `process` subType=10 (CSHS) | CSHS elements (above) | — |
| `process` subType=12, 13 (Service) | Service elements (above) | — |
| `coachView` | — | Coach View scripts (above) |

Existing fields (`details.variables`, `details.displayName`, etc.) are unchanged.

---

## File ownership

- **`src/parser/object-extractor.js`** — 4 fixers, each touches a different function in this file
- **`twx-viewer-new.js`** — designer touches the `drawElements` and `drawScripts` functions
- **`twx-viewer-new.css`** — designer adds styles for new card types

No two agents should edit the same function/file at the same time.

---

## Acceptance criteria

After all 5 agents finish:

1. `node app.js parse "C:/Users/Admin/Documents/twx-awesome-parser/example twx extracted"` produces JSON with:
   - BPDs (2): each with scriptTasks, callActivities, exclusiveGateways, events populated
   - CSHS (1): formTasks with preAssignment/postAssignment, scriptTasks with preAssignment
   - Services (2): scriptTasks populated
   - Coach Views (2): scripts.loadJsFunction etc. populated, scripts.inlineScripts populated for any with layout JS

2. Opening the viewer, clicking a BPD in By Type → Section 3 → Elements shows Script Tasks with scripts + PRE/POST

3. Opening a CSHS → Section 3 → Elements shows formTasks with preAssignment ("console.log("PRE COACH")")

4. Opening a Service → Section 3 → Elements shows scriptTasks with scripts

5. Opening a Coach View → Section 3 → Scripts shows only the non-empty JS functions + Inline Scripts section with context labels
