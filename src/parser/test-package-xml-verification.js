/**
 * Test to verify package.xml is being updated correctly
 * Run with: node src/parser/test-package-xml-verification.js
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

async function testPackageXMLUpdate() {
  console.log('🧪 Testing Package.xml Update...\n')
  
  const builder = new BusinessObjectBuilder()
  
  const jsonInput = `{
    "TestBusinessObject": {
      "id": "string",
      "name": "string",
      "isActive": "Boolean"
    }
  }`
  
  // Use the generated TWX file from previous test
  const testTWXPath = path.join(__dirname, '../../temp/complete-implementation-test.twx')
  
  if (!fs.existsSync(testTWXPath)) {
    console.log('❌ Test TWX file not found. Run test-complete-implementation.js first.')
    return
  }
  
  try {
    console.log('📂 Reading generated TWX file...')
    const zip = new ADMZip(fs.readFileSync(testTWXPath))
    const entries = zip.getEntries()
    
    console.log(`TWX file contains ${entries.length} entries:`)
    entries.forEach(entry => {
      console.log(`  - ${entry.entryName}`)
    })
    console.log()
    
    // Check package.xml content
    console.log('📋 Checking package.xml content...')
    const packageEntry = zip.getEntry('package.xml')
    if (packageEntry) {
      const packageXML = packageEntry.getData().toString('utf8')
      console.log('Package.xml content:')
      console.log('=' .repeat(80))
      console.log(packageXML)
      console.log('=' .repeat(80))
      console.log()
      
      // Check if objects are listed
      const objectMatches = packageXML.match(/<object[^>]*>/g) || []
      console.log(`📊 Found ${objectMatches.length} object entries in package.xml:`)
      objectMatches.forEach((match, i) => {
        console.log(`  ${i + 1}. ${match}`)
      })
      console.log()
    } else {
      console.log('❌ package.xml not found in TWX file')
    }
    
    // Check business object files
    console.log('🏗️ Checking business object files...')
    const objectFiles = entries.filter(entry => entry.entryName.startsWith('objects/') && entry.entryName.endsWith('.xml'))
    
    console.log(`Found ${objectFiles.length} business object files:`)
    objectFiles.forEach(file => {
      console.log(`  - ${file.entryName}`)
      
      // Read first few lines of the XML
      const xmlContent = file.getData().toString('utf8')
      const firstLines = xmlContent.split('\n').slice(0, 10).join('\n')
      console.log(`    First 10 lines:`)
      console.log(`    ${firstLines.replace(/\n/g, '\n    ')}`)
      console.log()
    })
    
  } catch (error) {
    console.error('❌ Error reading TWX file:', error.message)
  } finally {
    builder.cleanup()
  }
}

// Run the test
testPackageXMLUpdate().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})