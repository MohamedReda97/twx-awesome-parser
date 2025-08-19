/**
 * TWXFileHandler - Handles direct modification of TWX files without extraction/compression cycle
 * Adds business objects to TWX files and updates package.xml automatically
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')

class TWXFileHandler {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp')
    this.ensureTempDir()
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
  }

  /**
   * Open TWX file for modification
   * @param {string} twxFilePath - Path to TWX file
   * @returns {Object} TWX file object with zip and metadata
   */
  openTWXFile(twxFilePath) {
    if (!fs.existsSync(twxFilePath)) {
      throw new Error(`TWX file not found: ${twxFilePath}`)
    }

    try {
      const data = fs.readFileSync(twxFilePath)
      const zip = new ADMZip(data)
      
      // Get basic metadata
      const entries = zip.getEntries()
      const packageEntry = entries.find(entry => entry.entryName === 'META-INF/package.xml')
      
      if (!packageEntry) {
        throw new Error('Invalid TWX file: META-INF/package.xml not found')
      }

      const packageXML = packageEntry.getData().toString('utf8')
      
      return {
        filePath: twxFilePath,
        zip: zip,
        packageXML: packageXML,
        entries: entries,
        metadata: this.extractTWXMetadata(packageXML),
        isModified: false
      }
    } catch (error) {
      throw new Error(`Failed to open TWX file: ${error.message}`)
    }
  }

  /**
   * Add new business object to TWX file
   * @param {Object} twxFile - TWX file object from openTWXFile
   * @param {string} businessObjectXML - Generated business object XML
   * @param {string} objectId - Business object ID
   * @returns {Object} Updated TWX file object
   */
  addBusinessObjectToTWX(twxFile, businessObjectXML, businessObject) {
    if (!twxFile || !twxFile.zip) {
      throw new Error('Invalid TWX file object')
    }

    if (!businessObjectXML || !businessObject || !businessObject.id) {
      throw new Error('Business object XML and business object with ID are required')
    }
    
    const objectId = businessObject.id

    try {
      // Generate filename for the business object
      const fileName = this.generateObjectFileName(objectId)
      
      // Check if object already exists
      const existingEntry = twxFile.zip.getEntry(fileName)
      if (existingEntry) {
        throw new Error(`Business object with ID ${objectId} already exists in TWX file`)
      }

      // Add the business object XML to the zip
      twxFile.zip.addFile(fileName, Buffer.from(businessObjectXML, 'utf8'))
      
      // Update package.xml
      const updatedPackageXML = this.updatePackageXMLInTWX(twxFile, {
        id: objectId,
        versionId: businessObject.versionId,
        name: businessObject.name,
        fileName: fileName,
        type: 'twClass'
      })

      // Update the package.xml in the zip (correct path)
      twxFile.zip.updateFile('META-INF/package.xml', Buffer.from(updatedPackageXML, 'utf8'))
      
      // Update TWX file object
      twxFile.packageXML = updatedPackageXML
      twxFile.isModified = true
      
      // Refresh entries list
      twxFile.entries = twxFile.zip.getEntries()

      return twxFile
    } catch (error) {
      throw new Error(`Failed to add business object to TWX: ${error.message}`)
    }
  }

  /**
   * Update package.xml within TWX to include new object
   * @param {Object} twxFile - TWX file object
   * @param {Object} newObjectInfo - New object information
   * @returns {string} Updated package.xml content
   */
  updatePackageXMLInTWX(twxFile, newObjectInfo) {
    if (!twxFile || !twxFile.packageXML) {
      throw new Error('Invalid TWX file or missing package.xml')
    }

    if (!newObjectInfo || !newObjectInfo.id || !newObjectInfo.fileName) {
      throw new Error('New object info must include id and fileName')
    }

    try {
      let packageXML = twxFile.packageXML
      
      // Find the closing tag of the objects section or create one
      const objectsEndTag = '</objects>'
      const objectsEndIndex = packageXML.indexOf(objectsEndTag)
      
      if (objectsEndIndex === -1) {
        // No objects section exists, create one
        const packageEndTag = '</package>'
        const packageEndIndex = packageXML.indexOf(packageEndTag)
        
        if (packageEndIndex === -1) {
          throw new Error('Invalid package.xml structure')
        }

        const objectsSection = `    <objects>
        <object id="${newObjectInfo.id}" versionId="${newObjectInfo.versionId}" name="${newObjectInfo.name}" type="${newObjectInfo.type || 'twClass'}"/>
    </objects>
`
        packageXML = packageXML.substring(0, packageEndIndex) + objectsSection + packageXML.substring(packageEndIndex)
      } else {
        // Objects section exists, add new object entry
        const newObjectEntry = `        <object id="${newObjectInfo.id}" versionId="${newObjectInfo.versionId}" name="${newObjectInfo.name}" type="${newObjectInfo.type || 'twClass'}"/>
`
        packageXML = packageXML.substring(0, objectsEndIndex) + newObjectEntry + packageXML.substring(objectsEndIndex)
      }

      return packageXML
    } catch (error) {
      throw new Error(`Failed to update package.xml: ${error.message}`)
    }
  }

  /**
   * Save modified TWX file
   * @param {Object} twxFile - Modified TWX file object
   * @param {string} outputPath - Output file path (optional, defaults to original path)
   * @returns {string} Path to saved file
   */
  saveTWXFile(twxFile, outputPath) {
    if (!twxFile || !twxFile.zip) {
      throw new Error('Invalid TWX file object')
    }

    const savePath = outputPath || twxFile.filePath
    
    try {
      // Create backup if overwriting original file
      if (savePath === twxFile.filePath && fs.existsSync(savePath)) {
        const backupPath = `${savePath}.backup.${Date.now()}`
        fs.copyFileSync(savePath, backupPath)
        console.log(`Created backup: ${backupPath}`)
      }

      // Write the modified TWX file
      const buffer = twxFile.zip.toBuffer()
      fs.writeFileSync(savePath, buffer)
      
      // Update file object
      twxFile.filePath = savePath
      twxFile.isModified = false

      return savePath
    } catch (error) {
      throw new Error(`Failed to save TWX file: ${error.message}`)
    }
  }

  /**
   * Generate object filename from object ID
   * @param {string} objectId - Object ID (e.g., "12.abc-def-123")
   * @returns {string} Generated filename
   */
  generateObjectFileName(objectId) {
    if (!objectId) {
      throw new Error('Object ID is required')
    }

    // Remove the "12." prefix and use the UUID part
    const cleanId = objectId.replace(/^12\./, '')
    return `objects/${cleanId}.xml`
  }

  /**
   * Extract basic metadata from package.xml
   * @param {string} packageXML - Package XML content
   * @returns {Object} Extracted metadata
   */
  extractTWXMetadata(packageXML) {
    const metadata = {}

    try {
      // Extract basic package information
      const nameMatch = packageXML.match(/<package[^>]*name="([^"]*)"/)
      if (nameMatch) metadata.name = nameMatch[1]

      const versionMatch = packageXML.match(/<package[^>]*version="([^"]*)"/)
      if (versionMatch) metadata.version = versionMatch[1]

      const idMatch = packageXML.match(/<package[^>]*id="([^"]*)"/)
      if (idMatch) metadata.id = idMatch[1]

      // Count existing objects
      const objectMatches = packageXML.match(/<object[^>]*>/g) || []
      metadata.objectCount = objectMatches.length

      // Extract object types
      const objectTypes = new Set()
      for (const objectMatch of objectMatches) {
        const typeMatch = objectMatch.match(/type="([^"]*)"/)
        if (typeMatch) objectTypes.add(typeMatch[1])
      }
      metadata.objectTypes = Array.from(objectTypes)

      return metadata
    } catch (error) {
      console.warn('Failed to extract TWX metadata:', error.message)
      return {}
    }
  }

  /**
   * List existing objects in TWX file
   * @param {Object} twxFile - TWX file object
   * @returns {Array} Array of existing object information
   */
  listExistingObjects(twxFile) {
    if (!twxFile || !twxFile.packageXML) {
      return []
    }

    const objects = []
    const objectMatches = twxFile.packageXML.match(/<object[^>]*>/g) || []

    for (const objectMatch of objectMatches) {
      const idMatch = objectMatch.match(/id="([^"]*)"/)
      const typeMatch = objectMatch.match(/type="([^"]*)"/)
      const fileNameMatch = objectMatch.match(/fileName="([^"]*)"/)

      if (idMatch) {
        objects.push({
          id: idMatch[1],
          type: typeMatch ? typeMatch[1] : 'unknown',
          fileName: fileNameMatch ? fileNameMatch[1] : 'unknown',
          exists: twxFile.zip.getEntry(fileNameMatch ? fileNameMatch[1] : '') !== null
        })
      }
    }

    return objects
  }

  /**
   * Check if object ID already exists in TWX
   * @param {Object} twxFile - TWX file object
   * @param {string} objectId - Object ID to check
   * @returns {boolean} True if object exists
   */
  objectExists(twxFile, objectId) {
    const existingObjects = this.listExistingObjects(twxFile)
    return existingObjects.some(obj => obj.id === objectId)
  }

  /**
   * Remove business object from TWX file
   * @param {Object} twxFile - TWX file object
   * @param {string} objectId - Object ID to remove
   * @returns {Object} Updated TWX file object
   */
  removeBusinessObjectFromTWX(twxFile, objectId) {
    if (!twxFile || !twxFile.zip) {
      throw new Error('Invalid TWX file object')
    }

    if (!objectId) {
      throw new Error('Object ID is required')
    }

    try {
      const fileName = this.generateObjectFileName(objectId)
      
      // Check if object exists
      const entry = twxFile.zip.getEntry(fileName)
      if (!entry) {
        throw new Error(`Business object with ID ${objectId} not found in TWX file`)
      }

      // Remove the object file from zip
      twxFile.zip.deleteFile(fileName)
      
      // Update package.xml to remove object reference
      let packageXML = twxFile.packageXML
      const objectRegex = new RegExp(`\\s*<object[^>]*id="${objectId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`, 'g')
      packageXML = packageXML.replace(objectRegex, '')
      
      // Update the package.xml in the zip (correct path)
      twxFile.zip.updateFile('META-INF/package.xml', Buffer.from(packageXML, 'utf8'))
      
      // Update TWX file object
      twxFile.packageXML = packageXML
      twxFile.isModified = true
      twxFile.entries = twxFile.zip.getEntries()

      return twxFile
    } catch (error) {
      throw new Error(`Failed to remove business object from TWX: ${error.message}`)
    }
  }

  /**
   * Get TWX file statistics
   * @param {Object} twxFile - TWX file object
   * @returns {Object} File statistics
   */
  getTWXStatistics(twxFile) {
    if (!twxFile) {
      return null
    }

    const existingObjects = this.listExistingObjects(twxFile)
    const entries = twxFile.entries || []
    
    return {
      filePath: twxFile.filePath,
      isModified: twxFile.isModified,
      metadata: twxFile.metadata,
      totalEntries: entries.length,
      totalObjects: existingObjects.length,
      objectsByType: this.groupObjectsByType(existingObjects),
      fileSize: this.getFileSize(twxFile.filePath),
      lastModified: this.getFileLastModified(twxFile.filePath)
    }
  }

  /**
   * Group objects by type
   * @param {Array} objects - Array of objects
   * @returns {Object} Objects grouped by type
   */
  groupObjectsByType(objects) {
    const grouped = {}
    for (const obj of objects) {
      if (!grouped[obj.type]) {
        grouped[obj.type] = []
      }
      grouped[obj.type].push(obj)
    }
    return grouped
  }

  /**
   * Get file size
   * @param {string} filePath - File path
   * @returns {number} File size in bytes
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath)
      return stats.size
    } catch (error) {
      return 0
    }
  }

  /**
   * Get file last modified date
   * @param {string} filePath - File path
   * @returns {Date} Last modified date
   */
  getFileLastModified(filePath) {
    try {
      const stats = fs.statSync(filePath)
      return stats.mtime
    } catch (error) {
      return null
    }
  }

  /**
   * Validate TWX file structure
   * @param {Object} twxFile - TWX file object
   * @returns {Object} Validation result
   */
  validateTWXFile(twxFile) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    }

    if (!twxFile) {
      result.errors.push('TWX file object is null')
      result.isValid = false
      return result
    }

    // Check required components
    if (!twxFile.zip) {
      result.errors.push('Missing zip object')
      result.isValid = false
    }

    if (!twxFile.packageXML) {
      result.errors.push('Missing package.xml content')
      result.isValid = false
    }

    // Validate package.xml structure
    if (twxFile.packageXML) {
      if (!twxFile.packageXML.includes('<package')) {
        result.errors.push('Invalid package.xml: missing package element')
        result.isValid = false
      }
    }

    // Check for orphaned objects (referenced in package.xml but file missing)
    const existingObjects = this.listExistingObjects(twxFile)
    for (const obj of existingObjects) {
      if (!obj.exists) {
        result.warnings.push(`Object file missing: ${obj.fileName} (ID: ${obj.id})`)
      }
    }

    return result
  }

  /**
   * Clean up temporary files
   */
  cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir)
        for (const file of files) {
          const filePath = path.join(this.tempDir, file)
          fs.unlinkSync(filePath)
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup temporary files:', error.message)
    }
  }
}

module.exports = TWXFileHandler