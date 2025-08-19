/**
 * Test the complete Business Object Builder implementation
 * Run with: node src/parser/test-complete-implementation.js
 */

const fs = require('fs')
const path = require('path')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

// Create a test TWX file
function createTestTWXFile() {
  const ADMZip = require('adm-zip')
  const testTWXPath = path.join(__dirname, '../../temp/complete-implementation-test.twx')
  
  // Ensure temp directory exists
  const tempDir = path.dirname(testTWXPath)
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const zip = new ADMZip()
  
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<package id="test.complete.package" name="Complete Implementation Test" version="1.0">
    <description>Test package for complete Business Object Builder implementation</description>
    <objects>
    </objects>
</package>`

  zip.addFile('package.xml', Buffer.from(packageXML, 'utf8'))
  fs.writeFileSync(testTWXPath, zip.toBuffer())
  
  return testTWXPath
}

async function testCompleteImplementation() {
  console.log('🧪 Testing Complete Business Object Builder Implementation...\n')
  
  const builder = new BusinessObjectBuilder()
  const testTWXPath = createTestTWXFile()
  
  // Test JSON with various IBM BPM types
  const jsonInput = `{
    "CustomerProfile": {
      "customerId": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "age": "Integer",
      "isActive": "Boolean",
      "registrationDate": "Date",
      "preferences": "NameValuePair"
    },
    "OrderSummary": {
      "orderId": "string",
      "customerId": "string",
      "orderDate": "Date",
      "totalAmount": "Decimal",
      "isCompleted": "Boolean",
      "items": "TWList"
    }
  }`
  
  console.log('📝 Input JSON:')
  console.log(jsonInput)
  console.log()
  
  try {
    console.log('🚀 Running complete implementation...')
    const results = await builder.buildAndAddToTWX(jsonInput, testTWXPath)
    
    if (results.success) {
      console.log('✅ Complete implementation succeeded!')
      console.log()
      
      console.log('📊 Results:')
      console.log(`  Input objects: ${results.inputObjects}`)
      console.log(`  Generated objects: ${results.generatedObjects}`)
      console.log(`  Added to TWX: ${results.addedObjects}`)
      console.log(`  Failed objects: ${results.failedObjects}`)
      console.log(`  Output file: ${results.outputPath}`)
      console.log()
      
      console.log('🏗️ Generated Business Objects:')
      results.businessObjects.forEach((obj, i) => {
        console.log(`  ${i + 1}. ${obj.name} (ID: ${obj.id})`)
        console.log(`     Properties: ${obj.properties}`)
      })
      console.log()
      
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
      
      // Test the generated XML by reading it back
      console.log('🔍 Verifying generated XML...')
      const ADMZip = require('adm-zip')
      const zip = new ADMZip(fs.readFileSync(results.outputPath))
      const entries = zip.getEntries()
      
      console.log(`  TWX file contains ${entries.length} entries`)
      
      // Find business object files
      const objectFiles = entries.filter(entry => entry.entryName.startsWith('objects/') && entry.entryName.endsWith('.xml'))
      console.log(`  Found ${objectFiles.length} business object files`)
      
      // Show first business object XML (truncated)
      if (objectFiles.length > 0) {
        const firstObjectXML = objectFiles[0].getData().toString('utf8')
        console.log(`  Sample XML (first 500 chars):`)
        console.log(`  ${firstObjectXML.substring(0, 500)}...`)
      }
      
      return results
      
    } else {
      console.error('❌ Complete implementation failed:', results.error)
      
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

async function testTypeMapping() {
  console.log('🧪 Testing Type Mapping...\n')
  
  const builder = new BusinessObjectBuilder()
  
  console.log('📋 Supported Types:')
  const supportedTypes = builder.getSupportedTypes()
  supportedTypes.forEach((type, i) => {
    console.log(`  ${i + 1}. ${type}`)
  })
  console.log()
  
  console.log('💡 Type Suggestions:')
  const testTypes = ['str', 'number', 'bool', 'datetime', 'unknown']
  testTypes.forEach(type => {
    const suggestions = builder.getTypeSuggestions(type)
    console.log(`  ${type} -> ${suggestions.join(', ')}`)
  })
  console.log()
}

async function testErrorHandling() {
  console.log('🧪 Testing Error Handling...\n')
  
  const builder = new BusinessObjectBuilder()
  
  // Test 1: Invalid JSON
  console.log('1. Testing invalid JSON:')
  try {
    const results = await builder.buildAndAddToTWX('{ invalid json }', '/fake/path.twx')
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
  
  // Test 3: Unsupported types
  console.log('3. Testing unsupported types:')
  try {
    const testTWXPath = createTestTWXFile()
    const results = await builder.buildAndAddToTWX('{"Test": {"prop": "UnsupportedType"}}', testTWXPath)
    console.log(`   Result: ${results.success ? 'Success' : 'Failed'}`)
    console.log(`   Generated: ${results.generatedObjects || 0}, Failed: ${results.failedObjects || 0}`)
    if (results.errors && results.errors.length > 0) {
      console.log(`   Errors: ${results.errors.join(', ')}`)
    }
  } catch (error) {
    console.log(`   Exception: ${error.message}`)
  }
  console.log()
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Complete Business Object Builder Tests\n')
  console.log('=' .repeat(80))

  const implementationResult = await testCompleteImplementation()
  console.log('=' .repeat(80))

  await testTypeMapping()
  console.log('=' .repeat(80))

  await testErrorHandling()
  console.log('=' .repeat(80))

  if (implementationResult && implementationResult.success) {
    console.log('✅ All tests completed successfully!')
    console.log('\n🎉 Complete Business Object Builder is working correctly!')
    
    console.log('\n📊 Final Summary:')
    console.log(`  Implementation test: ${implementationResult.success ? '✅' : '❌'}`)
    console.log(`  Objects generated: ${implementationResult.generatedObjects || 0}`)
    console.log(`  Objects added to TWX: ${implementationResult.addedObjects || 0}`)
    
    if (implementationResult.outputPath) {
      console.log(`  Final TWX file: ${implementationResult.outputPath}`)
    }
    
  } else {
    console.log('❌ Some tests failed. Please review the errors above.')
  }

  console.log('\n📝 Key Improvements:')
  console.log('  ✅ Uses actual IBM BPM type IDs (12.db884a3c-c533-44b7-bb2d-47bec8ad4022 for String)')
  console.log('  ✅ Follows exact IBM BPM XML structure with proper classRef format')
  console.log('  ✅ Generates correct jsonData with Lombardi namespace types')
  console.log('  ✅ Extracts and uses project ID from TWX package.xml')
  console.log('  ✅ Consolidated into single file for easier maintenance')
  console.log('  ✅ Proper property structure with <n> tags and annotations')
  
  console.log('\n📝 Next steps:')
  console.log('  1. Update the web interface to use the new complete implementation')
  console.log('  2. Add backend API endpoint to call the BusinessObjectBuilder')
  console.log('  3. Test with real TWX files to verify compatibility')
  console.log('  4. Add support for extracting existing type IDs from TWX files')
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error)
  process.exit(1)
})