const Performance = require('../utils/Performance')
const { getDB } = require('./common')

const getParamsFromItem = item =>
  [item.snapshotId, item.appId, item.branchId, item.snapshotName, item.branchName, item.appShortName, item.appName, item.description, item.buildVersion, item.isToolkit, item.isSystem, item.isObjectsProcessed]

const buildWhereQuery = obj => {
  let whereClause = '1 = 1'
  const parameters = []
  if (obj) {
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        whereClause += ` and ${key} in (${obj[key].map((item) => `'${item}'`).join(', ')})`
        // parameters = parameters.concat(obj[key])
      } else {
        whereClause += ` and ${key} = '${obj[key]}'`
        // parameters.push(obj[key])
      }
    }
  }
  return [whereClause, parameters]
}

module.exports = {
  register: Performance.makeMeasurable((databaseName, item) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = `insert into AppSnapshot (snapshotId, appId, branchId, snapshotName, branchName, appShortName, appName, description, buildVersion, isToolkit, isSystem, isObjectsProcessed)
                  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      const params = getParamsFromItem(item)
      db.run(sql, params, err => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
      db.close()
    })
  }, 'db.AppSnapshot.register'),

  update: Performance.makeMeasurable((databaseName, snapshotId, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const updateFields = []
      const parameters = []
      if (obj) {
        for (const key in obj) {
          updateFields.push(`${key} = ?`)
          parameters.push(obj[key])
        }
      }
      parameters.push(snapshotId)
      const sql = `update AppSnapshot set ${updateFields.join(', ')} where snapshotId = ?`
      db.run(sql, parameters, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
      db.close()
    })
  }, 'db.AppSnapshot.update'),

  getAll: Performance.makeMeasurable((databaseName) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = 'select * from AppSnapshot'
      db.all(sql, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
      db.close()
    })
  }, 'db.AppSnapshot.getAll'),

  getById: Performance.makeMeasurable((databaseName, snapshotId) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = 'select * from AppSnapshot where snapshotId = ?'
      db.get(sql, [snapshotId], (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve(item)
      })
      db.close()
    })
  }, 'db.AppSnapshot.getById'),

  where: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `select * from AppSnapshot where ${whereClause}`
      db.all(sql, parameters, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
      db.close()
    })
  }, 'db.AppSnapshot.where'),

  find: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `select * from AppSnapshot where ${whereClause}`
      db.get(sql, parameters, (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve(item)
      })
      db.close()
    })
  }, 'db.AppSnapshot.find'),

  remove: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `delete from AppSnapshot where ${whereClause}`
      db.run(sql, parameters, (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
      db.close()
    })
  }, 'db.AppSnapshot.remove'),

  removeOrphaned: Performance.makeMeasurable((databaseName) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = `delete from AppSnapshot
                  where snapshotId in (
                    select childApp.snapshotId
                    from AppSnapshot childApp
                    left join SnapshotDependency sd on sd.childSnapshotId = childApp.snapshotId
                    where childApp.isToolkit = 1 and sd.childSnapshotId is null
                  )`
      db.run(sql, [], (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
      db.close()
    })
  }, 'db.AppSnapshot.removeOrphaned'),

  getWithoutChildren: Performance.makeMeasurable((databaseName, snapshotIdToExclude) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const whereClause1 = snapshotIdToExclude
        ? 'where snapshotId ' + (Array.isArray(snapshotIdToExclude)
          ? `not in (${snapshotIdToExclude.map((item) => `'${item}'`)})`
          : `<> '${snapshotIdToExclude}'`)
        : ''
      const whereClause2 = snapshotIdToExclude
        ? 'where childSnapshotId ' + (Array.isArray(snapshotIdToExclude)
          ? `not in (${snapshotIdToExclude.map((item) => `'${item}'`)})`
          : `<> '${snapshotIdToExclude}'`)
        : ''

      const sql = `select parent.*
                  from (
                    select *
                    from AppSnapshot
                    ${whereClause1}
                  ) parent
                  left join (
                    select *
                    from SnapshotDependency
                    ${whereClause2}
                  ) sd on sd.parentSnapshotId = parent.snapshotId
                  left join AppSnapshot child on child.snapshotId = sd.childSnapshotId
                  where sd.parentSnapshotId is null`

      db.all(sql, (err, items) => {
        if (err) {
          reject(err)
          return
        }
        resolve(items)
      })
      db.close()
    })
  }, 'getWithoutChildren'),

  getWithoutParents: Performance.makeMeasurable((databaseName, snapshotIdToExclude) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const whereClause1 = snapshotIdToExclude
        ? 'where snapshotId ' + (Array.isArray(snapshotIdToExclude)
          ? `not in (${snapshotIdToExclude.map((item) => `'${item}'`)})`
          : `<> '${snapshotIdToExclude}'`)
        : ''
      const whereClause2 = snapshotIdToExclude
        ? 'where parentSnapshotId ' + (Array.isArray(snapshotIdToExclude)
          ? `not in (${snapshotIdToExclude.map((item) => `'${item}'`)})`
          : `<> '${snapshotIdToExclude}'`)
        : ''

      const sql = `select child.*
        from (
          select *
          from AppSnapshot
          ${whereClause1}
        ) child
        left join (
          select *
          from SnapshotDependency
          ${whereClause2}
        ) sd on sd.childSnapshotId = child.snapshotId
        left join AppSnapshot parent on parent.snapshotId = sd.parentSnapshotId
        where sd.childSnapshotId is null`
      db.all(sql, (err, items) => {
        if (err) {
          reject(err)
          return
        }
        resolve(items)
      })
      db.close()
    })
  }, 'getWithoutParents')
}
