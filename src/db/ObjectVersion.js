const Performance = require('../utils/Performance')
const { getDB } = require('./common')

const getParamsFromItem = item =>
  [item.objectVersionId, item.objectId, item.name, item.description, item.type, item.subtype, item.isExposed]

const buildWhereQuery = (obj, snapshotObj) => {
  let whereClause = '1 = 1'
  const parameters = []
  if (obj) {
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        whereClause += ` and ov.${key} in (${obj[key].map((item) => `'${item}'`).join(', ')})`
        // parameters = parameters.concat(obj[key])
      } else {
        whereClause += ` and ov.${key} = '${obj[key]}'`
        // parameters.push(obj[key])
      }
    }
  }
  if (snapshotObj) {
    for (const key in snapshotObj) {
      if (Array.isArray(snapshotObj[key])) {
        whereClause += ` and a.${key} in (${snapshotObj[key].map((item) => `'${item}'`).join(', ')})`
        // parameters = parameters.concat(snapshotObj[key])
      } else {
        whereClause += ` and a.${key} = '${snapshotObj[key]}'`
        // parameters.push(snapshotObj[key])
      }
    }
  }
  return [whereClause, parameters]
}

module.exports = {
  register: Performance.makeMeasurable((databaseName, item) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = `insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed)
                  values (?, ?, ?, ?, ?, ?, ?)`
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
  }, 'db.ObjectVersion.register'),

  registerMany: Performance.makeMeasurable((databaseName, items) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      db.exec('begin')
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const sql = `insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed)
                  values (?, ?, ?, ?, ?, ?, ?)`
        const params = getParamsFromItem(item)

        db.run(sql, params)
      }
      db.exec('commit', err => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
      db.close()
    })
  }, 'db.ObjectVersion.registerMany'),

  getAll: Performance.makeMeasurable((databaseName) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = 'select * from ObjectVersion'
      db.all(sql, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
      db.close()
    })
  }, 'db.ObjectVersion.getAll'),

  getById: Performance.makeMeasurable((databaseName, objectVersionId) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = 'select * from ObjectVersion where objectVersionId = ?'
      db.get(sql, [objectVersionId], (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve(item)
      })
      db.close()
    })
  }, 'db.ObjectVersion.getById'),

  where: Performance.makeMeasurable((databaseName, obj, snapshotObj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj, snapshotObj)
      const sql = `select distinct ov.*
                  from ObjectVersion ov
                  inner join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                  inner join AppSnapshot a on a.snapshotId = sod.snapshotId
                  where ${whereClause}`
      db.all(sql, parameters, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
      db.close()
    })
  }, 'db.ObjectVersion.where'),

  find: Performance.makeMeasurable((databaseName, obj, snapshotObj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj, snapshotObj)
      const sql = `select distinct ov.*
                  from ObjectVersion ov
                  inner join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                  inner join AppSnapshot a on a.snapshotId = sod.snapshotId
                  where ${whereClause}`
      db.get(sql, parameters, (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve(item)
      })
      db.close()
    })
  }, 'db.ObjectVersion.find'),

  remove: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `delete from ObjectVersion ov where ${whereClause}`
      db.run(sql, parameters, (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
      db.close()
    })
  }, 'db.ObjectVersion.remove'),

  removeOrphaned: Performance.makeMeasurable((databaseName) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = `delete from ObjectVersion
                  where rowid in (
                    select ov.rowid
                    from ObjectVersion ov
                    left join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                    where sod.objectVersionId is null
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
  }, 'db.ObjectVersion.removeOrphaned')
}
