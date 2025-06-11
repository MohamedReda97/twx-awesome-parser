const path = require('path')
const fs = require('fs')
const { getDB, checkAccess } = require('./common')
const AppSnapshot = require('./AppSnapshot')
const ObjectVersion = require('./ObjectVersion')
const ObjectDependency = require('./ObjectDependency')
const SnapshotDependency = require('./SnapshotDependency')
const SnapshotObjectDependency = require('./SnapshotObjectDependency')

const loadSchema = (databaseName) => {
  return new Promise((resolve, reject) => {
    const db = getDB(databaseName)

    const appSnapshot = fs.readFileSync(path.join(__dirname, 'schema', 'AppSnapshot.txt'), 'utf8')
    const objectVersion = fs.readFileSync(path.join(__dirname, 'schema', 'ObjectVersion.txt'), 'utf8')
    const objectDependency = fs.readFileSync(path.join(__dirname, 'schema', 'ObjectDependency.txt'), 'utf8')
    const snapshotDependency = fs.readFileSync(path.join(__dirname, 'schema', 'SnapshotDependency.txt'), 'utf8')
    const snapshotObjectDependency = fs.readFileSync(path.join(__dirname, 'schema', 'SnapshotObjectDependency.txt'), 'utf8')
    const tags = fs.readFileSync(path.join(__dirname, 'schema', 'Tags.txt'), 'utf8')

    db.exec([appSnapshot, objectVersion, objectDependency, snapshotDependency, snapshotObjectDependency, tags].join('\n\n'), err => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })

    db.close()
  })
}

module.exports = {
  initialize: (databaseName, password) => {
    return checkAccess(databaseName, password).then(() =>
      loadSchema(databaseName)
    )
  },

  AppSnapshot,
  ObjectVersion,
  ObjectDependency,
  SnapshotDependency,
  SnapshotObjectDependency
}
