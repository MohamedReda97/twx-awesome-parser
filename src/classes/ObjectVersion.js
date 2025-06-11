const { ObjectVersion: DBAccess } = require('../db')

const getObjectFromResult = item =>
  item
    ? new ObjectVersion(item.objectVersionId, item.objectId, item.name, item.description, item.type, item.subtype, item.isExposed === 1)
    : null

const getObjectFromItem = obj =>
  obj
    ? {
      objectVersionId: obj.objectVersionId,
      objectId: obj.objectId,
      name: obj.name,
      description: obj.description,
      type: obj.type,
      subtype: obj.subtype,
      isExposed: obj.isExposed ? 1 : 0
    }
    : null

class ObjectVersion {
  constructor (objectVersionId, objectId, name, description, type, subtype, isExposed) {
    // primary key
    this.objectVersionId = objectVersionId

    // basic info
    this.objectId = objectId
    this.name = name
    this.description = description
    this.type = type
    this.subtype = subtype
    this.isExposed = isExposed
  }
}

ObjectVersion.register = (workspaceName, item) => DBAccess.register(workspaceName, getObjectFromItem(item))
ObjectVersion.registerMany = (workspaceName, items) => DBAccess.registerMany(workspaceName, items.map(getObjectFromItem))
ObjectVersion.getAll = (workspaceName) => DBAccess.getAll(workspaceName).then(results => results.map(getObjectFromResult))
ObjectVersion.getById = (workspaceName, objectVersionId) => DBAccess.getById(workspaceName, objectVersionId).then(result => getObjectFromResult(result))
ObjectVersion.where = (workspaceName, obj, snapshotObj) => DBAccess.where(workspaceName, obj, snapshotObj).then(results => results.map(getObjectFromResult))
ObjectVersion.find = (workspaceName, obj) => DBAccess.find(workspaceName, obj).then(result => getObjectFromResult(result))
ObjectVersion.remove = (workspaceName, obj) => DBAccess.remove(workspaceName, obj)
ObjectVersion.removeOrphaned = (workspaceName) => DBAccess.removeOrphaned(workspaceName)

module.exports = ObjectVersion
