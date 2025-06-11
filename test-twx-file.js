const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')

// Simple TWX file analyzer without database dependencies

async function analyzeTwxFile() {
  try {
    console.log('Starting TWX file analysis...')

    // Path to your TWX file
    const twxFilePath = 'C:\\Users\\Admin\\Downloads\\Compressed\\NEW_NBE_DC_Processes - NEW_NBE_DC_Test3.twx'

    console.log(`Analyzing file: ${twxFilePath}`)

    // Check if file exists
    if (!fs.existsSync(twxFilePath)) {
      console.error(`File not found: ${twxFilePath}`)
      return
    }

    // Read and analyze the TWX file
    console.log('Reading TWX file...')
    const data = fs.readFileSync(twxFilePath)
    const zip = new ADMZip(data)

    console.log('\n=== TWX FILE STRUCTURE ===')
    const entries = zip.getEntries()
    console.log(`Found ${entries.length} entries in the TWX file:`)

    // Analyze the structure
    const structure = {
      applications: [],
      toolkits: [],
      objects: [],
      metadata: []
    }

    entries.forEach((entry, index) => {
      const entryName = entry.entryName
      console.log(`${index + 1}. ${entryName} (${entry.header.size} bytes)`)

      if (entryName.includes('toolkits/')) {
        structure.toolkits.push(entryName)
      } else if (entryName.includes('.xml')) {
        structure.metadata.push(entryName)
      } else if (entryName.includes('objects/')) {
        structure.objects.push(entryName)
      } else {
        structure.applications.push(entryName)
      }
    })

    console.log('\n=== STRUCTURE SUMMARY ===')
    console.log(`Applications: ${structure.applications.length}`)
    console.log(`Toolkits: ${structure.toolkits.length}`)
    console.log(`Objects: ${structure.objects.length}`)
    console.log(`Metadata files: ${structure.metadata.length}`)

    // Try to find and read the main package file
    console.log('\n=== MAIN APPLICATION METADATA ===')
    const packageEntry = entries.find(entry => entry.entryName === 'META-INF/package.xml')

    if (packageEntry) {
      console.log(`Found package file: ${packageEntry.entryName}`)
      try {
        const packageContent = packageEntry.getData().toString('utf8')
        console.log('Package content preview:')
        console.log(packageContent.substring(0, 1000) + '...')

        // Try to extract application info
        const appNameMatch = packageContent.match(/<name[^>]*>([^<]+)<\/name>/)
        const versionMatch = packageContent.match(/<version[^>]*>([^<]+)<\/version>/)
        const descMatch = packageContent.match(/<description[^>]*>([^<]+)<\/description>/)
        const acronymMatch = packageContent.match(/<acronym[^>]*>([^<]+)<\/acronym>/)
        const branchMatch = packageContent.match(/<branch[^>]*>([^<]+)<\/branch>/)
        const snapshotMatch = packageContent.match(/<snapshot[^>]*>([^<]+)<\/snapshot>/)

        console.log('\n--- Application Details ---')
        if (appNameMatch) console.log(`Application Name: ${appNameMatch[1]}`)
        if (acronymMatch) console.log(`Acronym: ${acronymMatch[1]}`)
        if (versionMatch) console.log(`Version: ${versionMatch[1]}`)
        if (branchMatch) console.log(`Branch: ${branchMatch[1]}`)
        if (snapshotMatch) console.log(`Snapshot: ${snapshotMatch[1]}`)
        if (descMatch) console.log(`Description: ${descMatch[1]}`)

        // Try to extract dependency information
        const dependencyMatches = packageContent.match(/<dependency[^>]*>[\s\S]*?<\/dependency>/g)
        if (dependencyMatches && dependencyMatches.length > 0) {
          console.log(`\n--- Dependencies (${dependencyMatches.length}) ---`)
          dependencyMatches.forEach((dep, index) => {
            const depNameMatch = dep.match(/<name[^>]*>([^<]+)<\/name>/)
            const depVersionMatch = dep.match(/<version[^>]*>([^<]+)<\/version>/)
            const depAcronymMatch = dep.match(/<acronym[^>]*>([^<]+)<\/acronym>/)

            console.log(`${index + 1}. ${depNameMatch ? depNameMatch[1] : 'Unknown'}`)
            if (depAcronymMatch) console.log(`   Acronym: ${depAcronymMatch[1]}`)
            if (depVersionMatch) console.log(`   Version: ${depVersionMatch[1]}`)
          })
        }

      } catch (err) {
        console.log('Could not read package content:', err.message)
      }
    } else {
      console.log('No package.xml file found')
    }

    // Analyze toolkits
    if (structure.toolkits.length > 0) {
      console.log('\n=== TOOLKITS ===')
      structure.toolkits.forEach((toolkitPath, index) => {
        console.log(`${index + 1}. ${toolkitPath}`)
        try {
          const toolkitEntry = zip.getEntry(toolkitPath)
          if (toolkitEntry) {
            const toolkitData = toolkitEntry.getData()
            const toolkitZip = new ADMZip(toolkitData)
            const toolkitEntries = toolkitZip.getEntries()
            console.log(`   Contains ${toolkitEntries.length} files`)

            // Try to find toolkit metadata
            const toolkitMeta = toolkitEntries.find(e =>
              e.entryName.includes('metadata.xml') || e.entryName === 'package.xml'
            )
            if (toolkitMeta) {
              try {
                const content = toolkitMeta.getData().toString('utf8')
                const nameMatch = content.match(/<name[^>]*>([^<]+)<\/name>/)
                if (nameMatch) {
                  console.log(`   Toolkit Name: ${nameMatch[1]}`)
                }
              } catch (err) {
                console.log(`   Could not read toolkit metadata: ${err.message}`)
              }
            }
          }
        } catch (err) {
          console.log(`   Error analyzing toolkit: ${err.message}`)
        }
      })
    }

    console.log('\n=== ANALYSIS COMPLETED ===')
    console.log('This is a basic structural analysis of the TWX file.')
    console.log('For full parsing with dependency analysis, the complete twx-parser library with database support would be needed.')

  } catch (error) {
    console.error('Error analyzing TWX file:', error)
    console.error('Stack trace:', error.stack)
  }
}

// Run the analysis
analyzeTwxFile()
