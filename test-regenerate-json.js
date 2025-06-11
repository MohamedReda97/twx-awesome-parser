#!/usr/bin/env node

/**
 * Test script to regenerate JSON files with the updated CSHS separation logic
 * This processes the extracted TWX directory directly
 */

const fs = require('fs')
const path = require('path')
const TWXExtractor = require('./src/parser/twx-extractor')
const JSONParser = require('./src/parser/json-parser')

async function regenerateJSON() {
  console.log('🔄 Regenerating JSON files with updated CSHS separation logic...')
  
  try {
    // Create a TWX extractor instance
    const extractor = new TWXExtractor()
    
    // Extract data from the TWX directory
    console.log('📁 Processing TWX directory: TWX example')
    const extractedData = await extractor.extractFromDirectory('TWX example')
    
    // Create JSON parser and generate output files
    const jsonParser = new JSONParser('./output')
    console.log('📝 Generating JSON files...')
    
    const results = await jsonParser.generateOutputFiles(extractedData)
    
    console.log('✅ JSON regeneration completed!')
    console.log(`📊 Summary:`)
    console.log(`   • Total Objects: ${extractedData.objects.length}`)
    console.log(`   • Files Generated: ${results.length}`)
    
    // Check if CSHS objects were properly separated
    const summaryPath = path.join('./output', 'twx-summary.json')
    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
      const cshsType = summary.objectsByType.find(type => type.typeName === 'CSHS')
      
      if (cshsType) {
        console.log(`🎯 CSHS separation successful: ${cshsType.count} CSHS objects found`)
        console.log(`   CSHS objects:`)
        cshsType.objects.forEach(obj => {
          console.log(`   • ${obj.name}`)
        })
      } else {
        console.log('⚠️  No CSHS objects found - check the separation logic')
      }
    }
    
  } catch (error) {
    console.error('❌ Error regenerating JSON:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run the regeneration
regenerateJSON()
