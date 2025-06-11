const EventEmitter = require('events')
const Parser = require('../parser')
const Registry = require('./Registry')

/**
 * @typedef {Object} AppSnapshot
 * @property {string} snapshotId - Snapshot ID
 * @property {string} appId - Application ID
 * @property {string} branchId - Branch ID
 * @property {string} snapshotName - Snapshot Name
 * @property {string} branchName - Branch Name
 * @property {string} appShortName - Application Acronym
 * @property {string} appName - Application Name
 * @property {string} description - Application Description
 * @property {string} buildVersion - Application Build Version
 * @property {boolean} isToolkit - True if the snapshot is from a toolkit, and false otherwise
 * @property {boolean} isSystem - True if the snapshot is made by IBM, and false otherwise
 */

/**
 * @typedef {Object} ObjectVersion
 * @property {string} objectVersionId - Object Version ID
 * @property {string} objectId - Object ID
 * @property {string} name - Object Name
 * @property {string} type - Object Type
 * @property {string} subtype - Object Subtype
 */

/**
 * @typedef {Object} SnapshotCriteria
 * @property {string|Array<string>} snapshotId - use this property to query by one or more snapshot IDs
 * @property {string|Array<string>} appId - use this property to query by one or more application IDs
 * @property {string|Array<string>} branchId - use this property to query by one or more branch IDs
 * @property {string|Array<string>} snapshotName - use this property to query by one or more snapshot names
 * @property {string|Array<string>} branchName - use this property to query by one or more branch names
 * @property {string|Array<string>} appShortName - use this property to query by one or more application acronyms
 * @property {string|Array<string>} appName - use this property to query by one or more application names
 * @property {string|Array<string>} description - use this property to query by one or more application descriptions
 * @property {string|Array<string>} buildVersion - use this property to query by one or more application build versions
 * @property {string|Array<boolean>} isToolkit - use this property to query by toolkits or process applications
 * @property {string|Array<boolean>} isSystem - use this property to query by system toolkits or applications
 */

/**
 * @typedef {Object} ObjectCriteria
 * @property {string|Array<string>} objectVersionId - use this property to query by one or more object version IDs
 * @property {string|Array<string>} objectId - use this property to query by one or more object IDs
 * @property {string|Array<string>} name - use this property to query by one or more object names
 * @property {string|Array<string>} type - use this property to query by one or more object types
 * @property {string|Array<string>} subtype - use this property to query by one or more object sub types
 */

const getWithoutChildren = async (name, level, exclusions) => {
  const snapshots = await Registry.AppSnapshot.getWithoutChildren(name, exclusions)
  const snapshotIds = snapshots.map(item => item.snapshotId)
  const dependencies = await Registry.SnapshotDependency.getByChildId(name, snapshotIds)
  const parentIds = dependencies.map(item => item.parentSnapshotId)
  const parentSnapshots = await Registry.AppSnapshot.where(name, { snapshotId: parentIds })
  const newExclusions = exclusions.concat(snapshotIds)
  return {
    items: snapshots.map(snapshot => {
      return {
        snapshot,
        parents: parentSnapshots.filter(parent =>
          dependencies.filter(dependency => dependency.childSnapshotId === snapshot.snapshotId && dependency.parentSnapshotId === parent.snapshotId).length > 0
        )
      }
    }),
    level: level,
    getNextLevel: () => getWithoutChildren(name, level + 1, newExclusions)
  }
}

const getWithoutParents = async (name, level, exclusions) => {
  const snapshots = await Registry.AppSnapshot.getWithoutParents(name, exclusions)
  const snapshotIds = snapshots.map(item => item.snapshotId)
  const dependencies = await Registry.SnapshotDependency.getByParentId(name, snapshotIds)
  const childIds = dependencies.map(item => item.childSnapshotId)
  const childSnapshots = await Registry.AppSnapshot.where(name, { snapshotId: childIds })
  const newExclusions = exclusions.concat(snapshotIds)
  return {
    items: snapshots.map(snapshot => {
      return {
        snapshot,
        children: childSnapshots.filter(child =>
          dependencies.filter(dependency => dependency.parentSnapshotId === snapshot.snapshotId && dependency.childSnapshotId === child.snapshotId).length > 0
        )
      }
    }),
    level: level,
    getNextLevel: () => getWithoutParents(name, level + 1, newExclusions)
  }
}

/** Class that represents a workspace */
class Workspace extends EventEmitter {
  /**
   * Create a workspace.
   * @param {string} name - The workspace name
   */
  constructor (name) {
    super()
    this.name = name
    this.parser = new Parser(this.name)

    const events = ['packageStart', 'packageProgress', 'packageEnd', 'objectStart', 'objectProgress', 'objectEnd']
    events.map(event => {
      this.parser.on(event, data => {
        this.emit(event, data)
      })
    })
  }

  /**
   * Add a file to the workspace.
   * @async
   * @param {string} filePath - path to the TWX file to be added
   * @return {Promise<undefined|Error>} a `Promise` that will be resolved if the file is successfully parsed and added, or rejected with an `Error` instance if any error occurs.
   */
  async addFile (filePath) {
    await this.parser.addFile(filePath)
  }

  /**
   * Remove a file from the workspace.
   * @async
   * @param {string} filePath - path to the TWX file to be removed
   * @return {Promise<undefined|Error>} a `Promise` that will be resolved if the file is successfully parsed and removed, or rejected with an `Error` instance if any error occurs.
   */
  async removeFile (filePath) {
    await this.parser.removeFile(filePath)
  }

  /**
   * Query snapshots from the workspace.
   * @async
   * @param {SnapshotCriteria} criteria - search criteria
   * @return {Promise<Array<AppSnapshot>|Error>} a `Promise` that will be resolved with an array of `AppSnapshot` instances with the results that match the given criteria, or rejected with an `Error` instance if any error occurs
   */
  async getSnapshots (criteria) {
    return Registry.AppSnapshot.where(this.name, criteria)
  }

  /**
   * Retrieve snapshots that are direct children of the snapshot(s) passed as input.
   * @async
   * @param {AppSnapshot|Array<AppSnapshot>} inputData - snapshot(s) for which we want to retrieve children
   * @return {Promise<Array<AppSnapshot>|Error>} a `Promise` that will be resolved with an array of `AppSnapshot` instances with the results that match the given criteria, or rejected with an `Error` instance if any error occurs
   */
  async getSnapshotDependencies (inputData) {
    const snapshotId = Array.isArray(inputData) ? inputData.map(snap => snap.snapshotId) : inputData.snapshotId
    return Registry.SnapshotDependency.getByParentId(this.name, snapshotId).then(dependencies =>
      Registry.AppSnapshot.where(this.name, { snapshotId: dependencies.map(dependency => dependency.childSnapshotId) }).then(childSnapshots => {
        if (Array.isArray(inputData)) {
          return inputData.map(snap =>
            childSnapshots.filter(child =>
              dependencies.filter(dependency => dependency.parentSnapshotId === snap.snapshotId && dependency.childSnapshotId === child.snapshotId).length > 0
            )
          )
        } else {
          return childSnapshots
        }
      })
    )
  }

  /**
   * Retrieve snapshots that are direct parents of the snapshot(s) passed as input.
   * @async
   * @param {AppSnapshot|Array<AppSnapshot>} inputData - snapshot(s) for which we want to retrieve parents
   * @return {Promise<Array<AppSnapshot>|Error>} a `Promise` that will be resolved with an array of `AppSnapshot` instances with the results that match the given criteria, or rejected with an `Error` instance if any error occurs
   */
  async getSnapshotWhereUsed (inputData) {
    const snapshotId = Array.isArray(inputData) ? inputData.map(snap => snap.snapshotId) : inputData.snapshotId
    return Registry.SnapshotDependency.getByChildId(this.name, snapshotId).then(dependencies =>
      Registry.AppSnapshot.where(this.name, { snapshotId: dependencies.map(dependency => dependency.parentSnapshotId) }).then(parentSnapshots => {
        if (Array.isArray(inputData)) {
          return inputData.map(snap =>
            parentSnapshots.filter(parent =>
              dependencies.filter(dependency => dependency.childSnapshotId === snap.snapshotId && dependency.parentSnapshotId === parent.snapshotId).length > 0
            )
          )
        } else {
          return parentSnapshots
        }
      })
    )
  }

  /**
   * Retrieve objects that belong to the snapshot(s) passed as input.
   * @async
   * @param {AppSnapshot|Array<AppSnapshot>} inputData - snapshot(s) for which we want to retrieve objects
   * @return {Promise<Array<ObjectVersion>|Error>} a `Promise` that will be resolved with an array of `ObjectVersion` instances with the results that match the given criteria, or rejected with an `Error` instance if any error occurs
   */
  async getSnapshotObjects (inputData) {
    const snapshotId = Array.isArray(inputData) ? inputData.map(snap => snap.snapshotId) : inputData.snapshotId
    return Registry.SnapshotObjectDependency.getByParentId(this.name, snapshotId).then(dependencies =>
      Registry.ObjectVersion.where(this.name, { objectVersionId: dependencies.map(dependency => dependency.objectVersionId) }).then(childObjects => {
        if (Array.isArray(inputData)) {
          return inputData.map(snap =>
            childObjects.filter(child =>
              dependencies.filter(dependency => dependency.snapshotId === snap.snapshotId && dependency.objectVersionId === child.objectVersionId).length > 0
            )
          )
        } else {
          return childObjects
        }
      })
    )
  }

  /**
   * Query objects from the workspace. Optionally, you can restrict results that belong to snapshot(s) that match the given criteria.
   * @async
   * @param {ObjectCriteria} objectCriteria - search criteria
   * @param {SnapshotCriteria} snapshotCriteria - snapshot search criteria to restrict results
   * @return {Promise<Array<ObjectVersion>|Error>} a `Promise` that will be resolved with an array of `ObjectVersion` instances with the results that match the given criteria, or rejected with an `Error` instance if any error occurs
   */
  async getObjects (objectCriteria, snapshotCriteria) {
    return Registry.ObjectVersion.where(this.name, objectCriteria, snapshotCriteria)
  }

  /**
   * Retrieve objects that are direct children of the objects(s) passed as input. Optionally, you can restrict results that belong to snapshot(s) that match the given criteria.
   * @async
   * @param {ObjectVersion|Array<ObjectVersion>} inputData - object(s) for which we want to retrieve direct children
   * @param {SnapshotCriteria} snapshotCriteria - snapshot search criteria to restrict results
   * @return {Promise<Array<ObjectVersion>|Error>} a `Promise` that will be resolved with an array of `ObjectVersion` instances with the results that match the given criteria, or rejected with an `Error` instance if any error occurs
   */
  async getObjectDependencies (inputData, snapshotCriteria) {
    const objectVersionId = Array.isArray(inputData) ? inputData.map(obj => obj.objectVersionId) : inputData.objectVersionId
    return Registry.ObjectDependency.getByParentId(this.name, objectVersionId).then(dependencies =>
      Registry.ObjectVersion.where(this.name, { objectVersionId: dependencies.map(dependency => dependency.childObjectVersionId) }).then(childObjectCandidates => {
        if (snapshotCriteria) {
          return this.getSnapshots(snapshotCriteria)
            .then(snapshots => this.getSnapshotObjects(snapshots))
            .then(arrays => [].concat.apply([], arrays))
            .then(snapshotsObjects =>
              childObjectCandidates.filter(obj => snapshotsObjects.filter(snapObj => snapObj.objectVersionId === obj.objectVersionId).length > 0)
            )
        } else {
          return childObjectCandidates
        }
      }).then(childObjects => {
        if (Array.isArray(inputData)) {
          return inputData.map(obj =>
            childObjects.filter(child =>
              dependencies.filter(dependency => dependency.parentObjectVersionId === obj.objectVersionId &&
                dependency.childObjectVersionId === child.objectVersionId).length > 0
            )
          )
        } else {
          return childObjects
        }
      })
    )
  }

  /**
   * Retrieve objects that are direct parents of the objects(s) passed as input. Optionally, you can restrict results that belong to snapshot(s) that match the given criteria.
   * @async
   * @param {ObjectVersion|Array<ObjectVersion>} inputData - object(s) for which we want to retrieve direct parents
   * @param {SnapshotCriteria} snapshotCriteria - snapshot search criteria to restrict results
   * @return {Promise<Array<ObjectVersion>|Error>} a `Promise` that will be resolved with an array of `ObjectVersion` instances with the results that match the given criteria, or rejected with an `Error` instance if any error occurs
   */
  async getObjectWhereUsed (inputData, snapshotCriteria) {
    const objectVersionId = Array.isArray(inputData) ? inputData.map(obj => obj.objectVersionId) : inputData.objectVersionId
    return Registry.ObjectDependency.getByChildId(this.name, objectVersionId).then(dependencies =>
      Registry.ObjectVersion.where(this.name, { objectVersionId: dependencies.map(dependency => dependency.parentObjectVersionId) }).then(parentObjectCandidates => {
        if (snapshotCriteria) {
          return this.getSnapshots(snapshotCriteria)
            .then(snapshots => this.getSnapshotObjects(snapshots))
            .then(arrays => [].concat.apply([], arrays))
            .then(snapshotsObjects =>
              parentObjectCandidates.filter(obj => snapshotsObjects.filter(snapObj => snapObj.objectVersionId === obj.objectVersionId).length > 0)
            )
        } else {
          return parentObjectCandidates
        }
      }).then(parentObjects => {
        if (Array.isArray(inputData)) {
          return inputData.map(obj =>
            parentObjects.filter(parent =>
              dependencies.filter(dependency => dependency.childObjectVersionId === obj.objectVersionId &&
                dependency.parentObjectVersionId === parent.objectVersionId).length > 0
            )
          )
        } else {
          return parentObjects
        }
      })
    )
  }

  /**
   * Retrieve snapshots whose object(s) passed as input belong to.
   * @async
   * @param {ObjectVersion|Array<ObjectVersion>} inputData - object(s) for which we want to retrieve snapshots
   * @return {Promise<Array<AppSnapshot>|Error>} a `Promise` that will be resolved with an array of `AppSnapshot` instances with the results that match the given criteria, or rejected with an `Error` instance if any error occurs
   */
  async getObjectSnapshots (inputData) {
    const objectVersionId = Array.isArray(inputData) ? inputData.map(obj => obj.objectVersionId) : inputData.objectVersionId
    return Registry.SnapshotObjectDependency.getByChildId(this.name, objectVersionId).then(dependencies =>
      Registry.AppSnapshot.where(this.name, { snapshotId: dependencies.map(dependency => dependency.snapshotId) }).then(parentSnapshots => {
        if (Array.isArray(inputData)) {
          return inputData.map(obj =>
            parentSnapshots.filter(parent =>
              dependencies.filter(dependency => dependency.snapshotId === parent.snapshotId && dependency.objectVersionId === obj.objectVersionId).length > 0
            )
          )
        } else {
          return parentSnapshots
        }
      })
    )
  }

  /**
   * Retrieve snapshots that do not depend on any other snapshots.
   * @async
   * @return {Promise<Array<object>|Error>} a `Promise` that will be resolved with an array of results that match the given criteria, or rejected with an `Error` instance if any error occurs. The result has a `getNextLevel` method to retrieve the next level on the dependency tree.
   */
  async getLeafNodes () {
    return getWithoutChildren(this.name, 1, [])
  }

  /**
   * Retrieve snapshots that are not a dependency to any other snapshots.
   * @async
   * @return {Promise<Array<object>|Error>} a `Promise` that will be resolved with an array of results that match the given criteria, or rejected with an `Error` instance if any error occurs. The result has a `getNextLevel` method to retrieve the next level on the dependency tree.
   */
  async getTopLevelNodes () {
    return getWithoutParents(this.name, 1, [])
  }
}

module.exports = Workspace
