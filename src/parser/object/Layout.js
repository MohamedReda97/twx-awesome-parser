const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseLayout = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const layout = jsonData.teamworks.layout[0]
  const versionId = layout.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = layout.$.id
    result.name = layout.$.name
    result.description = ParseUtils.isNullXML(layout.description[0]) ? null : layout.description[0]
    result.type = TYPES.Layout
    result.isExposed = false
    result.dependencies = []
  }

  return result
}, 'parseLayout')

module.exports = parseLayout
