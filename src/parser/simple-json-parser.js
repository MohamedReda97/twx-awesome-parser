/**
 * SimpleJSONParser - Parses simple JSON-like object definitions for business objects
 * Supports simplified syntax like: customerObj { name: string, age: Integer }
 */
class SimpleJSONParser {
  constructor() {
    this.errors = []
  }

  /**
   * Parse simple JSON object definition
   * @param {string} jsonText - The JSON-like text to parse
   * @returns {Object} Parsed object definition or null if invalid
   */
  parseObjectDefinition(jsonText) {
    this.errors = []
    
    try {
      // Clean and validate input
      const cleanText = this.cleanInput(jsonText)
      if (!cleanText) {
        this.addError('Empty input provided')
        return null
      }

      // Try to parse as standard JSON first
      if (this.isStandardJSON(cleanText)) {
        return this.parseStandardJSON(cleanText)
      }

      // Parse as simple object syntax
      return this.parseSimpleSyntax(cleanText)
    } catch (error) {
      this.addError(`Parse error: ${error.message}`)
      return null
    }
  }

  /**
   * Extract object structure from parsed definition
   * @param {Object} definition - Parsed definition
   * @returns {Object} Object structure with name and properties
   */
  extractObjectStructure(definition) {
    if (!definition) return null

    // Handle multiple objects
    if (Array.isArray(definition)) {
      return definition.map(obj => this.extractSingleObjectStructure(obj))
    }

    // Handle single object
    return this.extractSingleObjectStructure(definition)
  }

  /**
   * Extract structure from a single object definition
   * @param {Object} obj - Single object definition
   * @returns {Object} Object structure
   */
  extractSingleObjectStructure(obj) {
    if (!obj || !obj.name) {
      this.addError('Object must have a name')
      return null
    }

    return {
      objectName: obj.name,
      properties: obj.properties || []
    }
  }

  /**
   * Validate basic syntax
   * @param {string} jsonText - Text to validate
   * @returns {boolean} True if syntax is valid
   */
  validateSyntax(jsonText) {
    this.errors = []
    
    if (!jsonText || typeof jsonText !== 'string') {
      this.addError('Input must be a non-empty string')
      return false
    }

    const cleanText = jsonText.trim()
    if (!cleanText) {
      this.addError('Input cannot be empty')
      return false
    }

    // Check for basic structure
    if (this.isStandardJSON(cleanText)) {
      return this.validateStandardJSON(cleanText)
    }

    return this.validateSimpleSyntax(cleanText)
  }

  /**
   * Parse property definitions from text
   * @param {string} propertiesText - Properties text to parse
   * @returns {Array} Array of property definitions
   */
  parseProperties(propertiesText) {
    if (!propertiesText) return []

    const properties = []
    const lines = propertiesText.split(',').map(line => line.trim())

    for (const line of lines) {
      if (!line) continue

      const property = this.parsePropertyLine(line)
      if (property) {
        properties.push(property)
      }
    }

    return properties
  }

  /**
   * Parse a single property line
   * @param {string} line - Property line to parse
   * @returns {Object|null} Property definition or null
   */
  parsePropertyLine(line) {
    // Match patterns like "name: string" or "age: Integer"
    const match = line.match(/^\s*(\w+)\s*:\s*(\w+)\s*$/)
    
    if (!match) {
      this.addError(`Invalid property syntax: ${line}`)
      return null
    }

    return {
      name: match[1],
      type: match[2]
    }
  }

  /**
   * Check if input is standard JSON format
   * @param {string} text - Text to check
   * @returns {boolean} True if standard JSON
   */
  isStandardJSON(text) {
    const trimmed = text.trim()
    return trimmed.startsWith('{') && trimmed.endsWith('}')
  }

  /**
   * Parse standard JSON format
   * @param {string} jsonText - JSON text to parse
   * @returns {Array} Array of object definitions
   */
  parseStandardJSON(jsonText) {
    try {
      const parsed = JSON.parse(jsonText)
      const objects = []

      // Handle single object or multiple objects
      for (const [objectName, properties] of Object.entries(parsed)) {
        const propertyArray = []
        
        if (typeof properties === 'object' && properties !== null) {
          for (const [propName, propType] of Object.entries(properties)) {
            propertyArray.push({
              name: propName,
              type: propType
            })
          }
        }

        objects.push({
          name: objectName,
          properties: propertyArray
        })
      }

      return objects
    } catch (error) {
      this.addError(`Invalid JSON: ${error.message}`)
      return null
    }
  }

  /**
   * Parse simple object syntax like: objectName { prop: type, ... }
   * @param {string} text - Text to parse
   * @returns {Array} Array of object definitions
   */
  parseSimpleSyntax(text) {
    const objects = []
    
    // Match pattern: objectName { properties }
    const objectRegex = /(\w+)\s*\{([^}]+)\}/g
    let match

    while ((match = objectRegex.exec(text)) !== null) {
      const objectName = match[1]
      const propertiesText = match[2]
      
      const properties = this.parseProperties(propertiesText)
      
      objects.push({
        name: objectName,
        properties: properties
      })
    }

    if (objects.length === 0) {
      this.addError('No valid object definitions found')
      return null
    }

    return objects
  }

  /**
   * Validate standard JSON syntax
   * @param {string} jsonText - JSON text to validate
   * @returns {boolean} True if valid
   */
  validateStandardJSON(jsonText) {
    try {
      const parsed = JSON.parse(jsonText)
      
      if (typeof parsed !== 'object' || parsed === null) {
        this.addError('JSON must be an object')
        return false
      }

      // Validate object structure
      for (const [objectName, properties] of Object.entries(parsed)) {
        if (!this.isValidObjectName(objectName)) {
          this.addError(`Invalid object name: ${objectName}`)
          return false
        }

        if (typeof properties !== 'object' || properties === null) {
          this.addError(`Properties for ${objectName} must be an object`)
          return false
        }

        // Validate properties
        for (const [propName, propType] of Object.entries(properties)) {
          if (!this.isValidPropertyName(propName)) {
            this.addError(`Invalid property name: ${propName}`)
            return false
          }

          if (typeof propType !== 'string') {
            this.addError(`Property type for ${propName} must be a string`)
            return false
          }
        }
      }

      return true
    } catch (error) {
      this.addError(`Invalid JSON syntax: ${error.message}`)
      return false
    }
  }

  /**
   * Validate simple syntax
   * @param {string} text - Text to validate
   * @returns {boolean} True if valid
   */
  validateSimpleSyntax(text) {
    // Check for basic object pattern
    const objectRegex = /(\w+)\s*\{([^}]+)\}/g
    const matches = [...text.matchAll(objectRegex)]

    if (matches.length === 0) {
      this.addError('No valid object definitions found. Use format: objectName { prop: type, ... }')
      return false
    }

    // Validate each object
    for (const match of matches) {
      const objectName = match[1]
      const propertiesText = match[2]

      if (!this.isValidObjectName(objectName)) {
        this.addError(`Invalid object name: ${objectName}`)
        return false
      }

      // Validate properties syntax
      const properties = propertiesText.split(',').map(p => p.trim()).filter(p => p)
      
      for (const prop of properties) {
        if (!prop.match(/^\s*\w+\s*:\s*\w+\s*$/)) {
          this.addError(`Invalid property syntax: ${prop}`)
          return false
        }
      }
    }

    return true
  }

  /**
   * Check if object name is valid
   * @param {string} name - Object name to check
   * @returns {boolean} True if valid
   */
  isValidObjectName(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
  }

  /**
   * Check if property name is valid
   * @param {string} name - Property name to check
   * @returns {boolean} True if valid
   */
  isValidPropertyName(name) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
  }

  /**
   * Clean input text
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  cleanInput(text) {
    if (!text || typeof text !== 'string') return ''
    return text.trim()
  }

  /**
   * Add error to errors array
   * @param {string} message - Error message
   */
  addError(message) {
    this.errors.push(message)
  }

  /**
   * Get all validation errors
   * @returns {Array} Array of error messages
   */
  getErrors() {
    return [...this.errors]
  }

  /**
   * Check if there are any errors
   * @returns {boolean} True if there are errors
   */
  hasErrors() {
    return this.errors.length > 0
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = []
  }
}

module.exports = SimpleJSONParser