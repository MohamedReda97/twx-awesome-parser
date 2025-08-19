/**
 * XMLBuilder - Converts business object definitions into IBM BPM XML format
 * Generates properly formatted XML that can be inserted into TWX files
 */

class XMLBuilder {
  constructor() {
    this.indentSize = 4
  }

  /**
   * Build complete XML for business object
   * @param {Object} businessObject - Business object from BusinessObjectGenerator
   * @param {Object} typeMapper - TypeMapper instance for type resolution
   * @returns {string} Complete XML string
   */
  buildBusinessObjectXML(businessObject, typeMapper) {
    if (!businessObject) {
      throw new Error('Business object is required')
    }

    if (!businessObject.id || !businessObject.name) {
      throw new Error('Business object must have id and name')
    }

    const jsonData = this.buildJSONData(businessObject, typeMapper)
    const definition = this.buildDefinition(businessObject, typeMapper)
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<teamworks>
    <twClass id="${businessObject.id}" name="${businessObject.name}">
        <lastModified>${businessObject.metadata.lastModified}</lastModified>
        <lastModifiedBy>${businessObject.metadata.lastModifiedBy}</lastModifiedBy>
        <classId>${businessObject.id}</classId>
        <type>1</type>
        <isSystem>${businessObject.metadata.isSystem}</isSystem>
        <shared>${businessObject.metadata.shared}</shared>
        <isShadow>${businessObject.metadata.isShadow}</isShadow>
        <globalLifetime>${businessObject.metadata.globalLifetime}</globalLifetime>
        <internalName isNull="true" />
        <extensionType isNull="true" />
        <saveServiceRef isNull="true" />
        <bpmn2Data isNull="true" />
        <externalId>${businessObject.externalId}</externalId>
        <dependencySummary isNull="true" />
        <jsonData>${this.escapeXML(jsonData)}</jsonData>
        <description>${this.escapeXML(businessObject.description)}</description>
        <guid>${businessObject.guid}</guid>
        <versionId>${businessObject.versionId}</versionId>
        <definition>
${definition}
        </definition>
    </twClass>
</teamworks>`

    return this.formatXML(xml)
  }

  /**
   * Build JSON schema data for IBM BPM
   * @param {Object} businessObject - Business object
   * @param {Object} typeMapper - TypeMapper instance
   * @returns {string} JSON schema string
   */
  buildJSONData(businessObject, typeMapper) {
    const schema = {
      type: "object",
      properties: {},
      required: []
    }

    // Add properties to schema
    for (const property of businessObject.properties) {
      const typeRef = typeMapper ? typeMapper.getBPMTypeReference(property.bpmType) : null
      
      let propertySchema = {
        type: this.mapBPMTypeToJSONType(property.bpmType, typeRef),
        description: property.description || property.name
      }

      // Add constraints if any
      if (property.constraints) {
        Object.assign(propertySchema, property.constraints)
      }

      // Handle array types
      if (property.isArray) {
        propertySchema = {
          type: "array",
          items: propertySchema,
          description: `Array of ${property.description || property.name}`
        }
      }

      schema.properties[property.name] = propertySchema

      // Add to required if specified
      if (property.isRequired) {
        schema.required.push(property.name)
      }
    }

    // Add metadata
    schema.metadata = {
      generatedBy: "BusinessObjectBuilder",
      generatedAt: businessObject.metadata.createdAt,
      objectId: businessObject.id,
      objectName: businessObject.name
    }

    return JSON.stringify(schema, null, 2)
  }

  /**
   * Build definition structure for properties
   * @param {Object} businessObject - Business object
   * @param {Object} typeMapper - TypeMapper instance
   * @returns {string} Definition XML string
   */
  buildDefinition(businessObject, typeMapper) {
    if (!businessObject.properties || businessObject.properties.length === 0) {
      return '            <!-- No properties defined -->'
    }

    const propertiesXML = this.buildProperties(businessObject.properties, typeMapper)
    
    return `            <properties>
${propertiesXML}
            </properties>`
  }

  /**
   * Build property definitions XML
   * @param {Array} properties - Array of properties
   * @param {Object} typeMapper - TypeMapper instance
   * @returns {string} Properties XML string
   */
  buildProperties(properties, typeMapper) {
    if (!Array.isArray(properties)) {
      return ''
    }

    return properties.map(property => {
      const typeRef = typeMapper ? typeMapper.getBPMTypeReference(property.bpmType) : null
      const mappedType = typeRef ? typeRef.typeId : property.bpmType
      
      return `                <property name="${property.name}">
                    <type>${this.escapeXML(mappedType)}</type>
                    <isRequired>${property.isRequired}</isRequired>
                    <isHidden>${property.isHidden}</isHidden>
                    <isArray>${property.isArray}</isArray>
                    <description>${this.escapeXML(property.description)}</description>
                    <order>${property.metadata.order}</order>
                    <defaultValue${property.defaultValue ? '' : ' isNull="true"'}>${property.defaultValue ? this.escapeXML(String(property.defaultValue)) : ''}</defaultValue>
                    <constraints>
${this.buildConstraintsXML(property.constraints)}
                    </constraints>
                </property>`
    }).join('\n')
  }

  /**
   * Build constraints XML for a property
   * @param {Object} constraints - Property constraints
   * @returns {string} Constraints XML
   */
  buildConstraintsXML(constraints) {
    if (!constraints || Object.keys(constraints).length === 0) {
      return '                        <!-- No constraints -->'
    }

    return Object.entries(constraints).map(([key, value]) => {
      return `                        <constraint name="${key}" value="${this.escapeXML(String(value))}" />`
    }).join('\n')
  }

  /**
   * Map IBM BPM type to JSON schema type
   * @param {string} bpmType - IBM BPM type
   * @param {Object} typeRef - Type reference from TypeMapper
   * @returns {string} JSON schema type
   */
  mapBPMTypeToJSONType(bpmType, typeRef) {
    // Handle system types
    if (typeRef && typeRef.isSystemType) {
      return "object"
    }

    // Map primitive types
    const typeMap = {
      'string': 'string',
      'String': 'string',
      'Integer': 'integer',
      'int': 'integer',
      'Boolean': 'boolean',
      'boolean': 'boolean',
      'Date': 'string',
      'DateTime': 'string',
      'Decimal': 'number',
      'decimal': 'number'
    }

    return typeMap[bpmType] || 'string'
  }

  /**
   * Format XML with proper indentation
   * @param {string} xmlContent - Raw XML content
   * @returns {string} Formatted XML
   */
  formatXML(xmlContent) {
    if (!xmlContent) return ''

    // Basic XML formatting - split by lines and maintain existing indentation
    const lines = xmlContent.split('\n')
    const formatted = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed) {
        formatted.push(line) // Keep original indentation
      }
    }

    return formatted.join('\n')
  }

  /**
   * Escape XML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeXML(text) {
    if (!text) return ''
    
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Unescape XML special characters
   * @param {string} text - Text to unescape
   * @returns {string} Unescaped text
   */
  unescapeXML(text) {
    if (!text) return ''
    
    return String(text)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  }

  /**
   * Validate generated XML
   * @param {string} xml - XML to validate
   * @returns {Object} Validation result
   */
  validateXML(xml) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    }

    if (!xml || typeof xml !== 'string') {
      result.errors.push('XML must be a non-empty string')
      result.isValid = false
      return result
    }

    // Basic XML structure validation
    if (!xml.includes('<?xml')) {
      result.warnings.push('XML declaration missing')
    }

    if (!xml.includes('<teamworks>')) {
      result.errors.push('Missing required <teamworks> root element')
      result.isValid = false
    }

    if (!xml.includes('<twClass')) {
      result.errors.push('Missing required <twClass> element')
      result.isValid = false
    }

    // Check for required attributes
    if (!xml.includes('id=')) {
      result.errors.push('Missing required id attribute on twClass')
      result.isValid = false
    }

    if (!xml.includes('name=')) {
      result.errors.push('Missing required name attribute on twClass')
      result.isValid = false
    }

    // Check for balanced tags (basic check)
    const openTags = (xml.match(/<[^\/][^>]*>/g) || []).length
    const closeTags = (xml.match(/<\/[^>]*>/g) || []).length
    const selfClosingTags = (xml.match(/<[^>]*\/>/g) || []).length
    
    if (openTags !== closeTags + selfClosingTags) {
      result.warnings.push('Possible unbalanced XML tags detected')
    }

    return result
  }

  /**
   * Generate XML template for testing
   * @param {string} objectName - Object name
   * @param {string} objectId - Object ID
   * @returns {string} Template XML
   */
  generateTemplate(objectName = 'TestObject', objectId = '12.test-id') {
    const timestamp = new Date().toISOString()
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<teamworks>
    <twClass id="${objectId}" name="${objectName}">
        <lastModified>${timestamp}</lastModified>
        <lastModifiedBy>BusinessObjectBuilder</lastModifiedBy>
        <classId>${objectId}</classId>
        <type>1</type>
        <isSystem>false</isSystem>
        <shared>false</shared>
        <isShadow>false</isShadow>
        <globalLifetime>false</globalLifetime>
        <internalName isNull="true" />
        <extensionType isNull="true" />
        <saveServiceRef isNull="true" />
        <bpmn2Data isNull="true" />
        <externalId>itm.${objectId}</externalId>
        <dependencySummary isNull="true" />
        <jsonData>{}</jsonData>
        <description>Template business object</description>
        <guid>${objectId}</guid>
        <versionId>${objectId}</versionId>
        <definition>
            <properties>
                <!-- Properties will be added here -->
            </properties>
        </definition>
    </twClass>
</teamworks>`
  }

  /**
   * Extract business object info from XML
   * @param {string} xml - XML content
   * @returns {Object} Extracted object info
   */
  extractObjectInfo(xml) {
    if (!xml) return null

    const info = {}
    
    // Extract basic attributes
    const classMatch = xml.match(/<twClass[^>]*id="([^"]*)"[^>]*name="([^"]*)"/)
    if (classMatch) {
      info.id = classMatch[1]
      info.name = classMatch[2]
    }

    // Extract other fields
    const extractField = (fieldName) => {
      const regex = new RegExp(`<${fieldName}>([^<]*)</${fieldName}>`)
      const match = xml.match(regex)
      return match ? match[1] : null
    }

    info.lastModified = extractField('lastModified')
    info.description = extractField('description')
    info.guid = extractField('guid')
    info.versionId = extractField('versionId')

    return info
  }
}

module.exports = XMLBuilder