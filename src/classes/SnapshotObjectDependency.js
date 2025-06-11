const { SnapshotObjectDependency: DBAccess } = require('../db')

const getObjectFromResult = item =>
  item
    ? new SnapshotObjectDependency(item.snapshotId, item.objectVersionId, item.objectId)
    : null

const getObjectFromItem = obj =>
  obj
    ? {
      snapshotId: obj.snapshotId,
      objectVersionId: obj.objectVersionId,
      objectId: obj.objectId
    }
    : null

class SnapshotObjectDependency {
  constructor (snapshotId, objectVersionId, objectId) {
    // relationship info
    this.objectVersionId = objectVersionId
    this.snapshotId = snapshotId
    this.objectId = objectId
  }
}

SnapshotObjectDependency.register = (workspaceName, item) => DBAccess.register(workspaceName, getObjectFromItem(item))
SnapshotObjectDependency.registerMany = (workspaceName, items) => DBAccess.registerMany(workspaceName, items.map(getObjectFromItem))
SnapshotObjectDependency.getAll = (workspaceName) => DBAccess.getAll(workspaceName).then(results => results.map(getObjectFromResult))
SnapshotObjectDependency.getByParentId = (workspaceName, snapshotId) => DBAccess.where(workspaceName, { snapshotId }).then(results => results.map(getObjectFromResult))
SnapshotObjectDependency.getByChildId = (workspaceName, objectVersionId) => DBAccess.where(workspaceName, { objectVersionId }).then(results => results.map(getObjectFromResult))
SnapshotObjectDependency.where = (workspaceName, obj) => DBAccess.where(workspaceName, obj).then(results => results.map(getObjectFromResult))
SnapshotObjectDependency.find = (workspaceName, obj) => DBAccess.find(workspaceName, obj).then(result => getObjectFromResult(result))
SnapshotObjectDependency.remove = (workspaceName, obj) => DBAccess.remove(workspaceName, obj)
SnapshotObjectDependency.removeOrphaned = (workspaceName) => DBAccess.removeOrphaned(workspaceName)

module.exports = SnapshotObjectDependency
