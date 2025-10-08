# TWX Parser - Deployment Guide

## 🚨 Issue with .exe Build

### Problem
The `build.bat` creates a `.exe` file using `pkg`, but it closes immediately when double-clicked because:

1. **Missing Dependencies**: `pkg` cannot bundle all Node.js modules properly, especially:
   - ESLint and its plugins (100+ files)
   - Prettier
   - Dynamic requires in the codebase
   - Static assets (HTML, CSS, JS files)

2. **Error Visibility**: When the .exe encounters an error, the console closes immediately, hiding the error message

3. **Working Directory**: The .exe doesn't know where to find the required files relative to its location

### Why pkg Doesn't Work Well Here
- **ESLint**: Requires dynamic loading of plugins and rules
- **Prettier**: Has native bindings that pkg struggles with
- **Web Server**: Needs to serve static files (HTML, CSS, JS)
- **File System**: Needs read/write access to `output/` folder
- **Size**: Would create a 100+ MB executable with all dependencies

---

## ✅ Recommended Solutions

### **Option 1: Use the Batch File Launcher (Recommended)**

This is the **easiest and most reliable** method.

#### How to Use:
1. **Double-click `TWX-Parser.bat`**
   - Automatically checks for Node.js
   - Installs dependencies if needed
   - Starts the web server
   - Opens browser automatically
   - Keeps console open to show status

#### Advantages:
- ✅ No build process needed
- ✅ All dependencies work correctly
- ✅ Easy to debug (console stays open)
- ✅ Automatic dependency installation
- ✅ Small file size (just the batch file)
- ✅ Easy to update (just pull new code)

#### Requirements:
- Node.js installed (download from https://nodejs.org/)
- Run `npm install` once (or let the batch file do it)

---

### **Option 2: Create a Portable Distribution**

Create a folder that can be copied to other machines.

#### Steps:

1. **Install Node.js Portable** (optional, for machines without Node.js):
   - Download Node.js portable from https://nodejs.org/
   - Extract to `portable-node/` folder in your project

2. **Create Distribution Folder**:
   ```
   TWX-Parser-Portable/
   ├── portable-node/          (optional - Node.js portable)
   ├── node_modules/           (all dependencies)
   ├── src/                    (source code)
   ├── output/                 (output folder)
   ├── twx-viewer-new.html
   ├── twx-viewer-new.css
   ├── twx-viewer-new.js
   ├── app.js
   ├── package.json
   ├── TWX-Parser.bat          (launcher)
   └── README.md
   ```

3. **Modify TWX-Parser.bat** to use portable Node.js:
   ```batch
   @echo off
   set NODE_PATH=%~dp0portable-node
   set PATH=%NODE_PATH%;%PATH%
   
   node app.js
   pause
   ```

4. **Zip the folder** and distribute

#### Advantages:
- ✅ Works on machines without Node.js (if you include portable Node.js)
- ✅ All dependencies included
- ✅ No installation needed
- ✅ Just unzip and run

#### Disadvantages:
- ❌ Large folder size (~200-300 MB with Node.js)
- ❌ Need to update the whole folder for updates

---

### **Option 3: Use Node.js Directly (For Developers)**

For development or if Node.js is already installed:

#### Commands:
```bash
# Start web interface
npm run viewer

# Or use the start script
npm start

# Or run directly
node app.js
```

---

## 🔧 Fixing the Current .exe Issue

If you still want to try making the .exe work, here are the issues to fix:

### 1. **Update pkg Configuration**

The current `package.json` pkg config is incomplete. It needs:

```json
"pkg": {
  "assets": [
    "twx-viewer-new.html",
    "twx-viewer-new.css",
    "twx-viewer-new.js",
    "twx-viewer.html",
    "src/**/*.js",
    ".eslintrc.cjs",
    "node_modules/eslint/**/*",
    "node_modules/prettier/**/*",
    "node_modules/@eslint/**/*",
    "node_modules/eslint-plugin-*/**/*"
  ],
  "scripts": [
    "src/**/*.js"
  ]
}
```

### 2. **Create Output Folder**

The .exe needs to create the `output/` folder if it doesn't exist:

```javascript
// Add to app.js
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
```

### 3. **Use run-twx-parser.bat**

Instead of double-clicking the .exe, use the `run-twx-parser.bat` file I created:
- It keeps the console open
- Shows error messages
- Displays exit codes

### 4. **Known Limitations**

Even with these fixes, the .exe will:
- Be 100+ MB in size
- Take 10-20 seconds to start (unpacking)
- May have issues with ESLint plugins
- Require the `output/` folder to be writable

---

## 📋 Recommended Deployment Strategy

### For End Users:
1. **Provide `TWX-Parser.bat`** as the launcher
2. **Include installation instructions** for Node.js
3. **Provide a setup script** that runs `npm install`

### For Distribution:
1. **Create a ZIP file** with:
   - All source files
   - `TWX-Parser.bat` launcher
   - `README.md` with instructions
   - `package.json` and `package-lock.json`

2. **Instructions for users**:
   ```
   1. Install Node.js from https://nodejs.org/
   2. Extract the ZIP file
   3. Double-click TWX-Parser.bat
   4. Wait for dependencies to install (first time only)
   5. Browser will open automatically
   ```

### For Corporate Environment:
1. **Pre-install Node.js** on all machines
2. **Run `npm install`** once during deployment
3. **Create a shortcut** to `TWX-Parser.bat`
4. **Place in a shared network folder** or deploy via software distribution

---

## 🎯 Summary

| Method | Pros | Cons | Recommended For |
|--------|------|------|-----------------|
| **TWX-Parser.bat** | Easy, reliable, small | Requires Node.js | Most users |
| **Portable Distribution** | No Node.js install needed | Large size (300MB) | Offline/restricted environments |
| **npm run viewer** | Developer-friendly | Requires command line | Developers |
| **.exe with pkg** | Single file | Doesn't work well, large, slow | Not recommended |

---

## 🚀 Quick Start (Recommended)

1. **Install Node.js**: https://nodejs.org/ (if not already installed)
2. **Run**: Double-click `TWX-Parser.bat`
3. **Done**: Browser opens automatically with the TWX Parser interface

---

## 💡 Why This Approach is Better

1. **Reliability**: No packaging issues, all dependencies work correctly
2. **Size**: ~50 MB (node_modules) vs 100+ MB (.exe)
3. **Speed**: Instant startup vs 10-20 seconds for .exe
4. **Updates**: Just pull new code, no rebuild needed
5. **Debugging**: Easy to see errors and logs
6. **Flexibility**: Can modify code without rebuilding

---

## 📞 Support

If you encounter issues:
1. Check that Node.js is installed: `node --version`
2. Check that dependencies are installed: `npm list`
3. Run with verbose logging: `node app.js --verbose`
4. Check the console output for error messages

