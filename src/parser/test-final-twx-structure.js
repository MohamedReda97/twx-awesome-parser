/**
 * Final test to create a TWX file with the updated structure
 * Run with: node src/parser/test-final-twx-structure.js
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

async function testFinalTWXStructure() {
  console.log('🧪 Testing Final TWX Structure...\n')
  
  // Create a TWX file with real IBM BPM structure
  const testTWXPath = createRealTWXFile()
  
  const builder = new BusinessObjectBuilder()
  
  const jsonInput = `{
    "CustomerData": {
      "customerId": "string",
      "customerName": "string",
      "email": "string",
      "isActive": "Boolean",
      "registrationDate": "Date"
    },
    "OrderData": {
      "orderId": "string",
      "orderDate": "Date",
      "totalAmount": "Decimal",
      "isCompleted": "Boolean"
    }
  }`
  
  console.log('📝 Input JSON:')
  console.log(jsonInput)
  console.log()
  
  try {
    console.log('🚀 Running with final TWX structure...')
    const results = await builder.buildAndAddToTWX(jsonInput, testTWXPath)
    
    if (results.success) {
      console.log('✅ Final structure test succeeded!')
      console.log(`  Generated: ${results.generatedObjects}`)
      console.log(`  Added to TWX: ${results.addedObjects}`)
      console.log()
      
      // Verify the results
      console.log('🔍 Verifying results...')
      const zip = new ADMZip(fs.readFileSync(results.outputPath))
      const entries = zip.getEntries()
      
      console.log(`TWX file contains ${entries.length} entries:`)
      entries.forEach(entry => {
        console.log(`  - ${entry.entryName}`)
      })
      console.log()
      
      // Check package.xml
      const packageEntry = zip.getEntry('META-INF/package.xml')
      if (packageEntry) {
        const packageXML = packageEntry.getData().toString('utf8')
        
        // Look for object entries
        const objectMatches = packageXML.match(/<object[^>]*>/g) || []
        console.log(`📊 Found ${objectMatches.length} object entries in package.xml:`)
        objectMatches.forEach((match, i) => {
          console.log(`  ${i + 1}. ${match}`)
        })
        console.log()
        
        // Show the objects section
        const objectsStart = packageXML.indexOf('<objects>')
        const objectsEnd = packageXML.indexOf('</objects>') + '</objects>'.length
        if (objectsStart !== -1 && objectsEnd !== -1) {
          const objectsSection = packageXML.substring(objectsStart, objectsEnd)
          console.log('📋 Objects section in package.xml:')
          console.log(objectsSection)
          console.log()
        }
      }
      
      // Check one of the generated business object XML files
      const objectEntries = entries.filter(entry => entry.entryName.startsWith('objects/') && entry.entryName.endsWith('.xml'))
      if (objectEntries.length > 0) {
        const firstObjectEntry = objectEntries[0]
        const objectXML = firstObjectEntry.getData().toString('utf8')
        
        console.log(`📋 Sample business object XML (${firstObjectEntry.entryName}):`)
        console.log(objectXML.substring(0, 500) + (objectXML.length > 500 ? '...' : ''))
        console.log()
        
        // Verify key elements are present
        const keyElements = ['teamworks', 'twClass', 'jsonData', 'definition', 'property', 'classRef']
        console.log('🔍 Verifying key XML elements:')
        keyElements.forEach(element => {
          const hasElement = objectXML.includes(`<${element}`)
          console.log(`  ${hasElement ? '✅' : '❌'} <${element}>`)
        })
        console.log()
      }
      
      console.log(`📁 Final TWX file saved to: ${results.outputPath}`)
      console.log('🎉 Test completed successfully!')
      
    } else {
      console.error('❌ Test failed:', results.error)
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message)
    console.error(error.stack)
  } finally {
    builder.cleanup()
  }
}

function createRealTWXFile() {
  // Create a minimal TWX file with proper IBM BPM structure
  const tempDir = path.join(__dirname, '../../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  const testTWXPath = path.join(tempDir, 'test-final-structure.twx')
  
  // Create a proper TWX file structure
  const zip = new ADMZip()
  
  // Add META-INF/package.xml with proper IBM BPM structure
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<p:package xmlns:p="http://lombardisoftware.com/schema/teamworks" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://lombardisoftware.com/schema/teamworks teamworks.xsd" id="2066.ac303e4d-473d-47d0-8c50-2337baf99edf" name="TestProject" version="2066.ac303e4d-473d-47d0-8c50-2337baf99edf">
    <dependencies>
        <dependency id="toolkit.system" name="System Data" version="8.6.0.0"/>
    </dependencies>
</p:package>`
  
  zip.addFile('META-INF/package.xml', Buffer.from(packageXML, 'utf8'))
  
  // Add META-INF/metadata.xml
  const metadataXML = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
    <name>TestProject</name>
    <version>2066.ac303e4d-473d-47d0-8c50-2337baf99edf</version>
    <created>2024-01-01T00:00:00.000Z</created>
</metadata>`
  
  zip.addFile('META-INF/metadata.xml', Buffer.from(metadataXML, 'utf8'))
  
  // Add META-INF/MANIFEST.MF
  const manifestMF = `Manifest-Version: 1.0
Created-By: Business Object Builder
`
  
  zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifestMF, 'utf8'))
  
  // Write the TWX file
  zip.writeZip(testTWXPath)
  
  console.log(`📦 Created test TWX file: ${testTWXPath}`)
  return testTWXPath
}

// Run the test
testFinalTWXStructure().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})