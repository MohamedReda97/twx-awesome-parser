# TWX Parser - Installation & Setup Guide

## 📦 Quick Installation

### Option 1: Simple Download (Recommended)
1. **Download** the `twx-parser.exe` file
2. **Save** it to any folder on your computer
3. **Double-click** `twx-parser.exe` to start
4. **Done!** Your browser will open automatically

### Option 2: Full Package Download
1. **Download** the entire distribution folder
2. **Extract** all files to a folder like `C:\TWX-Parser\`
3. **Run** `Start-TWX-Parser.bat` for easy startup
4. **Or** double-click `twx-parser.exe` directly

## 🚀 First Run

### Starting the Application
```cmd
# Method 1: Double-click the executable
twx-parser.exe

# Method 2: Use the batch file
Start-TWX-Parser.bat

# Method 3: Command line
twx-parser.exe --ui
```

### What Happens Next
1. **Console Window Opens**: Shows startup messages
2. **Web Server Starts**: Usually on port 3000-4000
3. **Browser Opens**: Automatically navigates to the interface
4. **Ready to Use**: Upload your TWX files!

## 🔧 Configuration

### Default Settings
- **Port**: Automatically assigned (usually 3000-9000)
- **Host**: localhost (127.0.0.1)
- **Output**: Creates `output/` folder in the same directory
- **Temp**: Creates `temp/` folder for processing

### Customization
The application works out-of-the-box with no configuration needed. All settings are automatically managed.

## 📁 File Organization

### Recommended Folder Structure
```
C:\TWX-Parser\
├── twx-parser.exe          # Main executable
├── README.md               # Documentation
├── Start-TWX-Parser.bat    # Quick start script
├── RELEASE-NOTES.md        # Version information
├── output/                 # Generated after first parse
│   ├── twx-summary.json
│   ├── objects-*.json
│   └── ...
└── temp/                   # Temporary files (auto-created)
```

### File Permissions
- **Read**: The application needs read access to TWX files
- **Write**: Needs write access to create output and temp folders
- **Execute**: The executable must have execute permissions

## 🌐 Network & Security

### Firewall Settings
- **Local Only**: The web server only accepts connections from localhost
- **No Internet**: No external network access required
- **Safe**: Windows Defender may scan the executable (this is normal)

### Antivirus Considerations
Some antivirus software may flag the executable as "unknown" because it's a packaged Node.js application. This is a false positive. The application:
- **Does not access the internet**
- **Does not modify system files**
- **Only reads TWX files and creates output files**

## ❓ Troubleshooting

### Application Won't Start
**Problem**: Double-clicking does nothing
**Solutions**:
1. Right-click → "Run as Administrator"
2. Check if antivirus blocked the file
3. Ensure you're on Windows 10/11 x64
4. Try running from Command Prompt: `twx-parser.exe --help`

### Browser Doesn't Open
**Problem**: Console shows server started but no browser
**Solutions**:
1. Manually open browser to `http://localhost:[port]` (port shown in console)
2. Check if default browser is set
3. Try different browser (Chrome, Firefox, Edge)

### "Port Already in Use" Error
**Problem**: Error message about port being in use
**Solutions**:
1. Close other instances of TWX Parser
2. Close applications using the same port
3. Restart the application (it will find a new port)

### File Upload Fails
**Problem**: TWX file won't upload or parse
**Solutions**:
1. Check file size (limit: 100MB)
2. Verify the file is a valid .twx file
3. Ensure sufficient disk space (2x file size)
4. Try with a smaller TWX file first

### "Out of Memory" Error
**Problem**: Large TWX files cause memory issues
**Solutions**:
1. Close other applications to free memory
2. Use a machine with more RAM (8GB+ recommended)
3. Try parsing smaller TWX files
4. Restart the application between large files

## 🔄 Updates

### Checking for Updates
- Compare version numbers in `version.json`
- Check for newer releases periodically
- No automatic update mechanism (by design for security)

### Upgrading
1. **Download** new version
2. **Stop** current TWX Parser instance
3. **Replace** the executable file
4. **Restart** the application
5. **Keep** your output files (they're compatible)

## 🗑️ Uninstallation

### Complete Removal
1. **Stop** the TWX Parser application
2. **Delete** the folder containing twx-parser.exe
3. **Optional**: Remove any output folders you created
4. **Done!** No registry entries or system files to clean

### Keeping Data
- **Output files**: Keep `output/` folders if you want to preserve parsed data
- **Settings**: No settings files are created (stateless application)

## 💡 Tips & Best Practices

### Performance Tips
- **Close** other applications when parsing large files
- **Use SSD** storage for better performance
- **8GB+ RAM** recommended for large TWX files
- **Keep** the output folder on the same drive as the executable

### Usage Tips
- **Start** with smaller TWX files to test
- **Use** the web interface for interactive analysis
- **Use** CLI mode for automation and scripting
- **Keep** parsed outputs for future reference

### Security Tips
- **Only** parse TWX files from trusted sources
- **Don't** run as Administrator unless necessary
- **Keep** the executable in a dedicated folder
- **Backup** important output files

---

**Need Help?** Check the README.md file for comprehensive documentation and examples.
