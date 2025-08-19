/**
 * Test forensic analysis to identify why business objects don't appear in IBM BPM
 * Run with: node src/parser/test-forensic-analysis.js
 */

const fs = require('fs')
const path = require('path')
const { TWXForensicAnalyzer } = require('./twx-forensic-analyzer')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

async function runForensicAnalysis() {
  console.log('🕵️ Starting Deep Forensic Investigation')
  console.log('🎯 Goal: Identify why business objects don\'t appear in IBM BPM Designer')
  console.log('=' .repeat(70))
  console.log()

  // Paths to files
  const workingExampleDir = path.join(__dirname, '../../TWX example')
  const tempDir = path.join(__dirname, '../../temp')
  
  if (!fs.existsSync(workingExampleDir)) {
    console.error('❌ Working IBM BPM example not found at:', workingExampleDir)
    console.log('Please ensure you have a working IBM BPM TWX example directory for comparison')
    return
  }
  
  // Create a TWX file from the example directory for comparison
  const workingExamplePath = await createTWXFromDirectory(workingExampleDir)

  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  try {
    // 1. Generate a new TWX file with our current implementation
    console.log('🔧 Generating TWX file with current implementation...')
    const generatedTWXPath = await generateTestTWX()
    console.log(`✅ Generated: ${path.basename(generatedTWXPath)}`)
    console.log(`📁 Generated path: ${generatedTWXPath}`)
    console.log(`📁 Working path: ${workingExamplePath}`)
    console.log()

    // 2. Verify files exist before analysis
    console.log('🔍 Verifying files before analysis...')
    console.log(`Working file exists: ${fs.existsSync(workingExamplePath)}`)
    console.log(`Generated file exists: ${fs.existsSync(generatedTWXPath)}`)
    
    if (!fs.existsSync(generatedTWXPath)) {
      console.error('❌ Generated file not found, checking temp directory...')
      const tempFiles = fs.readdirSync(tempDir)
      console.log('Temp directory contents:', tempFiles)
      return
    }
    
    // 2. Perform forensic analysis
    console.log('🔍 Performing forensic analysis...')
    const analyzer = new TWXForensicAnalyzer()
    const report = await analyzer.analyzeFiles(workingExamplePath, generatedTWXPath)
    
    // 3. Print detailed findings
    analyzer.printSummaryReport(report)
    
    // 4. Save detailed report
    const reportPath = path.join(tempDir, 'forensic-analysis-report.json')
    await analyzer.saveReport(report, reportPath)
    
    // 5. Generate specific recommendations
    console.log('🎯 SPECIFIC INVESTIGATION RESULTS:')
    await investigateSpecificIssues(report, workingExamplePath, generatedTWXPath)
    
    console.log('✅ Forensic analysis complete!')
    console.log(`📄 Detailed report saved to: ${reportPath}`)
    
  } catch (error) {
    console.error('❌ Forensic analysis failed:', error.message)
    console.error(error.stack)
  }
}

async function generateTestTWX() {
  const builder = new BusinessObjectBuilder()
  
  // Create a simple test TWX file first
  const testTWXPath = createBaseTWXFile()
  
  // Simple test business object
  const jsonInput = `{
    "TestObject": {
      "id": "string",
      "name": "string",
      "isActive": "Boolean",
      "createdDate": "Date"
    }
  }`
  
  try {
    const results = await builder.buildAndAddToTWX(jsonInput, testTWXPath)
    
    if (results.success) {
      console.log(`📄 Generated TWX result: ${results.outputPath}`)
      
      // Don't cleanup, just return the path
      return results.outputPath
    } else {
      throw new Error(`Failed to generate TWX: ${results.error}`)
    }
  } catch (error) {
    builder.cleanup()
    throw error
  }
  // Note: Not calling cleanup to preserve the file for analysis
}

function createBaseTWXFile() {
  const tempDir = path.join(__dirname, '../../temp')
  const testTWXPath = path.join(tempDir, 'forensic-test.twx')
  
  const ADMZip = require('adm-zip')
  const zip = new ADMZip()
  
  // Create minimal TWX structure
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<p:package xmlns:p="http://lombardisoftware.com/schema/teamworks" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://lombardisoftware.com/schema/teamworks teamworks.xsd" id="2066.forensic-test" name="ForensicTest" version="1.0.0">
    <dependencies>
        <dependency id="toolkit.system" name="System Data" version="8.6.0.0"/>
    </dependencies>
</p:package>`
  
  zip.addFile('META-INF/package.xml', Buffer.from(packageXML, 'utf8'))
  
  const metadataXML = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
    <name>ForensicTest</name>
    <version>1.0.0</version>
    <created>${new Date().toISOString()}</created>
</metadata>`
  
  zip.addFile('META-INF/metadata.xml', Buffer.from(metadataXML, 'utf8'))
  
  const manifestMF = `Manifest-Version: 1.0
Created-By: Forensic Test
`
  
  zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifestMF, 'utf8'))
  
  zip.writeZip(testTWXPath)
  return testTWXPath
}

async function investigateSpecificIssues(report, workingPath, generatedPath) {
  console.log()
  
  // 1. Check for missing files that might be critical
  if (report.analysis.structure.differences.missingInGenerated.length > 0) {
    console.log('🚨 CRITICAL: Missing files detected')
    console.log('Files present in working example but missing in generated:')
    report.analysis.structure.differences.missingInGenerated.forEach(file => {
      console.log(`  ❌ ${file}`)
    })
    console.log()
    
    // Analyze what these missing files contain
    await analyzeMissingFiles(workingPath, report.analysis.structure.differences.missingInGenerated)
  }
  
  // 2. Check for content differences in critical files
  const criticalFiles = ['META-INF/package.xml', 'META-INF/metadata.xml']
  const criticalDifferences = report.analysis.content.differentFiles.filter(diff => 
    criticalFiles.some(critical => diff.file.includes(critical))
  )
  
  if (criticalDifferences.length > 0) {
    console.log('🚨 CRITICAL: Content differences in essential files')
    for (const diff of criticalDifferences) {
      console.log(`📄 ${diff.file}:`)
      console.log(`  Working size: ${diff.workingSize} bytes`)
      console.log(`  Generated size: ${diff.generatedSize} bytes`)
      console.log(`  Size difference: ${Math.abs(diff.workingSize - diff.generatedSize)} bytes`)
      
      if (diff.xmlAnalysis) {
        console.log(`  XML differences:`)
        console.log(`    Missing elements: ${diff.xmlAnalysis.elementDifferences.missingInGenerated.length}`)
        console.log(`    Extra elements: ${diff.xmlAnalysis.elementDifferences.extraInGenerated.length}`)
      }
    }
    console.log()
  }
  
  // 3. Analyze business object files specifically
  const businessObjectDiffs = report.analysis.content.differentFiles.filter(diff => 
    diff.file.startsWith('objects/') && diff.file.endsWith('.xml')
  )
  
  if (businessObjectDiffs.length > 0) {
    console.log('🔍 Business object XML differences detected')
    for (const diff of businessObjectDiffs) {
      console.log(`📄 ${diff.file}:`)
      if (diff.xmlAnalysis) {
        console.log(`  Missing elements in generated: ${diff.xmlAnalysis.elementDifferences.missingInGenerated.join(', ')}`)
        console.log(`  Extra elements in generated: ${diff.xmlAnalysis.elementDifferences.extraInGenerated.join(', ')}`)
      }
    }
    console.log()
  }
  
  // 4. Check for structural issues
  const workingStructure = report.analysis.structure.working
  const generatedStructure = report.analysis.structure.generated
  
  console.log('📊 STRUCTURAL COMPARISON:')
  console.log(`  Working TWX: ${workingStructure.totalEntries} entries, ${workingStructure.files} files`)
  console.log(`  Generated TWX: ${generatedStructure.totalEntries} entries, ${generatedStructure.files} files`)
  console.log(`  Entry difference: ${Math.abs(workingStructure.totalEntries - generatedStructure.totalEntries)}`)
  console.log()
  
  // 5. Provide specific next steps
  console.log('🎯 RECOMMENDED NEXT STEPS:')
  
  if (report.analysis.structure.differences.missingInGenerated.length > 0) {
    console.log('  1. 🔥 HIGH PRIORITY: Add missing files to generated TWX')
    console.log('     These files may contain critical IBM BPM metadata')
  }
  
  if (criticalDifferences.length > 0) {
    console.log('  2. 🔥 HIGH PRIORITY: Fix content differences in package.xml and metadata.xml')
    console.log('     These files control how IBM BPM recognizes and loads objects')
  }
  
  if (businessObjectDiffs.length > 0) {
    console.log('  3. ⚠️  MEDIUM PRIORITY: Fix business object XML structure')
    console.log('     Ensure all required elements and attributes are present')
  }
  
  console.log('  4. 💡 INVESTIGATION: Examine IBM BPM logs during import')
  console.log('     Check for specific error messages or validation failures')
  console.log()
}

async function analyzeMissingFiles(workingPath, missingFiles) {
  console.log('🔍 Analyzing missing files...')
  
  const ADMZip = require('adm-zip')
  const workingZip = new ADMZip(fs.readFileSync(workingPath))
  
  for (const fileName of missingFiles) {
    const entry = workingZip.getEntry(fileName)
    if (entry && !entry.isDirectory) {
      const content = entry.getData()
      console.log(`📄 ${fileName}:`)
      console.log(`  Size: ${content.length} bytes`)
      
      if (fileName.endsWith('.xml')) {
        const xmlContent = content.toString('utf8')
        console.log(`  Type: XML file`)
        console.log(`  Root element: ${extractRootElement(xmlContent)}`)
        
        // Show first few lines
        const lines = xmlContent.split('\n').slice(0, 3)
        console.log(`  Preview:`)
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`    ${line.trim().substring(0, 60)}${line.trim().length > 60 ? '...' : ''}`)
          }
        })
      } else {
        console.log(`  Type: ${path.extname(fileName) || 'Unknown'}`)
      }
      console.log()
    }
  }
}

function extractRootElement(xmlContent) {
  const match = xmlContent.match(/<(\w+)/)
  return match ? match[1] : 'Unknown'
}

async function createTWXFromDirectory(dirPath) {
  console.log('📦 Creating TWX file from example directory...')
  
  const ADMZip = require('adm-zip')
  const zip = new ADMZip()
  
  // Recursively add all files from the directory
  function addDirectoryToZip(currentPath, zipPath = '') {
    const items = fs.readdirSync(currentPath)
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item)
      const zipEntryPath = zipPath ? path.join(zipPath, item).replace(/\\/g, '/') : item
      
      if (fs.statSync(fullPath).isDirectory()) {
        addDirectoryToZip(fullPath, zipEntryPath)
      } else {
        const content = fs.readFileSync(fullPath)
        zip.addFile(zipEntryPath, content)
      }
    }
  }
  
  addDirectoryToZip(dirPath)
  
  const tempDir = path.join(__dirname, '../../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  const twxPath = path.join(tempDir, 'working-example.twx')
  zip.writeZip(twxPath)
  
  console.log(`✅ Created working example TWX: ${path.basename(twxPath)}`)
  return twxPath
}

// Run the forensic analysis
runForensicAnalysis().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})