const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseScoreboard = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const scoreboard = jsonData.teamworks.scoreboard[0]
  const versionId = scoreboard.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = scoreboard.$.id
    result.name = scoreboard.$.name
    result.description = ParseUtils.isNullXML(scoreboard.description[0]) ? null : scoreboard.description[0]
    result.type = TYPES.Scoreboard
    result.isExposed = false
    result.dependencies = []

    if (scoreboard.layoutRef && !ParseUtils.isNullXML(scoreboard.layoutRef[0])) {
      result.dependencies.push({
        childReference: scoreboard.layoutRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.Scoreboard.Layout
      })
    }
    if (scoreboard.participantRef && !ParseUtils.isNullXML(scoreboard.participantRef[0])) {
      result.isExposed = true
      result.dependencies.push({
        childReference: scoreboard.participantRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.Scoreboard.ExposedTo
      })
    }

    if (scoreboard.scoreBoardReportLink) {
      for (let i = 0; i < scoreboard.scoreBoardReportLink.length; i++) {
        const item = scoreboard.scoreBoardReportLink[i]
        if (!ParseUtils.isNullXML(item) && item.reportRef && !ParseUtils.isNullXML(item.reportRef[0])) {
          result.dependencies.push({
            childReference: item.reportRef[0],
            dependencyType: OBJECT_DEPENDENCY_TYPES.Scoreboard.Report
          })
        }
      }
    }
  }

  return result
}, 'parseScoreboard')

module.exports = parseScoreboard
