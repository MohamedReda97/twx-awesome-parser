#!/usr/bin/env node

/**
 * Script to regenerate just the summary file with correct CSHS grouping
 */

const fs = require('fs')
const path = require('path')
const { groupByType } = require('./src/utils/type-mappings')

async function regenerateSummary() {
  console.log('🔄 Regenerating summary file with correct CSHS grouping...')
  
  try {
    // Load the all-objects.json file
    const allObjectsPath = './output/all-objects.json'
    const metadataPath = './output/metadata.json'
    
    if (!fs.existsSync(allObjectsPath)) {
      throw new Error('all-objects.json not found')
    }
    
    if (!fs.existsSync(metadataPath)) {
      throw new Error('metadata.json not found')
    }
    
    const allObjectsData = JSON.parse(fs.readFileSync(allObjectsPath, 'utf8'))
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    
    const objects = allObjectsData.objects
    console.log(`📊 Total objects: ${objects.length}`)
    
    // Group objects using the updated groupByType function
    const groupedObjects = groupByType(objects)
    console.log(`📁 Groups: ${Object.keys(groupedObjects).join(', ')}`)
    
    // Generate the summary
    const summary = {
      metadata: metadata,
      statistics: {
        totalObjects: objects.length,
        objectTypes: Object.keys(groupedObjects).length,
        toolkits: 0,
        extractedAt: new Date().toISOString(),
        sourceFile: "TWX example"
      },
      objectsByType: Object.keys(groupedObjects).map(typeName => ({
        typeName,
        count: groupedObjects[typeName].length,
        objects: groupedObjects[typeName].map(obj => ({
          id: obj.id,
          name: obj.name,
          versionId: obj.versionId,
          type: obj.type,
          subType: obj.subType,
          hasDetails: !!obj.details && Object.keys(obj.details).length > 0
        }))
      })).sort((a, b) => {
        // Sort CSHS first, then by count descending
        if (a.typeName === 'CSHS') return -1;
        if (b.typeName === 'CSHS') return 1;
        return b.count - a.count;
      }),
      toolkits: []
    }
    
    // Write the summary file
    const summaryPath = './output/twx-summary.json'
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
    
    console.log('✅ Summary file regenerated successfully!')
    console.log(`📄 File: ${summaryPath}`)
    
    // Show the type breakdown
    console.log('\n📊 Object type breakdown:')
    summary.objectsByType.forEach(type => {
      console.log(`   • ${type.typeName}: ${type.count} objects`)
    })
    
    // Verify CSHS section
    const cshsSection = summary.objectsByType.find(type => type.typeName === 'CSHS')
    if (cshsSection) {
      console.log(`\n🎯 CSHS section verified: ${cshsSection.count} objects`)
      console.log('   First few CSHS objects:')
      cshsSection.objects.slice(0, 5).forEach(obj => {
        console.log(`   • ${obj.name}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error regenerating summary:', error.message)
    process.exit(1)
  }
}

regenerateSummary()
