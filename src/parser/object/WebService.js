const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

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
