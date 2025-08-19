/**
 * TypeMapper - Maps simple type names to IBM BPM type references
 * Handles mapping from user-friendly types to IBM BPM internal type IDs
 */
class TypeMapper {
  constructor() {
    // IBM BPM type mappings - these are the actual type IDs used in IBM BPM
    this.typeMappings = {
      // Primitive types
      'string': '12.db884a3c-c533-44b7-bb2d-47bec8ad4022',      // String
      'String': '12.db884a3c-c533-44b7-bb2d-47bec8ad4022',      // String (alternative)
      'Integer': '12.c09c9b6e-aabd-4897-bef2-ed61db106297',     // Integer
      'int': '12.c09c9b6e-aabd-4897-bef2-ed61db106297',         // Integer (alternative)
      'Boolean': '12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',     // Boolean
      'boolean': '12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',     // Boolean (alternative)
      'Date': '12.19e8dc33-1100-46be-89a6-36c9040f7b3e',        // Date
      'DateTime': '12.19e8dc33-1100-46be-89a6-36c9040f7b3e',    // Date (alternative)
      'Decimal': '12.f92ac5c9-7b5e-4d5e-9c8a-1b2c3d4e5f6g',    // Decimal (placeholder ID)
      'decimal': '12.f92ac5c9-7b5e-4d5e-9c8a-1b2c3d4e5f6g',    // Decimal (alternative)
      
      // System toolkit types
      'NameValuePair': 'toolkit.TWSYS.NameValuePair',           // System toolkit type
      'TWList': 'toolkit.TWSYS.TWList',                         // System list type
      'TWObject': 'toolkit.TWSYS.TWObject',                     // System object type
      
      // Common business types (these would reference custom business objects)
      'XMLElement': '12.xml-element-type-id',                   // XML Element (placeholder)
      'JSONObject': '12.json-object-type-id'                    // JSON Object (placeholder)
    }

    // Type categories for better organization
    this.typeCategories = {
      primitive: ['string', 'String', 'Integer', 'int', 'Boolean', 'boolean', 'Date', 'DateTime', 'Decimal', 'decimal'],
      system: ['NameValuePair', 'TWList', 'TWObject'],
      custom: ['XMLElement', 'JSONObject']
    }

    // Common type aliases and suggestions
    this.typeSuggestions = {
      'str': 'string',
      'text': 'string',
      'number': 'Integer',
      'num': 'Integer',
      'bool': 'Boolean',
      'flag': 'Boolean',
      'datetime': 'Date',
      'timestamp': 'Date',
      'nvp': 'NameValuePair',
      'namevalue': 'NameValuePair',
      'list': 'TWList',
      'array': 'TWList',
      'object': 'TWObject',
      'obj': 'TWObject'
    }
  }

  /**
   * Map simple type to IBM BPM type reference
   * @param {string} simpleType - Simple type name (e.g., 'string', 'Integer')
   * @returns {string|null} IBM BPM type reference or null if not found
   */
  mapType(simpleType) {
    if (!simpleType || typeof simpleType !== 'string') {
      return null
    }

    const cleanType = simpleType.trim()
    
    // Direct mapping
    if (this.typeMappings[cleanType]) {
      return this.typeMappings[cleanType]
    }

    // Case-insensitive search
    const lowerType = cleanType.toLowerCase()
    for (const [key, value] of Object.entries(this.typeMappings)) {
      if (key.toLowerCase() === lowerType) {
        return value
      }
    }

    return null
  }

  /**
   * Get IBM BPM type reference with additional metadata
   * @param {string} type - Type name
   * @returns {Object|null} Type reference object with metadata
   */
  getBPMTypeReference(type) {
    const typeRef = this.mapType(type)
    if (!typeRef) return null

    return {
      typeId: typeRef,
      originalType: type,
      category: this.getTypeCategory(type),
      isSystemType: this.isSystemType(typeRef),
      isPrimitiveType: this.isPrimitiveType(type),
      displayName: this.getDisplayName(type)
    }
  }

  /**
   * Check if type is supported
   * @param {string} type - Type name to check
   * @returns {boolean} True if type is supported
   */
  isSupportedType(type) {
    return this.mapType(type) !== null
  }

  /**
   * Get type suggestions for invalid types
   * @param {string} invalidType - Invalid type name
   * @returns {Array} Array of suggested type names
   */
  suggestType(invalidType) {
    if (!invalidType || typeof invalidType !== 'string') {
      return []
    }

    const cleanType = invalidType.trim().toLowerCase()
    const suggestions = []

    // Check direct suggestions
    if (this.typeSuggestions[cleanType]) {
      suggestions.push(this.typeSuggestions[cleanType])
    }

    // Fuzzy matching - find similar type names
    const allTypes = Object.keys(this.typeMappings)
    for (const type of allTypes) {
      if (type.toLowerCase().includes(cleanType) || cleanType.includes(type.toLowerCase())) {
        if (!suggestions.includes(type)) {
          suggestions.push(type)
        }
      }
    }

    // If no suggestions found, provide common types
    if (suggestions.length === 0) {
      suggestions.push('string', 'Integer', 'Boolean', 'Date', 'NameValuePair')
    }

    return suggestions.slice(0, 5) // Limit to 5 suggestions
  }

  /**
   * Get all supported types
   * @returns {Array} Array of all supported type names
   */
  getSupportedTypes() {
    return Object.keys(this.typeMappings)
  }

  /**
   * Get types by category
   * @param {string} category - Category name ('primitive', 'system', 'custom')
   * @returns {Array} Array of type names in the category
   */
  getTypesByCategory(category) {
    return this.typeCategories[category] || []
  }

  /**
   * Get type category
   * @param {string} type - Type name
   * @returns {string} Category name or 'unknown'
   */
  getTypeCategory(type) {
    for (const [category, types] of Object.entries(this.typeCategories)) {
      if (types.includes(type)) {
        return category
      }
    }
    return 'unknown'
  }

  /**
   * Check if type is a system type (toolkit reference)
   * @param {string} typeRef - Type reference
   * @returns {boolean} True if system type
   */
  isSystemType(typeRef) {
    return typeRef && typeRef.startsWith('toolkit.')
  }

  /**
   * Check if type is a primitive type
   * @param {string} type - Type name
   * @returns {boolean} True if primitive type
   */
  isPrimitiveType(type) {
    return this.typeCategories.primitive.includes(type)
  }

  /**
   * Get display name for type
   * @param {string} type - Type name
   * @returns {string} Display name
   */
  getDisplayName(type) {
    // Convert camelCase and other formats to readable names
    const displayNames = {
      'NameValuePair': 'Name-Value Pair',
      'TWList': 'List',
      'TWObject': 'Object',
      'XMLElement': 'XML Element',
      'JSONObject': 'JSON Object',
      'DateTime': 'Date/Time'
    }

    return displayNames[type] || type
  }

  /**
   * Add custom type mapping
   * @param {string} typeName - Custom type name
   * @param {string} typeId - IBM BPM type ID
   * @param {string} category - Type category (default: 'custom')
   */
  addCustomType(typeName, typeId, category = 'custom') {
    this.typeMappings[typeName] = typeId
    
    if (!this.typeCategories[category]) {
      this.typeCategories[category] = []
    }
    
    if (!this.typeCategories[category].includes(typeName)) {
      this.typeCategories[category].push(typeName)
    }
  }

  /**
   * Remove custom type mapping
   * @param {string} typeName - Type name to remove
   */
  removeCustomType(typeName) {
    delete this.typeMappings[typeName]
    
    // Remove from categories
    for (const types of Object.values(this.typeCategories)) {
      const index = types.indexOf(typeName)
      if (index > -1) {
        types.splice(index, 1)
      }
    }
  }

  /**
   * Get type mapping statistics
   * @returns {Object} Statistics about type mappings
   */
  getStatistics() {
    const stats = {
      totalTypes: Object.keys(this.typeMappings).length,
      categories: {}
    }

    for (const [category, types] of Object.entries(this.typeCategories)) {
      stats.categories[category] = types.length
    }

    return stats
  }

  /**
   * Validate type mapping configuration
   * @returns {Object} Validation results
   */
  validateConfiguration() {
    const results = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Check for duplicate type IDs
    const typeIds = Object.values(this.typeMappings)
    const duplicates = typeIds.filter((id, index) => typeIds.indexOf(id) !== index)
    
    if (duplicates.length > 0) {
      results.warnings.push(`Duplicate type IDs found: ${duplicates.join(', ')}`)
    }

    // Check for missing essential types
    const essentialTypes = ['string', 'Integer', 'Boolean']
    for (const type of essentialTypes) {
      if (!this.typeMappings[type]) {
        results.errors.push(`Missing essential type mapping: ${type}`)
        results.isValid = false
      }
    }

    return results
  }
}

module.exports = TypeMapper