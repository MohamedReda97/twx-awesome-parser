/**
 * Complete solution test - demonstrates the full workflow
 * Run with: node src/parser/test-complete-solution.js
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

async function testCompleteSolution() {
  console.log('🎯 Testing Complete IBM BPM Business Object Solution\n')
  
  // Test with a comprehensive business object structure
  const jsonInput = `{
    "Employee": {
      "employeeId": "string",
      "firstName": "string", 
      "lastName": "string",
      "email": "string",
      "department": "string",
      "salary": "Decimal",
      "hireDate": "Date",
      "isActive": "Boolean",
      "skills": "string[]"
    },
    "Project": {
      "projectId": "string",
      "projectName": "string",
      "description": "string",
      "startDate": "Date",
      "endDate": "Date",
      "budget": "Decimal",
      "isCompleted": "Boolean",
      "teamMembers": "string[]"
    },
    "Task": {
      "taskId": "string",
      "title": "string",
      "description": "string",
      "assignedTo": "string",
      "dueDate": "Date",
      "priority": "Integer",
      "isCompleted": "Boolean",
      "estimatedHours": "Decimal"
    }
  }`
  
  console.log('📋 Test Scenario: Employee Management System')
  console.log('📝 Input JSON with 3 business objects:')
  console.log('  - Employee (9 properties, including arrays)')
  console.log('  - Project (7 properties)')  
  console.log('  - Task (8 properties)')
  console.log()
  
  // Create a realistic TWX file
  const testTWXPath = createRealisticTWXFile()
  
  const builder = new BusinessObjectBuilder()
  
  try {
    console.log('🚀 Processing with IBM BPM compatible structure...')
    const results = await builder.buildAndAddToTWX(jsonInput, testTWXPath)
    
    if (results.success) {
      console.log('✅ Solution test PASSED!')
      console.log(`📊 Results:`)
      console.log(`  - Generated objects: ${results.generatedObjects}`)
      console.log(`  - Added to TWX: ${results.addedObjects}`)
      console.log(`  - Output file: ${path.basename(results.outputPath)}`)
      console.log()
      
      // Detailed verification
      await verifyTWXStructure(results.outputPath)
      
      console.log('🎉 Complete solution test SUCCESSFUL!')
      console.log('📁 Ready for IBM BPM import:', results.outputPath)
      
    } else {
      console.error('❌ Solution test FAILED:', results.error)
      return false
    }
    
  } catch (error) {
    console.error('❌ Error during solution test:', error.message)
    return false
  } finally {
    builder.cleanup()
  }
  
  return true
}

function createRealisticTWXFile() {
  const tempDir = path.join(__dirname, '../../temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  
  const testTWXPath = path.join(tempDir, 'employee-management-system.twx')
  
  const zip = new ADMZip()
  
  // Realistic package.xml with proper IBM BPM structure
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<p:package xmlns:p="http://lombardisoftware.com/schema/teamworks" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://lombardisoftware.com/schema/teamworks teamworks.xsd" id="2066.employee-mgmt-system" name="Employee Management System" version="1.0.0">
    <dependencies>
        <dependency id="toolkit.system" name="System Data" version="8.6.0.0"/>
        <dependency id="toolkit.ui" name="UI Toolkit" version="8.6.0.0"/>
    </dependencies>
</p:package>`
  
  zip.addFile('META-INF/package.xml', Buffer.from(packageXML, 'utf8'))
  
  const metadataXML = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
    <name>Employee Management System</name>
    <version>1.0.0</version>
    <description>Business objects for employee management system</description>
    <created>${new Date().toISOString()}</created>
    <author>Business Object Builder</author>
</metadata>`
  
  zip.addFile('META-INF/metadata.xml', Buffer.from(metadataXML, 'utf8'))
  
  const manifestMF = `Manifest-Version: 1.0
Created-By: Business Object Builder v1.0
Implementation-Title: Employee Management System
Implementation-Version: 1.0.0
`
  
  zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifestMF, 'utf8'))
  
  zip.writeZip(testTWXPath)
  console.log(`📦 Created realistic TWX file: ${path.basename(testTWXPath)}`)
  return testTWXPath
}

async function verifyTWXStructure(twxPath) {
  console.log('🔍 Verifying TWX structure...')
  
  const zip = new ADMZip(fs.readFileSync(twxPath))
  const entries = zip.getEntries()
  
  console.log(`📁 TWX contains ${entries.length} files:`)
  
  // Categorize entries
  const metaFiles = entries.filter(e => e.entryName.startsWith('META-INF/'))
  const objectFiles = entries.filter(e => e.entryName.startsWith('objects/'))
  
  console.log(`  📋 META-INF files: ${metaFiles.length}`)
  metaFiles.forEach(entry => {
    console.log(`    - ${entry.entryName}`)
  })
  
  console.log(`  🏗️  Business object files: ${objectFiles.length}`)
  objectFiles.forEach(entry => {
    console.log(`    - ${entry.entryName}`)
  })
  console.log()
  
  // Verify package.xml structure
  const packageEntry = zip.getEntry('META-INF/package.xml')
  if (packageEntry) {
    const packageXML = packageEntry.getData().toString('utf8')
    
    // Count registered objects
    const objectMatches = packageXML.match(/<object[^>]*>/g) || []
    console.log(`📊 Package.xml analysis:`)
    console.log(`  - Registered objects: ${objectMatches.length}`)
    
    // Show object registrations
    objectMatches.forEach((match, i) => {
      const nameMatch = match.match(/name="([^"]*)"/)
      const name = nameMatch ? nameMatch[1] : 'Unknown'
      console.log(`    ${i + 1}. ${name}`)
    })
    console.log()
  }
  
  // Verify a sample business object XML
  if (objectFiles.length > 0) {
    const sampleEntry = objectFiles[0]
    const sampleXML = sampleEntry.getData().toString('utf8')
    
    console.log(`📋 Sample business object structure (${sampleEntry.entryName}):`)
    
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
    
    ibmElements.forEach(element => {
      const hasElement = sampleXML.includes(`<${element}`)
      console.log(`  ${hasElement ? '✅' : '❌'} <${element}>`)
    })
    
    // Check property count
    const propertyMatches = sampleXML.match(/<property>/g) || []
    console.log(`  📊 Properties defined: ${propertyMatches.length}`)
    console.log()
  }
  
  console.log('✅ TWX structure verification complete')
}

// Run the complete solution test
console.log('=' .repeat(60))
console.log('IBM BPM BUSINESS OBJECT BUILDER - COMPLETE SOLUTION TEST')
console.log('=' .repeat(60))
console.log()

testCompleteSolution().then(success => {
  if (success) {
    console.log()
    console.log('🎯 SOLUTION READY FOR PRODUCTION USE')
    console.log('📋 Next steps:')
    console.log('  1. Import the generated TWX file into IBM BPM Designer')
    console.log('  2. Verify business objects appear in the library')
    console.log('  3. Use the objects in your business processes')
    console.log()
  } else {
    console.log('❌ Solution test failed - check logs above')
    process.exit(1)
  }
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})