#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Import existing modules
const TWXExtractor = require('./src/parser/twx-extractor');
const { createJSONOutput } = require('./src/parser/json-parser');

/**
 * TWX Parser Application - Unified Entry Point
 * 
 * Usage:
 *   app.exe                           # Start web UI (default)
 *   app.exe --ui                      # Start web UI explicitly  
 *   app.exe parse <twx-file>          # CLI parsing mode
 *   app.exe parse <twx-directory>     # CLI parsing mode for directory
 *   app.exe --help                    # Show help
 */

class TWXParserApp {
  constructor() {
    this.extractor = new TWXExtractor();
    this.server = null;
  }

  /**
   * Main application entry point
   */
  async run() {
    const args = process.argv.slice(2);
    
    try {
      if (args.length === 0 || args[0] === '--ui') {
        // Default mode: Start web UI
        await this.startWebUI();
      } else if (args[0] === 'parse' && args[1]) {
        // CLI parsing mode
        await this.parseCLI(args[1]);
      } else if (args[0] === '--help' || args[0] === '-h') {
        this.showHelp();
      } else {
        console.log('Invalid arguments. Use --help for usage information.');
        process.exit(1);
      }
    } catch (error) {
      console.error('Application error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Start the web UI server and open browser
   */
  async startWebUI() {
    console.log('🚀 Starting TWX Parser Web UI...');
    
    try {
      // Import and start the web server
      const { startServer } = require('./src/server/web-server');
      this.server = await startServer();
      const port = this.server.port;
      
      console.log(`✅ Server running at http://localhost:${port}`);
      console.log('🌐 Opening browser...');
      
      // Auto-open browser
      this.openBrowser(`http://localhost:${port}`);
      
      // Handle graceful shutdown
      this.setupGracefulShutdown();
      
      // Keep the process running
      console.log('💡 Press Ctrl+C to stop the server');
      
    } catch (error) {
      console.error('❌ Failed to start web UI:', error.message);
      throw error;
    }
  }

  /**
   * CLI parsing mode
   */
  async parseCLI(inputPath) {
    console.log(`📁 Parsing TWX: ${inputPath}`);
    
    if (!fs.existsSync(inputPath)) {
      throw new Error(`File or directory not found: ${inputPath}`);
    }

    const stat = fs.statSync(inputPath);
    let extractedData;

    if (stat.isDirectory()) {
      // Parse extracted TWX directory
      extractedData = await this.extractor.extractFromDirectory(inputPath);
    } else if (path.extname(inputPath).toLowerCase() === '.twx') {
      // Parse TWX file
      extractedData = await this.extractor.extractTWX(inputPath);
    } else {
      throw new Error('Input must be a .twx file or extracted TWX directory');
    }

    // Generate JSON output
    console.log('📊 Generating JSON output...');
    await createJSONOutput(extractedData, './output');
    
    console.log('✅ Parsing completed! Check the output folder for results.');
    console.log(`📋 Summary: ${extractedData.objects.length} objects processed`);
  }

  /**
   * Open browser on the appropriate platform
   */
  openBrowser(url) {
    const platform = process.platform;
    
    try {
      if (platform === 'win32') {
        // Windows: Use cmd /c start to properly launch the browser
        const child = spawn('cmd', ['/c', 'start', '""', url], {
          detached: true,
          stdio: 'ignore',
          shell: false
        });
        child.unref();
      } else if (platform === 'darwin') {
        // macOS
        const child = spawn('open', [url], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      } else {
        // Linux
        const child = spawn('xdg-open', [url], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      }
    } catch (error) {
      console.log(`⚠️  Could not auto-open browser: ${error.message}`);
      console.log(`📋 Please manually open: ${url}`);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = () => {
      console.log('\n🛑 Shutting down TWX Parser...');
      if (this.server) {
        this.server.stop(() => {
          console.log('✅ Server closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
TWX Parser Application

USAGE:
  app.exe                           Start web UI (default)
  app.exe --ui                      Start web UI explicitly
  app.exe parse <file-or-directory> Parse TWX file or directory via CLI
  app.exe --help                    Show this help

EXAMPLES:
  app.exe                           # Start web interface
  app.exe parse example.twx         # Parse TWX file
  app.exe parse ./extracted-twx/    # Parse extracted directory

WEB UI:
  The web interface provides a visual tool for browsing and analyzing
  TWX files with search capabilities and detailed object views.

CLI MODE:
  CLI mode parses TWX files and generates JSON output in the ./output folder.
  Use this for batch processing or integration with other tools.
`);
  }
}

// Run the application
if (require.main === module) {
  console.log('Starting TWX Parser App...');
  const app = new TWXParserApp();
  app.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TWXParserApp;
