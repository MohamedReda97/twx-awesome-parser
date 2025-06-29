# TWX Parser v1.7.0 - Distribution Package

## 📦 Package Contents

This distribution contains everything you need to parse and analyze IBM BPM TWX files:

### Core Files
- **`twx-parser.exe`** (Main executable - ~150MB)
  - Self-contained Windows x64 application
  - Includes Node.js v18 runtime
  - No installation required

### Documentation
- **`README.md`** - Complete user guide and documentation
- **`INSTALL.md`** - Installation and setup instructions
- **`RELEASE-NOTES.md`** - Version history and new features
- **`version.json`** - Technical build information

### Quick Start Scripts
- **`Start-TWX-Parser.bat`** - One-click web interface startup
- **`Example-CLI-Parse.bat`** - Interactive command line example

## 🚀 Getting Started

### For First-Time Users
1. **Read**: `INSTALL.md` for setup instructions
2. **Run**: `Start-TWX-Parser.bat` to launch web interface
3. **Upload**: Your TWX file through the web interface
4. **Explore**: Parsed objects and search functionality

### For Advanced Users
1. **CLI Mode**: Use `twx-parser.exe parse "file.twx"` for scripting
2. **Integration**: Parse files in batch or CI/CD pipelines
3. **Analysis**: Use generated JSON files for custom processing

## 📊 Features Overview

### Web Interface
- ✅ File upload with drag-and-drop
- ✅ Collapsible object browser
- ✅ Deep search with highlighting
- ✅ Detailed object views
- ✅ Real-time progress tracking

### Command Line
- ✅ Parse TWX files or directories
- ✅ Generate JSON output files
- ✅ Scriptable and automatable
- ✅ Batch processing support

### Object Support
- ✅ CSHS (Coach Views, Human Services)
- ✅ Business Process Definitions
- ✅ Coach Views and UI Components
- ✅ Business Objects and Data Models
- ✅ Environment Variables
- ✅ Participants and Security
- ✅ Resource Bundles and i18n
- ✅ Enterprise Service Artifacts
- ✅ Managed Assets

## 🔧 System Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Windows 10/11 x64 |
| RAM | 4GB min, 8GB recommended |
| Disk Space | 500MB free |
| Browser | Chrome, Firefox, Edge |
| .NET | Not required |
| Java | Not required |
| Node.js | Embedded (not required) |

## 📁 Output Structure

After parsing, the application creates:

```
output/
├── twx-summary.json              # Overview and statistics
├── objects-cshs.json             # CSHS objects
├── objects-process.json          # Process definitions
├── objects-coach-view.json       # Coach views
├── objects-business-object.json  # Business objects
├── objects-environment-*.json    # Environment settings
├── objects-participant.json      # Users and groups
├── objects-resource-bundle.json  # Internationalization
├── objects-esartifact.json       # Service artifacts
└── objects-managed-asset.json    # Shared resources
```

## 🛡️ Security & Privacy

- **Local Processing**: Everything runs on your machine
- **No Network**: No data sent to external servers
- **Read-Only**: Never modifies your TWX files
- **Temporary Files**: Automatically cleaned up
- **Open Source**: Based on open source libraries

## 📞 Support

### Self-Help Resources
1. **README.md** - Complete documentation
2. **INSTALL.md** - Setup troubleshooting
3. **RELEASE-NOTES.md** - Known issues and fixes

### Common Issues
- **Won't start**: Run as Administrator or check antivirus
- **No browser**: Manually navigate to http://localhost:[port]
- **Upload fails**: Check file size (100MB limit) and disk space
- **Memory error**: Use machine with 8GB+ RAM for large files

## 🔄 Version Information

- **Version**: 1.7.0
- **Build Date**: June 29, 2025
- **Target Platform**: Windows x64
- **Node.js Runtime**: v18.x (embedded)
- **Package Format**: PKG (Node.js executable)
- **Compression**: Yes (UPX optimized)

## 📋 File Checksums

To verify package integrity:

| File | Size | Purpose |
|------|------|---------|
| twx-parser.exe | ~150MB | Main application |
| README.md | ~15KB | User documentation |
| INSTALL.md | ~8KB | Setup guide |
| RELEASE-NOTES.md | ~12KB | Version info |
| Start-TWX-Parser.bat | ~1KB | Quick start |
| Example-CLI-Parse.bat | ~1KB | CLI example |
| version.json | ~1KB | Build metadata |

## 🎯 Use Cases

### Business Analysts
- Analyze process definitions and flows
- Review business objects and data models
- Understand application structure

### Developers
- Audit code and configurations
- Find dependencies and references
- Export for documentation

### Architects
- Review application architecture
- Understand component relationships
- Validate design patterns

### Compliance Teams
- Generate audit reports
- Review security configurations
- Document system components

---

**Ready to analyze your TWX files!** 🚀

Start with `Start-TWX-Parser.bat` or see `INSTALL.md` for detailed setup instructions.
