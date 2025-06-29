# TWX Parser - Standalone Executable

A powerful, user-friendly tool for parsing and analyzing IBM BPM TWX files.

## 📦 What's Included

- `twx-parser.exe` - The main executable
- `README.md` - This documentation
- `Start-TWX-Parser.bat` - Quick start script for web interface
- `Example-CLI-Parse.bat` - Command line usage example
- `version.json` - Version and build information

## 🚀 Quick Start

### Option 1: Web Interface (Recommended)
1. **Double-click** `twx-parser.exe`
2. **Wait** for the web browser to open automatically
3. **Upload** your TWX file using the file selector
4. **Browse** and analyze your parsed objects

### Option 2: Command Line
```cmd
# Parse a TWX file
twx-parser.exe parse "path\to\your\file.twx"

# Parse an extracted TWX directory
twx-parser.exe parse "path\to\extracted\directory"

# Show help
twx-parser.exe --help
```

## ✨ Features

### 🌐 Web Interface
- **File Upload**: Drag and drop or browse for TWX files
- **Object Browser**: Navigate through objects by type with collapsible panels
- **Deep Search**: Search across all object content with highlighting
- **Object Details**: View detailed information for each object
- **Modern UI**: Clean, responsive interface with no popups

### 🔍 Object Types Supported
- **CSHS** (Coach Views, Human Services)
- **Processes** (Business Process Definitions)
- **Coach Views** (UI Components)
- **Business Objects** (Data Models)
- **Environment Variables**
- **Participants** (Users and Groups)
- **Resource Bundles** (Internationalization)
- **ESArtifacts** (Enterprise Service Artifacts)
- **Managed Assets** (Shared Resources)

### 📊 Analysis Features
- **Object Statistics**: Count and categorize all objects
- **Dependency Analysis**: Understand object relationships
- **Search & Filter**: Find specific objects or content
- **Export Options**: Generate JSON output files

## 💻 System Requirements

- **Operating System**: Windows 10/11 (x64)
- **Memory**: 4GB RAM minimum (8GB recommended for large TWX files)
- **Disk Space**: 500MB free space
- **Browser**: Any modern web browser (Chrome, Firefox, Edge)

## 📁 File Structure

After parsing, the tool creates an `output` folder with:
```
output/
├── twx-summary.json          # Complete summary and statistics
├── objects-cshs.json         # CSHS objects
├── objects-process.json      # Process definitions
├── objects-coach-view.json   # Coach views
└── ... (other object types)
```

## 🔧 Usage Examples

### Web Interface Workflow
1. **Start**: Run `twx-parser.exe`
2. **Upload**: Select your `.twx` file
3. **Parse**: Click "Parse File" and wait for completion
4. **Browse**: Explore objects by type in collapsible panels
5. **Search**: Use the deep search to find specific content
6. **Analyze**: View detailed object information

### Command Line Examples
```cmd
# Parse a TWX file
twx-parser.exe parse "C:\MyProjects\MyApp.twx"

# Parse multiple files (run separately)
twx-parser.exe parse "App1.twx"
twx-parser.exe parse "App2.twx"

# Parse an extracted directory
twx-parser.exe parse "C:\ExtractedTWX\MyApp"
```

## 🔍 Search Tips

The search function is very powerful and searches through:
- Object names and descriptions
- Variable names and types
- Script content and logic
- Configuration properties
- Comments and documentation

**Search Examples:**
- `"customerData"` - Find objects dealing with customer data
- `"validation"` - Find validation logic
- `"submit"` - Find submit buttons or functions
- `"error"` - Find error handling code

## 📋 Troubleshooting

### Common Issues

**Q: Browser doesn't open automatically**
- A: Manually open your browser and go to the URL shown in the console (usually `http://localhost:3000`)

**Q: "File too large" error**
- A: Large TWX files (>100MB) may take time to process. Ensure sufficient disk space.

**Q: Parse fails with error**
- A: Ensure the TWX file is not corrupted and is a valid IBM BPM export

**Q: Search returns no results**
- A: Make sure you've parsed a TWX file first. Search only works after parsing.

### Getting Help

If you encounter issues:
1. Check the console output for error messages
2. Ensure your TWX file is valid
3. Try with the included example file first
4. Make sure you have sufficient disk space

## 📄 Output Files

The parser generates several JSON files for analysis:

- **twx-summary.json**: Overview with statistics and object counts
- **objects-[type].json**: Detailed objects grouped by type
- **metadata.json**: TWX package metadata and information

These files can be used for:
- Further analysis with other tools
- Integration with CI/CD pipelines
- Documentation generation
- Compliance reporting

## 🛡️ Security & Privacy

- **Local Processing**: All parsing happens locally on your machine
- **No Network**: No data is sent to external servers
- **Temporary Files**: Uploaded files are cleaned up automatically
- **Read-Only**: The tool only reads TWX files, never modifies them

## 📜 License

MIT License - See LICENSE file for details.

## 🚀 Version Information

- **Version**: 1.7.0
- **Build Date**: June 29, 2025
- **Node.js**: v18 Runtime Included
- **Platform**: Windows x64

---

**Happy Parsing!** 🎉

For more advanced usage and development information, see the full documentation in the source repository.
