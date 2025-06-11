const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseEventSubscription = Performance.makeMeasurable(async (databaseName, jsonData) => {
  // only parse the object if it hasn't been added yet
  const eventSubscription = jsonData.teamworks.eventSubscription[0]
  const versionId = eventSubscription.versionId[0]
  const result = {
    register: false,
    versionId
  }
  const item = await Registry.ObjectVersion.getById(databaseName, versionId)
  if (!item) {
    result.register = true
    result.id = eventSubscription.$.id
    result.name = eventSubscription.$.name
    result.description = ParseUtils.isNullXML(eventSubscription.description[0]) ? null : eventSubscription.description[0]
    result.type = TYPES.EventSubscription
    result.isExposed = true
    result.dependencies = []

    if (eventSubscription.processRef && !ParseUtils.isNullXML(eventSubscription.processRef[0])) {
      result.dependencies.push({
        childReference: eventSubscription.processRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.EventSubscription.AttachedService
      })
    }
    if (eventSubscription.participantRef && !ParseUtils.isNullXML(eventSubscription.participantRef[0])) {
      result.dependencies.push({
        childReference: eventSubscription.participantRef[0],
        dependencyType: OBJECT_DEPENDENCY_TYPES.EventSubscription.ExposedTo
      })
    }
  }

  return result
}, 'parseEventSubscription')

module.exports = parseEventSubscription
