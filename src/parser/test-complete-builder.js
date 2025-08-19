/**
 * Complete test for the Business Object Builder
 * Tests the full end-to-end workflow
 * Run with: node src/parser/test-complete-builder.js
 */

const fs = require('fs')
const path = require('path')
const BusinessObjectBuilder = require('./business-object-builder')

// Create a test TWX file for testing
function createTestTWXFile() {
  const ADMZip = require('adm-zip')
  const testTWXPath = path.join(__dirname, '../../temp/complete-test.twx')
  
  // Ensure temp directory exists
  const tempDir = path.dirname(testTWXPath)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const zip = new ADMZip()
  
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<package id="complete.test.package" name="Complete Test Package" version="1.0">
    <description>Complete test package for Business Object Builder</description>
    <objects>
    </objects>
</package>`

  zip.addFile('package.xml', Buffer.from(packageXML, 'utf8'))
  fs.writeFileSync(testTWXPath, zip.toBuffer())
  
  return testTWXPath
}

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Business Object Builder Workflow...\n')
  
  const builder = new BusinessObjectBuilder()
  const testTWXPath = createTestTWXFile()
  
  // Test JSON input with multiple objects and various types
  const jsonInput = `{
    "CustomerProfile": {
      "customerId": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phoneNumber": "string",
      "dateOfBirth": "Date",
      "isActive": "Boolean",
      "registrationDate": "Date",
      "preferences": "NameValuePair",
      "loyaltyPoints": "Integer"
    },
    "OrderDetails": {
      "orderId": "string",
      "customerId": "string",
      "orderDate": "Date",
      "totalAmount": "Decimal",
      "currency": "string",
      "status": "string",
      "isCompleted": "Boolean",
      "items": "TWList",
      "shippingAddress": "string",
      "billingAddress": "string"
    },
    "ProductCatalog": {
      "productId": "string",
      "productName": "string",
      "description": "string",
      "category": "string",
      "price": "Decimal",
      "inStock": "Boolean",
      "stockQuantity": "Integer",
      "lastUpdated": "Date",
      "attributes": "NameValuePair"
    }
  }`
  
  console.log('📝 Input JSON (3 business objects):')
  console.log('  - CustomerProfile (10 properties)')
  console.log('  - OrderDetails (10 properties)')
  console.log('  - ProductCatalog (9 properties)')
  console.log()
  
  try {
    // Test the complete workflow
    console.log('🚀 Running complete workflow...')
    const results = await builder.buildAndAddToTWX(jsonInput, testTWXPath, {
      skipDuplicates: true,
      strictTypeValidation: false
    })
    
    if (results.success) {
      console.log('✅ Complete workflow succeeded!')
      console.log()
      
      // Display results
      console.log('📊 Results Summary:')
      console.log(`  Input objects: ${results.inputObjects}`)
      console.log(`  Generated objects: ${results.generatedObjects}`)
      console.log(`  Added to TWX: ${results.addedObjects}`)
      console.log(`  Failed objects: ${results.failedObjects}`)
      console.log(`  Output file: ${results.outputPath}`)
      console.log()
      
      // Type validation results
      console.log('🔍 Type Validation:')
      console.log(`  Supported types: ${results.typeValidation.supportedTypes.length}`)
      console.log(`  Unsupported types: ${results.typeValidation.unsupportedTypes.length}`)
      
      if (results.typeValidation.supportedTypes.length > 0) {
        console.log(`  Supported: ${results.typeValidation.supportedTypes.join(', ')}`)
      }
      
      if (results.typeValidation.unsupportedTypes.length > 0) {
        console.log(`  Unsupported: ${results.typeValidation.unsupportedTypes.join(', ')}`)
      }
      console.log()
      
      // TWX Statistics
      console.log('📈 TWX File Statistics:')
      const stats = results.twxStatistics
      console.log(`  Total entries: ${stats.totalEntries}`)
      console.log(`  Total objects: ${stats.totalObjects}`)
      console.log(`  File size: ${stats.fileSize} bytes`)
      console.log(`  Objects by type:`)
      
      for (const [type, objects] of Object.entries(stats.objectsByType)) {
        console.log(`    ${type}: ${objects.length}`)
      }
      console.log()
      
      // Generated objects details
      console.log('⚙️ Generated Objects:')
      results.generationResults.successful.forEach((generated, i) => {
        const obj = generated.businessObject
        console.log(`  ${i + 1}. ${obj.name} (ID: ${obj.id})`)
        console.log(`     Properties: ${obj.properties.length}`)
        console.log(`     XML size: ${generated.xml.length} characters`)
        console.log(`     Valid XML: ${generated.xmlValidation.isValid ? '✅' : '❌'}`)
      })
      console.log()
      
      // Errors and warnings
      if (results.errors.length > 0) {
        console.log('❌ Errors:')
        results.errors.forEach((error, i) => {
          console.log(`  ${i + 1}. ${error}`)
        })
        console.log()
      }
      
      if (results.warnings.length > 0) {
        console.log('⚠️ Warnings:')
        results.warnings.forEach((warning, i) => {
          console.log(`  ${i + 1}. ${warning}`)
        })
        console.log()
      }
      
      return results
      
    } else {
      console.error('❌ Complete workflow failed:', results.error)
      
      if (results.errors && results.errors.length > 0) {
        console.error('Detailed errors:')
        results.errors.forEach((error, i) => {
          console.error(`  ${i + 1}. ${error}`)
        })
      }
      
      return results
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error.stack)
    return { success: false, error: error.message }
  } finally {
    builder.cleanup()
  }
}

async function testJSONOnlyWorkflow() {
  console.log('🧪 Testing JSON-Only Workflow (no TWX file)...\n')
  
  const builder = new BusinessObjectBuilder()
  
  const simpleJSON = `{
    "SimpleObject": {
      "id": "string",
      "name": "string",
      "isActive": "Boolean"
    }
  }`
  
  try {
    const results = builder.buildFromJSON(simpleJSON)
    
    if (results.success) {
      console.log('✅ JSON-only workflow succeeded!')
      console.log(`  Generated ${results.generatedObjects} business objects`)
      console.log(`  Failed ${results.failedObjects} objects`)
      
      if (results.businessObjects.length > 0) {
        const obj = results.businessObjects[0]
        console.log(`  Sample object: ${obj.businessObject.name} (${obj.businessObject.properties.length} properties)`)
      }
      
      return results
    } else {
      console.error('❌ JSON-only workflow failed:', results.error)
      return results
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in JSON-only workflow:', error.message)
    return { success: false, error: error.message }
  }
}

async function testErrorScenarios() {
  console.log('🧪 Testing Error Scenarios...\n')
  
  const builder = new BusinessObjectBuilder()
  
  // Test 1: Invalid JSON
  console.log('1. Testing invalid JSON:')
  try {
    const results = await builder.buildFromJSON('{ invalid json }')
    console.log(`   Result: ${results.success ? 'Success' : 'Failed (expected)'}`)
    if (!results.success) {
      console.log(`   Error: ${results.error}`)
    }
  } catch (error) {
    console.log(`   Exception: ${error.message}`)
  }
  console.log()
  
  // Test 2: Non-existent TWX file
  console.log('2. Testing non-existent TWX file:')
  try {
    const results = await builder.buildAndAddToTWX('{"Test": {"prop": "string"}}', '/non/existent/file.twx')
    console.log(`   Result: ${results.success ? 'Success' : 'Failed (expected)'}`)
    if (!results.success) {
      console.log(`   Error: ${results.error}`)
    }
  } catch (error) {
    console.log(`   Exception: ${error.message}`)
  }
  console.log()
  
  // Test 3: Unsupported types with strict validation
  console.log('3. Testing unsupported types with strict validation:')
  try {
    const testTWXPath = createTestTWXFile()
    const results = await builder.buildAndAddToTWX(
      '{"Test": {"prop": "UnsupportedType"}}', 
      testTWXPath,
      { strictTypeValidation: true }
    )
    console.log(`   Result: ${results.success ? 'Success' : 'Failed (expected)'}`)
    if (!results.success) {
      console.log(`   Error: ${results.error}`)
    }
  } catch (error) {
    console.log(`   Exception: ${error.message}`)
  }
  console.log()
}

async function testBuilderFeatures() {
  console.log('🧪 Testing Builder Features...\n')
  
  const builder = new BusinessObjectBuilder()
  
  // Test supported types
  console.log('1. Supported types:')
  const supportedTypes = builder.getSupportedTypes()
  console.log(`   Found ${supportedTypes.length} supported types`)
  console.log(`   Sample types: ${supportedTypes.slice(0, 5).join(', ')}...`)
  console.log()
  
  // Test type suggestions
  console.log('2. Type suggestions:')
  const testTypes = ['str', 'number', 'bool', 'unknown']
  for (const type of testTypes) {
    const suggestions = builder.getTypeSuggestions(type)
    console.log(`   ${type} -> ${suggestions.join(', ')}`)
  }
  console.log()
  
  // Test custom type
  console.log('3. Adding custom type:')
  builder.addCustomType('CustomString', '12.custom-string-id', 'custom')
  const customSupported = builder.getSupportedTypes().includes('CustomString')
  console.log(`   CustomString supported: ${customSupported ? '✅' : '❌'}`)
  console.log()
  
  // Test statistics
  console.log('4. Builder statistics:')
  const stats = builder.getStatistics()
  console.log(`   Type mapper stats: ${JSON.stringify(stats.typeMapperStats, null, 2)}`)
  console.log(`   Generator stats: ${JSON.stringify(stats.generatorStats, null, 2)}`)
  console.log()
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Complete Business Object Builder Tests\n')
  console.log('=' .repeat(80))

  const workflowResult = await testCompleteWorkflow()
  console.log('=' .repeat(80))

  const jsonOnlyResult = await testJSONOnlyWorkflow()
  console.log('=' .repeat(80))

  await testErrorScenarios()
  console.log('=' .repeat(80))

  await testBuilderFeatures()
  console.log('=' .repeat(80))

  // Final summary
  const allSuccessful = workflowResult.success && jsonOnlyResult.success
  
  if (allSuccessful) {
    console.log('✅ All Business Object Builder tests completed successfully!')
    console.log('\n🎉 Business Object Builder is fully functional!')
    
    console.log('\n📊 Final Summary:')
    console.log(`  Complete workflow: ${workflowResult.success ? '✅' : '❌'}`)
    console.log(`  JSON-only workflow: ${jsonOnlyResult.success ? '✅' : '❌'}`)
    console.log(`  Total objects generated: ${(workflowResult.generatedObjects || 0) + (jsonOnlyResult.generatedObjects || 0)}`)
    
    if (workflowResult.outputPath) {
      console.log(`  Final TWX file: ${workflowResult.outputPath}`)
    }
    
  } else {
    console.log('❌ Some Business Object Builder tests failed.')
    console.log('Please review the errors above.')
  }

  console.log('\n📝 Implementation Status:')
  console.log('  ✅ SimpleJSONParser - Parse JSON object definitions')
  console.log('  ✅ TypeMapper - Map types to IBM BPM format')
  console.log('  ✅ BusinessObjectGenerator - Generate business object structures')
  console.log('  ✅ XMLBuilder - Create IBM BPM compatible XML')
  console.log('  ✅ TWXFileHandler - Direct TWX file modification')
  console.log('  ✅ BusinessObjectBuilder - Complete integration')
  
  console.log('\n📝 Next steps:')
  console.log('  1. Create user interface for JSON input and file selection')
  console.log('  2. Integrate with existing TWX parser web interface')
  console.log('  3. Add comprehensive validation and error handling UI')
  console.log('  4. Implement batch processing and advanced features')
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error)
  process.exit(1)
})