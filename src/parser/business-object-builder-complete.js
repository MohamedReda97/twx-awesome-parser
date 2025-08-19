/**
 * Complete Business Object Builder
 * Consolidated implementation that follows IBM BPM XML structure exactly
 * Uses existing type IDs and generates proper XML format
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')

// IBM BPM System Type IDs (extracted from actual TWX files)
const IBM_BPM_TYPES = {
  'string': '12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
  'String': '12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
  'Integer': '12.c09c9b6e-aabd-4897-bef2-ed61db106297',
  'int': '12.c09c9b6e-aabd-4897-bef2-ed61db106297',
  'Boolean': '12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
  'boolean': '12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
  'Date': '12.19e8dc33-1100-46be-89a6-36c9040f7b3e',
  'DateTime': '12.19e8dc33-1100-46be-89a6-36c9040f7b3e',
  'Decimal': '12.f92ac5c9-7b5e-4d5e-9c8a-1b2c3d4e5f6g', // Placeholder - need actual ID
  'decimal': '12.f92ac5c9-7b5e-4d5e-9c8a-1b2c3d4e5f6g',
  'NameValuePair': 'toolkit.TWSYS.NameValuePair',
  'TWList': 'toolkit.TWSYS.TWList',
  'TWObject': 'toolkit.TWSYS.TWObject'
}

// Lombardi namespace types for jsonData
const LOMBARDI_TYPES = {
  'string': '{http://lombardi.ibm.com/schema/}String',
  'String': '{http://lombardi.ibm.com/schema/}String',
  'Integer': '{http://lombardi.ibm.com/schema/}Integer',
  'int': '{http://lombardi.ibm.com/schema/}Integer',
  'Boolean': '{http://lombardi.ibm.com/schema/}Boolean',
  'boolean': '{http://lombardi.ibm.com/schema/}Boolean',
  'Date': '{http://lombardi.ibm.com/schema/}Date',
  'DateTime': '{http://lombardi.ibm.com/schema/}Date',
  'Decimal': '{http://lombardi.ibm.com/schema/}Decimal',
  'decimal': '{http://lombardi.ibm.com/schema/}Decimal',
  'NameValuePair': '{http://lombardi.ibm.com/schema/}NameValuePair',
  'TWList': '{http://lombardi.ibm.com/schema/}TWList',
  'TWObject': '{http://lombardi.ibm.com/schema/}TWObject'
}

/**
 * Simple JSON Parser for business object definitions
 */
class SimpleJSONParser {
  constructor() {
    this.errors = []
  }

  parseObjectDefinition(jsonText) {
    this.errors = []
    
    try {
      const cleanText = jsonText.trim()
      if (!cleanText) {
        this.addError('Empty input provided')
        return null
      }

      const parsed = JSON.parse(cleanText)
      const objects = []

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

  extractObjectStructure(definition) {
    if (!definition) return null
    if (Array.isArray(definition)) {
      return definition.map(obj => ({
        objectName: obj.name,
        properties: obj.properties || []
      }))
    }
    return [{
      objectName: definition.name,
      properties: definition.properties || []
    }]
  }

  addError(message) {
    this.errors.push(message)
  }

  getErrors() {
    return [...this.errors]
  }

  clearErrors() {
    this.errors = []
  }
}

/**
 * Type Mapper with IBM BPM type IDs
 */
class TypeMapper {
  constructor() {
    this.typeMappings = IBM_BPM_TYPES
    this.lombardiTypes = LOMBARDI_TYPES
  }

  mapType(simpleType) {
    return this.typeMappings[simpleType] || null
  }

  getLombardiType(simpleType) {
    return this.lombardiTypes[simpleType] || null
  }

  isSupportedType(type) {
    return this.mapType(type) !== null
  }

  getSupportedTypes() {
    return Object.keys(this.typeMappings)
  }

  suggestType(invalidType) {
    const suggestions = []
    const cleanType = invalidType.toLowerCase()
    
    // Direct suggestions
    const directSuggestions = {
      'str': 'string',
      'text': 'string',
      'number': 'Integer',
      'num': 'Integer',
      'bool': 'Boolean',
      'flag': 'Boolean',
      'datetime': 'Date',
      'timestamp': 'Date'
    }
    
    if (directSuggestions[cleanType]) {
      suggestions.push(directSuggestions[cleanType])
    }

    // Fuzzy matching
    const allTypes = Object.keys(this.typeMappings)
    for (const type of allTypes) {
      if (type.toLowerCase().includes(cleanType) || cleanType.includes(type.toLowerCase())) {
        if (!suggestions.includes(type)) {
          suggestions.push(type)
        }
      }
    }

    return suggestions.length > 0 ? suggestions.slice(0, 5) : ['string', 'Integer', 'Boolean', 'Date']
  }
}

/**
 * Business Object Generator
 */
class BusinessObjectGenerator {
  constructor() {
    this.generatedIds = new Set()
  }

  generateBusinessObject(objectDefinition) {
    const objectName = objectDefinition.name || objectDefinition.objectName
    if (!objectName) {
      throw new Error('Object definition must have a name or objectName')
    }

    const sanitizedName = this.sanitizeName(objectName)
    const objectId = this.generateObjectId()
    const versionId = this.generateVersionId()
    const timestamp = Date.now()

    return {
      id: objectId,
      versionId: versionId,
      name: sanitizedName,
      originalName: objectName,
      properties: this.createProperties(objectDefinition.properties || []),
      metadata: {
        createdAt: timestamp,
        createdBy: 'BusinessObjectBuilder',
        lastModified: timestamp,
        lastModifiedBy: 'BusinessObjectBuilder',
        type: 'twClass',
        subType: 'BusinessObject'
      },
      externalId: `itm.${objectId}`,
      guid: this.generateGUID(),
      description: `Business object ${sanitizedName} generated by Business Object Builder`
    }
  }

  createProperties(properties) {
    return properties.map((prop, index) => ({
      name: this.sanitizeName(prop.name),
      originalName: prop.name,
      bpmType: prop.type,
      isRequired: prop.isRequired || false,
      isHidden: prop.isHidden || false,
      isArray: prop.isArray || false,
      description: prop.description || null,
      order: index
    }))
  }

  generateObjectId() {
    let id
    let attempts = 0
    do {
      const uuid = this.generateUUID()
      id = `12.${uuid}`
      attempts++
    } while (this.generatedIds.has(id) && attempts < 100)

    this.generatedIds.add(id)
    return id
  }

  generateVersionId() {
    return this.generateUUID()
  }

  generateGUID() {
    // IBM BPM uses this format for GUIDs
    return this.generateUUID()
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  sanitizeName(name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Name must be a non-empty string')
    }

    let sanitized = name.trim()
    sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '_')
    
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = '_' + sanitized
    }
    
    sanitized = sanitized.replace(/_+/g, '_').replace(/_+$/, '')
    
    if (sanitized.length === 0) {
      sanitized = 'BusinessObject'
    }
    
    if (sanitized.length > 64) {
      sanitized = sanitized.substring(0, 64)
    }

    return sanitized
  }

  reset() {
    this.generatedIds.clear()
  }
}

/**
 * XML Builder that follows IBM BPM structure exactly
 */
class XMLBuilder {
  constructor(typeMapper, projectId = 'b5a7448c-61c1-4e1e-9933-3912eb5c29ad') {
    this.typeMapper = typeMapper
    this.projectId = projectId // Default project ID, should be extracted from TWX
  }

  buildBusinessObjectXML(businessObject) {
    const jsonData = this.buildJSONData(businessObject)
    const definition = this.buildDefinition(businessObject)
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<teamworks>
    <twClass id="${businessObject.id}" name="${businessObject.name}">
        <lastModified>${businessObject.metadata.lastModified}</lastModified>
        <lastModifiedBy>${businessObject.metadata.lastModifiedBy}</lastModifiedBy>
        <classId>${businessObject.id}</classId>
        <type>1</type>
        <isSystem>false</isSystem>
        <shared>false</shared>
        <isShadow>false</isShadow>
        <globalLifetime>false</globalLifetime>
        <internalName isNull="true" />
        <extensionType isNull="true" />
        <saveServiceRef isNull="true" />
        <bpmn2Data isNull="true" />
        <externalId>${businessObject.externalId}</externalId>
        <dependencySummary isNull="true" />
        <jsonData>${this.escapeXML(jsonData)}</jsonData>
        <description isNull="true" />
        <guid>${businessObject.guid}</guid>
        <versionId>${businessObject.versionId}</versionId>
        <definition>
${definition}
        </definition>
    </twClass>
</teamworks>`

    return xml
  }

  buildJSONData(businessObject) {
    const elements = businessObject.properties.map(prop => {
      const lombardiType = this.typeMapper.getLombardiType(prop.bpmType)
      const typeId = this.typeMapper.mapType(prop.bpmType)
      
      return {
        annotation: {
          documentation: [{}],
          appinfo: [{
            propertyName: [prop.name],
            propertyRequired: [prop.isRequired],
            propertyHidden: [prop.isHidden],
            advancedParameterProperties: [{}]
          }]
        },
        name: prop.name,
        type: lombardiType || prop.bpmType,
        otherAttributes: {
          "{http://www.ibm.com/bpmsdk}refid": typeId || prop.bpmType
        }
      }
    })

    const jsonSchema = {
      attributeFormDefault: "unqualified",
      elementFormDefault: "unqualified",
      targetNamespace: "http://NBEODCR", // Default namespace
      complexType: [{
        annotation: {
          documentation: [{}],
          appinfo: [{
            shared: [false],
            advancedProperties: [{}],
            shadow: [false]
          }]
        },
        sequence: {
          element: elements
        },
        name: businessObject.name
      }],
      id: `_${businessObject.id}`
    }

    return JSON.stringify(jsonSchema).replace(/"/g, '\\"')
  }

  buildDefinition(businessObject) {
    const properties = businessObject.properties.map(prop => {
      const typeId = this.typeMapper.mapType(prop.bpmType)
      const classRef = typeId ? `${this.projectId}/${typeId}` : prop.bpmType
      
      return `            <property>
                <n>${prop.name}</n>
                <description isNull="true" />
                <classRef>${classRef}</classRef>
                <arrayProperty>${prop.isArray}</arrayProperty>
                <propertyDefault isNull="true" />
                <propertyRequired>${prop.isRequired}</propertyRequired>
                <propertyHidden>${prop.isHidden}</propertyHidden>
                <annotation type="com.lombardisoftware.core.xml.XMLFieldAnnotation" version="2.0">
                    <exclude isNull="true" />
                    <nodeType isNull="true" />
                    <name isNull="true" />
                    <namespace isNull="true" />
                    <typeName isNull="true" />
                    <typeNamespace isNull="true" />
                    <minOccurs isNull="true" />
                    <maxOccurs isNull="true" />
                    <nillable isNull="true" />
                    <order isNull="true" />
                    <wrapArray isNull="true" />
                    <arrayTypeName isNull="true" />
                    <arrayTypeAnonymous isNull="true" />
                    <arrayItemName isNull="true" />
                    <arrayItemWildcard isNull="true" />
                    <wildcard isNull="true" />
                    <wildcardVariety isNull="true" />
                    <wildcardMode isNull="true" />
                    <wildcardNamespace isNull="true" />
                    <parentModelGroupCompositor isNull="true" />
                    <timeZone isNull="true" />
                </annotation>
            </property>`
    }).join('\n')

    return `${properties}
            <validator>
                <className isNull="true" />
                <errorMessage isNull="true" />
                <webWidgetJavaClass isNull="true" />
                <externalType isNull="true" />
                <configData>
                    <schema>
                        <simpleType name="${businessObject.name}">
                            <restriction base="String" />
                        </simpleType>
                    </schema>
                </configData>
            </validator>
            <annotation type="com.lombardisoftware.core.xml.XMLTypeAnnotation" version="2.0">
                <exclude isNull="true" />
                <anonymous isNull="true" />
                <local isNull="true" />
                <name isNull="true" />
                <namespace isNull="true" />
                <elementName isNull="true" />
                <elementNamespace isNull="true" />
                <protoTypeName isNull="true" />
                <baseTypeName isNull="true" />
                <specialType isNull="true" />
                <contentTypeVariety isNull="true" />
                <xscRef isNull="true" />
            </annotation>`
  }

  escapeXML(text) {
    if (!text) return ''
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  setProjectId(projectId) {
    this.projectId = projectId
  }
}

/**
 * TWX File Handler
 */
class TWXFileHandler {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp')
    this.ensureTempDir()
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true })
    }
  }

  /**
   * Validate if file is a valid ZIP/TWX file
   */
  validateTWXFile(filePath) {
    try {
      const data = fs.readFileSync(filePath)
      
      // Check ZIP file signature (PK)
      if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4B) {
        return {
          valid: false,
          error: 'File is not a valid ZIP/TWX archive (missing ZIP signature)'
        }
      }
      
      // Try to read as ZIP
      const zip = new ADMZip(data)
      const entries = zip.getEntries()
      
      if (entries.length === 0) {
        return {
          valid: false,
          error: 'TWX file appears to be empty or corrupted'
        }
      }
      
      // Check for package.xml in various locations (prefer META-INF location)
      const hasPackageXML = entries.some(entry => 
        entry.entryName === 'META-INF/package.xml' ||
        entry.entryName === 'package.xml' ||
        entry.entryName === 'meta-inf/package.xml' ||
        entry.entryName.toLowerCase().includes('package.xml')
      )
      
      if (!hasPackageXML) {
        return {
          valid: false,
          error: `TWX file missing package.xml. Available files: ${entries.map(e => e.entryName).slice(0, 10).join(', ')}${entries.length > 10 ? '...' : ''}`
        }
      }
      
      return {
        valid: true,
        entries: entries.length
      }
      
    } catch (error) {
      return {
        valid: false,
        error: `Failed to validate TWX file: ${error.message}`
      }
    }
  }

  openTWXFile(twxFilePath) {
    if (!fs.existsSync(twxFilePath)) {
      throw new Error(`TWX file not found: ${twxFilePath}`)
    }

    try {
      const data = fs.readFileSync(twxFilePath)
      const zip = new ADMZip(data)
      
      // List all entries for debugging
      const entries = zip.getEntries()
      console.log(`TWX file contains ${entries.length} entries:`)
      entries.forEach(entry => {
        console.log(`  - ${entry.entryName}`)
      })
      
      // Look for package.xml in the correct location (META-INF/package.xml)
      let packageEntry = zip.getEntry('META-INF/package.xml')
      let packagePath = 'META-INF/package.xml'
      
      if (!packageEntry) {
        // Try alternative locations
        packageEntry = zip.getEntry('package.xml') || 
                      zip.getEntry('meta-inf/package.xml') ||
                      entries.find(entry => entry.entryName.toLowerCase().includes('package.xml'))
        
        if (packageEntry) {
          packagePath = packageEntry.entryName
        }
      }
      
      if (!packageEntry) {
        throw new Error(`Invalid TWX file: package.xml not found. Available files: ${entries.map(e => e.entryName).join(', ')}`)
      }
      
      console.log(`Found package.xml at: ${packagePath}`)
      const packageXML = packageEntry.getData().toString('utf8')
      
      // Extract project ID from the target project element
      const projectIdMatch = packageXML.match(/<project id="([^"]+)"/);
      const projectId = projectIdMatch ? projectIdMatch[1] : '2066.ac303e4d-473d-47d0-8c50-2337baf99edf';
      
      console.log(`Extracted project ID: ${projectId}`)
      
      return {
        filePath: twxFilePath,
        zip: zip,
        packageXML: packageXML,
        packagePath: packagePath,
        entries: entries,
        projectId: projectId,
        isModified: false
      }
      
    } catch (error) {
      if (error.message.includes('Invalid TWX file')) {
        throw error
      }
      throw new Error(`Failed to read TWX file: ${error.message}. Please ensure the file is a valid TWX archive.`)
    }
  }

  addBusinessObjectToTWX(twxFile, businessObjectXML, businessObject) {
    const fileName = this.generateObjectFileName(businessObject.id)
    
    // Check if object already exists
    const existingEntry = twxFile.zip.getEntry(fileName)
    if (existingEntry) {
      throw new Error(`Business object with ID ${businessObject.id} already exists`)
    }

    // Add the business object XML to the zip
    twxFile.zip.addFile(fileName, Buffer.from(businessObjectXML, 'utf8'))
    
    // Update package.xml with correct structure
    const updatedPackageXML = this.updatePackageXML(twxFile.packageXML, {
      id: businessObject.id,
      versionId: businessObject.versionId,
      name: businessObject.name,
      type: 'twClass'
    })

    // Update the package.xml in the zip at the correct location
    twxFile.zip.updateFile(twxFile.packagePath, Buffer.from(updatedPackageXML, 'utf8'))
    
    // Also update metadata.xml if it exists
    this.updateMetadataXML(twxFile, businessObject)
    
    twxFile.packageXML = updatedPackageXML
    twxFile.isModified = true
    twxFile.entries = twxFile.zip.getEntries()

    return twxFile
  }

  updatePackageXML(packageXML, newObjectInfo) {
    const objectsEndTag = '</objects>'
    const objectsEndIndex = packageXML.indexOf(objectsEndTag)
    
    if (objectsEndIndex === -1) {
      // No objects section exists, create one
      const packageEndTag = '</p:package>'
      const packageEndIndex = packageXML.indexOf(packageEndTag)
      
      if (packageEndIndex === -1) {
        throw new Error('Invalid package.xml structure: no closing package tag found')
      }
      
      const objectsSection = `    <objects>
        <object id="${newObjectInfo.id}" versionId="${newObjectInfo.versionId}" name="${newObjectInfo.name}" type="${newObjectInfo.type}"/>
    </objects>
`
      return packageXML.substring(0, packageEndIndex) + objectsSection + packageXML.substring(packageEndIndex)
    } else {
      // Objects section exists, add new object entry
      const newObjectEntry = `        <object id="${newObjectInfo.id}" versionId="${newObjectInfo.versionId}" name="${newObjectInfo.name}" type="${newObjectInfo.type}"/>
`
      return packageXML.substring(0, objectsEndIndex) + newObjectEntry + packageXML.substring(objectsEndIndex)
    }
  }

  saveTWXFile(twxFile, outputPath) {
    const savePath = outputPath || twxFile.filePath
    
    // Create backup if overwriting original file
    if (savePath === twxFile.filePath && fs.existsSync(savePath)) {
      const backupPath = `${savePath}.backup.${Date.now()}`
      fs.copyFileSync(savePath, backupPath)
    }

    // Write the modified TWX file
    const buffer = twxFile.zip.toBuffer()
    fs.writeFileSync(savePath, buffer)
    
    twxFile.filePath = savePath
    twxFile.isModified = false

    return savePath
  }

  generateObjectFileName(objectId) {
    return `objects/${objectId}.xml`
  }

  /**
   * Update metadata.xml if it exists
   */
  updateMetadataXML(twxFile, businessObject) {
    const metadataEntry = twxFile.zip.getEntry('META-INF/metadata.xml')
    if (!metadataEntry) {
      console.log('No metadata.xml found, skipping metadata update')
      return
    }

    try {
      const metadataXML = metadataEntry.getData().toString('utf8')
      
      // Add new object entry to metadata
      const newMetadataEntry = `    <object id="${businessObject.id}">
        <tags>
            <tag>Generated</tag>
        </tags>
    </object>
`
      
      const metadataEndTag = '</metadata>'
      const metadataEndIndex = metadataXML.indexOf(metadataEndTag)
      
      if (metadataEndIndex !== -1) {
        const updatedMetadataXML = metadataXML.substring(0, metadataEndIndex) + 
                                  newMetadataEntry + 
                                  metadataXML.substring(metadataEndIndex)
        
        twxFile.zip.updateFile('META-INF/metadata.xml', Buffer.from(updatedMetadataXML, 'utf8'))
        console.log('Updated metadata.xml with new business object')
      }
    } catch (error) {
      console.warn('Failed to update metadata.xml:', error.message)
    }
  }

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

/**
 * Main Business Object Builder
 */
class BusinessObjectBuilder {
  constructor() {
    this.parser = new SimpleJSONParser()
    this.typeMapper = new TypeMapper()
    this.generator = new BusinessObjectGenerator()
    this.xmlBuilder = new XMLBuilder(this.typeMapper)
    this.twxHandler = new TWXFileHandler()
    
    this.errors = []
    this.warnings = []
  }

  async buildAndAddToTWX(jsonInput, twxFilePath, options = {}) {
    this.clearMessages()
    
    try {
      // Validate TWX file first
      if (!fs.existsSync(twxFilePath)) {
        throw new Error(`TWX file not found: ${twxFilePath}`)
      }
      
      // Check file size
      const stats = fs.statSync(twxFilePath)
      if (stats.size === 0) {
        throw new Error('TWX file is empty')
      }
      
      if (stats.size > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('TWX file is too large (max 100MB)')
      }
      
      console.log(`Processing TWX file: ${path.basename(twxFilePath)} (${stats.size} bytes)`)
      
      // Validate TWX file structure
      const validation = this.twxHandler.validateTWXFile(twxFilePath)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      
      console.log(`TWX file validation passed (${validation.entries} entries)`)
      
      // Parse JSON input
      const parsedObjects = this.parser.parseObjectDefinition(jsonInput)
      if (!parsedObjects) {
        this.addErrors(this.parser.getErrors())
        throw new Error('Failed to parse JSON input')
      }
      
      // Extract object structures
      const structures = this.parser.extractObjectStructure(parsedObjects)
      if (!structures || structures.length === 0) {
        throw new Error('No valid object structures found')
      }
      
      // Open TWX file
      const twxFile = this.twxHandler.openTWXFile(twxFilePath)
      
      // Set project ID in XML builder
      this.xmlBuilder.setProjectId(twxFile.projectId)
      
      // Generate and add business objects
      const results = {
        success: true,
        inputObjects: structures.length,
        generatedObjects: 0,
        addedObjects: 0,
        failedObjects: 0,
        businessObjects: [],
        errors: [],
        warnings: []
      }
      
      for (const structure of structures) {
        try {
          // Generate business object
          const businessObject = this.generator.generateBusinessObject(structure)
          
          // Generate XML
          const xml = this.xmlBuilder.buildBusinessObjectXML(businessObject)
          
          // Add to TWX file
          this.twxHandler.addBusinessObjectToTWX(twxFile, xml, businessObject)
          
          results.generatedObjects++
          results.addedObjects++
          results.businessObjects.push({
            name: businessObject.name,
            id: businessObject.id,
            properties: businessObject.properties.length
          })
          
        } catch (error) {
          results.failedObjects++
          this.addError(`Failed to process ${structure.objectName}: ${error.message}`)
        }
      }
      
      // Save TWX file
      const outputPath = options.outputPath || twxFilePath
      const savedPath = this.twxHandler.saveTWXFile(twxFile, outputPath)
      
      results.outputPath = savedPath
      results.errors = this.errors
      results.warnings = this.warnings
      
      return results
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errors: this.errors,
        warnings: this.warnings
      }
    }
  }

  getSupportedTypes() {
    return this.typeMapper.getSupportedTypes()
  }

  getTypeSuggestions(type) {
    return this.typeMapper.suggestType(type)
  }

  clearMessages() {
    this.errors = []
    this.warnings = []
  }

  addError(message) {
    this.errors.push(message)
  }

  addErrors(messages) {
    this.errors.push(...messages)
  }

  addWarning(message) {
    this.warnings.push(message)
  }

  getErrors() {
    return [...this.errors]
  }

  getWarnings() {
    return [...this.warnings]
  }

  cleanup() {
    this.twxHandler.cleanup()
  }
}

module.exports = {
  BusinessObjectBuilder,
  SimpleJSONParser,
  TypeMapper,
  BusinessObjectGenerator,
  XMLBuilder,
  TWXFileHandler
}