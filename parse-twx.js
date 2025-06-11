#!/usr/bin/env node

/**
 * Main script to parse TWX files and generate JSON output
 * Usage: node parse-twx.js <twx-file-path> [output-directory]
 */

const fs = require('fs')
const path = require('path')
const JSONParser = require('./src/parser/json-parser')

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function printHeader() {
  console.log(colorize('\n╔══════════════════════════════════════════════════════════════╗', 'cyan'))
  console.log(colorize('║                    TWX Parser v2.0                          ║', 'cyan'))
  console.log(colorize('║              JSON-Based TWX File Parser                     ║', 'cyan'))
  console.log(colorize('╚══════════════════════════════════════════════════════════════╝\n', 'cyan'))
}

function printUsage() {
  console.log(colorize('Usage:', 'bright'))
  console.log('  node parse-twx.js <twx-file-path> [output-directory]\n')
  console.log(colorize('Arguments:', 'bright'))
  console.log('  twx-file-path     Path to the TWX file to parse')
  console.log('  output-directory  Directory to save JSON files (default: ./output)\n')
  console.log(colorize('Examples:', 'bright'))
  console.log('  node parse-twx.js ./my-app.twx')
  console.log('  node parse-twx.js ./my-app.twx ./results')
  console.log('  node parse-twx.js "TWX example" ./parsed-data\n')
}

function validateInputs(twxPath, outputDir) {
  const errors = []

  // Check if TWX path exists
  if (!fs.existsSync(twxPath)) {
    errors.push(`TWX file/directory not found: ${twxPath}`)
  }

  // Check if output directory is writable (create if doesn't exist)
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Test write permission
    const testFile = path.join(outputDir, '.write-test')
    fs.writeFileSync(testFile, 'test')
    fs.unlinkSync(testFile)
  } catch (error) {
    errors.push(`Cannot write to output directory: ${outputDir}`)
  }

  return errors
}

async function findTWXFiles(searchPath) {
  const twxFiles = []
  
  if (fs.statSync(searchPath).isFile()) {
    if (searchPath.toLowerCase().endsWith('.twx')) {
      twxFiles.push(searchPath)
    }
  } else if (fs.statSync(searchPath).isDirectory()) {
    // Look for TWX files in directory
    const files = fs.readdirSync(searchPath)
    for (const file of files) {
      const fullPath = path.join(searchPath, file)
      if (fs.statSync(fullPath).isFile() && file.toLowerCase().endsWith('.twx')) {
        twxFiles.push(fullPath)
      }
    }
  }
  
  return twxFiles
}

async function parseTWXFile(twxPath, outputDir) {
  const parser = new JSONParser(outputDir)
  
  console.log(colorize(`📁 Processing: ${path.basename(twxPath)}`, 'blue'))
  console.log(`   Source: ${twxPath}`)
  console.log(`   Output: ${outputDir}\n`)
  
  const startTime = Date.now()
  
  try {
    const results = await parser.parseTWX(twxPath)
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log(colorize('\n✅ Parsing completed successfully!', 'green'))
    console.log(colorize('📊 Summary:', 'bright'))
    console.log(`   • Total Objects: ${results.summary.totalObjects}`)
    console.log(`   • Object Types: ${results.summary.objectTypes}`)
    console.log(`   • Toolkits: ${results.summary.toolkits}`)
    console.log(`   • Files Generated: ${results.filesGenerated.length}`)
    console.log(`   • Processing Time: ${duration}s`)
    
    console.log(colorize('\n📄 Generated Files:', 'bright'))
    results.filesGenerated.forEach(file => {
      const fileName = path.basename(file)
      const fileSize = (fs.statSync(file).size / 1024).toFixed(1)
      console.log(`   • ${fileName} (${fileSize} KB)`)
    })
    
    return results
  } catch (error) {
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log(colorize(`\n❌ Parsing failed after ${duration}s`, 'red'))
    console.log(colorize('Error:', 'red'), error.message)
    
    if (error.stack) {
      console.log(colorize('\nStack trace:', 'yellow'))
      console.log(error.stack)
    }
    
    throw error
  }
}

async function main() {
  printHeader()
  
  // Parse command line arguments
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }
  
  const twxPath = args[0]
  const outputDir = args[1] || './output'
  
  console.log(colorize('🔍 Validating inputs...', 'yellow'))
  
  // Validate inputs
  const errors = validateInputs(twxPath, outputDir)
  if (errors.length > 0) {
    console.log(colorize('\n❌ Validation errors:', 'red'))
    errors.forEach(error => console.log(`   • ${error}`))
    console.log()
    printUsage()
    process.exit(1)
  }
  
  try {
    // Find TWX files
    const twxFiles = await findTWXFiles(twxPath)
    
    if (twxFiles.length === 0) {
      console.log(colorize('❌ No TWX files found in the specified path', 'red'))
      process.exit(1)
    }
    
    console.log(colorize(`✅ Found ${twxFiles.length} TWX file(s) to process\n`, 'green'))
    
    // Process each TWX file
    const allResults = []
    for (let i = 0; i < twxFiles.length; i++) {
      const twxFile = twxFiles[i]
      console.log(colorize(`[${i + 1}/${twxFiles.length}]`, 'magenta'))
      
      const fileOutputDir = twxFiles.length > 1 
        ? path.join(outputDir, path.basename(twxFile, '.twx'))
        : outputDir
      
      const results = await parseTWXFile(twxFile, fileOutputDir)
      allResults.push(results)
      
      if (i < twxFiles.length - 1) {
        console.log(colorize('\n' + '─'.repeat(60) + '\n', 'cyan'))
      }
    }
    
    // Final summary
    console.log(colorize('\n🎉 All files processed successfully!', 'green'))
    
    if (twxFiles.length > 1) {
      const totalObjects = allResults.reduce((sum, r) => sum + r.summary.totalObjects, 0)
      const totalFiles = allResults.reduce((sum, r) => sum + r.filesGenerated.length, 0)
      
      console.log(colorize('\n📈 Overall Summary:', 'bright'))
      console.log(`   • TWX Files Processed: ${twxFiles.length}`)
      console.log(`   • Total Objects Extracted: ${totalObjects}`)
      console.log(`   • Total JSON Files Generated: ${totalFiles}`)
    }
    
    console.log(colorize(`\n💡 Next steps:`, 'cyan'))
    console.log(`   • Open twx-viewer.html in your browser to view the results`)
    console.log(`   • JSON files are available in: ${outputDir}`)
    console.log()
    
  } catch (error) {
    console.log(colorize('\n💥 Fatal error occurred:', 'red'))
    console.log(error.message)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log(colorize('\n💥 Uncaught exception:', 'red'))
  console.log(error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.log(colorize('\n💥 Unhandled promise rejection:', 'red'))
  console.log(reason)
  process.exit(1)
})

// Run the main function
if (require.main === module) {
  main()
}

module.exports = { main, parseTWXFile }
