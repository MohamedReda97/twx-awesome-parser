const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseCoachView = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const coachView = jsonData.teamworks.coachView[0]
  const versionId = coachView.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = coachView.$.id
    result.name = coachView.$.name
    result.description = ParseUtils.isNullXML(coachView.description[0]) ? null : coachView.description[0]
    result.type = TYPES.CoachView
    result.isExposed = false
    result.dependencies = []

    // Layout
    if (coachView.layout && !ParseUtils.isNullXML(coachView.layout[0])) {
      const layoutString = coachView.layout[0]
      const jsonLayout = await ParseUtils.parseXML(layoutString, 'layout')
      const viewIds = ParseUtils.xpath(jsonLayout, '//viewUUID')
      if (viewIds) {
        viewIds.map(viewId => {
          result.dependencies.push({
            childReference: viewId,
            dependencyType: OBJECT_DEPENDENCY_TYPES.CoachView.CoachView
          })
        })
      }
    }

    // Preview Image
    if (coachView.previewImage && !ParseUtils.isNullXML(coachView.previewImage[0])) {
      result.dependencies.push({
        childReference: coachView.previewImage[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.CoachView.PreviewImage
      })
    }

    // Palette Icon
    if (coachView.paletteIcon && !ParseUtils.isNullXML(coachView.paletteIcon[0])) {
      result.dependencies.push({
        childReference: coachView.paletteIcon[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.CoachView.PaletteIcon
      })
    }

    // Binding
    if (coachView.bindingType && !ParseUtils.isNullXML(coachView.bindingType[0]) && coachView.bindingType[0].classId && !ParseUtils.isNullXML(coachView.bindingType[0].classId[0])) {
      result.dependencies.push({
        childReference: coachView.bindingType[0].classId[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.CoachView.Binding,
        dependencyName: coachView.bindingType[0].$.name
      })
    }

    // Config Options
    if (coachView.configOption) {
      for (let i = 0; i < coachView.configOption.length; i++) {
        if (!ParseUtils.isNullXML(coachView.configOption[i]) && coachView.configOption[i].classId && !ParseUtils.isNullXML(coachView.configOption[i].classId[0])) {
          result.dependencies.push({
            childReference: coachView.configOption[i].classId[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.CoachView.Config,
            dependencyName: coachView.configOption[i].$.name
          })
        }
      }
    }

    // Resource
    if (coachView.resource) {
      for (let i = 0; i < coachView.resource.length; i++) {
        if (!ParseUtils.isNullXML(coachView.resource[i]) && coachView.resource[i].assetUuid && !ParseUtils.isNullXML(coachView.resource[i].assetUuid[0])) {
          result.dependencies.push({
            childReference: coachView.resource[i].assetUuid[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.CoachView.Asset
          })
        }
      }
    }

    // Localization Resources
    if (coachView.localization) {
      for (let i = 0; i < coachView.localization.length; i++) {
        if (!ParseUtils.isNullXML(coachView.localization[i]) && coachView.localization[i].resourceBundleGroupId && !ParseUtils.isNullXML(coachView.localization[i].resourceBundleGroupId[0])) {
          result.dependencies.push({
            childReference: coachView.localization[i].resourceBundleGroupId[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.CoachView.Resource
          })
        }
      }
    }
  }

  return result
}, 'parseCoachView')

module.exports = parseCoachView
