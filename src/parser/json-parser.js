const fs = require('fs')
const path = require('path')
const TWXExtractor = require('./twx-extractor')
const { groupByType } = require('../utils/type-mappings')
const { objectTypeFileName, combinedObjectTypeFileName } = require('../utils/file-names')

/**
 * JSON-based TWX parser that outputs structured JSON files
 */
class JSONParser {
  constructor(outputDir = './output') {
    this.outputDir = outputDir
    this.extractor = new TWXExtractor()
    this.ensureOutputDir()
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  /**
   * Parse a TWX file and generate JSON output files
   * @param {string} twxFilePath - Path to the TWX file
   * @returns {Promise<Object>} Parsing return { summary, objects: this.objects }
   */
  async parseTWX(twxFilePath) {
    try {
      console.log(`Starting TWX parsing: ${twxFilePath}`)
      
      // Extract data from TWX file
      const extractedData = await this.extractor.extractTWX(twxFilePath)
      
      
      // Generate output files
      const results = await this.generateOutputFiles(extractedData)
      
      console.log(`TWX parsing completed successfully`)
      console.log(`Generated ${results.filesGenerated.length} output files`)
      
      return { ...results, objects: extractedData.objects }
    } catch (error) {
      console.error('Error parsing TWX file:', error)
      throw error
    }
  }
  /**
   * Generate structured JSON output files
   * @param {Object} extractedData - Data extracted from TWX file
   * @returns {Promise<Object>} Generation results
   */
  async generateOutputFiles(extractedData) {
    const filesGenerated = []
    
    // 1. Generate main summary file
    const summaryFile = await this.generateSummaryFile(extractedData)
    filesGenerated.push(summaryFile)
    
    // 2. Generate objects by type files (main application objects)
    const typeFiles = await this.generateObjectsByTypeFiles(extractedData.objects)
    filesGenerated.push(...typeFiles)
    
    // 🆕 3. Generate toolkit object files if any
    if (extractedData.toolkits && extractedData.toolkits.length > 0) {
      const allToolkitObjects = extractedData.toolkits.flatMap(toolkit => toolkit.objects || [])
      
      if (allToolkitObjects.length > 0) {
        console.log(`📦 Generating toolkit object files for ${allToolkitObjects.length} toolkit objects...`)
        const toolkitTypeFiles = await this.generateToolkitObjectsByTypeFiles(allToolkitObjects)
        filesGenerated.push(...toolkitTypeFiles)
      }
    }

    // 🆕 4. Generate combined object files (app + toolkit)
    if (extractedData.allObjects && extractedData.allObjects.length > 0) {
      console.log(`🔗 Generating combined object files for ${extractedData.allObjects.length} total objects...`)
      const combinedTypeFiles = await this.generateCombinedObjectsByTypeFiles(extractedData.allObjects)
      filesGenerated.push(...combinedTypeFiles)
    }

    // 🆕 5. Generate dependencies file
    const depsFile = await this.generateDependenciesFile(extractedData.dependencies || [])
    filesGenerated.push(depsFile)

    // 6. Generate metadata file
    const metadataFile = await this.generateMetadataFile(extractedData)
    filesGenerated.push(metadataFile)
    
    // 7. Generate enhanced toolkits file if any
    if (extractedData.toolkits && extractedData.toolkits.length > 0) {
      const toolkitsFile = await this.generateToolkitsFile(extractedData.toolkits)
      filesGenerated.push(toolkitsFile)
    }

    return {
      filesGenerated: filesGenerated.filter(Boolean), // Remove any null/undefined entries
      summary: {
        totalObjects: extractedData.allObjects ? extractedData.allObjects.length : extractedData.objects.length,
        applicationObjects: extractedData.objects.length,
        toolkitObjects: extractedData.toolkits ? extractedData.toolkits.reduce((sum, tk) => sum + (tk.objects?.length || 0), 0) : 0,
        objectTypes: Object.keys(groupByType(extractedData.allObjects || extractedData.objects)).length,
        toolkits: extractedData.toolkits.length,
        extractedAt: extractedData.extractedAt,
        sourceFile: extractedData.sourceFile
      }
    }
  }
  /**
   * Generate main summary file for the UI
   * @param {Object} extractedData - Extracted data
   * @returns {Promise<string>} Generated file path
   */
  async generateSummaryFile(extractedData) {
    const groupedObjects = groupByType(extractedData.objects)
    
    // 🆕 Calculate toolkit statistics
    const allToolkitObjects = extractedData.toolkits ? extractedData.toolkits.flatMap(toolkit => toolkit.objects || []) : []
    const toolkitObjectsByType = groupByType(allToolkitObjects)
    
    // 🆕 Calculate combined statistics
    const allObjects = extractedData.allObjects || extractedData.objects
    const combinedObjectsByType = groupByType(allObjects)
    
    const summary = {
      metadata: extractedData.metadata,
      statistics: {
        totalObjects: allObjects.length,
        applicationObjects: extractedData.objects.length,
        toolkitObjects: allToolkitObjects.length,
        objectTypes: Object.keys(combinedObjectsByType).length,
        toolkits: extractedData.toolkits.length,
        extractedAt: extractedData.extractedAt,
        sourceFile: extractedData.sourceFile
      },
      objectsByType: Object.keys(combinedObjectsByType).map(typeName => {
        const allTypeObjects = combinedObjectsByType[typeName] || []
        const appTypeObjects = allTypeObjects.filter(obj => obj.source === 'application')
        const toolkitTypeObjects = allTypeObjects.filter(obj => obj.source === 'toolkit')
        
        return {
          typeName,
          count: allTypeObjects.length,
          applicationCount: appTypeObjects.length,
          toolkitCount: toolkitTypeObjects.length,
          objects: allTypeObjects.map(obj => ({
            id: obj.id,
            name: obj.name,
            versionId: obj.versionId,
            type: obj.type,
            subType: obj.subType,
            source: obj.source, // 🆕 Include source information
            toolkitInfo: obj.toolkitInfo, // 🆕 Include toolkit info if available
            hasDetails: !!obj.details && Object.keys(obj.details).length > 0
          }))
        }
      }).sort((a, b) => {
        // Sort CSHS first, then by count descending
        if (a.typeName === 'CSHS') return -1;
        if (b.typeName === 'CSHS') return 1;
        return b.count - a.count;
      }),
      toolkits: extractedData.toolkits
    }
    
    const filePath = path.join(this.outputDir, 'twx-summary.json')
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2))
    
    console.log(`Generated summary file: ${filePath}`)
    console.log(`  - Total objects: ${summary.statistics.totalObjects}`)
    console.log(`  - Application objects: ${summary.statistics.applicationObjects}`)
    console.log(`  - Toolkit objects: ${summary.statistics.toolkitObjects}`)
    console.log(`  - Toolkits: ${summary.statistics.toolkits}`)
    
    return filePath
  }

  /**
   * Generate separate files for each object type
   * @param {Array} objects - Array of objects
   * @returns {Promise<Array>} Array of generated file paths
   */
  async generateObjectsByTypeFiles(objects) {
    const groupedObjects = groupByType(objects)
    const filesGenerated = []
    
    for (const [typeName, typeObjects] of Object.entries(groupedObjects)) {
      const fileName = objectTypeFileName(typeName)
      const filePath = path.join(this.outputDir, fileName)

      const typeData = {
        typeName,
        count: typeObjects.length,
        objects: typeObjects.sort((a, b) => a.name.localeCompare(b.name)) // Sort by name
      }

      fs.writeFileSync(filePath, JSON.stringify(typeData, null, 2))
      filesGenerated.push(filePath)

      console.log(`Generated ${typeName} objects file: ${filePath} (${typeObjects.length} objects)`)
    }

    // Generate individual object files
    const individualFilesGenerated = await this.generateIndividualObjectFiles(objects)
    filesGenerated.push(...individualFilesGenerated)

    return filesGenerated
  }

  /**
   * Individual object files are no longer generated
   * This method is kept for backward compatibility but returns an empty array
   * @returns {Promise<Array>} Empty array
   */
  async generateIndividualObjectFiles() {
    return []
  }

  /**
   * Complete objects file is no longer generated
   * This method is kept for backward compatibility but returns null
   * @returns {Promise<null>} Always returns null
   */
  async generateCompleteObjectsFile() {
    return null
  }

  /**
   * Generate metadata file
   * @param {Object} metadata - Project metadata
   * @returns {Promise<string>} Generated file path
   */
  async generateMetadataFile(metadata) {
    const filePath = path.join(this.outputDir, 'metadata.json')
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2))
    
    console.log(`Generated metadata file: ${filePath}`)
    return filePath
  }

  /**
   * Generate toolkits file
   * @param {Array} toolkits - Array of toolkit information
   * @returns {Promise<string>} Generated file path
   */
  async generateToolkitsFile(toolkits) {
    const filePath = path.join(this.outputDir, 'toolkits.json')
    
    const data = {
      count: toolkits.length,
      toolkits: toolkits
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    
    console.log(`Generated toolkits file: ${filePath}`)
    return filePath
  }

  /**
   * Generate dependencies file
   * @param {Array} dependencies - Array of dependency objects
   * @returns {Promise<string>} Generated file path
   */
  async generateDependenciesFile(dependencies) {
    const filePath = path.join(this.outputDir, 'dependencies.json')

    const data = {
      count: dependencies.length,
      dependencies: dependencies
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

    // ponytail: also write to root so the static file server can serve it at /dependencies.json
    fs.writeFileSync('dependencies.json', JSON.stringify(data, null, 2))

    console.log(`Generated dependencies file: ${filePath} (${dependencies.length} deps)`)
    return filePath
  }

  /**
   * Generate separate files for each toolkit object type
   * @param {Array} toolkitObjects - Array of toolkit objects
   * @returns {Promise<Array>} Array of generated file paths
   */
  async generateToolkitObjectsByTypeFiles(toolkitObjects) {
    const groupedObjects = groupByType(toolkitObjects)
    const filesGenerated = []
    
    for (const [typeName, typeObjects] of Object.entries(groupedObjects)) {
      const fileName = `toolkit-objects-${typeName.toLowerCase().replace(/\s+/g, '-')}.json`
      const filePath = path.join(this.outputDir, fileName)

      const typeData = {
        typeName,
        count: typeObjects.length,
        source: 'toolkit',
        objects: typeObjects.sort((a, b) => a.name.localeCompare(b.name))
      }

      fs.writeFileSync(filePath, JSON.stringify(typeData, null, 2))
      filesGenerated.push(filePath)

      console.log(`Generated toolkit ${typeName} objects file: ${filePath} (${typeObjects.length} objects)`)
    }

    return filesGenerated
  }

  /**
   * Generate combined files for each object type (app + toolkit)
   * @param {Array} allObjects - Array of all objects (app + toolkit)
   * @returns {Promise<Array>} Array of generated file paths
   */
  async generateCombinedObjectsByTypeFiles(allObjects) {
    const groupedObjects = groupByType(allObjects)
    const filesGenerated = []
    
    for (const [typeName, typeObjects] of Object.entries(groupedObjects)) {
      const appObjects = typeObjects.filter(obj => obj.source === 'application')
      const toolkitObjects = typeObjects.filter(obj => obj.source === 'toolkit')
      
      const fileName = combinedObjectTypeFileName(typeName)
      const filePath = path.join(this.outputDir, fileName)

      const typeData = {
        typeName,
        count: typeObjects.length,
        applicationCount: appObjects.length,
        toolkitCount: toolkitObjects.length,
        objects: typeObjects.sort((a, b) => {
          // Sort by source first (app then toolkit), then by name
          if (a.source !== b.source) {
            return a.source === 'application' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
      }

      fs.writeFileSync(filePath, JSON.stringify(typeData, null, 2))
      filesGenerated.push(filePath)

      console.log(`Generated combined ${typeName} objects file: ${filePath} (${appObjects.length} app + ${toolkitObjects.length} toolkit)`)
    }

    return filesGenerated
  }

  /**
   * Get list of generated files
   * @returns {Array} Array of file paths in output directory
   */
  getGeneratedFiles() {
    if (!fs.existsSync(this.outputDir)) {
      return []
    }
    
    return fs.readdirSync(this.outputDir)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(this.outputDir, file))
  }
}

/**
 * Convenience function to create JSON output from extracted data
 * @param {Object} extractedData - Data extracted from TWX file
 * @param {string} outputDir - Output directory path
 * @returns {Promise<Object>} Generation results
 */
async function createJSONOutput(extractedData, outputDir = './output') {
  const parser = new JSONParser(outputDir);
  return await parser.generateOutputFiles(extractedData);
}

module.exports = { JSONParser, createJSONOutput };
