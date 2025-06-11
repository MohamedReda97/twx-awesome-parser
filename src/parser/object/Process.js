const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, SUBTYPES: { Process: PROCESS_TYPES }, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseProcess = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const process = jsonData.teamworks.process[0]
  const versionId = process.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    let subType = PROCESS_TYPES.GeneralSystemService
    if (process.processType && !ParseUtils.isNullXML(process.processType[0])) {
      subType = process.processType[0]
    }

    result.register = true
    result.id = process.$.id
    result.name = process.$.name
    result.description = ParseUtils.isNullXML(process.description[0]) ? null : process.description[0]
    result.type = TYPES.Process
    result.subType = subType
    result.isExposed = false
    result.dependencies = []

    if (subType === PROCESS_TYPES.AjaxService || !ParseUtils.isNullXML(process.exposedType[0])) {
      result.isExposed = true
    }

    // Exposed to Start
    if (process.participantRef && !ParseUtils.isNullXML(process.participantRef[0])) {
      result.dependencies.push({
        childReference: process.participantRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.Process.ExposedTo
      })
      result.isExposed = true
    }

    // Input and Output Parameters
    if (process.processParameter) {
      for (let i = 0; i < process.processParameter.length; i++) {
        if (!ParseUtils.isNullXML(process.processParameter[i]) && process.processParameter[i].classId && !ParseUtils.isNullXML(process.processParameter[i].classId[0])) {
          result.dependencies.push({
            childReference: process.processParameter[i].classId[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.Process.Binding,
            dependencyName: process.processParameter[i].$.name
          })
        }
      }
    }

    // Private Variables
    if (process.processVariable) {
      for (let i = 0; i < process.processVariable.length; i++) {
        if (!ParseUtils.isNullXML(process.processVariable[i]) && process.processVariable[i].classId && !ParseUtils.isNullXML(process.processVariable[i].classId[0])) {
          result.dependencies.push({
            childReference: process.processVariable[i].classId[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.Process.Variable,
            dependencyName: process.processVariable[i].$.name
          })
        }
      }
    }

    // EPVs
    if (process.EPV_PROCESS_LINK) {
      for (let i = 0; i < process.EPV_PROCESS_LINK.length; i++) {
        if (!ParseUtils.isNullXML(process.EPV_PROCESS_LINK[i]) && process.EPV_PROCESS_LINK[i].epvId && !ParseUtils.isNullXML(process.EPV_PROCESS_LINK[i].epvId[0])) {
          result.dependencies.push({
            childReference: process.EPV_PROCESS_LINK[i].epvId[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.Process.EPV
          })
        }
      }
    }

    // Resources
    if (process.RESOURCE_PROCESS_LINK) {
      for (let i = 0; i < process.RESOURCE_PROCESS_LINK.length; i++) {
        const item = process.RESOURCE_PROCESS_LINK[i]
        if (!ParseUtils.isNullXML(item) && item.resourceBundleGroupId && !ParseUtils.isNullXML(item.resourceBundleGroupId[0])) {
          result.dependencies.push({
            childReference: item.resourceBundleGroupId[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.Process.Resource
          })
        }
      }
    }

    // UCAs
    const ucas = ParseUtils.xpath(process, '//ucaRef')
    if (ucas) {
      ucas.map(ucaId => {
        if (!ParseUtils.isNullXML(ucaId)) {
          result.dependencies.push({
            childReference: ucaId,
            dependencyType: OBJECT_DEPENDENCY_TYPES.Process.UCA
          })
        }
      })
    }

    // Subprocesses
    const subProcesses = ParseUtils.xpath(process, '//attachedProcessRef')
    if (subProcesses) {
      subProcesses.map(subProcessId => {
        if (!ParseUtils.isNullXML(subProcessId)) {
          result.dependencies.push({
            childReference: subProcessId,
            dependencyType: OBJECT_DEPENDENCY_TYPES.Process.AttachedService
          })
        }
      })
    }

    // Coaches
    const coaches = ParseUtils.xpath(process, '//TWComponent/layoutData')
    if (coaches) {
      for (let i = 0; i < coaches.length; i++) {
        const layoutString = coaches[i]
        if (!ParseUtils.isNullXML(layoutString)) {
          const jsonLayout = await ParseUtils.parseXML(layoutString, 'layout')
          const viewIds = ParseUtils.xpath(jsonLayout, '//viewUUID')
          if (viewIds) {
            viewIds.map(viewId => {
              result.dependencies.push({
                childReference: viewId,
                dependencyType: OBJECT_DEPENDENCY_TYPES.Process.CoachView
              })
            })
          }
        }
      }
    }

    // Coach Flow
    if (process.coachflow) {
      for (let i = 0; i < process.coachflow.length; i++) {
        if (!ParseUtils.isNullXML(process.coachflow[i])) {
          const viewIds = ParseUtils.xpath(process.coachflow[i], '//viewUUID')
          if (viewIds) {
            viewIds.map(viewId => {
              result.dependencies.push({
                childReference: viewId,
                dependencyType: OBJECT_DEPENDENCY_TYPES.Process.CoachView
              })
            })
          }
        }
      }
    }
  }

  return result
}, 'parseProcess')

module.exports = parseProcess
