const fs = require('fs')
const path = require('path')
const TWXExtractor = require('./twx-extractor')
const { groupByType } = require('../utils/type-mappings')

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
      
      // Phase 2: Resolve cross-references for business objects
      const businessObjects = extractedData.objects.filter(obj => obj.type === 'twClass');
      if (businessObjects.length > 0) {
        console.log(`🔗 Phase 2: Resolving cross-references for ${businessObjects.length} business objects...`);
        this.extractor.resolveBusinessObjectCrossReferences(businessObjects);
      }
      
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
    
    // 2. Generate objects by type files
    const typeFiles = await this.generateObjectsByTypeFiles(extractedData.objects)
    filesGenerated.push(...typeFiles)
    
    // 3. Generate metadata file
    const metadataFile = await this.generateMetadataFile(extractedData)
    filesGenerated.push(metadataFile)
    
    // 4. Generate toolkits file if any
    if (extractedData.toolkits && extractedData.toolkits.length > 0) {
      const toolkitsFile = await this.generateToolkitsFile(extractedData.toolkits)
      filesGenerated.push(toolkitsFile)
    }

    return {
      filesGenerated: filesGenerated.filter(Boolean), // Remove any null/undefined entries
      summary: {
        totalObjects: extractedData.objects.length,
        objectTypes: Object.keys(groupByType(extractedData.objects)).length,
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
    
    const summary = {
      metadata: extractedData.metadata,
      statistics: {
        totalObjects: extractedData.objects.length,
        objectTypes: Object.keys(groupedObjects).length,
        toolkits: extractedData.toolkits.length,
        extractedAt: extractedData.extractedAt,
        sourceFile: extractedData.sourceFile
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
      toolkits: extractedData.toolkits
    }
    
    const filePath = path.join(this.outputDir, 'twx-summary.json')
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2))
    
    console.log(`Generated summary file: ${filePath}`)
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
      const fileName = `objects-${typeName.toLowerCase().replace(/\s+/g, '-')}.json`
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
