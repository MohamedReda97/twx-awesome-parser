const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')
const { performance } = require('perf_hooks')

const parseWebService = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const webservice = jsonData.teamworks.webService[0]
  const versionId = webservice.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = webservice.$.id
    result.name = webservice.$.name
    result.description = ParseUtils.isNullXML(webservice.description[0]) ? null : webservice.description[0]
    result.type = TYPES.WebService
    result.isExposed = true
    result.dependencies = []
    result.scripts = []
    
    // Extract scripts from the service
    if (webservice.item && Array.isArray(webservice.item)) {
      webservice.item.forEach(item => {
        // Skip if item has no name or contains ignored tags
        if (!item.TWComponent || ParseUtils.isNullXML(item)) {
          return;
        }
        
        // Process each TWComponent in the item
        const components = Array.isArray(item.TWComponent) ? item.TWComponent : [item.TWComponent];
        
        components.forEach(component => {
          if (component.script && !ParseUtils.isNullXML(component.script[0])) {
            const scriptContent = component.script[0];
            const scriptName = item.$.name || 'unnamed_script';
            
            result.scripts.push({
              name: scriptName,
              content: scriptContent,
              componentName: component.$.name || 'unnamed_component'
            });
          }
        });
      });
    }

    if (webservice.webServiceOperation) {
      for (let i = 0; i < webservice.webServiceOperation.length; i++) {
        if (!ParseUtils.isNullXML(webservice.webServiceOperation[i]) && webservice.webServiceOperation[i].processRef &&
            !ParseUtils.isNullXML(webservice.webServiceOperation[i].processRef[0])) {
          result.dependencies.push({
            childReference: webservice.webServiceOperation[i].processRef[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.WebService.AttachedService,
            dependencyName: webservice.webServiceOperation[i].$.name
          })
        }
      }
    }
  }

  return result
}, 'parseWebService')

module.exports = parseWebService
