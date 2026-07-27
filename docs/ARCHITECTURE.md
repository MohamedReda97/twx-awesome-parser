# twx-parser — How it Works

A visual walkthrough of what `twx-parser` does and how the pieces fit together.

---

## 1. The one-liner

`twx-parser` reads **IBM BPM `Process App` and `Toolkit` packages** (`.twx` files), turns them into a directory of structured JSON files, and serves a browser UI on top of that JSON so you can search and inspect every object inside.

---

## 2. First: what is a `.twx`?

A `.twx` is **just a zip file with a convention**:

```
my-app.twx                                ← (zip)
├── META-INF/
│   └── package.xml                       ← the manifest: app metadata + list of objects
├── <object-type>/                        ← one folder per object type
│   └── <id>.<name>.<subtype>.xml         ← one XML file per object
├── toolkits/                             ← toolkits are nested .twx zips
│   └── some-toolkit.twx                  ←   (zip-in-zip, recursed by the parser)
└── ...
```

That's the whole input model. Everything the app does is: **unzip → read `package.xml` → walk object XMLs → recurse into toolkits → emit JSON**.

---

## 3. The two faces of the app

```
┌──────────────────────────────────────────────────────────────────┐
│                          twx-parser                              │
│                                                                  │
│   ┌────────────────────────┐         ┌────────────────────────┐   │
│   │  CLI / Web UI shell    │         │   Library API          │   │
│   │  (app.js)              │         │   (src/index.js)       │   │
│   │                        │         │                        │   │
│   │  • no args / --ui  ──▶ web UI    │  • createWorkspace()   │   │
│   │  • parse <file>    ──▶ CLI parse │  • parseTWX(file)      │   │
│   │  • --help          ──▶ help      │  • extractTWX(file)    │   │
│   └────────────┬───────────┘         └────────────┬───────────┘   │
│                │                                  │               │
│                └──────────────┬───────────────────┘               │
│                               ▼                                   │
│                  ┌─────────────────────────┐                     │
│                  │   Parsing pipeline       │                     │
│                  │   (src/parser/...)        │                     │
│                  └────────────┬─────────────┘                     │
│                               ▼                                   │
│                       ./output/*.json                             │
│                               │                                   │
│                               ▼                                   │
│                  ┌─────────────────────────┐                     │
│                  │  HTTP server + viewer    │                     │
│                  │  (web-server.js +        │                     │
│                  │   twx-viewer-new.*)      │                     │
│                  └─────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. The parsing architecture

There is **one parsing pipeline**, JSON-based, with no database dependency:

```
                           .twx file
                               │
                               ▼
                    ┌─────────────────────┐
                    │  TWXExtractor       │
                    │  Unzips the .twx,   │
                    │  parses metadata,   │
                    │  extracts objects,  │
                    │  recurses toolkits, │
                    │  resolves cross-refs │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  JSONParser         │
                    │  Writes JSON to     │
                    │  ./output/          │
                    └──────────┬──────────┘
                               │
                               ▼
                      ./output/*.json
                               │
                               ▼
                    ┌─────────────────────┐
                    │  JSONWorkspace      │
                    │  Loads summary      │
                    │  for API queries    │
                    └──────────┬──────────┘
                               │
                               ▼
                    web viewer / CLI parse

```

Object-type parsing (BPD, Process, UCA, etc.) is handled by the extractor internally. There are no separate per-type parser files — the extractor reads each object's XML from the zip and parses it directly.

---

## 5. Module map

```
src/
├── index.js                       ← library API (createWorkspace, parseTWX, extractTWX)
│
├── parser/                        ← the parsing heart
│   ├── twx-extractor.js           ←    workhorse (zip → objects → cross-refs)
│   ├── json-parser.js             ←    writes the ./output/*.json files
│   ├── business-object-schema-    ←    Business Object (twClass) schema parser
│   │   parser.js
│   └── toolkit/                   ←    toolkit specialists
│       ├── ToolkitBusinessObjectExtractor.js
│       ├── ToolkitCSHSExtractor.js
│       ├── ToolkitDependencyMapper.js
│       ├── ToolkitServiceExtractor.js
│       └── ToolkitValidator.js
│
├── classes/                       ← domain model
│   ├── JSONWorkspace.js           ←    wraps JSONParser, reads summary for API queries
│   ├── AppSnapshot.js             ←    snapshot metadata
│   ├── ObjectVersion.js
│   ├── ObjectDependency.js
│   ├── SnapshotDependency.js
│   └── SnapshotObjectDependency.js
│
├── search/                        ← search
│   ├── xml-search.js              ←    raw XML search
│   └── search-api.js              ←    /api/search HTTP handler
│
├── server/
│   └── web-server.js              ← HTTP server used by app.js
│                                   (/api/* endpoints + static viewer files)
│
└── utils/                         ← shared building blocks
    ├── Constants.js               ←    TYPES + IBM ID prefixes (2064. 2063. 2066. 2069.)
    ├── type-mappings.js           ←    raw type codes → human names + groupByType()
    ├── file-names.js              ←    objectTypeFileName + variants
    ├── business-object-*.js       ←    business object registries
    ├── toolkit-type-registry.js
    └── Performance.js             ←    makeMeasurable() — logs timings in hot paths
```

---

## 6. End-to-end: a `.twx` becomes JSON

```
                    ┌────────────────────────────────────┐
                    │  user runs:  app.js parse foo.twx  │
                    │  or clicks "Parse" in the web UI   │
                    └─────────────────┬──────────────────┘
                                      │
                                      ▼
                    ┌────────────────────────────────────┐
                    │  TWXExtractor.extractTWX(path)     │
                    │  (src/parser/twx-extractor.js)     │
                    └─────────────────┬──────────────────┘
                                      │
              ┌───────────────────────┼─────────────────────────┐
              │                       │                         │
              ▼                       ▼                         ▼
   ┌──────────────────┐   ┌──────────────────────┐   ┌────────────────────┐
   │ adm-zip opens    │   │ extractPackageMeta-  │   │ extractToolkits()  │
   │ the .twx         │   │ data(zip)            │   │  for each entry     │
   │                  │   │  reads META-INF/     │   │  under toolkits/:   │
   │                  │   │  package.xml         │   │  recurse one level  │
   └────────┬─────────┘   └──────────┬───────────┘   └─────────┬──────────┘
            │                        │                         │
            │                        │                         │
            ▼                        ▼                         ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │  extractObjects(zip, objectList)                                     │
   │  for each object in package.xml:                                     │
   │      parse its XML  (per-type logic inline in twx-extractor.js)  │
   │      tag with  source: 'application'                                 │
   └──────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
              ┌───────────────────────────────────────┐
              │ toolkit objects get  source: 'toolkit'│
              │ combine  →  allObjects                │
              └─────────────────┬─────────────────────┘
                                │
                                ▼
              ┌───────────────────────────────────────┐
              │ resolveBusinessObjectCrossReferences  │
              │  for every twClass object              │
              │  (link parent/child BO schemas)        │
              └─────────────────┬─────────────────────┘
                                │
                                ▼
                    ┌───────────────────────────┐
                    │  JSONParser.generateOutputFiles
                    │  (src/parser/json-parser.js)
                    └─────────────┬─────────────┘
                                  │
            ┌──────────┬──────────┼──────────┬──────────┬──────────┐
            ▼          ▼          ▼          ▼          ▼          ▼
        ┌───────┐ ┌───────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐
        │twx-   │ │objects│ │toolkit-│ │combined-│ │toolkits│ │metadata  │
        │summary│ │-<type>│ │objects-│ │objects- │ │.json   │ │.json     │
        │.json  │ │.json  │ │<type>  │ │<type>   │ │        │ │          │
        └───────┘ └───────┘ └────────┘ └─────────┘ └────────┘ └──────────┘
                                  │
                                  ▼
                            ./output/*.json
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  JSONWorkspace.loadData()   │
                    │  reads twx-summary.json     │
                    │  →  in-memory model         │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  twx-viewer-new.js (browser)│
                    │  fetches /api/*             │
                    │  reads output/*.json        │
                    └─────────────────────────────┘
```

---

## 7. The web UI's data model

The viewer never talks to the parser. It only knows about files in `./output/`. Here's what it sees:

```
./output/
├── twx-summary.json              ← entry point: metadata, stats, objectsByType[]
│
├── objects-<type>.json           ← main app objects, one file per type
│                                    (e.g. objects-bpd.json, objects-twclass.json)
│
├── toolkit-objects-<type>.json   ← toolkit objects, one file per type
│
├── combined-objects-<type>.json  ← app + toolkit merged, with per-source counts
│
├── toolkits.json                 ← list of toolkits + their metadata
│
└── metadata.json                 ← raw package.xml + extraction metadata
```

Every object carries a `source: 'application' | 'toolkit'` field. The UI uses it to break down counts and to show where each object came from.

---

## 8. CLI vs web UI

```
┌────────────────────────┬───────────────────────────────────────┐
│  Command               │  What happens                         │
├────────────────────────┼───────────────────────────────────────┤
│  app.js                │  starts the HTTP server, opens the    │
│                        │  browser at http://localhost:<port>   │
│                        │                                       │
│  app.js --ui           │  same as above (explicit)             │
│                        │                                       │
│  app.js parse foo.twx  │  extracts, writes ./output/*.json,    │
│                        │  exits. No server.                    │
│                        │                                       │
│  app.js parse ./dir/   │  same, but reads an already-unzipped  │
│                        │  TWX directory                        │
│                        │                                       │
│  app.js --help         │  usage text                           │
└────────────────────────┴───────────────────────────────────────┘
```

---

## 9. Important conventions

These are the things that will trip you up:

- **`.twx` is a zip; toolkits are zips inside the zip.** The parser recurses one level (`toolkits/<name>.twx`). It does not recurse infinitely.
- **Object IDs carry IBM prefixes** — `2064.` (snapshot), `2063.` (branch), `2066.` (app), `2069.` (dependency). The literal numbers are part of the IDs in the source XML.
- **The public API is in `src/index.js`.** Use `createWorkspace()`, `parseTWX()`, or `extractTWX()`. The old DB-backed `getWorkspace()` API has been removed.
- **`npm run build` cleans `output/` first, then runs `pkg`.** The embedded `output/` directory in `dist/twx-parser.exe` is empty by default.
- **`dist/twx-parser.exe` is the only build artifact.** `npm run build` targets `node18-win-x64` by default — change `--targets` in `package.json` for Linux/macOS.

---

## 10. Where to start reading

| If you want to understand…              | Read this                                                                            |
|-----------------------------------------|--------------------------------------------------------------------------------------|
| The whole flow, top to bottom           | `app.js` → `src/parser/twx-extractor.js#extractTWX` → `src/parser/json-parser.js`    |
| What the UI sees                        | the JSON files in `output/`, and `src/parser/json-parser.js#generateSummaryFile`     |
| How the viewer talks to the server      | `src/server/web-server.js#handleApiRequest` and `twx-viewer-new.js`                  |
| Where to add a new object type          | `src/utils/type-mappings.js` + dispatch in `src/parser/twx-extractor.js`             |
| How to add a CLI subcommand             | the `if/else` over `args[0]` in `app.js#run`                                         |
