const { AppSnapshot: DBAccess } = require('../db')

const getObjectFromResult = item =>
  item
    ? new AppSnapshot(item.snapshotId, item.appId, item.branchId, item.appShortName, item.snapshotName, item.appName, item.branchName, item.description,
      item.buildVersion, item.isToolkit === 1, item.isSystem === 1, item.isObjectsProcessed === 1)
    : null

const getObjectFromItem = obj =>
  obj
    ? {
      snapshotId: obj.snapshotId,
      appId: obj.appId,
      branchId: obj.branchId,
      appShortName: obj.appShortName,
      snapshotName: obj.snapshotName,
      appName: obj.appName,
      branchName: obj.branchName,
      description: obj.description,
      buildVersion: obj.buildVersion,
      isToolkit: obj.isToolkit ? 1 : 0,
      isSystem: obj.isSystem ? 1 : 0,
      isObjectsProcessed: obj.isObjectsProcessed ? 1 : 0
    }
    : null

class AppSnapshot {
  constructor (id, appId, branchId, appShortName, snapshotName, appName, branchName, description, buildVersion, isToolkit, isSystem, isObjectsProcessed) {
    // primary key
    this.snapshotId = id

    // basic info
    this.appId = appId
    this.branchId = branchId
    this.snapshotName = snapshotName
    this.branchName = branchName
    this.appShortName = appShortName
    this.appName = appName
    this.description = description
    this.buildVersion = buildVersion
    this.isToolkit = isToolkit
    this.isSystem = isSystem
    this.isObjectsProcessed = isObjectsProcessed
  }
}

AppSnapshot.register = (workspaceName, item) => DBAccess.register(workspaceName, getObjectFromItem(item))
AppSnapshot.markObjectsProcessed = (workspaceName, snapshotId) => DBAccess.update(workspaceName, snapshotId, { isObjectsProcessed: 1 })
AppSnapshot.getAll = (workspaceName) => DBAccess.getAll(workspaceName).then(results => results.map(getObjectFromResult))
AppSnapshot.getById = (workspaceName, snapshotId) => DBAccess.getById(workspaceName, snapshotId).then(result => getObjectFromResult(result))
AppSnapshot.where = (workspaceName, obj) => DBAccess.where(workspaceName, obj).then(results => results.map(getObjectFromResult))
AppSnapshot.find = (workspaceName, obj) => DBAccess.find(workspaceName, obj).then(result => getObjectFromResult(result))
AppSnapshot.remove = (workspaceName, obj) => DBAccess.remove(workspaceName, obj)
AppSnapshot.removeOrphaned = (workspaceName) => DBAccess.removeOrphaned(workspaceName)
AppSnapshot.getWithoutChildren = (workspaceName, snapshotIdToExclude) => DBAccess.getWithoutChildren(workspaceName, snapshotIdToExclude)
AppSnapshot.getWithoutParents = (workspaceName, snapshotIdToExclude) => DBAccess.getWithoutParents(workspaceName, snapshotIdToExclude)

module.exports = AppSnapshot
