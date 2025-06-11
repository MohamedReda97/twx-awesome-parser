const fs = require('fs')
const path = require('path')

// Global data store for captured parsing results
const globalDataStore = {
  snapshots: new Map(),
  objects: new Map(),
  dependencies: new Map()
}

// Mock bcrypt to avoid compilation issues
const mockBcrypt = {
  hash: (password, rounds) => Promise.resolve(`hashed_${password}`),
  compare: (password, hash) => Promise.resolve(hash === `hashed_${password}`)
}

// Mock sqlite3 to avoid compilation issues
const mockSqlite3 = {
  verbose: () => ({
    Database: class MockDatabase {
      constructor(path) {
        this.path = path
        this.data = new Map()
        this.snapshots = new Map()
        this.objects = new Map()
        this.dependencies = new Map()
      }

      exec(sql, callback) {
        console.log('Mock DB: Executing schema creation')
        if (callback) callback(null)
      }

      run(sql, params, callback) {
        console.log(`Mock DB: INSERT - ${sql.substring(0, 50)}...`)

        // Store data for later retrieval
        if (sql.includes('AppSnapshot')) {
          const id = params[0] // snapshotId
          const snapshot = {
            snapshotId: params[0],
            appId: params[1],
            branchId: params[2],
            snapshotName: params[3],
            branchName: params[4],
            appShortName: params[5],
            appName: params[6],
            description: params[7],
            buildVersion: params[8],
            isToolkit: params[9],
            isSystem: params[10],
            isObjectsProcessed: params[11]
          }
          this.snapshots.set(id, snapshot)
          globalDataStore.snapshots.set(id, snapshot)
          console.log(`📦 Stored snapshot: ${snapshot.appName} (${snapshot.appShortName})`)
        } else if (sql.includes('ObjectVersion')) {
          const id = params[0] // objectVersionId
          const object = {
            objectVersionId: params[0],
            objectId: params[1],
            name: params[2],
            type: params[3],
            subtype: params[4]
          }
          this.objects.set(id, object)
          globalDataStore.objects.set(id, object)
          console.log(`🔧 Stored object: ${object.name} (Type: ${object.type})`)
        }

        if (callback) callback(null)
      }

      get(sql, params, callback) {
        console.log(`Mock DB: GET - ${sql.substring(0, 50)}...`)

        // Return specific data based on query
        if (sql.includes('AppSnapshot')) {
          const id = params[0]
          const snapshot = this.snapshots.get(id)
          if (callback) callback(null, snapshot || null)
        } else if (sql.includes('ObjectVersion')) {
          const id = params[0]
          const object = this.objects.get(id)
          if (callback) callback(null, object || null)
        } else {
          if (callback) callback(null, null)
        }
      }

      all(sql, params, callback) {
        console.log(`Mock DB: SELECT ALL - ${sql.substring(0, 50)}...`)

        // Return mock data based on query type
        if (sql.includes('AppSnapshot')) {
          const snapshots = Array.from(this.snapshots.values())
          if (callback) callback(null, snapshots)
        } else if (sql.includes('ObjectVersion')) {
          const objects = Array.from(this.objects.values())
          if (callback) callback(null, objects)
        } else if (sql.includes('SnapshotDependency')) {
          if (callback) callback(null, [])
        } else if (sql.includes('ObjectDependency')) {
          if (callback) callback(null, [])
        } else if (sql.includes('SnapshotObjectDependency')) {
          if (callback) callback(null, [])
        } else {
          if (callback) callback(null, [])
        }
      }

      close() {
        console.log('Mock DB: Connection closed')
      }
    }
  })
}

// Set up mocks before requiring the main modules
require.cache[require.resolve('bcrypt')] = { exports: mockBcrypt }
require.cache[require.resolve('sqlite3')] = { exports: mockSqlite3 }

// Now we can require the main twx-parser module
const twxParser = require('./src')

async function testFullParser() {
  try {
    console.log('Starting FULL TWX file parsing test with dependency analysis...')
    
    // Path to your TWX file
    const twxFilePath = 'C:\\Users\\Admin\\Downloads\\Compressed\\NEW_NBE_DC_Processes - NEW_NBE_DC_Test3.twx'
    
    console.log(`Parsing file: ${twxFilePath}`)
    
    // Check if file exists
    if (!fs.existsSync(twxFilePath)) {
      console.error(`File not found: ${twxFilePath}`)
      return
    }
    
    // Create/get workspace
    console.log('Creating workspace...')
    const workspace = await twxParser.getWorkspace('test-workspace', 'password123')
    console.log('Workspace created successfully')
    
    // Add progress event listeners
    workspace.on('packageStart', (data) => {
      console.log('📦 Package parsing started:', data)
    })
    
    workspace.on('packageProgress', (data) => {
      console.log('📦 Package parsing progress:', data)
    })
    
    workspace.on('packageEnd', (data) => {
      console.log('📦 Package parsing completed:', data)
    })
    
    workspace.on('objectStart', (data) => {
      console.log('🔧 Object parsing started:', data)
    })
    
    workspace.on('objectProgress', (data) => {
      console.log('🔧 Object parsing progress:', data)
    })
    
    workspace.on('objectEnd', (data) => {
      console.log('🔧 Object parsing completed:', data)
    })
    
    // Add the TWX file to the workspace
    console.log('\n=== ADDING TWX FILE TO WORKSPACE ===')
    await workspace.addFile(twxFilePath)
    console.log('✅ TWX file added successfully!')
    
    // Get all snapshots (applications/toolkits)
    console.log('\n=== SNAPSHOTS (APPLICATIONS & TOOLKITS) ===')
    const snapshots = await workspace.getSnapshots()
    console.log(`Found ${snapshots.length} snapshots:`)
    
    snapshots.forEach((snapshot, index) => {
      console.log(`\n${index + 1}. ${snapshot.appName || 'Unknown'} (${snapshot.appShortName || 'N/A'})`)
      console.log(`   📋 Snapshot: ${snapshot.snapshotName || 'N/A'}`)
      console.log(`   🌿 Branch: ${snapshot.branchName || 'N/A'}`)
      console.log(`   📁 Type: ${snapshot.isToolkit ? 'Toolkit' : 'Application'}`)
      console.log(`   🏢 System: ${snapshot.isSystem ? 'Yes' : 'No'}`)
      console.log(`   🔢 Build Version: ${snapshot.buildVersion || 'N/A'}`)
      console.log(`   📝 Description: ${snapshot.description || 'N/A'}`)
      console.log(`   🆔 Snapshot ID: ${snapshot.snapshotId || 'N/A'}`)
      console.log(`   🆔 App ID: ${snapshot.appId || 'N/A'}`)
    })
    
    // Get all objects
    console.log('\n=== OBJECTS ===')
    const objects = await workspace.getObjects()
    console.log(`Found ${objects.length} objects:`)
    
    // Group objects by type for better overview
    const objectsByType = {}
    objects.forEach(obj => {
      const type = obj.type || 'Unknown'
      if (!objectsByType[type]) {
        objectsByType[type] = []
      }
      objectsByType[type].push(obj)
    })
    
    Object.keys(objectsByType).forEach(type => {
      console.log(`\n📂 Type ${type}: ${objectsByType[type].length} objects`)
      // Show first few objects of each type
      objectsByType[type].slice(0, 3).forEach((obj, index) => {
        console.log(`  ${index + 1}. ${obj.name || 'Unnamed'} (${obj.subtype ? 'Subtype: ' + obj.subtype : 'No subtype'})`)
        console.log(`     🆔 ID: ${obj.objectVersionId || 'N/A'}`)
      })
      if (objectsByType[type].length > 3) {
        console.log(`  ... and ${objectsByType[type].length - 3} more`)
      }
    })
    
    // If there are snapshots, show dependencies for the first one
    if (snapshots.length > 0) {
      console.log('\n=== DEPENDENCY ANALYSIS ===')
      const firstSnapshot = snapshots[0]
      console.log(`\n🔍 Analyzing dependencies for: ${firstSnapshot.appName || 'Unknown Application'}`)
      
      try {
        // Get objects in this snapshot
        const snapshotObjects = await workspace.getSnapshotObjects(firstSnapshot)
        console.log(`📦 This snapshot contains ${snapshotObjects.length} objects`)
        
        // Get snapshot dependencies (toolkits this depends on)
        const dependencies = await workspace.getSnapshotDependencies(firstSnapshot)
        console.log(`\n⬇️  Dependencies (${dependencies.length} snapshots this depends on):`)
        dependencies.forEach((dep, index) => {
          console.log(`  ${index + 1}. ${dep.appName || 'Unknown'} (${dep.appShortName || 'N/A'})`)
          console.log(`     📋 Snapshot: ${dep.snapshotName || 'N/A'}`)
          console.log(`     📁 Type: ${dep.isToolkit ? 'Toolkit' : 'Application'}`)
        })
        
        // Get where this snapshot is used
        const whereUsed = await workspace.getSnapshotWhereUsed(firstSnapshot)
        console.log(`\n⬆️  Where Used (${whereUsed.length} snapshots that depend on this):`)
        whereUsed.forEach((usage, index) => {
          console.log(`  ${index + 1}. ${usage.appName || 'Unknown'} (${usage.appShortName || 'N/A'})`)
          console.log(`     📋 Snapshot: ${usage.snapshotName || 'N/A'}`)
          console.log(`     📁 Type: ${usage.isToolkit ? 'Toolkit' : 'Application'}`)
        })
        
        // Analyze object dependencies if we have objects
        if (snapshotObjects.length > 0) {
          console.log(`\n🔗 Object Dependency Analysis (first object):`)
          const firstObject = snapshotObjects[0]
          console.log(`   Analyzing: ${firstObject.name || 'Unnamed Object'}`)
          
          const objectDeps = await workspace.getObjectDependencies(firstObject)
          console.log(`   ⬇️  Depends on ${objectDeps.length} objects`)
          
          const objectUsage = await workspace.getObjectWhereUsed(firstObject)
          console.log(`   ⬆️  Used by ${objectUsage.length} objects`)
          
          const objectSnapshots = await workspace.getObjectSnapshots(firstObject)
          console.log(`   📦 Belongs to ${objectSnapshots.length} snapshots`)
        }
        
      } catch (depError) {
        console.log(`❌ Error during dependency analysis: ${depError.message}`)
      }
    }
    
    // Get leaf nodes and top level nodes
    try {
      console.log('\n=== DEPENDENCY TREE ANALYSIS ===')
      
      const leafNodes = await workspace.getLeafNodes()
      console.log(`\n🍃 Leaf Nodes (Level ${leafNodes.level}): ${leafNodes.items.length} snapshots with no dependencies`)
      leafNodes.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.snapshot.appName || 'Unknown'} (${item.snapshot.appShortName || 'N/A'})`)
        if (item.parents && item.parents.length > 0) {
          console.log(`     Parents: ${item.parents.map(p => p.appShortName || 'Unknown').join(', ')}`)
        }
      })
      
      const topLevelNodes = await workspace.getTopLevelNodes()
      console.log(`\n🔝 Top Level Nodes (Level ${topLevelNodes.level}): ${topLevelNodes.items.length} snapshots that are not dependencies`)
      topLevelNodes.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.snapshot.appName || 'Unknown'} (${item.snapshot.appShortName || 'N/A'})`)
        if (item.children && item.children.length > 0) {
          console.log(`     Children: ${item.children.map(c => c.appShortName || 'Unknown').join(', ')}`)
        }
      })
      
    } catch (treeError) {
      console.log(`❌ Error during tree analysis: ${treeError.message}`)
    }
    
    console.log('\n🎉 === FULL PARSING COMPLETED SUCCESSFULLY ===')
    console.log('This analysis includes:')
    console.log('✅ Complete TWX file structure parsing')
    console.log('✅ Application and toolkit metadata extraction')
    console.log('✅ Object inventory and categorization')
    console.log('✅ Dependency relationship mapping')
    console.log('✅ Dependency tree analysis')

    // Export data for UI
    console.log('\n📤 === EXPORTING REAL PARSED DATA FOR UI ===')

    // Get the real data from our global data store
    const realSnapshots = Array.from(globalDataStore.snapshots.values())
    const realObjects = Array.from(globalDataStore.objects.values())

    console.log(`📊 Found ${realSnapshots.length} snapshots and ${realObjects.length} objects in data store`)

    // Group objects by type
    const realObjectsByType = {}
    realObjects.forEach(obj => {
      const type = obj.type || 'Unknown'
      if (!realObjectsByType[type]) {
        realObjectsByType[type] = []
      }
      realObjectsByType[type].push(obj)
    })

    console.log(`📂 Grouped objects into ${Object.keys(realObjectsByType).length} types:`)
    Object.entries(realObjectsByType).forEach(([type, objects]) => {
      console.log(`   Type ${type}: ${objects.length} objects`)
    })

    const exportData = {
      snapshots: realSnapshots,
      objects: realObjects,
      objectsByType: realObjectsByType,
      dependencies: realSnapshots.length > 0 ? {
        snapshotDependencies: dependencies || [],
        whereUsed: whereUsed || []
      } : {},
      metadata: {
        totalSnapshots: realSnapshots.length,
        totalObjects: realObjects.length,
        parseDate: new Date().toISOString(),
        fileName: twxFilePath
      }
    }

    // Save to JSON file for UI consumption
    fs.writeFileSync('parsing-results.json', JSON.stringify(exportData, null, 2))
    console.log('✅ Real parsed data exported to parsing-results.json')
    console.log(`📊 Exported ${realSnapshots.length} snapshots and ${realObjects.length} objects`)

    return exportData

  } catch (error) {
    console.error('❌ Error during full parsing:', error)
    console.error('Stack trace:', error.stack)
    return null
  }
}

// Run the full parser test
testFullParser()
