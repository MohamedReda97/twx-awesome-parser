/**
 * BusinessObjectBuilder - Main class that integrates all components
 * Provides a simple API for generating business objects from JSON and adding them to TWX files
 */

const SimpleJSONParser = require('./simple-json-parser')
const TypeMapper = require('./type-mapper')
const BusinessObjectGenerator = require('./business-object-generator')
const XMLBuilder = require('./xml-builder')
const TWXFileHandler = require('./twx-file-handler')

class BusinessObjectBuilder {
  constructor() {
    this.parser = new SimpleJSONParser()
    this.typeMapper = new TypeMapper()
    this.generator = new BusinessObjectGenerator()
    this.xmlBuilder = new XMLBuilder()
    this.twxHandler = new TWXFileHandler()
    
    this.lastResults = null
    this.errors = []
    this.warnings = []
  }

  /**
   * Build business objects from JSON and add them to a TWX file
   * @param {string} jsonInput - JSON input string
   * @param {string} twxFilePath - Path to TWX file
   * @param {Object} options - Build options
   * @returns {Object} Build results
   */
  async buildAndAddToTWX(jsonInput, twxFilePath, options = {}) {
    this.clearMessages()
    
    try {
      console.log('🚀 Starting Business Object Builder process...')
      
      // Step 1: Parse JSON input
      console.log('📝 Step 1: Parsing JSON input...')
      const parsedObjects = this.parser.parseObjectDefinition(jsonInput)
      
      if (!parsedObjects) {
        this.addErrors(this.parser.getErrors())
        throw new Error('Failed to parse JSON input')
      }
      
      console.log(`✅ Parsed ${parsedObjects.length} object definitions`)
      
      // Step 2: Extract object structures
      console.log('🏗️ Step 2: Extracting object structures...')
      const structures = this.parser.extractObjectStructure(parsedObjects)
      
      if (!structures || structures.length === 0) {
        throw new Error('No valid object structures found')
      }
      
      console.log(`✅ Extracted ${structures.length} object structures`)
      
      // Step 3: Validate types
      console.log('🔍 Step 3: Validating types...')
      const typeValidation = this.validateTypes(structures)
      
      if (typeValidation.unsupportedTypes.length > 0) {
        this.addWarnings(typeValidation.warnings)
        
        if (options.strictTypeValidation) {
          throw new Error(`Unsupported types found: ${typeValidation.unsupportedTypes.join(', ')}`)
        }
      }
      
      console.log(`✅ Type validation completed (${typeValidation.supportedTypes.length} supported, ${typeValidation.unsupportedTypes.length} unsupported)`)
      
      // Step 4: Open TWX file
      console.log('📂 Step 4: Opening TWX file...')
      const twxFile = this.twxHandler.openTWXFile(twxFilePath)
      
      console.log(`✅ Opened TWX file: ${twxFile.metadata.name || 'Unknown'} (${twxFile.metadata.objectCount || 0} existing objects)`)
      
      // Step 5: Generate business objects
      console.log('⚙️ Step 5: Generating business objects...')
      const generationResults = this.generateBusinessObjects(structures, twxFile, options)
      
      console.log(`✅ Generated ${generationResults.successful.length} business objects (${generationResults.failed.length} failed)`)
      
      // Step 6: Add objects to TWX
      console.log('➕ Step 6: Adding objects to TWX file...')
      const addResults = await this.addObjectsToTWX(generationResults.successful, twxFile, options)
      
      console.log(`✅ Added ${addResults.successful.length} objects to TWX (${addResults.failed.length} failed)`)
      
      // Step 7: Save TWX file
      console.log('💾 Step 7: Saving TWX file...')
      const outputPath = options.outputPath || twxFilePath
      const savedPath = this.twxHandler.saveTWXFile(twxFile, outputPath)
      
      console.log(`✅ Saved TWX file: ${savedPath}`)
      
      // Compile results
      const results = {
        success: true,
        inputObjects: structures.length,
        generatedObjects: generationResults.successful.length,
        addedObjects: addResults.successful.length,
        failedObjects: generationResults.failed.length + addResults.failed.length,
        outputPath: savedPath,
        twxStatistics: this.twxHandler.getTWXStatistics(twxFile),
        typeValidation: typeValidation,
        generationResults: generationResults,
        addResults: addResults,
        errors: this.errors,
        warnings: this.warnings
      }
      
      this.lastResults = results
      return results
      
    } catch (error) {
      console.error('❌ Business Object Builder failed:', error.message)
      
      const errorResults = {
        success: false,
        error: error.message,
        errors: this.errors,
        warnings: this.warnings
      }
      
      this.lastResults = errorResults
      return errorResults
    }
  }

  /**
   * Build business objects from JSON (without adding to TWX)
   * @param {string} jsonInput - JSON input string
   * @param {Object} options - Build options
   * @returns {Object} Build results
   */
  buildFromJSON(jsonInput, options = {}) {
    this.clearMessages()
    
    try {
      // Parse and extract structures
      const parsedObjects = this.parser.parseObjectDefinition(jsonInput)
      if (!parsedObjects) {
        this.addErrors(this.parser.getErrors())
        throw new Error('Failed to parse JSON input')
      }
      
      const structures = this.parser.extractObjectStructure(parsedObjects)
      if (!structures || structures.length === 0) {
        throw new Error('No valid object structures found')
      }
      
      // Validate types
      const typeValidation = this.validateTypes(structures)
      if (typeValidation.unsupportedTypes.length > 0) {
        this.addWarnings(typeValidation.warnings)
      }
      
      // Generate business objects
      const generationResults = this.generateBusinessObjects(structures, null, options)
      
      return {
        success: true,
        inputObjects: structures.length,
        generatedObjects: generationResults.successful.length,
        failedObjects: generationResults.failed.length,
        businessObjects: generationResults.successful,
        typeValidation: typeValidation,
        generationResults: generationResults,
        errors: this.errors,
        warnings: this.warnings
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errors: this.errors,
        warnings: this.warnings
      }
    }
  }

  /**
   * Validate types in object structures
   * @param {Array} structures - Object structures
   * @returns {Object} Validation results
   */
  validateTypes(structures) {
    const supportedTypes = []
    const unsupportedTypes = []
    const warnings = []
    
    for (const structure of structures) {
      for (const property of structure.properties) {
        if (this.typeMapper.isSupportedType(property.type)) {
          if (!supportedTypes.includes(property.type)) {
            supportedTypes.push(property.type)
          }
        } else {
          if (!unsupportedTypes.includes(property.type)) {
            unsupportedTypes.push(property.type)
            
            const suggestions = this.typeMapper.suggestType(property.type)
            warnings.push(`Unsupported type '${property.type}' in ${structure.objectName}.${property.name}. Suggestions: ${suggestions.join(', ')}`)
          }
        }
      }
    }
    
    return {
      supportedTypes,
      unsupportedTypes,
      warnings,
      totalTypes: supportedTypes.length + unsupportedTypes.length
    }
  }

  /**
   * Generate business objects from structures
   * @param {Array} structures - Object structures
   * @param {Object} twxFile - TWX file object (optional, for duplicate checking)
   * @param {Object} options - Generation options
   * @returns {Object} Generation results
   */
  generateBusinessObjects(structures, twxFile, options = {}) {
    const successful = []
    const failed = []
    
    for (const structure of structures) {
      try {
        // Generate business object
        const businessObject = this.generator.generateBusinessObject(structure)
        
        // Check for duplicates in TWX file
        if (twxFile && this.twxHandler.objectExists(twxFile, businessObject.id)) {
          if (options.skipDuplicates) {
            this.addWarning(`Skipping duplicate object: ${businessObject.name} (${businessObject.id})`)
            continue
          } else if (!options.allowDuplicates) {
            throw new Error(`Object with ID ${businessObject.id} already exists in TWX file`)
          }
        }
        
        // Generate XML
        const xml = this.xmlBuilder.buildBusinessObjectXML(businessObject, this.typeMapper)
        
        // Validate XML
        const xmlValidation = this.xmlBuilder.validateXML(xml)
        if (!xmlValidation.isValid) {
          throw new Error(`Invalid XML generated: ${xmlValidation.errors.join(', ')}`)
        }
        
        successful.push({
          businessObject,
          xml,
          xmlValidation
        })
        
      } catch (error) {
        failed.push({
          structure,
          error: error.message
        })
        
        this.addError(`Failed to generate business object for ${structure.objectName}: ${error.message}`)
      }
    }
    
    return { successful, failed }
  }

  /**
   * Add generated objects to TWX file
   * @param {Array} generatedObjects - Generated objects with XML
   * @param {Object} twxFile - TWX file object
   * @param {Object} options - Add options
   * @returns {Object} Add results
   */
  async addObjectsToTWX(generatedObjects, twxFile, options = {}) {
    const successful = []
    const failed = []
    
    for (const generated of generatedObjects) {
      try {
        const { businessObject, xml } = generated
        
        // Add to TWX file
        this.twxHandler.addBusinessObjectToTWX(twxFile, xml, businessObject.id)
        
        successful.push({
          businessObject,
          fileName: this.twxHandler.generateObjectFileName(businessObject.id)
        })
        
      } catch (error) {
        failed.push({
          businessObject: generated.businessObject,
          error: error.message
        })
        
        this.addError(`Failed to add ${generated.businessObject.name} to TWX: ${error.message}`)
      }
    }
    
    return { successful, failed }
  }

  /**
   * Get supported types
   * @returns {Array} Array of supported type names
   */
  getSupportedTypes() {
    return this.typeMapper.getSupportedTypes()
  }

  /**
   * Get type suggestions for a given type
   * @param {string} type - Type to get suggestions for
   * @returns {Array} Array of suggested types
   */
  getTypeSuggestions(type) {
    return this.typeMapper.suggestType(type)
  }

  /**
   * Add custom type mapping
   * @param {string} typeName - Custom type name
   * @param {string} typeId - IBM BPM type ID
   * @param {string} category - Type category
   */
  addCustomType(typeName, typeId, category = 'custom') {
    this.typeMapper.addCustomType(typeName, typeId, category)
  }

  /**
   * Get last build results
   * @returns {Object} Last build results
   */
  getLastResults() {
    return this.lastResults
  }

  /**
   * Clear error and warning messages
   */
  clearMessages() {
    this.errors = []
    this.warnings = []
  }

  /**
   * Add error message
   * @param {string} message - Error message
   */
  addError(message) {
    this.errors.push(message)
  }

  /**
   * Add multiple error messages
   * @param {Array} messages - Error messages
   */
  addErrors(messages) {
    this.errors.push(...messages)
  }

  /**
   * Add warning message
   * @param {string} message - Warning message
   */
  addWarning(message) {
    this.warnings.push(message)
  }

  /**
   * Add multiple warning messages
   * @param {Array} messages - Warning messages
   */
  addWarnings(messages) {
    this.warnings.push(...messages)
  }

  /**
   * Get current errors
   * @returns {Array} Array of error messages
   */
  getErrors() {
    return [...this.errors]
  }

  /**
   * Get current warnings
   * @returns {Array} Array of warning messages
   */
  getWarnings() {
    return [...this.warnings]
  }

  /**
   * Reset the builder state
   */
  reset() {
    this.generator.reset()
    this.clearMessages()
    this.lastResults = null
  }

  /**
   * Get builder statistics
   * @returns {Object} Builder statistics
   */
  getStatistics() {
    return {
      generatorStats: this.generator.getStatistics(),
      typeMapperStats: this.typeMapper.getStatistics(),
      lastResults: this.lastResults,
      errors: this.errors.length,
      warnings: this.warnings.length
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.twxHandler.cleanup()
  }
}

module.exports = BusinessObjectBuilder