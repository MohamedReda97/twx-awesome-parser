const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseKPI = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const kpi = jsonData.teamworks.metric[0]
  const versionId = kpi.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = kpi.$.id
    result.name = kpi.$.name
    result.description = ParseUtils.isNullXML(kpi.description[0]) ? null : kpi.description[0]
    result.type = TYPES.KPI
    result.isExposed = false
    result.dependencies = []

    if (kpi.rollupMetricRef && !ParseUtils.isNullXML(kpi.rollupMetricRef[0])) {
      result.dependencies.push({
        childReference: kpi.rollupMetricRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.KPI.RollupMetric
      })
    }
  }

  return result
}, 'parseKPI')

module.exports = parseKPI
