# TWX Parser v2.0 - Refactored

A modern, JSON-based TWX (IBM BPM) file parser with enhanced UI for viewing artifacts.

## 🚀 What's New in v2.0

### ✅ Completed Refactoring
- **Removed Database Dependency**: No more SQLite database required
- **JSON-Based Storage**: All parsed data stored in structured JSON files
- **Enhanced UI**: Improved artifact viewer with better filtering and search
- **Simplified Architecture**: Cleaner, more maintainable codebase
- **Real Data Support**: Works with actual TWX files and package.xml structure

### 🎯 Key Features
- Parse TWX files directly to JSON format
- Interactive web-based artifact viewer
- Support for all TWX object types (processes, business objects, coach views, etc.)
- Advanced filtering and search capabilities
- Export functionality (JSON, CSV)
- No database setup required

## 📁 Project Structure

```
twx-parse-1.7.0/
├── src/
│   ├── parser/
│   │   ├── json-parser.js          # Main JSON parser
│   │   ├── twx-extractor.js        # TWX file extraction logic
│   │   └── index.js                # Legacy parser (deprecated)
│   ├── classes/
│   │   ├── JSONWorkspace.js        # New JSON-based workspace
│   │   └── Workspace.js            # Legacy workspace (deprecated)
│   ├── utils/
│   │   └── type-mappings.js        # Object type mappings
│   └── index.js                    # Main entry point (refactored)
├── output/                         # Generated JSON files
├── TWX example/                    # Example TWX structure
├── parse-twx.js                   # Command-line parser script
├── twx-viewer.html                # Enhanced UI
├── twx-viewer-enhanced.js         # Enhanced UI JavaScript
└── test-new-parser.js             # Test script
```

## 🛠️ Installation

1. **Clone or download the project**
2. **Install dependencies**:
   ```bash
   npm install
   ```

## 🚀 Quick Start

### 1. Parse a TWX File

```bash
# Parse TWX file to JSON
node parse-twx.js "path/to/your/file.twx"

# Parse with custom output directory
node parse-twx.js "path/to/your/file.twx" "./my-output"

# Parse the included example
node parse-twx.js "TWX example" "./output"
```

### 2. View Results

Open `twx-viewer.html` in your web browser to view the parsed artifacts with an interactive interface.

### 3. Programmatic Usage

```javascript
const { createWorkspace, parseTWX } = require('./src/index')

// Method 1: Direct parsing
const results = await parseTWX('./my-app.twx', './output')
console.log(`Parsed ${results.summary.totalObjects} objects`)

// Method 2: Using workspace
const workspace = createWorkspace('./output')
await workspace.addFile('./my-app.twx')

// Query the data
const metadata = workspace.getMetadata()
const objects = workspace.getObjectsByType()
const searchResults = workspace.searchObjects('process')
```

## 📊 Generated JSON Files

The parser generates several JSON files:

- **`twx-summary.json`** - Main summary for the UI
- **`metadata.json`** - Project metadata
- **`all-objects.json`** - Complete object list
- **`objects-{type}.json`** - Objects grouped by type
- **`toolkits.json`** - Toolkit information (if any)

## 🎨 Enhanced UI Features

### New Features
- **Project Information Display**: Shows project name and details
- **Advanced Filtering**: Filter by multiple object types
- **Enhanced Search**: Search across all object names
- **View Options**: Toggle object details and IDs
- **Collapsible Groups**: Expand/collapse object type groups
- **Responsive Design**: Works on desktop and mobile

### UI Controls
- **Search Box**: Filter objects by name
- **Type Filters**: Select/deselect object types
- **Select All/Clear All**: Bulk filter controls
- **Show Details**: Toggle additional object information
- **Show IDs**: Toggle object ID display

## 🔧 API Reference

### JSONWorkspace Class

```javascript
const workspace = new JSONWorkspace('./output')

// Parse TWX file
await workspace.addFile('./app.twx')

// Query methods
workspace.getMetadata()           // Get project metadata
workspace.getStatistics()        // Get parsing statistics
workspace.getObjectsByType()     // Get objects grouped by type
workspace.getObjectsOfType(type) // Get objects of specific type
workspace.searchObjects(term)    // Search objects by name
workspace.getObjectDetails(id)   // Get detailed object info

// Export methods
await workspace.exportData('json', './export.json')
await workspace.exportData('csv', './export.csv')

// Utility methods
workspace.hasData()              // Check if data is loaded
workspace.getSummaryReport()     // Get summary report
workspace.clear()                // Clear all data
```

### Direct Parsing Functions

```javascript
const { parseTWX, extractTWX } = require('./src/index')

// Parse to JSON files
const results = await parseTWX('./app.twx', './output')

// Extract raw data only
const rawData = await extractTWX('./app.twx')
```

## 📋 Object Types Supported

The parser recognizes and categorizes these TWX object types:

- **Processes** - Business processes and workflows
- **Business Objects** - Data structures and classes
- **Coach Views** - UI components
- **Services** - Integration and business services
- **Business Process Definitions** - BPD artifacts
- **Environment Property Variables** - Configuration variables
- **Resource Bundles** - Localization resources
- **Managed Assets** - Files and resources
- **Environment Variables** - System configuration
- **Project Settings** - Project configuration

## 🧪 Testing

Run the test script to verify the parser works:

```bash
node test-new-parser.js
```

This will:
- Analyze the TWX example structure
- Test the JSON parser functionality
- Create mock data for UI testing
- Verify workspace operations

## 🔄 Migration from v1.x

### What Changed
- **Database Removed**: No more SQLite dependency
- **New API**: Simplified workspace and parsing methods
- **JSON Output**: All data stored in JSON files
- **Enhanced UI**: Better artifact viewing experience

### Migration Steps
1. **Update Dependencies**: Remove database-related packages
2. **Update Code**: Use new `JSONWorkspace` instead of `Workspace`
3. **Update Parsing**: Use `parse-twx.js` script or new API methods
4. **Update UI**: Use enhanced `twx-viewer.html`

### Legacy Support
The old database-based system is still available but deprecated:
- `src/classes/Workspace.js` - Legacy workspace
- `src/db/` - Database layer (deprecated)
- `twx-viewer.js` - Legacy UI script

## 🐛 Troubleshooting

### Common Issues

1. **"No TWX files found"**
   - Ensure the file path is correct
   - Check file has `.twx` extension

2. **"Failed to load parsing results"**
   - Run the parser first: `node parse-twx.js <file>`
   - Check output directory contains JSON files

3. **UI shows no data**
   - Ensure `twx-summary.json` exists in output directory
   - Check browser console for errors

### Debug Mode
Set `NODE_ENV=development` for verbose logging:

```bash
NODE_ENV=development node parse-twx.js "TWX example"
```

## 📈 Performance

The refactored parser offers significant improvements:
- **Faster Parsing**: No database overhead
- **Lower Memory Usage**: Streaming JSON processing
- **Better Scalability**: File-based storage
- **Easier Deployment**: No database setup required

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `node test-new-parser.js`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Original TWX parser project
- IBM BPM documentation
- Community feedback and contributions
