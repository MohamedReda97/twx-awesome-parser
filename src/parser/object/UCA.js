const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseUCA = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const uca = jsonData.teamworks.underCoverAgent[0]
  const versionId = uca.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = uca.$.id
    result.name = uca.$.name
    result.description = ParseUtils.isNullXML(uca.description[0]) ? null : uca.description[0]
    result.type = TYPES.UCA
    result.isExposed = false
    result.dependencies = []

    if (uca.processRef && !ParseUtils.isNullXML(uca.processRef[0])) {
      result.dependencies.push({
        childReference: uca.processRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.UCA.AttachedService
      })
    }
    if (uca.variableRef && !ParseUtils.isNullXML(uca.variableRef[0])) {
      result.dependencies.push({
        childReference: uca.variableRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.UCA.DataType
      })
    }
  }

  return result
}, 'parseUCA')

module.exports = parseUCA
