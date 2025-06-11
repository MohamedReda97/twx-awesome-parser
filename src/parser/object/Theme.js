const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseTheme = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const theme = jsonData.teamworks.uiTheme[0]
  const versionId = theme.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = theme.$.id
    result.name = theme.$.name
    result.description = ParseUtils.isNullXML(theme.description[0]) ? null : theme.description[0]
    result.type = TYPES.Theme
    result.isExposed = false
    result.dependencies = []
  }

  return result
}, 'parseTheme')

module.exports = parseTheme
