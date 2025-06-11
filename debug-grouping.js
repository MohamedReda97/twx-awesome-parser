#!/usr/bin/env node

/**
 * Debug script to check the grouping logic for CSHS objects
 */

const fs = require('fs')
const { groupByType } = require('./src/utils/type-mappings')

// Load the all-objects.json file to see the raw data
const allObjectsPath = './output/all-objects.json'
if (fs.existsSync(allObjectsPath)) {
  const allObjectsData = JSON.parse(fs.readFileSync(allObjectsPath, 'utf8'))
  const objects = allObjectsData.objects
  
  console.log('🔍 Debugging CSHS grouping logic...')
  console.log(`📊 Total objects: ${objects.length}`)
  
  // Check for Process objects with processType = 10
  const processObjects = objects.filter(obj => obj.type === 'process')
  console.log(`📋 Process objects: ${processObjects.length}`)
  
  const cshsObjects = processObjects.filter(obj => {
    const hasProcessType10 = obj.details && obj.details.processType === '10'
    const hasSubType10 = obj.subType === '10'
    
    if (hasProcessType10 || hasSubType10) {
      console.log(`🎯 Found CSHS object: ${obj.name}`)
      console.log(`   - ID: ${obj.id}`)
      console.log(`   - Type: ${obj.type}`)
      console.log(`   - SubType: ${obj.subType}`)
      console.log(`   - ProcessType: ${obj.details?.processType}`)
      console.log(`   - Details keys: ${obj.details ? Object.keys(obj.details).join(', ') : 'none'}`)
    }
    
    return hasProcessType10 || hasSubType10
  })
  
  console.log(`🎯 CSHS objects found: ${cshsObjects.length}`)
  
  // Test the groupByType function
  console.log('\n🧪 Testing groupByType function...')
  const grouped = groupByType(objects)
  
  console.log(`📁 Groups created: ${Object.keys(grouped).join(', ')}`)
  
  if (grouped.CSHS) {
    console.log(`✅ CSHS group exists with ${grouped.CSHS.length} objects`)
    grouped.CSHS.forEach(obj => {
      console.log(`   - ${obj.name}`)
    })
  } else {
    console.log(`❌ No CSHS group found`)
  }
  
  if (grouped.Process) {
    console.log(`📋 Process group has ${grouped.Process.length} objects`)
  }
  
} else {
  console.log('❌ all-objects.json file not found')
}
