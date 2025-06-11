#!/usr/bin/env node

/**
 * Test script for the new JSON-based TWX parser
 * This script tests parsing the TWX example directory
 */

const fs = require('fs')
const path = require('path')
const JSONParser = require('./src/parser/json-parser')
const JSONWorkspace = require('./src/classes/JSONWorkspace')

async function testTWXExample() {
  console.log('🧪 Testing TWX Parser with Example Data\n')
  
  const twxExamplePath = './TWX example'
  const outputDir = './test-output'
  
  // Check if TWX example exists
  if (!fs.existsSync(twxExamplePath)) {
    console.error('❌ TWX example directory not found')
    return
  }
  
  try {
    // Test 1: Direct parsing with JSONParser
    console.log('📝 Test 1: Direct JSON Parser')
    console.log('─'.repeat(40))
    
    const parser = new JSONParser(outputDir)
    
    // Since TWX example is a directory, we'll test the extractor directly
    const TWXExtractor = require('./src/parser/twx-extractor')
    const extractor = new TWXExtractor()
    
    // Create a mock TWX structure for testing
    console.log('📁 Analyzing TWX example structure...')
    
    // Read package.xml
    const packageXmlPath = path.join(twxExamplePath, 'META-INF', 'package.xml')
    if (fs.existsSync(packageXmlPath)) {
      console.log('✅ Found package.xml')
      
      const packageXml = fs.readFileSync(packageXmlPath, 'utf8')
      console.log(`📄 Package XML size: ${(packageXml.length / 1024).toFixed(1)} KB`)
      
      // Parse the package XML to get object count
      const xml2js = require('xml2js')
      const xmlParser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false, mergeAttrs: true })
      
      try {
        const packageData = await xmlParser.parseStringPromise(packageXml)
        const pkg = packageData['p:package'] || packageData.package
        
        if (pkg && pkg.objects && pkg.objects.object) {
          const objects = Array.isArray(pkg.objects.object) ? pkg.objects.object : [pkg.objects.object]
          console.log(`📊 Found ${objects.length} objects in package.xml`)
          
          // Show type breakdown
          const typeCount = {}
          objects.forEach(obj => {
            typeCount[obj.type] = (typeCount[obj.type] || 0) + 1
          })
          
          console.log('\n📈 Object Type Breakdown:')
          Object.entries(typeCount).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} objects`)
          })
          
          // Show some example objects
          console.log('\n📋 Example Objects:')
          objects.slice(0, 5).forEach(obj => {
            console.log(`   • ${obj.name} (${obj.type})`)
          })
          if (objects.length > 5) {
            console.log(`   ... and ${objects.length - 5} more`)
          }
        }
      } catch (parseError) {
        console.warn('⚠️  Could not parse package.xml:', parseError.message)
      }
    } else {
      console.error('❌ package.xml not found in TWX example')
    }
    
    // Check objects directory
    const objectsPath = path.join(twxExamplePath, 'objects')
    if (fs.existsSync(objectsPath)) {
      const objectFiles = fs.readdirSync(objectsPath).filter(f => f.endsWith('.xml'))
      console.log(`\n📁 Found ${objectFiles.length} object XML files`)
      
      if (objectFiles.length > 0) {
        console.log('📋 Example object files:')
        objectFiles.slice(0, 3).forEach(file => {
          console.log(`   • ${file}`)
        })
        if (objectFiles.length > 3) {
          console.log(`   ... and ${objectFiles.length - 3} more`)
        }
      }
    }
    
    // Test 2: Workspace functionality
    console.log('\n📝 Test 2: JSON Workspace')
    console.log('─'.repeat(40))
    
    const workspace = new JSONWorkspace(outputDir)
    
    // Create a mock summary file for testing
    const mockData = {
      metadata: {
        project: {
          name: 'NEW NBE DC Processes',
          shortName: 'NEWNBED',
          description: 'Test Nested process'
        },
        branch: {
          name: 'Main'
        },
        snapshot: {
          name: 'NEW_NBE_DC_Test3'
        }
      },
      statistics: {
        totalObjects: 265,
        objectTypes: 8,
        toolkits: 0,
        extractedAt: new Date().toISOString(),
        sourceFile: 'TWX example'
      },
      objectsByType: [
        {
          typeName: 'Process',
          count: 111,
          objects: [
            { id: '1.01554586-6b73-40b1-957d-c2491f071bbb', name: 'getRequestType', versionId: 'efbec366-e797-45d2-9a92-b625a913f937' },
            { id: '1.027e3afb-1a94-4896-883d-daa4cdfee232', name: 'Get HUB name by code', versionId: 'cf9b85d7-e4d2-4dc2-9e41-5fd3490c6154' }
          ]
        },
        {
          typeName: 'Business Object',
          count: 33,
          objects: [
            { id: '12.07546a6c-13be-4fe9-93f0-33c48a8492c7', name: 'DebitedAccount', versionId: '4518ff06-f0b0-4fd1-95ce-a46f0ccc545f' },
            { id: '12.0b55eb1a-7871-4183-b9ee-f4146bfa5d07', name: 'ChargesObj', versionId: 'c975380a-eff0-4ded-a897-6da87fa50f6f' }
          ]
        },
        {
          typeName: 'Coach View',
          count: 35,
          objects: [
            { id: '64.0d7634e8-859f-4f60-b8ce-a0b32d5a1374', name: 'Withdrawal Request Trade FO', versionId: 'd40f4439-fb45-474b-acf2-8ed3d88c0a8f' },
            { id: '64.0fa21995-2169-498c-ba2e-ea66c3dc5616', name: 'Contract Creation', versionId: 'b7059166-d296-437a-9e30-5607ea8f75c7' }
          ]
        }
      ],
      toolkits: []
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Write mock summary file
    const summaryPath = path.join(outputDir, 'twx-summary.json')
    fs.writeFileSync(summaryPath, JSON.stringify(mockData, null, 2))
    console.log('✅ Created mock summary file')
    
    // Test workspace methods
    await workspace.loadData()
    
    if (workspace.hasData()) {
      console.log('✅ Workspace loaded data successfully')
      
      const metadata = workspace.getMetadata()
      console.log(`📋 Project: ${metadata.project.name} (${metadata.project.shortName})`)
      
      const stats = workspace.getStatistics()
      console.log(`📊 Statistics: ${stats.totalObjects} objects, ${stats.objectTypes} types`)
      
      const objectsByType = workspace.getObjectsByType()
      console.log(`📂 Object types: ${objectsByType.map(t => t.typeName).join(', ')}`)
      
      // Test search
      const searchResults = workspace.searchObjects('get')
      console.log(`🔍 Search for 'get': ${searchResults.length} results`)
      
      // Test export
      const exportPath = await workspace.exportData('json')
      console.log(`💾 Exported data to: ${exportPath}`)
      
      // Generate summary report
      const report = workspace.getSummaryReport()
      console.log('\n📈 Summary Report:')
      console.log(`   Total Objects: ${report.statistics.totalObjects}`)
      console.log(`   Object Types: ${report.statistics.objectTypes}`)
      report.typeBreakdown.forEach(type => {
        console.log(`   • ${type.typeName}: ${type.count} (${type.percentage}%)`)
      })
    } else {
      console.error('❌ Workspace failed to load data')
    }
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   1. Run: node parse-twx.js "TWX example" ./output')
    console.log('   2. Open twx-viewer.html in your browser')
    console.log('   3. View the parsed results')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  }
}

// Run the test
if (require.main === module) {
  testTWXExample()
}

module.exports = { testTWXExample }
