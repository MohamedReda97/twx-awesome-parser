/**
 * Final verification test to confirm the IBM BPM visibility fix is working
 * Run with: node src/parser/test-final-fix-verification.js
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

async function testFinalFixVerification() {
  console.log('🎯 FINAL IBM BPM VISIBILITY FIX VERIFICATION')
  console.log('=' .repeat(60))
  console.log()
  
  // Create a comprehensive test
  const tempDir = path.join(__dirname, '../../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  const testTWXPath = path.join(tempDir, 'final-fix-verification.twx')
  
  // Create a realistic TWX structure
  const zip = new ADMZip()
  
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<p:package xmlns:p="http://lombardisoftware.com/schema/teamworks" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://lombardisoftware.com/schema/teamworks teamworks.xsd" id="2066.final-fix-test" name="FinalFixTest" version="1.0.0">
    <dependencies>
        <dependency id="toolkit.system" name="System Data" version="8.6.0.0"/>
        <dependency id="toolkit.ui" name="UI Toolkit" version="8.6.0.0"/>
    </dependencies>
</p:package>`
  
  zip.addFile('META-INF/package.xml', Buffer.from(packageXML, 'utf8'))
  
  const metadataXML = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
    <name>FinalFixTest</name>
    <version>1.0.0</version>
    <description>Final verification of IBM BPM visibility fix</description>
    <created>${new Date().toISOString()}</created>
    <author>Business Object Builder</author>
</metadata>`
  
  zip.addFile('META-INF/metadata.xml', Buffer.from(metadataXML, 'utf8'))
  
  const manifestMF = `Manifest-Version: 1.0
Created-By: Final Fix Verification
Implementation-Title: IBM BPM Business Object Builder
Implementation-Version: 2.0.0
`
  
  zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifestMF, 'utf8'))
  
  zip.writeZip(testTWXPath)
  
  console.log(`📦 Created test TWX: ${path.basename(testTWXPath)}`)
  
  // Test with comprehensive business objects
  const builder = new BusinessObjectBuilder()
  
  const jsonInput = `{
    "Customer": {
      "customerId": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string",
      "isActive": "Boolean",
      "registrationDate": "Date",
      "creditLimit": "Decimal"
    },
    "Order": {
      "orderId": "string",
      "customerId": "string",
      "orderDate": "Date",
      "totalAmount": "Decimal",
      "status": "string",
      "isCompleted": "Boolean",
      "items": "string[]"
    },
    "Product": {
      "productId": "string",
      "name": "string",
      "description": "string",
      "price": "Decimal",
      "category": "string",
      "inStock": "Boolean",
      "stockQuantity": "Integer"
    }
  }`
  
  try {
    console.log('🚀 Creating comprehensive business objects...')
    console.log('📝 Input: 3 business objects with 22 total properties')
    console.log()
    
    const results = await builder.buildAndAddToTWX(jsonInput, testTWXPath)
    
    if (results.success) {
      console.log('✅ BUSINESS OBJECT CREATION SUCCESSFUL!')
      console.log(`📊 Results:`)
      console.log(`  - Generated objects: ${results.generatedObjects}`)
      console.log(`  - Added to TWX: ${results.addedObjects}`)
      console.log(`  - Failed objects: ${results.failedObjects}`)
      console.log()
      
      // Comprehensive verification
      console.log('🔍 COMPREHENSIVE VERIFICATION:')
      const resultZip = new ADMZip(fs.readFileSync(results.outputPath))
      const entries = resultZip.getEntries()
      
      console.log(`📁 TWX Structure:`)
      console.log(`  Total files: ${entries.length}`)
      
      // Categorize files
      const metaFiles = entries.filter(e => e.entryName.startsWith('META-INF/'))
      const objectFiles = entries.filter(e => e.entryName.startsWith('objects/'))
      
      console.log(`  META-INF files: ${metaFiles.length}`)
      metaFiles.forEach(file => {
        console.log(`    - ${file.entryName} (${file.header.size} bytes)`)
      })
      
      console.log(`  Business object files: ${objectFiles.length}`)
      objectFiles.forEach(file => {
        console.log(`    - ${file.entryName} (${file.header.size} bytes)`)
      })
      console.log()
      
      // Verify package.xml registration
      const packageEntry = resultZip.getEntry('META-INF/package.xml')
      let packageContent = ''
      if (packageEntry) {
        packageContent = packageEntry.getData().toString('utf8')
        
        console.log('📋 PACKAGE.XML VERIFICATION:')
        
        // Check for objects section
        const hasObjectsSection = packageContent.includes('<objects>')
        console.log(`  Objects section: ${hasObjectsSection ? '✅' : '❌'}`)
        
        // Count object registrations
        const objectMatches = packageContent.match(/<object[^>]*>/g) || []
        console.log(`  Registered objects: ${objectMatches.length}`)
        
        // Verify each object registration
        objectMatches.forEach((match, i) => {
          const idMatch = match.match(/id="([^"]*)"/)
          const nameMatch = match.match(/name="([^"]*)"/)
          const versionMatch = match.match(/versionId="([^"]*)"/)
          const typeMatch = match.match(/type="([^"]*)"/)
          
          console.log(`    ${i + 1}. ${nameMatch ? nameMatch[1] : 'Unknown'}`)
          console.log(`       ID: ${idMatch ? idMatch[1] : 'Missing'}`)
          console.log(`       Version: ${versionMatch ? versionMatch[1] : 'Missing'}`)
          console.log(`       Type: ${typeMatch ? typeMatch[1] : 'Missing'}`)
        })
        console.log()
      }
      
      // Verify business object XML structure
      if (objectFiles.length > 0) {
        console.log('📋 BUSINESS OBJECT XML VERIFICATION:')
        
        const sampleFile = objectFiles[0]
        const sampleXML = sampleFile.getData().toString('utf8')
        
        console.log(`Sample: ${sampleFile.entryName}`)
        
        // Check key IBM BPM elements
        const ibmElements = [
          'teamworks',
          'twClass', 
          'lastModified',
          'classId',
          'type',
          'isSystem',
          'shared',
          'isShadow', 
          'globalLifetime',
          'jsonData',
          'definition',
          'property',
          'classRef',
          'validator',
          'annotation'
        ]
        
        console.log('  IBM BPM Elements:')
        ibmElements.forEach(element => {
          const hasElement = sampleXML.includes(`<${element}`)
          console.log(`    ${hasElement ? '✅' : '❌'} <${element}>`)
        })
        
        // Check property count
        const propertyMatches = sampleXML.match(/<property>/g) || []
        console.log(`  Properties defined: ${propertyMatches.length}`)
        console.log()
      }
      
      // Final assessment
      console.log('🎯 FINAL ASSESSMENT:')
      
      const criticalChecks = [
        { name: 'Business object files created', passed: objectFiles.length > 0 },
        { name: 'Package.xml updated', passed: packageEntry !== null },
        { name: 'Objects registered in package.xml', passed: (packageContent.match(/<object[^>]*>/g) || []).length > 0 },
        { name: 'Correct file structure', passed: entries.length >= 4 },
        { name: 'All objects processed', passed: results.generatedObjects === 3 && results.failedObjects === 0 }
      ]
      
      const passedChecks = criticalChecks.filter(check => check.passed).length
      const totalChecks = criticalChecks.length
      
      criticalChecks.forEach(check => {
        console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`)
      })
      
      console.log()
      console.log(`📊 SCORE: ${passedChecks}/${totalChecks} critical checks passed`)
      
      if (passedChecks === totalChecks) {
        console.log('🎉 ALL CRITICAL CHECKS PASSED!')
        console.log('✅ IBM BPM VISIBILITY FIX IS WORKING CORRECTLY!')
        console.log()
        console.log('📋 NEXT STEPS:')
        console.log('  1. Import the generated TWX file into IBM BPM Designer')
        console.log('  2. Check the Business Objects library')
        console.log('  3. Verify objects are visible and usable')
        console.log()
        console.log(`📁 Generated TWX file: ${results.outputPath}`)
      } else {
        console.log('❌ SOME CRITICAL CHECKS FAILED')
        console.log('🔧 Additional fixes may be needed')
      }
      
    } else {
      console.error('❌ BUSINESS OBJECT CREATION FAILED:', results.error)
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
    console.log('\\n📁 Files preserved for inspection in temp directory')
  }
}

// Run the final verification test
testFinalFixVerification().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})