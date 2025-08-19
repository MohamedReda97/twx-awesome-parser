/**
 * Simple test to verify business object creation is working
 * Run with: node src/parser/test-business-object-creation.js
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

async function testBusinessObjectCreation() {
  console.log('🧪 Testing Business Object Creation...\n')
  
  // Create a simple test TWX file
  const tempDir = path.join(__dirname, '../../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  const testTWXPath = path.join(tempDir, 'test-creation.twx')
  
  // Create minimal TWX structure
  const zip = new ADMZip()
  
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<p:package xmlns:p="http://lombardisoftware.com/schema/teamworks" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://lombardisoftware.com/schema/teamworks teamworks.xsd" id="2066.test-creation" name="TestCreation" version="1.0.0">
    <dependencies>
        <dependency id="toolkit.system" name="System Data" version="8.6.0.0"/>
    </dependencies>
</p:package>`
  
  zip.addFile('META-INF/package.xml', Buffer.from(packageXML, 'utf8'))
  
  const metadataXML = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
    <name>TestCreation</name>
    <version>1.0.0</version>
    <created>${new Date().toISOString()}</created>
</metadata>`
  
  zip.addFile('META-INF/metadata.xml', Buffer.from(metadataXML, 'utf8'))
  
  const manifestMF = `Manifest-Version: 1.0
Created-By: Test
`
  
  zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifestMF, 'utf8'))
  
  zip.writeZip(testTWXPath)
  
  console.log(`📦 Created test TWX: ${path.basename(testTWXPath)}`)
  
  // Test business object creation
  const builder = new BusinessObjectBuilder()
  
  const jsonInput = `{
    "SimpleTest": {
      "id": "string",
      "name": "string",
      "isActive": "Boolean"
    }
  }`
  
  try {
    console.log('🚀 Creating business object...')
    const results = await builder.buildAndAddToTWX(jsonInput, testTWXPath)
    
    if (results.success) {
      console.log('✅ Business object creation succeeded!')
      console.log(`  Generated: ${results.generatedObjects}`)
      console.log(`  Added: ${results.addedObjects}`)
      
      // Verify the TWX file contents
      console.log('\\n🔍 Verifying TWX contents...')
      const resultZip = new ADMZip(fs.readFileSync(results.outputPath))
      const entries = resultZip.getEntries()
      
      console.log(`📁 TWX contains ${entries.length} files:`)
      entries.forEach(entry => {
        console.log(`  - ${entry.entryName} (${entry.header.size} bytes)`)
      })
      
      // Check for business object files
      const objectFiles = entries.filter(e => e.entryName.startsWith('objects/'))
      console.log(`\\n📊 Business object files: ${objectFiles.length}`)
      
      if (objectFiles.length > 0) {
        console.log('✅ Business object files created successfully!')
        objectFiles.forEach(file => {
          console.log(`  📄 ${file.entryName}`)
        })
      } else {
        console.log('❌ No business object files found!')
      }
      
      // Check package.xml
      const packageEntry = resultZip.getEntry('META-INF/package.xml')
      if (packageEntry) {
        const packageContent = packageEntry.getData().toString('utf8')
        console.log('\\n📋 Package.xml content:')
        console.log(packageContent)
        
        // Check for object registration
        const hasObjects = packageContent.includes('<objects>')
        const hasObjectEntry = packageContent.includes('<object')
        console.log(`\\n📊 Package.xml analysis:`)
        console.log(`  Objects section: ${hasObjects ? '✅' : '❌'}`)
        console.log(`  Object entries: ${hasObjectEntry ? '✅' : '❌'}`)
      }
      
    } else {
      console.error('❌ Business object creation failed:', results.error)
      if (results.errors && results.errors.length > 0) {
        console.log('Errors:')
        results.errors.forEach(error => console.log(`  - ${error}`))
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  } finally {
    // Don't cleanup to preserve files for inspection
    console.log('\\n📁 Files preserved for inspection')
  }
}

// Run the test
testBusinessObjectCreation().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})