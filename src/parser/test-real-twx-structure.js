/**
 * Test with real IBM BPM TWX structure
 * Run with: node src/parser/test-real-twx-structure.js
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

// Create a TWX file with real IBM BPM structure
function createRealTWXFile() {
  const testTWXPath = path.join(__dirname, '../../temp/real-structure-test.twx')
  
  // Ensure temp directory exists
  const tempDir = path.dirname(testTWXPath)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const zip = new ADMZip()
  
  // Create package.xml with real IBM BPM structure
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<p:package buildId="BPM8600-20211214-184954" buildVersion="8.6.3" buildDescription="IBM Business Process Manager V8.6.3.21030 - 20211214_2112 - BPM8600-20211214-184954" fixPack="21030" containsECM="false" containsBPMN2="false" xmlns:p="http://lombardisoftware.com/schema/teamworks/7.0.0/package.xsd">
    <target>
        <project id="2066.ac303e4d-473d-47d0-8c50-2337baf99edf" name="Test Project" description="" shortName="TESTPROJ" isToolkit="false" isHidden="false" isSystem="false" solutionID="" solutionServerName="" solutionPrefix="" type="" isTemplate="false" isIconSet="false"/>
        <branch id="2063.be263739-2390-4bdc-9654-7b1c99f9fa73" name="Main" acronym="Main" description=""/>
        <snapshot id="2064.712d7eff-cd2c-4ccf-bc3b-f6db9d6589b6" name="Test_v1" acronym="TESTV1" originalCreationDate="2025-01-20T12:00:00.000+03:00" description="Test snapshot"/>
    </target>
    <governanceAssignments/>
    <dependencies>
        <dependency rank="0" isManaged="false" id="2069.b5a7448c-61c1-4e1e-9933-3912eb5c29ad">
            <project id="2066.1b351583-e5cb-43b7-baee-340a63130ea7" name="System Data" shortName="TWSYS" isToolkit="true" isHidden="false" isSystem="true"/>
            <branch id="2063.0798815e-0346-4ef4-8946-ab4301c9f340" name="Main"/>
            <snapshot id="2064.1080ded6-d153-4654-947c-2d16fce170ed" name="8.6.0.0" originalCreationDate="2015-08-25T02:00:00.000+03:00"/>
        </dependency>
    </dependencies>
    <objects>
    </objects>
</p:package>`

  // Create metadata.xml
  const metadataXML = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
</metadata>`

  // Create MANIFEST.MF
  const manifestMF = `Manifest-Version: 1.0
Created-By: IBM Business Process Manager
`

  zip.addFile('META-INF/package.xml', Buffer.from(packageXML, 'utf8'))
  zip.addFile('META-INF/metadata.xml', Buffer.from(metadataXML, 'utf8'))
  zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifestMF, 'utf8'))
  
  fs.writeFileSync(testTWXPath, zip.toBuffer())
  
  return testTWXPath
}

async function testRealTWXStructure() {
  console.log('🧪 Testing Real IBM BPM TWX Structure...\n')
  
  const builder = new BusinessObjectBuilder()
  const testTWXPath = createRealTWXFile()
  
  const jsonInput = `{
    "CustomerData": {
      "customerId": "string",
      "customerName": "string",
      "email": "string",
      "isActive": "Boolean",
      "registrationDate": "Date"
    }
  }`
  
  console.log('📝 Input JSON:')
  console.log(jsonInput)
  console.log()
  
  try {
    console.log('🚀 Running with real TWX structure...')
    const results = await builder.buildAndAddToTWX(jsonInput, testTWXPath)
    
    if (results.success) {
      console.log('✅ Real structure test succeeded!')
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
      
      // Check metadata.xml
      const metadataEntry = zip.getEntry('META-INF/metadata.xml')
      if (metadataEntry) {
        const metadataXML = metadataEntry.getData().toString('utf8')
        console.log('📋 Metadata.xml content:')
        console.log(metadataXML)
        console.log()
      }
      
      // Check business object file
      const objectFiles = entries.filter(entry => entry.entryName.startsWith('objects/') && entry.entryName.endsWith('.xml'))
      if (objectFiles.length > 0) {
        const objectFile = objectFiles[0]
        const xmlContent = objectFile.getData().toString('utf8')
        
        console.log(`📄 Business object file: ${objectFile.entryName}`)
        console.log('First 20 lines:')
        const lines = xmlContent.split('\n').slice(0, 20)
        lines.forEach((line, i) => {
          console.log(`${String(i + 1).padStart(2)}: ${line}`)
        })
        console.log()
      }
      
    } else {
      console.error('❌ Real structure test failed:', results.error)
      if (results.errors && results.errors.length > 0) {
        console.error('Errors:')
        results.errors.forEach((error, i) => {
          console.error(`  ${i + 1}. ${error}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error.stack)
  } finally {
    builder.cleanup()
  }
}

// Run the test
testRealTWXStructure().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})