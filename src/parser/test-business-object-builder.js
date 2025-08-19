/**
 * Comprehensive tests for Business Object Builder components
 * Tests SimpleJSONParser, TypeMapper, BusinessObjectGenerator, and XMLBuilder integration
 * Run with: node src/parser/test-business-object-builder.js
 */

const SimpleJSONParser = require('./simple-json-parser')
const TypeMapper = require('./type-mapper')
const BusinessObjectGenerator = require('./business-object-generator')
const XMLBuilder = require('./xml-builder')

function testFullWorkflow() {
  console.log('🧪 Testing Full Business Object Builder Workflow...\n')
  
  // Initialize components
  const parser = new SimpleJSONParser()
  const typeMapper = new TypeMapper()
  const generator = new BusinessObjectGenerator()
  const xmlBuilder = new XMLBuilder()
  
  // Test input - simple JSON format
  const jsonInput = `{
    "CustomerObject": {
      "customerId": "string",
      "customerName": "string",
      "email": "string",
      "age": "Integer",
      "isActive": "Boolean",
      "registrationDate": "Date",
      "preferences": "NameValuePair"
    },
    "OrderObject": {
      "orderId": "string",
      "customerId": "string",
      "orderDate": "Date",
      "totalAmount": "Decimal",
      "isCompleted": "Boolean"
    }
  }`
  
  console.log('📝 Input JSON:')
  console.log(jsonInput)
  console.log()
  
  try {
    // Step 1: Parse JSON
    console.log('🔍 Step 1: Parsing JSON...')
    const parsedObjects = parser.parseObjectDefinition(jsonInput)
    
    if (!parsedObjects) {
      console.error('❌ Parsing failed:', parser.getErrors())
      return
    }
    
    console.log(`✅ Parsed ${parsedObjects.length} objects`)
    parsedObjects.forEach((obj, i) => {
      console.log(`  ${i + 1}. ${obj.name} (${obj.properties.length} properties)`)
    })
    console.log()
    
    // Step 2: Extract object structures
    console.log('🏗️ Step 2: Extracting object structures...')
    const structures = parser.extractObjectStructure(parsedObjects)
    
    console.log('✅ Extracted structures:')
    structures.forEach((struct, i) => {
      console.log(`  ${i + 1}. ${struct.objectName}:`)
      struct.properties.forEach(prop => {
        const typeRef = typeMapper.getBPMTypeReference(prop.type)
        const supported = typeMapper.isSupportedType(prop.type)
        console.log(`    - ${prop.name}: ${prop.type} -> ${typeRef ? typeRef.typeId : 'UNMAPPED'} ${supported ? '✅' : '❌'}`)
      })
    })
    console.log()
    
    // Step 3: Generate business objects
    console.log('⚙️ Step 3: Generating business objects...')
    const businessObjects = []
    
    for (const structure of structures) {
      const businessObject = generator.generateBusinessObject(structure)
      
      // Map types using TypeMapper
      businessObject.properties = businessObject.properties.map(prop => {
        const typeRef = typeMapper.getBPMTypeReference(prop.bpmType)
        return {
          ...prop,
          bpmType: prop.bpmType, // Keep original for reference
          mappedType: typeRef ? typeRef.typeId : prop.bpmType,
          typeMetadata: typeRef
        }
      })
      
      businessObjects.push(businessObject)
    }
    
    console.log(`✅ Generated ${businessObjects.length} business objects`)
    businessObjects.forEach((obj, i) => {
      console.log(`  ${i + 1}. ${obj.name} (ID: ${obj.id})`)
      console.log(`     Properties: ${obj.properties.length}`)
      console.log(`     Created: ${obj.metadata.createdAt}`)
    })
    console.log()
    
    // Step 4: Generate XML
    console.log('📄 Step 4: Generating XML...')
    const xmlResults = []
    
    for (const businessObject of businessObjects) {
      try {
        const xml = xmlBuilder.buildBusinessObjectXML(businessObject, typeMapper)
        const validation = xmlBuilder.validateXML(xml)
        
        xmlResults.push({
          object: businessObject,
          xml: xml,
          validation: validation
        })
        
        console.log(`✅ Generated XML for ${businessObject.name}`)
        console.log(`   Length: ${xml.length} characters`)
        console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`)
        
        if (validation.errors.length > 0) {
          console.log(`   Errors: ${validation.errors.join(', ')}`)
        }
        
        if (validation.warnings.length > 0) {
          console.log(`   Warnings: ${validation.warnings.join(', ')}`)
        }
        
      } catch (error) {
        console.error(`❌ XML generation failed for ${businessObject.name}:`, error.message)
      }
    }
    console.log()
    
    // Step 5: Display sample XML
    if (xmlResults.length > 0) {
      console.log('📋 Step 5: Sample Generated XML (first object):')
      console.log('=' .repeat(80))
      console.log(xmlResults[0].xml.substring(0, 1000) + (xmlResults[0].xml.length > 1000 ? '\n... (truncated)' : ''))
      console.log('=' .repeat(80))
      console.log()
    }
    
    // Step 6: Summary
    console.log('📊 Step 6: Generation Summary:')
    console.log(`  Input objects: ${structures.length}`)
    console.log(`  Generated business objects: ${businessObjects.length}`)
    console.log(`  Generated XML files: ${xmlResults.length}`)
    console.log(`  Total properties: ${businessObjects.reduce((sum, obj) => sum + obj.properties.length, 0)}`)
    console.log(`  Supported types: ${businessObjects.flatMap(obj => obj.properties).filter(prop => typeMapper.isSupportedType(prop.bpmType)).length}`)
    console.log(`  Unsupported types: ${businessObjects.flatMap(obj => obj.properties).filter(prop => !typeMapper.isSupportedType(prop.bpmType)).length}`)
    
    const generatorStats = generator.getStatistics()
    console.log(`  Generated IDs: ${generatorStats.totalGenerated}`)
    console.log()
    
    return {
      parsedObjects,
      structures,
      businessObjects,
      xmlResults,
      success: true
    }
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message)
    console.error(error.stack)
    return { success: false, error: error.message }
  }
}

function testErrorHandling() {
  console.log('🧪 Testing Error Handling...\n')
  
  const parser = new SimpleJSONParser()
  const generator = new BusinessObjectGenerator()
  const xmlBuilder = new XMLBuilder()
  
  // Test invalid JSON
  console.log('1. Testing invalid JSON:')
  const invalidJson = '{ invalid json here'
  const result1 = parser.parseObjectDefinition(invalidJson)
  console.log(`   Result: ${result1 ? 'Parsed' : 'Failed'}`)
  console.log(`   Errors: ${parser.getErrors().join(', ')}`)
  console.log()
  
  // Test missing object name
  console.log('2. Testing missing object name:')
  try {
    generator.generateBusinessObject({ properties: [] })
    console.log('   ❌ Should have thrown error')
  } catch (error) {
    console.log(`   ✅ Correctly threw error: ${error.message}`)
  }
  console.log()
  
  // Test invalid XML generation
  console.log('3. Testing invalid XML generation:')
  try {
    xmlBuilder.buildBusinessObjectXML(null)
    console.log('   ❌ Should have thrown error')
  } catch (error) {
    console.log(`   ✅ Correctly threw error: ${error.message}`)
  }
  console.log()
}

function testEdgeCases() {
  console.log('🧪 Testing Edge Cases...\n')
  
  const parser = new SimpleJSONParser()
  const generator = new BusinessObjectGenerator()
  const typeMapper = new TypeMapper()
  
  // Test empty object
  console.log('1. Testing empty object:')
  const emptyJson = '{ "EmptyObject": {} }'
  const result1 = parser.parseObjectDefinition(emptyJson)
  if (result1) {
    const structure = parser.extractObjectStructure(result1)[0]
    const businessObject = generator.generateBusinessObject(structure)
    console.log(`   ✅ Generated object with ${businessObject.properties.length} properties`)
  }
  console.log()
  
  // Test special characters in names
  console.log('2. Testing special characters in names:')
  const specialJson = '{ "Object-With-Dashes": { "property_with_underscores": "string", "property with spaces": "Integer" } }'
  const result2 = parser.parseObjectDefinition(specialJson)
  if (result2) {
    const structure = parser.extractObjectStructure(result2)[0]
    const businessObject = generator.generateBusinessObject(structure)
    console.log(`   Original name: ${structure.objectName}`)
    console.log(`   Sanitized name: ${businessObject.name}`)
    console.log(`   Properties:`)
    businessObject.properties.forEach(prop => {
      console.log(`     ${prop.originalName} -> ${prop.name}`)
    })
  }
  console.log()
  
  // Test unsupported types
  console.log('3. Testing unsupported types:')
  const unsupportedJson = '{ "TestObject": { "unknownProp": "UnknownType", "customProp": "CustomType" } }'
  const result3 = parser.parseObjectDefinition(unsupportedJson)
  if (result3) {
    const structure = parser.extractObjectStructure(result3)[0]
    console.log(`   Properties with type support:`)
    structure.properties.forEach(prop => {
      const supported = typeMapper.isSupportedType(prop.type)
      const suggestions = supported ? [] : typeMapper.suggestType(prop.type)
      console.log(`     ${prop.name}: ${prop.type} - ${supported ? '✅ supported' : '❌ unsupported'}`)
      if (!supported && suggestions.length > 0) {
        console.log(`       Suggestions: ${suggestions.join(', ')}`)
      }
    })
  }
  console.log()
}

// Run all tests
console.log('🚀 Starting Business Object Builder Integration Tests\n')
console.log('=' .repeat(80))

const workflowResult = testFullWorkflow()
console.log('=' .repeat(80))

testErrorHandling()
console.log('=' .repeat(80))

testEdgeCases()
console.log('=' .repeat(80))

if (workflowResult && workflowResult.success) {
  console.log('✅ All tests completed successfully!')
  console.log('\n🎉 Business Object Builder core components are working correctly!')
} else {
  console.log('❌ Some tests failed. Please review the errors above.')
}

console.log('\n📝 Next steps:')
console.log('  1. Implement TWX file handler for direct file modification')
console.log('  2. Create user interface for JSON input and file selection')
console.log('  3. Add integration with existing TWX parser interface')
console.log('  4. Implement comprehensive testing and validation')