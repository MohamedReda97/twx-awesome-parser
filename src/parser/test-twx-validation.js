/**
 * Test TWX file validation
 * Run with: node src/parser/test-twx-validation.js
 */

const fs = require('fs')
const path = require('path')
const { BusinessObjectBuilder } = require('./business-object-builder-complete')

function createInvalidTWXFile() {
  const invalidPath = path.join(__dirname, '../../temp/invalid.twx')
  
  // Create a file that's not a valid ZIP
  fs.writeFileSync(invalidPath, 'This is not a valid TWX file')
  
  return invalidPath
}

function createEmptyTWXFile() {
  const emptyPath = path.join(__dirname, '../../temp/empty.twx')
  
  // Create an empty file
  fs.writeFileSync(emptyPath, '')
  
  return emptyPath
}

async function testTWXValidation() {
  console.log('🧪 Testing TWX File Validation...\n')
  
  const builder = new BusinessObjectBuilder()
  
  const jsonInput = `{
    "TestObject": {
      "id": "string",
      "name": "string"
    }
  }`
  
  // Test 1: Non-existent file
  console.log('1. Testing non-existent file:')
  try {
    const result = await builder.buildAndAddToTWX(jsonInput, '/non/existent/file.twx')
    console.log(`   Result: ${result.success ? 'Success' : 'Failed (expected)'}`)
    if (!result.success) {
      console.log(`   Error: ${result.error}`)
    }
  } catch (error) {
    console.log(`   Exception: ${error.message}`)
  }
  console.log()
  
  // Test 2: Invalid TWX file (not a ZIP)
  console.log('2. Testing invalid TWX file (not a ZIP):')
  const invalidPath = createInvalidTWXFile()
  try {
    const result = await builder.buildAndAddToTWX(jsonInput, invalidPath)
    console.log(`   Result: ${result.success ? 'Success' : 'Failed (expected)'}`)
    if (!result.success) {
      console.log(`   Error: ${result.error}`)
    }
  } catch (error) {
    console.log(`   Exception: ${error.message}`)
  }
  
  // Cleanup
  if (fs.existsSync(invalidPath)) {
    fs.unlinkSync(invalidPath)
  }
  console.log()
  
  // Test 3: Empty TWX file
  console.log('3. Testing empty TWX file:')
  const emptyPath = createEmptyTWXFile()
  try {
    const result = await builder.buildAndAddToTWX(jsonInput, emptyPath)
    console.log(`   Result: ${result.success ? 'Success' : 'Failed (expected)'}`)
    if (!result.success) {
      console.log(`   Error: ${result.error}`)
    }
  } catch (error) {
    console.log(`   Exception: ${error.message}`)
  }
  
  // Cleanup
  if (fs.existsSync(emptyPath)) {
    fs.unlinkSync(emptyPath)
  }
  console.log()
  
  // Test 4: Valid TWX file (from previous test)
  console.log('4. Testing valid TWX file:')
  const validPath = path.join(__dirname, '../../temp/complete-implementation-test.twx')
  if (fs.existsSync(validPath)) {
    try {
      const result = await builder.buildAndAddToTWX(jsonInput, validPath)
      console.log(`   Result: ${result.success ? 'Success' : 'Failed'}`)
      if (result.success) {
        console.log(`   Generated: ${result.generatedObjects}, Added: ${result.addedObjects}`)
      } else {
        console.log(`   Error: ${result.error}`)
      }
    } catch (error) {
      console.log(`   Exception: ${error.message}`)
    }
  } else {
    console.log('   Valid TWX file not found (run test-complete-implementation.js first)')
  }
  console.log()
  
  builder.cleanup()
}

// Run the test
testTWXValidation().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})