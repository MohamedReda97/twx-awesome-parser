# TWX Parser

A comprehensive tool for parsing, analyzing, and visualizing IBM BPM (Business Process Manager) Process Applications and Toolkits. 
The TWX Parser extracts and analyzes TWX (TeamWorks eXchange) files, providing powerful static code analysis and visualization capabilities.

## 🎯 Overview

The TWX Parser helps developers understand and analyze IBM BPM applications by:

- **📦 Parsing TWX Files**: Extract and parse IBM BPM Process Applications and Toolkits
- **🔍 Static Code Analysis**: Analyze JavaScript code with ESLint and Prettier integration
- **📊 Visualization**: Interactive web interface to explore objects, dependencies, and structures
- **🔎 Search**: Powerful search across all objects and metadata
- **📈 Reports**: Generate detailed JSON reports for further analysis
- **⚡ Performance Analysis**: Detect nested loops, code quality issues, and potential bugs

## ✨ Key Features

### Static Code Analysis
- **ESLint Integration**: 27 critical rules covering runtime errors, security, and code quality
- **Prettier Formatting**: Automatic code formatting before analysis
- **Performance Warnings**: Detects deeply nested loops (3+ levels) and potential performance issues
- **Code Quality Checks**: Identifies unused variables, unreachable code, and duplicate functions
- **IBM BPM Specific**: Recognizes IBM BPM system objects (`tw`, `bpmext`, `page`, `TWDate`)
- **Smart Filtering**: Automatically skips CSS and Coachflow scripts
- **Deduplication**: Prevents duplicate issue reporting from multiple script sources

### Web Interface
- **Interactive Viewer**: Browse and explore TWX objects with a modern UI
- **Object Details**: View comprehensive details for each object type
- **Script Analysis**: Analyze JavaScript code directly from the interface
- **Export Results**: Export analysis results to JSON or CSV
- **Real-time Progress**: Track analysis progress with live updates

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Quick Start

1. **Start the Viewer**:
   ```bash
   npm run viewer
   ```
   This will start the web server and open the viewer in your browser.

2. **Load a TWX File**:
   - Click "Choose File" and select your TWX file
   - Click "Parse TWX" to extract and parse the file

3. **Run Static Analysis**:
   - Navigate to the "Static Review" tab
   - Select object types to analyze (Coach Views, CSHS, Services)
   - Click "Start Static Analysis"
   - View results in the interactive table

### Command Line Usage

```bash
# Start the viewer
npm run viewer

# Run linting
npm run lint

# Type checking
npm run type-check

# Build executable
npm run build
```

## 📋 Static Analysis Rules

### Critical Errors (22 rules)
- **Runtime Errors**: `no-undef`, `no-unreachable`, `no-constant-condition`, etc.
- **Security Issues**: `no-eval`, `no-implied-eval`, `security/detect-eval-with-expression`, etc.
- **Logic Errors**: `no-dupe-keys`, `no-duplicate-case`, `no-empty-pattern`, etc.

### Code Quality Warnings (5 rules)
- `no-unused-vars`: Detect unused variables
- `no-unmodified-loop-condition`: Identify infinite loops
- `no-unreachable-loop`: Find loops that only execute once
- `sonarjs/no-identical-expressions`: Detect duplicate expressions
- `sonarjs/no-identical-functions`: Find duplicate functions

### Performance Warnings
- **Nested Loops**: Warns on 3+ level nested loops
- **If-in-Loop**: Detects conditional statements in loops without break/continue

## 🏗️ Project Structure

```
twx-awesome-parser/
├── src/
│   ├── classes/          # Core parsing classes
│   ├── parser/           # TWX file parsers
│   ├── search/           # Search functionality
│   ├── server/           # Web server
│   ├── static-analysis/  # Static code analysis
│   └── utils/            # Utility functions
├── output/               # Parsed TWX data (JSON)
├── twx-viewer-new.html   # Web interface
├── twx-viewer-new.js     # Web interface logic
├── twx-viewer-new.css    # Web interface styles
├── .eslintrc.cjs         # ESLint configuration
├── package.json          # Project dependencies
└── README.md             # This file
```

## 🔧 Configuration

### ESLint Configuration
The project uses a custom ESLint configuration (`.eslintrc.cjs`) optimized for IBM BPM JavaScript code:
- Prettier integration for consistent formatting
- IBM BPM system globals (`tw`, `bpmext`, `page`, `TWDate`)
- Critical-only error reporting
- Code quality warnings

### Supported Object Types
- **Coach Views** (64): UI components with client-side scripts
- **CSHS** (1): Client-Side Human Services with script tasks
- **Services** (1): Server-side services and web services
- **Business Objects** (12): Data structures
- **Processes**: BPD definitions and flows

## 📊 Analysis Results

The static analysis provides:
- **Issue Count**: Total issues by severity (Critical, Warning, Info)
- **Script Statistics**: Number of scripts analyzed, issues per script
- **Category Breakdown**: Issues grouped by category (runtime, security, performance, code_quality)
- **Detailed Reports**: Line numbers, descriptions, and suggestions for each issue
- **Export Options**: JSON and CSV export for further processing

## 🛠️ Development

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn

### Scripts
```bash
npm start          # Start the application
npm run viewer     # Start the web viewer
npm run lint       # Run ESLint
npm run type-check # Run TypeScript type checking
npm run check      # Run both lint and type-check
npm run build      # Build executable with pkg
```

### Adding New Rules
To add new ESLint rules, edit `.eslintrc.cjs`:
```javascript
rules: {
  'your-new-rule': 'error',  // or 'warn'
}
```
## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

## 🙏 Acknowledgments

- Built for IBM BPM/BAW developers
- Uses ESLint, Prettier, and SonarJS for code analysis
- Powered by Node.js and modern web technologies