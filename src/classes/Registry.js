const AppSnapshot = require('../classes/AppSnapshot')
const ObjectVersion = require('../classes/ObjectVersion')
const SnapshotDependency = require('../classes/SnapshotDependency')
const ObjectDependency = require('../classes/ObjectDependency')
const SnapshotObjectDependency = require('../classes/SnapshotObjectDependency')

const AppSnapshotObj = {
  register: (databaseName, item) => AppSnapshot.register(databaseName, item),
  markObjectsProcessed: (databaseName, snapshotId) => AppSnapshot.markObjectsProcessed(databaseName, snapshotId),
  getAll: (databaseName) => AppSnapshot.getAll(databaseName),
  getById: (databaseName, snapshotId) => AppSnapshot.getById(databaseName, snapshotId),
  where: (databaseName, obj) => AppSnapshot.where(databaseName, obj),
  find: (databaseName, obj) => AppSnapshot.find(databaseName, obj),
  remove: (databaseName, obj) => AppSnapshot.remove(databaseName, obj),
  removeOrphaned: (databaseName) => AppSnapshot.removeOrphaned(databaseName),
  getWithoutChildren: (databaseName, snapshotIdToExclude) => AppSnapshot.getWithoutChildren(databaseName, snapshotIdToExclude),
  getWithoutParents: (databaseName, snapshotIdToExclude) => AppSnapshot.getWithoutParents(databaseName, snapshotIdToExclude)
}

const ObjectVersionObj = {
  register: (databaseName, item) => ObjectVersion.register(databaseName, item),
  registerMany: (databaseName, items) => ObjectVersion.registerMany(databaseName, items),
  getAll: (databaseName) => ObjectVersion.getAll(databaseName),
  getById: (databaseName, objectVersionId) => ObjectVersion.getById(databaseName, objectVersionId),
  where: (databaseName, obj, snapshotObj) => ObjectVersion.where(databaseName, obj, snapshotObj),
  find: (databaseName, obj) => ObjectVersion.find(databaseName, obj),
  remove: (databaseName, obj) => ObjectVersion.remove(databaseName, obj),
  removeOrphaned: (databaseName) => ObjectVersion.removeOrphaned(databaseName)
}

const SnapshotDependencyObj = {
  register: (databaseName, item) => SnapshotDependency.register(databaseName, item),
  registerMany: (databaseName, items) => SnapshotDependency.registerMany(databaseName, items),
  getAll: (databaseName) => SnapshotDependency.getAll(databaseName),
  getByParentId: (databaseName, parentSnapshotId) => SnapshotDependency.getByParentId(databaseName, parentSnapshotId),
  getByChildId: (databaseName, childSnapshotId) => SnapshotDependency.getByChildId(databaseName, childSnapshotId),
  where: (databaseName, obj) => SnapshotDependency.where(databaseName, obj),
  find: (databaseName, obj) => SnapshotDependency.find(databaseName, obj),
  remove: (databaseName, obj) => SnapshotDependency.remove(databaseName, obj),
  removeOrphaned: (databaseName) => SnapshotDependency.removeOrphaned(databaseName)
}

const ObjectDependencyObj = {
  register: (databaseName, item) => ObjectDependency.register(databaseName, item),
  registerMany: (databaseName, items) => ObjectDependency.registerMany(databaseName, items),
  getAll: (databaseName) => ObjectDependency.getAll(databaseName),
  getByParentId: (databaseName, parentObjectVersionId) => ObjectDependency.getByParentId(databaseName, parentObjectVersionId),
  getByChildId: (databaseName, childObjectVersionId) => ObjectDependency.getByChildId(databaseName, childObjectVersionId),
  where: (databaseName, obj) => ObjectDependency.where(databaseName, obj),
  find: (databaseName, obj) => ObjectDependency.find(databaseName, obj),
  remove: (databaseName, obj) => ObjectDependency.remove(databaseName, obj),
  removeOrphaned: (databaseName) => ObjectDependency.removeOrphaned(databaseName)
}

const SnapshotObjectDependencyObj = {
  register: (databaseName, item) => SnapshotObjectDependency.register(databaseName, item),
  registerMany: (databaseName, items) => SnapshotObjectDependency.registerMany(databaseName, items),
  getAll: (databaseName) => SnapshotObjectDependency.getAll(databaseName),
  getByParentId: (databaseName, snapshotId) => SnapshotObjectDependency.getByParentId(databaseName, snapshotId),
  getByChildId: (databaseName, objectVersionId) => SnapshotObjectDependency.getByChildId(databaseName, objectVersionId),
  where: (databaseName, obj) => SnapshotObjectDependency.where(databaseName, obj),
  find: (databaseName, obj) => SnapshotObjectDependency.find(databaseName, obj),
  remove: (databaseName, obj) => SnapshotObjectDependency.remove(databaseName, obj),
  removeOrphaned: (databaseName) => SnapshotObjectDependency.removeOrphaned(databaseName)
}

const Registry = {
  AppSnapshot: AppSnapshotObj,
  ObjectVersion: ObjectVersionObj,
  SnapshotDependency: SnapshotDependencyObj,
  ObjectDependency: ObjectDependencyObj,
  SnapshotObjectDependency: SnapshotObjectDependencyObj
}

module.exports = Registry
