const Performance = require('../utils/Performance')
const { getDB } = require('./common')

const getParamsFromItem = item =>
  [item.parentObjectVersionId, item.childObjectVersionId, item.dependencyType, item.dependencyName]

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
      const sql = `insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
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
  }, 'db.ObjectDependency.register'),

  registerMany: Performance.makeMeasurable((databaseName, items) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      db.exec('begin')
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const sql = `insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
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
  }, 'db.ObjectDependency.registerMany'),

  getAll: Performance.makeMeasurable((databaseName) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = 'select * from ObjectDependency'
      db.all(sql, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
      db.close()
    })
  }, 'db.ObjectDependency.getAll'),

  where: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `select * from ObjectDependency where ${whereClause}`
      db.all(sql, parameters, (err, results) => {
        if (err) {
          reject(err)
          return
        }
        resolve(results)
      })
      db.close()
    })
  }, 'db.ObjectDependency.where'),

  find: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `select * from ObjectDependency where ${whereClause}`
      db.get(sql, parameters, (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve(item)
      })
      db.close()
    })
  }, 'db.ObjectDependency.find'),

  remove: Performance.makeMeasurable((databaseName, obj) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const [whereClause, parameters] = buildWhereQuery(obj)
      const sql = `delete from ObjectDependency where ${whereClause}`
      db.run(sql, parameters, (err, item) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
      db.close()
    })
  }, 'db.ObjectDependency.remove'),

  removeOrphaned: Performance.makeMeasurable((databaseName) => {
    return new Promise((resolve, reject) => {
      const db = getDB(databaseName)
      const sql = `delete from ObjectDependency
                  where rowid in (
                    select od.rowid
                    from ObjectDependency od
                    left join ObjectVersion ov on ov.objectVersionId = od.parentObjectVersionId
                    where ov.objectVersionId is null
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
  }, 'db.ObjectDependency.removeOrphaned')
}
