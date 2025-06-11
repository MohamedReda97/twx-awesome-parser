const Performance = require('../utils/Performance')
const { getDB } = require('./common')

const getParamsFromItem = item =>
  [item.parentSnapshotId, item.childSnapshotId, item.rank, item.dependencyId]

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
      const sql = `insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                  values (?, ?, ?, ?)`
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
  }, 'db.SnapshotDependency.register'),

  registerMany: Performance.makeMeasurable((databaseName, items) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      db.exec('begin')
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const sql = `insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                values (?, ?, ?, ?)`
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
  }, 'db.SnapshotDependency.registerMany'),

  getAll: Performance.makeMeasurable((databaseName) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = 'select * from SnapshotDependency'
      db.all(sql, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
      db.close()
    })
  }, 'db.SnapshotDependency.getAll'),

  where: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `select * from SnapshotDependency where ${whereClause}`
      db.all(sql, parameters, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
      db.close()
    })
  }, 'db.SnapshotDependency.where'),

  find: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `select * from SnapshotDependency where ${whereClause}`
      db.get(sql, parameters, (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve(item)
      })
      db.close()
    })
  }, 'db.SnapshotDependency.find'),

  remove: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `delete from SnapshotDependency where ${whereClause}`
      db.run(sql, parameters, (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
      db.close()
    })
  }, 'db.SnapshotDependency.remove'),

  removeOrphaned: Performance.makeMeasurable((databaseName) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = `delete from SnapshotDependency
                  where rowid in (
                    select sd.rowid
                    from SnapshotDependency sd
                    left join AppSnapshot a on a.snapshotId = sd.parentSnapshotId
                    where a.snapshotId is null
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
  }, 'db.SnapshotDependency.removeOrphaned')
}
