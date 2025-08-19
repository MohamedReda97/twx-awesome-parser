/**
 * Basic tests for SimpleJSONParser and TypeMapper
 * Run with: node src/parser/test-simple-parser.js
 */

const SimpleJSONParser = require('./simple-json-parser')
const TypeMapper = require('./type-mapper')

function testSimpleJSONParser() {
  console.log('🧪 Testing SimpleJSONParser...\n')
  
  const parser = new SimpleJSONParser()
  
  // Test 1: Standard JSON format
  console.log('Test 1: Standard JSON format')
  const jsonInput = `{
    "customerObj": {
      "name": "string",
      "age": "Integer",
      "isActive": "Boolean"
    }
  }`
  
  const result1 = parser.parseObjectDefinition(jsonInput)
  console.log('Input:', jsonInput.replace(/\n\s*/g, ' '))
  console.log('Result:', JSON.stringify(result1, null, 2))
  console.log('Errors:', parser.getErrors())
  console.log()
  
  // Test 2: Simple syntax format
  console.log('Test 2: Simple syntax format')
  const simpleInput = 'customerObj { name: string, age: Integer, isActive: Boolean }'
  
  parser.clearErrors()
  const result2 = parser.parseObjectDefinition(simpleInput)
  console.log('Input:', simpleInput)
  console.log('Result:', JSON.stringify(result2, null, 2))
  console.log('Errors:', parser.getErrors())
  console.log()
  
  // Test 3: Multiple objects
  console.log('Test 3: Multiple objects')
  const multiInput = `{
    "customerObj": {
      "name": "string",
      "country": "NameValuePair"
    },
    "orderObj": {
      "orderId": "Integer",
      "orderDate": "Date"
    }
  }`
  
  parser.clearErrors()
  const result3 = parser.parseObjectDefinition(multiInput)
  console.log('Input:', multiInput.replace(/\n\s*/g, ' '))
  console.log('Result:', JSON.stringify(result3, null, 2))
  console.log('Errors:', parser.getErrors())
  console.log()
  
  // Test 4: Extract object structure
  console.log('Test 4: Extract object structure')
  if (result3) {
    const structure = parser.extractObjectStructure(result3)
    console.log('Structure:', JSON.stringify(structure, null, 2))
  }
  console.log()
  
  // Test 5: Validation errors
  console.log('Test 5: Validation errors')
  const invalidInput = 'invalid syntax here'
  
  parser.clearErrors()
  const result5 = parser.parseObjectDefinition(invalidInput)
  console.log('Input:', invalidInput)
  console.log('Result:', result5)
  console.log('Errors:', parser.getErrors())
  console.log()
}

function testTypeMapper() {
  console.log('🧪 Testing TypeMapper...\n')
  
  const mapper = new TypeMapper()
  
  // Test 1: Basic type mapping
  console.log('Test 1: Basic type mapping')
  const types = ['string', 'Integer', 'Boolean', 'NameValuePair', 'Date']
  
  for (const type of types) {
    const mapped = mapper.mapType(type)
    console.log(`${type} -> ${mapped}`)
  }
  console.log()
  
  // Test 2: Type reference with metadata
  console.log('Test 2: Type reference with metadata')
  const typeRef = mapper.getBPMTypeReference('NameValuePair')
  console.log('NameValuePair reference:', JSON.stringify(typeRef, null, 2))
  console.log()
  
  // Test 3: Type suggestions
  console.log('Test 3: Type suggestions')
  const invalidTypes = ['str', 'number', 'bool', 'unknown']
  
  for (const type of invalidTypes) {
    const suggestions = mapper.suggestType(type)
    console.log(`${type} -> suggestions: ${suggestions.join(', ')}`)
  }
  console.log()
  
  // Test 4: Supported types check
  console.log('Test 4: Supported types check')
  const testTypes = ['string', 'Integer', 'UnknownType', 'NameValuePair']
  
  for (const type of testTypes) {
    const isSupported = mapper.isSupportedType(type)
    console.log(`${type}: ${isSupported ? '✅ supported' : '❌ not supported'}`)
  }
  console.log()
  
  // Test 5: Get all supported types
  console.log('Test 5: All supported types')
  const allTypes = mapper.getSupportedTypes()
  console.log('Supported types:', allTypes.join(', '))
  console.log()
  
  // Test 6: Statistics
  console.log('Test 6: Type mapping statistics')
  const stats = mapper.getStatistics()
  console.log('Statistics:', JSON.stringify(stats, null, 2))
  console.log()
}

function testIntegration() {
  console.log('🧪 Testing Integration...\n')
  
  const parser = new SimpleJSONParser()
  const mapper = new TypeMapper()
  
  // Test parsing and type mapping together
  const input = `{
    "customerObj": {
      "name": "string",
      "age": "Integer",
      "isActive": "Boolean",
      "country": "NameValuePair",
      "createdDate": "Date"
    }
  }`
  
  console.log('Integration test: Parse and map types')
  console.log('Input:', input.replace(/\n\s*/g, ' '))
  
  const parsed = parser.parseObjectDefinition(input)
  if (parsed && parsed.length > 0) {
    const structure = parser.extractObjectStructure(parsed)
    
    if (structure && structure.length > 0) {
      const obj = structure[0]
      console.log(`\nObject: ${obj.objectName}`)
      console.log('Properties with type mappings:')
      
      for (const prop of obj.properties) {
        const typeRef = mapper.getBPMTypeReference(prop.type)
        const isSupported = mapper.isSupportedType(prop.type)
        
        console.log(`  ${prop.name}: ${prop.type} -> ${typeRef ? typeRef.typeId : 'UNMAPPED'} ${isSupported ? '✅' : '❌'}`)
        
        if (!isSupported) {
          const suggestions = mapper.suggestType(prop.type)
          console.log(`    Suggestions: ${suggestions.join(', ')}`)
        }
      }
    }
  }
  
  console.log('\nErrors:', parser.getErrors())
  console.log()
}

// Run all tests
console.log('🚀 Starting Business Object Builder Parser Tests\n')
console.log('=' .repeat(60))

testSimpleJSONParser()
console.log('=' .repeat(60))

testTypeMapper()
console.log('=' .repeat(60))

testIntegration()
console.log('=' .repeat(60))

console.log('✅ All tests completed!')