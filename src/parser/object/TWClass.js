const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseTWClass = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const twClass = jsonData.teamworks.twClass[0]
  const versionId = twClass.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = twClass.$.id
    result.name = twClass.$.name
    result.description = ParseUtils.isNullXML(twClass.description[0]) ? null : twClass.description[0]
    result.type = TYPES.TWClass
    result.isExposed = false
    result.dependencies = []

    if (twClass.definition && !ParseUtils.isNullXML(twClass.definition[0]) && twClass.definition[0].property) {
      for (let i = 0; i < twClass.definition[0].property.length; i++) {
        const item = twClass.definition[0].property[i]
        if (!ParseUtils.isNullXML(item) && item.classRef && !ParseUtils.isNullXML(item.classRef[0])) {
          result.dependencies.push({
            childReference: item.classRef[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.TWClass.DataType,
            dependencyName: ParseUtils.isNullXML(item.name[0]) ? null : item.name[0]
          })
        }
      }
    }
  }

  return result
}, 'parseTWClass')

module.exports = parseTWClass
