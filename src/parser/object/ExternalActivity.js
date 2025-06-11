const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseExternalActivity = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const externalActivity = jsonData.teamworks.externalActivity[0]
  const versionId = externalActivity.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = externalActivity.$.id
    result.name = externalActivity.$.name
    result.description = ParseUtils.isNullXML(externalActivity.description[0]) ? null : externalActivity.description[0]
    result.type = TYPES.ExternalActivity
    result.isExposed = false
    result.dependencies = []
  }

  return result
}, 'parseExternalActivity')

module.exports = parseExternalActivity
