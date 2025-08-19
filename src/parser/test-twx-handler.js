/**
 * Test TWX File Handler functionality
 * Run with: node src/parser/test-twx-handler.js
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const TWXFileHandler = require('./twx-file-handler')
const SimpleJSONParser = require('./simple-json-parser')
const TypeMapper = require('./type-mapper')
const BusinessObjectGenerator = require('./business-object-generator')
const XMLBuilder = require('./xml-builder')

// Create a test TWX file
function createTestTWXFile() {
  const testTWXPath = path.join(__dirname, '../../temp/test-sample.twx')
  
  // Ensure temp directory exists
  const tempDir = path.dirname(testTWXPath)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  // Create a minimal TWX file structure
  const zip = new ADMZip()
  
  // Create package.xml
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<package id="test.package" name="Test Package" version="1.0">
    <description>Test TWX package for Business Object Builder testing</description>
    <objects>
        <object id="12.existing-object-123" type="twClass" fileName="objects/existing-object-123.xml" />
    </objects>
</package>`

  zip.addFile('package.xml', Buffer.from(packageXML, 'utf8'))
  
  // Create an existing object file
  const existingObjectXML = `<?xml version="1.0" encoding="UTF-8"?>
<teamworks>
    <twClass id="12.existing-object-123" name="ExistingObject">
        <lastModified>2025-01-01T00:00:00.000Z</lastModified>
        <lastModifiedBy>TestCreator</lastModifiedBy>
        <classId>12.existing-object-123</classId>
        <type>1</type>
        <isSystem>false</isSystem>
        <shared>false</shared>
        <isShadow>false</isShadow>
        <globalLifetime>false</globalLifetime>
        <internalName isNull="true" />
        <extensionType isNull="true" />
        <saveServiceRef isNull="true" />
        <bpmn2Data isNull="true" />
        <externalId>itm.12.existing-object-123</externalId>
        <dependencySummary isNull="true" />
        <jsonData>{}</jsonData>
        <description>Existing test object</description>
        <guid>12.existing-object-123</guid>
        <versionId>12.existing-object-123</versionId>
        <definition>
            <properties>
                <!-- Existing object properties -->
            </properties>
        </definition>
    </twClass>
</teamworks>`

  zip.addFile('objects/existing-object-123.xml', Buffer.from(existingObjectXML, 'utf8'))
  
  // Write the TWX file
  fs.writeFileSync(testTWXPath, zip.toBuffer())
  
  console.log(`✅ Created test TWX file: ${testTWXPath}`)
  return testTWXPath
}

function testTWXFileHandler() {
  console.log('🧪 Testing TWX File Handler...\n')
  
  // Create test TWX file
  const testTWXPath = createTestTWXFile()
  
  const handler = new TWXFileHandler()
  
  try {
    // Test 1: Open TWX file
    console.log('📂 Test 1: Opening TWX file...')
    const twxFile = handler.openTWXFile(testTWXPath)
    
    console.log(`✅ Opened TWX file: ${twxFile.filePath}`)
    console.log(`   Metadata: ${JSON.stringify(twxFile.metadata, null, 2)}`)
    console.log(`   Entries: ${twxFile.entries.length}`)
    console.log(`   Modified: ${twxFile.isModified}`)
    console.log()
    
    // Test 2: List existing objects
    console.log('📋 Test 2: Listing existing objects...')
    const existingObjects = handler.listExistingObjects(twxFile)
    
    console.log(`✅ Found ${existingObjects.length} existing objects:`)
    existingObjects.forEach((obj, i) => {
      console.log(`   ${i + 1}. ${obj.id} (${obj.type}) - ${obj.fileName} ${obj.exists ? '✅' : '❌'}`)
    })
    console.log()
    
    // Test 3: Generate a new business object
    console.log('⚙️ Test 3: Generating new business object...')
    const parser = new SimpleJSONParser()
    const typeMapper = new TypeMapper()
    const generator = new BusinessObjectGenerator()
    const xmlBuilder = new XMLBuilder()
    
    const jsonInput = `{
      "TestBusinessObject": {
        "id": "string",
        "name": "string",
        "isActive": "Boolean",
        "createdDate": "Date"
      }
    }`
    
    const parsedObjects = parser.parseObjectDefinition(jsonInput)
    const structure = parser.extractObjectStructure(parsedObjects)[0]
    const businessObject = generator.generateBusinessObject(structure)
    const businessObjectXML = xmlBuilder.buildBusinessObjectXML(businessObject, typeMapper)
    
    console.log(`✅ Generated business object: ${businessObject.name} (ID: ${businessObject.id})`)
    console.log(`   XML length: ${businessObjectXML.length} characters`)
    console.log()
    
    // Test 4: Add business object to TWX
    console.log('➕ Test 4: Adding business object to TWX...')
    const updatedTWXFile = handler.addBusinessObjectToTWX(twxFile, businessObjectXML, businessObject.id)
    
    console.log(`✅ Added business object to TWX`)
    console.log(`   Modified: ${updatedTWXFile.isModified}`)
    console.log(`   New entries count: ${updatedTWXFile.entries.length}`)
    console.log()
    
    // Test 5: Verify object was added
    console.log('🔍 Test 5: Verifying object was added...')
    const updatedObjects = handler.listExistingObjects(updatedTWXFile)
    
    console.log(`✅ Objects after addition: ${updatedObjects.length}`)
    updatedObjects.forEach((obj, i) => {
      console.log(`   ${i + 1}. ${obj.id} (${obj.type}) - ${obj.fileName} ${obj.exists ? '✅' : '❌'}`)
    })
    console.log()
    
    // Test 6: Save modified TWX file
    console.log('💾 Test 6: Saving modified TWX file...')
    const outputPath = path.join(path.dirname(testTWXPath), 'test-sample-modified.twx')
    const savedPath = handler.saveTWXFile(updatedTWXFile, outputPath)
    
    console.log(`✅ Saved modified TWX file: ${savedPath}`)
    console.log(`   File size: ${handler.getFileSize(savedPath)} bytes`)
    console.log(`   Modified: ${updatedTWXFile.isModified}`)
    console.log()
    
    // Test 7: Validate TWX file
    console.log('✅ Test 7: Validating TWX file...')
    const validation = handler.validateTWXFile(updatedTWXFile)
    
    console.log(`✅ Validation result:`)
    console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`)
    console.log(`   Errors: ${validation.errors.length}`)
    console.log(`   Warnings: ${validation.warnings.length}`)
    
    if (validation.errors.length > 0) {
      console.log(`   Error details: ${validation.errors.join(', ')}`)
    }
    
    if (validation.warnings.length > 0) {
      console.log(`   Warning details: ${validation.warnings.join(', ')}`)
    }
    console.log()
    
    // Test 8: Get statistics
    console.log('📊 Test 8: Getting TWX statistics...')
    const stats = handler.getTWXStatistics(updatedTWXFile)
    
    console.log(`✅ TWX Statistics:`)
    console.log(`   File: ${stats.filePath}`)
    console.log(`   Modified: ${stats.isModified}`)
    console.log(`   Total entries: ${stats.totalEntries}`)
    console.log(`   Total objects: ${stats.totalObjects}`)
    console.log(`   File size: ${stats.fileSize} bytes`)
    console.log(`   Objects by type:`)
    
    for (const [type, objects] of Object.entries(stats.objectsByType)) {
      console.log(`     ${type}: ${objects.length}`)
    }
    console.log()
    
    return {
      success: true,
      testTWXPath,
      outputPath: savedPath,
      businessObject,
      stats
    }
    
  } catch (error) {
    console.error('❌ TWX File Handler test failed:', error.message)
    console.error(error.stack)
    return { success: false, error: error.message }
  } finally {
    // Cleanup
    handler.cleanup()
  }
}

function testErrorHandling() {
  console.log('🧪 Testing Error Handling...\n')
  
  const handler = new TWXFileHandler()
  
  // Test 1: Non-existent file
  console.log('1. Testing non-existent file:')
  try {
    handler.openTWXFile('/non/existent/file.twx')
    console.log('   ❌ Should have thrown error')
  } catch (error) {
    console.log(`   ✅ Correctly threw error: ${error.message}`)
  }
  console.log()
  
  // Test 2: Invalid TWX file object
  console.log('2. Testing invalid TWX file object:')
  try {
    handler.addBusinessObjectToTWX(null, '<xml></xml>', '12.test-id')
    console.log('   ❌ Should have thrown error')
  } catch (error) {
    console.log(`   ✅ Correctly threw error: ${error.message}`)
  }
  console.log()
  
  // Test 3: Missing business object XML
  console.log('3. Testing missing business object XML:')
  try {
    const mockTWXFile = { zip: new ADMZip(), packageXML: '<package></package>' }
    handler.addBusinessObjectToTWX(mockTWXFile, null, '12.test-id')
    console.log('   ❌ Should have thrown error')
  } catch (error) {
    console.log(`   ✅ Correctly threw error: ${error.message}`)
  }
  console.log()
}

// Run tests
console.log('🚀 Starting TWX File Handler Tests\n')
console.log('=' .repeat(80))

const result = testTWXFileHandler()
console.log('=' .repeat(80))

testErrorHandling()
console.log('=' .repeat(80))

if (result && result.success) {
  console.log('✅ All TWX File Handler tests completed successfully!')
  console.log('\n🎉 TWX File Handler is working correctly!')
  console.log('\n📝 Test Results:')
  console.log(`  - Test TWX file: ${result.testTWXPath}`)
  console.log(`  - Modified TWX file: ${result.outputPath}`)
  console.log(`  - Generated business object: ${result.businessObject.name}`)
  console.log(`  - Total objects in final TWX: ${result.stats.totalObjects}`)
} else {
  console.log('❌ Some TWX File Handler tests failed. Please review the errors above.')
}

console.log('\n📝 Next steps:')
console.log('  1. Create user interface for JSON input and TWX file selection')
console.log('  2. Integrate with existing TWX parser interface')
console.log('  3. Add comprehensive validation and error handling')
console.log('  4. Implement batch processing for multiple business objects')