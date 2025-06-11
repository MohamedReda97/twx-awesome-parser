const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseReport = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const report = jsonData.teamworks.report[0]
  const versionId = report.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = report.$.id
    result.name = report.$.name
    result.description = ParseUtils.isNullXML(report.description[0]) ? null : report.description[0]
    result.type = TYPES.Report
    result.isExposed = false
    result.dependencies = []

    if (report.participantRef && !ParseUtils.isNullXML(report.participantRef[0])) {
      result.dependencies.push({
        childReference: report.participantRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.Report.ExposedTo
      })
      result.isExposed = true
    }

    if (report.ReportTGLink) {
      for (let i = 0; i < report.ReportTGLink.length; i++) {
        if (!ParseUtils.isNullXML(report.ReportTGLink[i]) && report.ReportTGLink[i].trackingGroupRef && !ParseUtils.isNullXML(report.ReportTGLink[i].trackingGroupRef[0])) {
          result.dependencies.push({
            childReference: report.ReportTGLink[i].trackingGroupRef[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.Report.TrackingGroup
          })
        }
      }
    }

    if (report.ReportEpvLink) {
      for (let i = 0; i < report.ReportEpvLink.length; i++) {
        if (!ParseUtils.isNullXML(report.ReportEpvLink[i]) && report.ReportEpvLink[i].epvRef && !ParseUtils.isNullXML(report.ReportEpvLink[i].epvRef[0])) {
          result.dependencies.push({
            childReference: report.ReportEpvLink[i].epvRef[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.Report.EPV
          })
        }
      }
    }

    if (report.ReportRbgLink) {
      for (let i = 0; i < report.ReportRbgLink.length; i++) {
        if (!ParseUtils.isNullXML(report.ReportRbgLink[i]) && report.ReportRbgLink[i].rbgRef && !ParseUtils.isNullXML(report.ReportRbgLink[i].rbgRef[0])) {
          result.dependencies.push({
            childReference: report.ReportRbgLink[i].rbgRef[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.Report.Resource
          })
        }
      }
    }
  }

  return result
}, 'parseReport')

module.exports = parseReport
