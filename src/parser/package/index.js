const EventEmitter = require('events')
const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const AppSnapshot = require('../../classes/AppSnapshot')
const SnapshotDependency = require('../../classes/SnapshotDependency')
const SnapshotObjectDependency = require('../../classes/SnapshotObjectDependency')

const addPackage = async (databaseName, zipFile, fileName, startCallback, progressCallback, endCallback) => {
  const packageEntry = zipFile.getEntry('META-INF/package.xml')

  const jsonData = await ParseUtils.parseXML(packageEntry.getData().toString('utf-8'), fileName)
  const snapshot = jsonData.package.target[0].snapshot[0]
  const project = jsonData.package.target[0].project[0]
  const branch = jsonData.package.target[0].branch[0]
  const parentSnapshotId = snapshot.$.id

  // only parse the package if it hasn't been added yet
  const existingAppSnapshot = await Registry.AppSnapshot.getById(databaseName, parentSnapshotId)
  if (!existingAppSnapshot) {
    const appSnapshot = new AppSnapshot(parentSnapshotId, project.$.id, branch.$.id, project.$.shortName, snapshot.$.name, project.$.name, branch.$.name,
      project.$.description, jsonData.package.$.buildVersion, project.$.isToolkit === 'true', project.$.isSystem === 'true', false)
    await Registry.AppSnapshot.register(databaseName, appSnapshot)

    startCallback({
      id: parentSnapshotId,
      name: fileName,
      skipped: false,
      total: (jsonData.package.dependencies[0].dependency ? jsonData.package.dependencies[0].dependency.length : 0) +
        (jsonData.package.objects[0].object ? jsonData.package.objects[0].object.length : 0)
    })

    if (jsonData.package.dependencies[0].dependency) {
      const objectsToAdd = jsonData.package.dependencies[0].dependency.map(dependency =>
        new SnapshotDependency(parentSnapshotId, dependency.snapshot[0].$.id, Number(dependency.$.rank), dependency.$.id))
      await Registry.SnapshotDependency.registerMany(databaseName, objectsToAdd)
      progressCallback({
        id: parentSnapshotId,
        data: objectsToAdd
      })
    }

    if (jsonData.package.objects[0].object) {
      const objectsToAdd = jsonData.package.objects[0].object.filter(obj => obj.$.type !== 'SmartFolder').map(obj =>
        new SnapshotObjectDependency(parentSnapshotId, obj.$.versionId, obj.$.id))
      await Registry.SnapshotObjectDependency.registerMany(databaseName, objectsToAdd)
      progressCallback({
        id: parentSnapshotId,
        data: objectsToAdd
      })
    }
    endCallback({
      id: parentSnapshotId
    })
  } else {
    startCallback({
      id: parentSnapshotId,
      name: fileName,
      skipped: true,
      total: 0
    })
    endCallback({
      id: parentSnapshotId
    })
  }
}

const removePackage = async (databaseName, zipFile, fileName, startCallback, endCallback) => {
  const packageEntry = zipFile.getEntry('META-INF/package.xml')

  const jsonData = await ParseUtils.parseXML(packageEntry.getData().toString('utf-8'), fileName)
  const snapshot = jsonData.package.target[0].snapshot[0]
  const parentSnapshotId = snapshot.$.id

  // only parse the package if it exists and is not a toolkit
  const existingAppSnapshot = await Registry.AppSnapshot.getById(databaseName, parentSnapshotId)
  let snapshotParents = []
  if (existingAppSnapshot) {
    snapshotParents = await Registry.SnapshotDependency.getByChildId(databaseName, existingAppSnapshot.snapshotId)
  }
  if (existingAppSnapshot && snapshotParents.length === 0) {
    startCallback({
      id: parentSnapshotId,
      name: fileName,
      skipped: false,
      total: 0
    })
    await Registry.SnapshotObjectDependency.remove(databaseName, { snapshotId: parentSnapshotId })
    await Registry.SnapshotDependency.remove(databaseName, { parentSnapshotId: parentSnapshotId })
    await Registry.AppSnapshot.remove(databaseName, { snapshotId: parentSnapshotId })

    let allSnapshots = await Registry.AppSnapshot.getAll(databaseName)
    let appSnapshotCount = allSnapshots.length
    // console.log(`I currently have ${appSnapshotCount} snapshots`)
    while (true) {
      await Registry.AppSnapshot.removeOrphaned(databaseName)
      await Registry.SnapshotDependency.removeOrphaned(databaseName)
      await Registry.SnapshotObjectDependency.removeOrphaned(databaseName)
      await Registry.ObjectVersion.removeOrphaned(databaseName)
      await Registry.ObjectDependency.removeOrphaned(databaseName)

      allSnapshots = await Registry.AppSnapshot.getAll(databaseName)
      const newAppSnapshotCount = allSnapshots.length
      // console.log(`I currently have ${newAppSnapshotCount} snapshots`)
      if (appSnapshotCount === newAppSnapshotCount) {
        break
      } else {
        appSnapshotCount = newAppSnapshotCount
      }
    }

    endCallback({
      id: parentSnapshotId
    })
  } else {
    startCallback({
      id: parentSnapshotId,
      name: fileName,
      skipped: true,
      total: 0
    })
    endCallback({
      id: parentSnapshotId
    })
  }
}

class PackageParser extends EventEmitter {
  constructor (databaseName) {
    super()
    this.databaseName = databaseName
  }

  add (zipFile, fileName) {
    return addPackage(this.databaseName, zipFile, fileName, data => {
      this.emit('start', data)
    }, data => {
      this.emit('progress', data)
    }, data => {
      this.emit('end', data)
    })
  }

  remove (zipFile, fileName) {
    return removePackage(this.databaseName, zipFile, fileName, data => {
      this.emit('start', data)
    }, data => {
      this.emit('end', data)
    })
  }
}

module.exports = PackageParser
