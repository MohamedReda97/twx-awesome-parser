const EventEmitter = require('events')
const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const ObjectVersion = require('../../classes/ObjectVersion')
const ObjectDependency = require('../../classes/ObjectDependency')
const { TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseProcess = require('./Process')
const parseUCA = require('./UCA')
const parseWebService = require('./WebService')
const parseReport = require('./Report')
const parseTWClass = require('./TWClass')
const parseScoreboard = require('./Scoreboard')
const parseTrackingGroup = require('./TrackingGroup')
const parseTimingInterval = require('./TimingInterval')
const parseLayout = require('./Layout')
const parseEPV = require('./EPV')
const parseParticipant = require('./Participant')
const parseBPD = require('./BPD')
const parseSLA = require('./SLA')
const parseKPI = require('./KPI')
const parseResource = require('./Resource')
const parseUserAtrribute = require('./UserAttribute')
const parseHistoricalScenario = require('./HistoricalScenario')
const parseExternalActivity = require('./ExternalActivity')
const parseFile = require('./File')
const parseEnvironmentVariable = require('./EnvironmentVariable')
const parseProjectDefaults = require('./ProjectDefaults')
const parseCoachView = require('./CoachView')
const parseEventSubscription = require('./EventSubscription')
const parseTheme = require('./Theme')

const buildDependencyTree = Performance.makeMeasurable(async (databaseName, parentSnapshotId) => {
  const result = {}
  const items = await Registry.SnapshotDependency.getByParentId(databaseName, parentSnapshotId)
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const dependencies = await buildDependencyTree(databaseName, item.childSnapshotId)
    result[item.dependencyId] = {
      dependencyId: item.dependencyId,
      snapshotId: item.childSnapshotId,
      dependencies
    }
  }
  return result
}, 'buildDependencyTree')

const getObjectVersionIdFromFullReference = Performance.makeMeasurable(async (databaseName, parentSnapshotId, childObjectReference, toolkits) => {
  const parts = childObjectReference.split('/')
  const childObjectId = parts[parts.length - 1]
  const dependencyArray = parts.slice(0, -1).filter(item => item !== '')

  let childSnapshotId = parentSnapshotId
  let dependencies = toolkits
  for (let i = 0; i < dependencyArray.length; i++) {
    const dependency = dependencies[`2069.${dependencyArray[i]}`]
    if (dependency) {
      childSnapshotId = dependency.snapshotId
      dependencies = dependency.dependencies
    }
  }

  const obj = await Registry.SnapshotObjectDependency.find(databaseName, {
    snapshotId: childSnapshotId,
    objectId: childObjectId
  })
  if (obj) {
    return obj.objectVersionId
  } else {
    return null
  }
}, 'getObjectVersionIdFromFullReference')

const getObjectVersionIdFromHalfReference = Performance.makeMeasurable(async (databaseName, parentSnapshotId, childObjectReference, toolkits) => {
  let childObjectVersionId = null
  const childObjectId = childObjectReference

  const appsToSearch = [parentSnapshotId].concat(toolkits.map(item => item.snapshotId))
  const objects = await Registry.SnapshotObjectDependency.where(databaseName, { objectId: childObjectId })

  for (let i = 0; i < objects.length; i++) {
    for (let j = 0; j < appsToSearch.length; j++) {
      if (appsToSearch[j] === objects[i].snapshotId) {
        childObjectVersionId = objects[i].objectVersionId
        break
      }
    }
    if (childObjectVersionId) {
      break
    }
  }

  return childObjectVersionId
}, 'getObjectVersionIdFromHalfReference')

const saveObjectInformation = Performance.makeMeasurable(async (databaseName, objectInformationArray, currentSnapshotId, dependencyCache, toolkitsAsMap, toolkitsAsArray) => {
  let objectVersionArray = []
  let objectDependenciesArray = []
  if (objectInformationArray) {
    for (let i = 0; i < objectInformationArray.length; i++) {
      const objectInfo = objectInformationArray[i]
      if (objectInfo && objectInfo.register) {
        objectVersionArray.push(new ObjectVersion(objectInfo.versionId, objectInfo.id, objectInfo.name, objectInfo.description, objectInfo.type, objectInfo.subType, objectInfo.isExposed))

        const dependencyArr = []
        if (objectInfo.dependencies) {
          // remove duplicates
          objectInfo.dependencies = objectInfo.dependencies.filter((item, pos, self) =>
            pos === self.findIndex((i) =>
              i.childReference === item.childReference && i.dependencyType === item.dependencyType && i.dependencyName === item.dependencyName
            )
          )

          for (let i = 0; i < objectInfo.dependencies.length; i++) {
            const childObjectReference = objectInfo.dependencies[i].childReference
            const dependencyType = objectInfo.dependencies[i].dependencyType
            const dependencyName = objectInfo.dependencies[i].dependencyName
            let childObjectVersionId
            if (!(`${currentSnapshotId};${childObjectReference}` in dependencyCache)) {
              if (childObjectReference.indexOf('/') > -1) {
                // there is a full path, so we can easily infer the ids
                childObjectVersionId = await getObjectVersionIdFromFullReference(databaseName, currentSnapshotId, childObjectReference, toolkitsAsMap)
              } else {
                // there is only an object id, so we need to perform a deeper search
                childObjectVersionId = await getObjectVersionIdFromHalfReference(databaseName, currentSnapshotId, childObjectReference, toolkitsAsArray)
              }
              dependencyCache[`${currentSnapshotId};${childObjectReference}`] = childObjectVersionId
            } else {
              childObjectVersionId = dependencyCache[`${currentSnapshotId};${childObjectReference}`]
            }

            if (childObjectVersionId) {
              // Registry.ObjectDependency.register(new ObjectDependency(objectInfo.versionId, childObjectVersionId))
              dependencyArr.push(new ObjectDependency(objectInfo.versionId, childObjectVersionId, dependencyType, dependencyName))
            } else {
              // console.warn(`Reference ${childObjectReference} was not found. Parent Snapshot Id is ${currentSnapshotId}`)
            }
          }
        }
        objectDependenciesArray = objectDependenciesArray.concat(dependencyArr)
      }
    }
  }

  // Remove all duplicates
  objectVersionArray = objectVersionArray.filter((item, index, array) =>
    index === array.findIndex((t) => (
      t.objectVersionId === item.objectVersionId
    ))
  )
  objectDependenciesArray = objectDependenciesArray.filter((item, index, array) =>
    index === array.findIndex((t) => (
      t.parentObjectVersionId === item.parentObjectVersionId && t.childObjectVersionId === item.childObjectVersionId
    ))
  )
  await Registry.ObjectVersion.registerMany(databaseName, objectVersionArray)
  await Registry.ObjectDependency.registerMany(databaseName, objectDependenciesArray)
}, 'saveObjectInformation')

const parseObject = Performance.makeMeasurable(async (databaseName, zipFile, entryType, entryName, currentSnapshotId) => {
  const entry = zipFile.getEntry(entryName)
  const jsonData = await ParseUtils.parseXML(entry.getData().toString('utf-8'), entryName)
  let objectInfo
  switch (entryType) {
    case TYPES.Process:
      objectInfo = await parseProcess(databaseName, jsonData)
      break
    case TYPES.UCA:
      objectInfo = await parseUCA(databaseName, jsonData)
      break
    case TYPES.WebService:
      objectInfo = await parseWebService(databaseName, jsonData)
      break
    case TYPES.Report:
      objectInfo = await parseReport(databaseName, jsonData)
      break
    case TYPES.TWClass:
      objectInfo = await parseTWClass(databaseName, jsonData)
      break
    case TYPES.Scoreboard:
      objectInfo = await parseScoreboard(databaseName, jsonData)
      break
    case TYPES.TrackingGroup:
      objectInfo = await parseTrackingGroup(databaseName, jsonData)
      break
    case TYPES.TimingInterval:
      objectInfo = await parseTimingInterval(databaseName, jsonData)
      break
    case TYPES.Layout:
      objectInfo = await parseLayout(databaseName, jsonData)
      break
    case TYPES.EPV:
      objectInfo = await parseEPV(databaseName, jsonData)
      break
    case TYPES.Participant:
      objectInfo = await parseParticipant(databaseName, jsonData)
      break
    case TYPES.BPD:
      objectInfo = await parseBPD(databaseName, jsonData)
      break
    case TYPES.SLA:
      objectInfo = await parseSLA(databaseName, jsonData)
      break
    case TYPES.KPI:
      objectInfo = await parseKPI(databaseName, jsonData)
      break
    case TYPES.Resource:
      objectInfo = await parseResource(databaseName, jsonData)
      break
    case TYPES.UserAttribute:
      objectInfo = await parseUserAtrribute(databaseName, jsonData)
      break
    case TYPES.HistoricalScenario:
      objectInfo = await parseHistoricalScenario(databaseName, jsonData)
      break
    case TYPES.ExternalActivity:
      objectInfo = await parseExternalActivity(databaseName, jsonData)
      break
    case TYPES.File:
      objectInfo = await parseFile(databaseName, jsonData)
      break
    case TYPES.EnvironmentVariable:
      objectInfo = await parseEnvironmentVariable(databaseName, jsonData)
      break
    case TYPES.ProjectDefaults:
      objectInfo = await parseProjectDefaults(databaseName, jsonData)
      break
    case TYPES.CoachView:
      objectInfo = await parseCoachView(databaseName, jsonData)
      break
    case TYPES.EventSubscription:
      objectInfo = await parseEventSubscription(databaseName, jsonData)
      break
    case TYPES.Theme:
      objectInfo = await parseTheme(databaseName, jsonData)
      break
    default:
      // do nothing
      break
  }
  return objectInfo
}, 'parseObject')

const addObjects = async (databaseName, zipFile, fileName, startCallback, progressCallback, endCallback) => {
  const packageEntry = zipFile.getEntry('META-INF/package.xml')
  const packageJsonData = await ParseUtils.parseXML(packageEntry.getData().toString('utf-8'), 'META-INF/package.xml')
  const currentSnapshotId = packageJsonData.package.target[0].snapshot[0].$.id

  const existingAppSnapshot = await Registry.AppSnapshot.getById(databaseName, currentSnapshotId)
  if (!existingAppSnapshot || !existingAppSnapshot.isObjectsProcessed) {
    const objectEntryNames = zipFile.getEntries().map(entry => entry.entryName).filter(name => name.indexOf('objects/') === 0)

    const toolkits = await buildDependencyTree(databaseName, currentSnapshotId)
    const toolkitsArray = Object.values(toolkits)

    startCallback({
      id: currentSnapshotId,
      name: fileName,
      skipped: false,
      total: objectEntryNames.length
    })
    const dependencyCache = {}
    const objectInformationArray = []
    for (let i = 0; i < objectEntryNames.length; i++) {
      const entryName = objectEntryNames[i]
      const entryType = entryName.split('/')[1].split('.')[0]
      const objectInfo = await parseObject(databaseName, zipFile, entryType, entryName, currentSnapshotId)
      objectInformationArray.push(objectInfo)
      progressCallback({
        id: currentSnapshotId,
        data: [objectInfo]
      })
    }
    await saveObjectInformation(databaseName, objectInformationArray, currentSnapshotId, dependencyCache, toolkits, toolkitsArray)
    endCallback({
      id: currentSnapshotId
    })
    await Registry.AppSnapshot.markObjectsProcessed(databaseName, currentSnapshotId)
  } else {
    startCallback({
      id: currentSnapshotId,
      name: fileName,
      skipped: true,
      total: 0
    })
    endCallback({
      id: currentSnapshotId
    })
  }
}

class ObjectParser extends EventEmitter {
  constructor (databaseName) {
    super()
    this.databaseName = databaseName
  }

  add (zipFile, fileName) {
    return addObjects(this.databaseName, zipFile, fileName, data => {
      this.emit('start', {
        id: data.id,
        name: data.name,
        skipped: data.skipped,
        total: data.total
      })
    }, data => {
      this.emit('progress', data)
    }, data => {
      this.emit('end', data)
    })
  }
}

module.exports = ObjectParser
