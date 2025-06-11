const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const xml2js = require('xml2js')
const { getTypeName } = require('../utils/type-mappings')

/**
 * Extract and parse TWX file contents
 */
class TWXExtractor {
  constructor() {
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    })
  }

  /**
   * Extract all data from a TWX file
   * @param {string} twxFilePath - Path to the TWX file
   * @returns {Promise<Object>} Extracted data
   */
  async extractTWX(twxFilePath) {
    try {
      console.log(`Extracting TWX file: ${twxFilePath}`)

      const data = fs.readFileSync(twxFilePath)
      const zip = new ADMZip(data)

      // Extract package metadata
      const packageData = await this.extractPackageMetadata(zip)

      // Extract objects
      const objects = await this.extractObjects(zip, packageData.objectList)

      // Extract toolkits if any
      const toolkits = await this.extractToolkits(zip)

      return {
        metadata: packageData.metadata,
        objects: objects,
        toolkits: toolkits,
        extractedAt: new Date().toISOString(),
        sourceFile: path.basename(twxFilePath)
      }
    } catch (error) {
      console.error('Error extracting TWX file:', error)
      throw error
    }
  }

  /**
   * Extract all data from an extracted TWX directory
   * @param {string} twxDirPath - Path to the extracted TWX directory
   * @returns {Promise<Object>} Extracted data
   */
  async extractFromDirectory(twxDirPath) {
    try {
      console.log(`Extracting TWX directory: ${twxDirPath}`)

      // Extract package metadata from META-INF/package.xml
      const packageData = await this.extractPackageMetadataFromDir(twxDirPath)

      // Extract objects from objects folder
      const objects = await this.extractObjectsFromDir(twxDirPath, packageData.objectList)

      // Extract toolkits if any (empty for now)
      const toolkits = []

      return {
        metadata: packageData.metadata,
        objects: objects,
        toolkits: toolkits,
        extractedAt: new Date().toISOString(),
        sourceFile: path.basename(twxDirPath)
      }
    } catch (error) {
      console.error('Error extracting TWX directory:', error)
      throw error
    }
  }

  /**
   * Extract package metadata from META-INF/package.xml
   * @param {ADMZip} zip - ZIP archive
   * @returns {Promise<Object>} Package metadata and object list
   */
  async extractPackageMetadata(zip) {
    const packageEntry = zip.getEntry('META-INF/package.xml')
    if (!packageEntry) {
      throw new Error('META-INF/package.xml not found in TWX file')
    }

    const packageXml = packageEntry.getData().toString('utf8')
    const packageData = await this.parser.parseStringPromise(packageXml)
    
    const pkg = packageData['p:package'] || packageData.package
    
    // Extract project information
    const target = pkg.target
    const project = target.project
    const branch = target.branch
    const snapshot = target.snapshot

    const metadata = {
      project: {
        id: project.id,
        name: project.name,
        shortName: project.shortName,
        description: project.description || '',
        isToolkit: project.isToolkit === 'true',
        isSystem: project.isSystem === 'true'
      },
      branch: {
        id: branch.id,
        name: branch.name,
        description: branch.description || ''
      },
      snapshot: {
        id: snapshot.id,
        name: snapshot.name,
        description: snapshot.description || '',
        creationDate: snapshot.originalCreationDate
      },
      buildInfo: {
        buildId: pkg.buildId,
        buildVersion: pkg.buildVersion,
        buildDescription: pkg.buildDescription
      }
    }

    // Extract object list
    const objectList = []
    if (pkg.objects && pkg.objects.object) {
      const objects = Array.isArray(pkg.objects.object) ? pkg.objects.object : [pkg.objects.object]
      objects.forEach(obj => {
        objectList.push({
          id: obj.id,
          versionId: obj.versionId,
          name: obj.name,
          type: obj.type,
          typeName: getTypeName(obj.type)
        })
      })
    }

    return { metadata, objectList }
  }

  /**
   * Extract package metadata from META-INF/package.xml in a directory
   * @param {string} twxDirPath - Path to the extracted TWX directory
   * @returns {Promise<Object>} Package metadata and object list
   */
  async extractPackageMetadataFromDir(twxDirPath) {
    const packagePath = path.join(twxDirPath, 'META-INF', 'package.xml')
    if (!fs.existsSync(packagePath)) {
      throw new Error(`META-INF/package.xml not found in directory: ${twxDirPath}`)
    }

    const packageXml = fs.readFileSync(packagePath, 'utf8')
    const packageData = await this.parser.parseStringPromise(packageXml)

    const pkg = packageData['p:package'] || packageData.package

    // Extract project information
    const target = pkg.target
    const project = target.project
    const branch = target.branch
    const snapshot = target.snapshot

    const metadata = {
      project: {
        id: project.id,
        name: project.name,
        shortName: project.shortName,
        description: project.description || '',
        isToolkit: project.isToolkit === 'true',
        isSystem: project.isSystem === 'true'
      },
      branch: {
        id: branch.id,
        name: branch.name,
        description: branch.description || ''
      },
      snapshot: {
        id: snapshot.id,
        name: snapshot.name,
        description: snapshot.description || '',
        creationDate: snapshot.originalCreationDate
      },
      buildInfo: {
        buildId: pkg.buildId,
        buildVersion: pkg.buildVersion,
        buildDescription: pkg.buildDescription
      }
    }

    // Extract object list
    const objectList = []
    if (pkg.objects && pkg.objects.object) {
      const objects = Array.isArray(pkg.objects.object) ? pkg.objects.object : [pkg.objects.object]
      objects.forEach(obj => {
        objectList.push({
          id: obj.id,
          versionId: obj.versionId,
          name: obj.name,
          type: obj.type,
          typeName: getTypeName(obj.type)
        })
      })
    }

    return { metadata, objectList }
  }

  /**
   * Extract object details from objects folder
   * @param {ADMZip} zip - ZIP archive
   * @param {Array} objectList - List of objects from package.xml
   * @returns {Promise<Array>} Array of object details
   */
  async extractObjects(zip, objectList) {
    const objects = []
    
    for (const objMeta of objectList) {
      try {
        // Find the object file - try both versionId and id
        let objectFileName = `objects/${objMeta.versionId}.xml`
        let objectEntry = zip.getEntry(objectFileName)

        // If not found with versionId, try with id
        if (!objectEntry) {
          objectFileName = `objects/${objMeta.id}.xml`
          objectEntry = zip.getEntry(objectFileName)
        }

        // Debug logging for Coach Views (disabled for production)
        // if (objMeta.type === 'coachView') {
        //   console.log(`\n=== Coach View Debug ===`)
        //   console.log(`Name: ${objMeta.name}`)
        //   console.log(`ID: ${objMeta.id}`)
        //   console.log(`VersionID: ${objMeta.versionId}`)
        //   console.log(`Trying file: ${objectFileName}`)
        //   console.log(`Found entry: ${!!objectEntry}`)
        // }

        if (objectEntry) {
          const objectXml = objectEntry.getData().toString('utf8')
          const objectData = await this.parser.parseStringPromise(objectXml)
          
          // Extract relevant information based on object type
          const extractedObject = this.extractObjectDetails(objectData, objMeta)
          objects.push(extractedObject)
        } else {
          // If object file not found, include basic metadata
          objects.push({
            id: objMeta.id,
            versionId: objMeta.versionId,
            name: objMeta.name,
            type: objMeta.type,
            typeName: objMeta.typeName,
            details: null,
            error: 'Object file not found'
          })
        }
      } catch (error) {
        console.warn(`Error processing object ${objMeta.name}:`, error.message)
        objects.push({
          id: objMeta.id,
          versionId: objMeta.versionId,
          name: objMeta.name,
          type: objMeta.type,
          typeName: objMeta.typeName,
          details: null,
          error: error.message
        })
      }
    }
    
    return objects
  }

  /**
   * Extract object details from objects folder in a directory
   * @param {string} twxDirPath - Path to the extracted TWX directory
   * @param {Array} objectList - List of objects from package.xml
   * @returns {Promise<Array>} Array of object details
   */
  async extractObjectsFromDir(twxDirPath, objectList) {
    const objects = []
    const objectsDir = path.join(twxDirPath, 'objects')

    for (const objMeta of objectList) {
      try {
        // Find the object file - try both versionId and id
        let objectFilePath = path.join(objectsDir, `${objMeta.versionId}.xml`)

        if (!fs.existsSync(objectFilePath)) {
          objectFilePath = path.join(objectsDir, `${objMeta.id}.xml`)
        }

        if (fs.existsSync(objectFilePath)) {
          const objectXml = fs.readFileSync(objectFilePath, 'utf8')
          const objectData = await this.parser.parseStringPromise(objectXml)

          // Extract relevant information based on object type
          const extractedObject = this.extractObjectDetails(objectData, objMeta)
          objects.push(extractedObject)
        } else {
          // If object file not found, include basic metadata
          objects.push({
            id: objMeta.id,
            versionId: objMeta.versionId,
            name: objMeta.name,
            type: objMeta.type,
            typeName: objMeta.typeName,
            details: null,
            error: 'Object file not found'
          })
        }
      } catch (error) {
        console.warn(`Error processing object ${objMeta.name}:`, error.message)
        objects.push({
          id: objMeta.id,
          versionId: objMeta.versionId,
          name: objMeta.name,
          type: objMeta.type,
          typeName: objMeta.typeName,
          details: null,
          error: error.message
        })
      }
    }

    return objects
  }

  /**
   * Extract specific details based on object type
   * @param {Object} objectData - Parsed XML data
   * @param {Object} objMeta - Object metadata
   * @returns {Object} Extracted object with details
   */
  extractObjectDetails(objectData, objMeta) {
    const baseObject = {
      id: objMeta.id,
      versionId: objMeta.versionId,
      name: objMeta.name,
      type: objMeta.type,
      typeName: objMeta.typeName,
      details: {},
      _fullObjectData: objectData  // Store for CSHS extraction
    }

    // Extract common properties
    const rootElement = Object.values(objectData)[0]
    if (rootElement) {
      if (rootElement.name) baseObject.details.displayName = rootElement.name
      if (rootElement.description) baseObject.details.description = rootElement.description
      if (rootElement.documentation) baseObject.details.documentation = rootElement.documentation

      // Extract type-specific details
      if (objMeta.type === 'coachView') {
        // For Coach Views, the data is nested under the coachView key
        const coachViewData = objectData.teamworks && objectData.teamworks.coachView ? objectData.teamworks.coachView : rootElement
        this.extractCoachViewDetails(coachViewData, baseObject)
      } else if (objMeta.type === 'process') {
        // For Process objects, extract subType and CSHS details
        // Handle both array and single object cases due to explicitArray: false
        let processData = rootElement
        if (objectData.teamworks && objectData.teamworks.process) {
          processData = Array.isArray(objectData.teamworks.process) ? objectData.teamworks.process[0] : objectData.teamworks.process
        }
        this.extractProcessDetails(processData, baseObject)
      }
    }

    return baseObject
  }

  /**
   * Extract Coach View specific details
   * @param {Object} coachViewElement - Coach View XML element
   * @param {Object} baseObject - Base object to add details to
   */
  extractCoachViewDetails(coachViewElement, baseObject) {
    const details = baseObject.details

    // Extract loadJsFunction
    if (coachViewElement.loadJsFunction &&
        coachViewElement.loadJsFunction !== null &&
        typeof coachViewElement.loadJsFunction === 'string' &&
        !coachViewElement.loadJsFunction.includes('isNull="true"')) {
      details.loadJsFunction = this.cleanJavaScript(coachViewElement.loadJsFunction)
    }

    // Extract bindingType
    if (coachViewElement.bindingType) {
      const bindingType = Array.isArray(coachViewElement.bindingType) ? coachViewElement.bindingType[0] : coachViewElement.bindingType
      // Handle both attribute-based and property-based name
      const bindingName = bindingType.$ ? bindingType.$.name : bindingType.name
      if (bindingName) {
        details.bindingType = bindingName
      }
    }

    // Extract configOptions
    if (coachViewElement.configOption) {
      const configOptions = Array.isArray(coachViewElement.configOption) ? coachViewElement.configOption : [coachViewElement.configOption]
      details.configOptions = configOptions
        .map(option => {
          // Handle both attribute-based and property-based name
          return option.$ ? option.$.name : option.name
        })
        .filter(name => name && name !== 'Unnamed')
    }

    // Extract inlineScript
    if (coachViewElement.inlineScript) {
      const inlineScripts = Array.isArray(coachViewElement.inlineScript) ? coachViewElement.inlineScript : [coachViewElement.inlineScript]
      details.inlineScripts = inlineScripts.map(script => ({
        name: script.$ ? script.$.name : script.name || 'Unnamed Script',
        scriptType: script.scriptType || 'JS',
        scriptBlock: script.scriptBlock ? this.cleanJavaScript(script.scriptBlock) : ''
      })).filter(script => script.scriptBlock)
    }

    // Mark as having detailed information
    baseObject.hasDetails = !!(details.loadJsFunction || details.bindingType || details.configOptions || details.inlineScripts)
  }

  /**
   * Extract Process specific details including subType and CSHS information
   * @param {Object} processElement - Process XML element
   * @param {Object} baseObject - Base object to add details to
   */
  extractProcessDetails(processElement, baseObject) {
    const details = baseObject.details

    // Extract subType (processType) with proper null checks
    // Handle both array and single value cases due to explicitArray: false
    if (processElement && processElement.processType) {
      const processType = Array.isArray(processElement.processType) ? processElement.processType[0] : processElement.processType
      baseObject.subType = processType
      details.processType = processType
    } else {
      // Default subType if not found
      baseObject.subType = '0'
      details.processType = '0'
    }

    // If this is a CSHS (processType = 10), extract detailed information
    if (baseObject.subType === '10') {
      // Pass the full objectData to extract from XML structure, not just processElement
      this.extractCSHSDetails(baseObject._fullObjectData, baseObject)
    }

    // Mark as having detailed information if it's a CSHS
    baseObject.hasDetails = baseObject.subType === '10'
  }

  /**
   * Extract CSHS-specific details including variables and elements from XML structure
   * @param {Object} objectData - Full parsed XML data
   * @param {Object} baseObject - Base object to add details to
   */
  extractCSHSDetails(objectData, baseObject) {
    // Preserve existing details and add CSHS-specific details
    const details = {
      ...baseObject.details,  // Preserve existing details like processType
      variables: {
        input: [],
        output: [],
        private: []
      },
      elements: {
        formTasks: [],
        callActivities: [],
        exclusiveGateways: [],
        scriptTasks: []
      }
    }

    // Extract variables from the main XML structure
    const processElement = objectData.teamworks && objectData.teamworks.process ?
      (Array.isArray(objectData.teamworks.process) ? objectData.teamworks.process[0] : objectData.teamworks.process) :
      Object.values(objectData)[0]

    // Parse processParameter elements (input/output variables)
    if (processElement.processParameter) {
      const parameters = Array.isArray(processElement.processParameter) ? processElement.processParameter : [processElement.processParameter]
      for (const param of parameters) {
        if (param && param.name) {
          const variable = {
            name: param.name,
            hasDefault: param.hasDefault === 'true' || param.hasDefault === true,
            type: param.parameterType
          }

          if (variable.type === '1') {
            details.variables.input.push(variable)
          } else if (variable.type === '2') {
            details.variables.output.push(variable)
          }
        }
      }
    }

    // Parse processVariable elements (private variables)
    if (processElement.processVariable) {
      const variables = Array.isArray(processElement.processVariable) ? processElement.processVariable : [processElement.processVariable]
      for (const variable of variables) {
        if (variable && variable.name) {
          details.variables.private.push({
            name: variable.name,
            hasDefault: variable.hasDefault === 'true' || variable.hasDefault === true
          })
        }
      }
    }

    // Extract process elements from coachflow structure
    if (processElement.coachflow) {
      // Parse the coachflow structure to extract elements
      this.parseCoachflowElements(processElement.coachflow, details)
    }

    baseObject.details = details
  }

  /**
   * Parse coachflow structure to extract process elements
   * @param {Object} coachflow - Coachflow structure
   * @param {Object} details - Details object to populate
   */
  parseCoachflowElements(coachflow, details) {
    try {
      // Navigate to the userTaskImplementation
      const userTaskImpl = coachflow['ns16:definitions']?.['ns16:globalUserTask']?.['ns16:extensionElements']?.['ns3:userTaskImplementation']

      if (!userTaskImpl) {
        console.warn('No userTaskImplementation found in coachflow')
        return
      }

      // Extract scriptTask elements
      if (userTaskImpl['ns16:scriptTask']) {
        const scriptTasks = Array.isArray(userTaskImpl['ns16:scriptTask']) ?
          userTaskImpl['ns16:scriptTask'] : [userTaskImpl['ns16:scriptTask']]

        for (const scriptTask of scriptTasks) {
          details.elements.scriptTasks.push({
            name: scriptTask.name || 'Unnamed',
            id: scriptTask.id,
            script: scriptTask['ns16:script'] ? this.cleanJavaScript(scriptTask['ns16:script']) : '',
            hasPreScript: false,
            hasPostScript: false,
            preScript: '',
            postScript: ''
          })
        }
      }

      // Extract exclusiveGateway elements
      if (userTaskImpl['ns16:exclusiveGateway']) {
        const gateways = Array.isArray(userTaskImpl['ns16:exclusiveGateway']) ?
          userTaskImpl['ns16:exclusiveGateway'] : [userTaskImpl['ns16:exclusiveGateway']]

        for (const gateway of gateways) {
          details.elements.exclusiveGateways.push({
            name: gateway.name || 'Unnamed',
            id: gateway.id,
            hasPreScript: false,
            hasPostScript: false,
            preScript: '',
            postScript: ''
          })
        }
      }

      // Extract formTask elements
      if (userTaskImpl['ns3:formTask']) {
        const formTasks = Array.isArray(userTaskImpl['ns3:formTask']) ?
          userTaskImpl['ns3:formTask'] : [userTaskImpl['ns3:formTask']]

        for (const formTask of formTasks) {
          details.elements.formTasks.push({
            name: formTask.name || 'Unnamed',
            id: formTask.id,
            hasPreScript: false,
            hasPostScript: false,
            preScript: '',
            postScript: ''
          })
        }
      }

      // Extract callActivity elements
      if (userTaskImpl['ns16:callActivity']) {
        const callActivities = Array.isArray(userTaskImpl['ns16:callActivity']) ?
          userTaskImpl['ns16:callActivity'] : [userTaskImpl['ns16:callActivity']]

        for (const callActivity of callActivities) {
          details.elements.callActivities.push({
            name: callActivity.name || 'Unnamed',
            id: callActivity.id,
            hasPreScript: false,
            hasPostScript: false,
            preScript: '',
            postScript: ''
          })
        }
      }

    } catch (error) {
      console.warn('Error parsing coachflow elements:', error)
    }
  }

  /**
   * Clean JavaScript code by replacing &#xD; with newlines and decoding HTML entities
   * @param {string} jsCode - Raw JavaScript code
   * @returns {string} Cleaned JavaScript code
   */
  cleanJavaScript(jsCode) {
    if (!jsCode || typeof jsCode !== 'string') return ''

    return jsCode
      .replace(/&#xD;/g, '\n')
      .replace(/&#xA;/g, '\n')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  /**
   * Extract toolkit information
   * @param {ADMZip} zip - ZIP archive
   * @returns {Promise<Array>} Array of toolkit information
   */
  async extractToolkits(zip) {
    const toolkits = []
    const entries = zip.getEntries()
    
    for (const entry of entries) {
      if (entry.entryName.startsWith('toolkits/') && entry.entryName.endsWith('.twx')) {
        try {
          const toolkitData = entry.getData()
          const toolkitZip = new ADMZip(toolkitData)
          const toolkitInfo = await this.extractPackageMetadata(toolkitZip)
          
          toolkits.push({
            fileName: path.basename(entry.entryName),
            metadata: toolkitInfo.metadata,
            objectCount: toolkitInfo.objectList.length
          })
        } catch (error) {
          console.warn(`Error processing toolkit ${entry.entryName}:`, error.message)
        }
      }
    }
    
    return toolkits
  }
}

module.exports = TWXExtractor
