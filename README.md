![npm](https://img.shields.io/npm/v/twx-parser?color=green&label=npm%20package)

# twx-parser

Parse IBM BPM `Process App` and `Toolkit` packages (`.twx` files), explore objects, search dependencies, and view results in a browser UI.

## Install

```bash
npm install twx-parser
```

Or install globally for the CLI:

```bash
npm install -g twx-parser
```

## Quick example (library API)

```js
const { createWorkspace, parseTWX, extractTWX } = require('twx-parser');

// Create a workspace backed by ./output/*.json
const ws = createWorkspace('./output');

// Parse a .twx file end-to-end (writes JSON to output/)
const result = await parseTWX('my-app.twx');

// Or just extract raw data without writing files
const data = await extractTWX('my-app.twx');
console.log(data.metadata.name, data.allObjects.length, 'objects');
```

## CLI

```bash
twx-parser                            # Start the web UI (browser)
twx-parser --ui                        # Same as above
twx-parser parse <file-or-directory>   # Parse a .twx file or extracted dir via CLI
twx-parser --help                      # Show usage
```

The web UI provides a visual browser for exploring parsed objects with search and detailed views. CLI mode writes JSON output to `./output/` and exits — useful for batch processing.

## Build

Build a standalone Windows executable:

```bash
npm run build
```

Produces `dist/twx-parser.exe`. The build script cleans `./output/` before packaging. To target other platforms, edit the `--targets` flag in `package.json`.

## Docs

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the parsing pipeline works, module map, data flow
- [UI-PROMOTION-PLAN.md](docs/UI-PROMOTION-PLAN.md) — UI design and promotion plan for the production viewer

## License

MIT
