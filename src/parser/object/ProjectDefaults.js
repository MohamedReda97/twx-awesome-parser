const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseProjectDefaults = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const projectDefaults = jsonData.teamworks.projectDefaults[0]
  const versionId = projectDefaults.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = projectDefaults.$.id
    result.name = projectDefaults.$.name
    result.description = ParseUtils.isNullXML(projectDefaults.description[0]) ? null : projectDefaults.description[0]
    result.type = TYPES.ProjectDefaults
    result.isExposed = false
    result.dependencies = []

    if (projectDefaults.defaultXslRef && !ParseUtils.isNullXML(projectDefaults.defaultXslRef[0])) {
      result.dependencies.push({
        childReference: projectDefaults.defaultXslRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.ProjectDefaults.XSL
      })
    }
    if (projectDefaults.defaultCssRef && !ParseUtils.isNullXML(projectDefaults.defaultCssRef[0])) {
      result.dependencies.push({
        childReference: projectDefaults.defaultCssRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.ProjectDefaults.CSS
      })
    }
    if (projectDefaults.defaultTheme && !ParseUtils.isNullXML(projectDefaults.defaultTheme[0])) {
      result.dependencies.push({
        childReference: projectDefaults.defaultTheme[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.ProjectDefaults.Theme
      })
    }
  }

  return result
}, 'parseProjectDefaults')

module.exports = parseProjectDefaults
