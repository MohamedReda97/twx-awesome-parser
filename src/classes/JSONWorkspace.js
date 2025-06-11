const fs = require('fs')
const path = require('path')
const JSONParser = require('../parser/json-parser')

/**
 * JSON-based workspace that replaces the database-dependent Workspace class
 */
class JSONWorkspace {
  /**
   * Create a JSON workspace
   * @param {string} outputDir - Directory where JSON files are stored
   */
  constructor(outputDir = './output') {
    this.outputDir = outputDir
    this.parser = new JSONParser(outputDir)
    this.data = null
  }

  /**
   * Parse a TWX file and store results as JSON
   * @param {string} filePath - Path to the TWX file
   * @returns {Promise<Object>} Parsing results
   */
  async addFile(filePath) {
    try {
      const results = await this.parser.parseTWX(filePath)
      await this.loadData()
      return results
    } catch (error) {
      console.error('Error adding file:', error)
      throw error
    }
  }

  /**
   * Load data from JSON files
   * @returns {Promise<void>}
   */
  async loadData() {
    try {
      const summaryPath = path.join(this.outputDir, 'twx-summary.json')
      if (fs.existsSync(summaryPath)) {
        const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
        this.data = summaryData
      } else {
        this.data = null
      }
    } catch (error) {
      console.error('Error loading data:', error)
      this.data = null
    }
  }

  /**
   * Get project metadata
   * @returns {Object|null} Project metadata
   */
  getMetadata() {
    return this.data ? this.data.metadata : null
  }

  /**
   * Get parsing statistics
   * @returns {Object|null} Statistics
   */
  getStatistics() {
    return this.data ? this.data.statistics : null
  }

  /**
   * Get all objects grouped by type
   * @returns {Array} Array of type groups
   */
  getObjectsByType() {
    return this.data ? this.data.objectsByType : []
  }

  /**
   * Get objects of a specific type
   * @param {string} typeName - Name of the type
   * @returns {Array} Array of objects
   */
  getObjectsOfType(typeName) {
    if (!this.data) return []
    
    const typeGroup = this.data.objectsByType.find(group => group.typeName === typeName)
    return typeGroup ? typeGroup.objects : []
  }

  /**
   * Search objects by name
   * @param {string} searchTerm - Search term
   * @returns {Array} Array of matching objects
   */
  searchObjects(searchTerm) {
    if (!this.data || !searchTerm) return []
    
    const results = []
    const lowerSearchTerm = searchTerm.toLowerCase()
    
    this.data.objectsByType.forEach(typeGroup => {
      typeGroup.objects.forEach(obj => {
        if (obj.name.toLowerCase().includes(lowerSearchTerm)) {
          results.push({
            ...obj,
            typeName: typeGroup.typeName
          })
        }
      })
    })
    
    return results
  }

  /**
   * Get detailed object information
   * @param {string} objectId - Object ID
   * @returns {Promise<Object|null>} Object details
   */
  async getObjectDetails(objectId) {
    if (!this.data) return null
    
    // First find the object in the summary
    let foundObject = null
    let typeName = null
    
    for (const typeGroup of this.data.objectsByType) {
      const obj = typeGroup.objects.find(o => o.id === objectId)
      if (obj) {
        foundObject = obj
        typeName = typeGroup.typeName
        break
      }
    }
    
    if (!foundObject) return null
    
    // Try to load detailed information from type-specific file
    try {
      const typeFileName = `objects-${typeName.toLowerCase().replace(/\s+/g, '-')}.json`
      const typeFilePath = path.join(this.outputDir, typeFileName)
      
      if (fs.existsSync(typeFilePath)) {
        const typeData = JSON.parse(fs.readFileSync(typeFilePath, 'utf8'))
        const detailedObject = typeData.objects.find(o => o.id === objectId)
        return detailedObject || foundObject
      }
    } catch (error) {
      console.warn('Error loading detailed object information:', error)
    }
    
    return foundObject
  }

  /**
   * Get toolkit information
   * @returns {Array} Array of toolkits
   */
  getToolkits() {
    return this.data ? this.data.toolkits : []
  }

  /**
   * Export data to a specific format
   * @param {string} format - Export format ('json', 'csv')
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async exportData(format = 'json', outputPath = null) {
    if (!this.data) {
      throw new Error('No data loaded. Parse a TWX file first.')
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const defaultPath = outputPath || path.join(this.outputDir, `export-${timestamp}.${format}`)
    
    switch (format.toLowerCase()) {
      case 'json':
        fs.writeFileSync(defaultPath, JSON.stringify(this.data, null, 2))
        break
        
      case 'csv':
        const csvData = this.convertToCSV()
        fs.writeFileSync(defaultPath, csvData)
        break
        
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
    
    console.log(`Data exported to: ${defaultPath}`)
    return defaultPath
  }

  /**
   * Convert data to CSV format
   * @returns {string} CSV data
   */
  convertToCSV() {
    const headers = ['Type', 'Name', 'ID', 'Version ID', 'Has Details']
    const rows = [headers.join(',')]
    
    this.data.objectsByType.forEach(typeGroup => {
      typeGroup.objects.forEach(obj => {
        const row = [
          `"${typeGroup.typeName}"`,
          `"${obj.name || ''}"`,
          `"${obj.id || ''}"`,
          `"${obj.versionId || ''}"`,
          obj.hasDetails ? 'Yes' : 'No'
        ]
        rows.push(row.join(','))
      })
    })
    
    return rows.join('\n')
  }

  /**
   * Get summary report
   * @returns {Object} Summary report
   */
  getSummaryReport() {
    if (!this.data) return null
    
    const report = {
      metadata: this.data.metadata,
      statistics: this.data.statistics,
      typeBreakdown: this.data.objectsByType.map(typeGroup => ({
        typeName: typeGroup.typeName,
        count: typeGroup.count,
        percentage: ((typeGroup.count / this.data.statistics.totalObjects) * 100).toFixed(1)
      })).sort((a, b) => b.count - a.count),
      toolkits: this.data.toolkits.map(toolkit => ({
        name: toolkit.metadata.project.name,
        objectCount: toolkit.objectCount
      }))
    }
    
    return report
  }

  /**
   * Check if workspace has data
   * @returns {boolean} True if data is loaded
   */
  hasData() {
    return this.data !== null
  }

  /**
   * Get list of available JSON files
   * @returns {Array} Array of file paths
   */
  getAvailableFiles() {
    return this.parser.getGeneratedFiles()
  }

  /**
   * Clear all data and files
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      if (fs.existsSync(this.outputDir)) {
        const files = fs.readdirSync(this.outputDir)
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(this.outputDir, file))
          }
        }
      }
      this.data = null
      console.log('Workspace cleared')
    } catch (error) {
      console.error('Error clearing workspace:', error)
      throw error
    }
  }
}

module.exports = JSONWorkspace
