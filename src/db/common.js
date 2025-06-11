const path = require('path')
const fs = require('fs')
const bcrypt = require('bcrypt')
const sqlite3 = require('sqlite3').verbose()

const dir = process.env.TWXPARSE_DATA_FOLDER || path.join(__dirname, '..', '..', 'data')
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir)
}

const getDBName = (name) => path.join(dir, name || 'database.db')

const getDBPassName = (name) => path.join(dir, name + '.txt')

const getDB = (name) => new sqlite3.Database(getDBName(name))

const checkAccess = (name, password) => {
  return new Promise((resolve, reject) => {
    if (!name) {
      reject(new Error('No database name supplied'))
      return
    } else if (!password) {
      reject(new Error('No password supplied'))
      return
    }
    const dbName = getDBName(name)
    const passName = getDBPassName(name)
    if (fs.existsSync(dbName) && fs.existsSync(passName)) {
      const hashPassword = fs.readFileSync(passName, 'utf8')
      bcrypt.compare(password, hashPassword).then(hasAccess => {
        if (hasAccess) {
          resolve()
        } else {
          reject(new Error('Password mismatch'))
        }
      }).catch(reject)
    } else if (fs.existsSync(dbName) && !fs.existsSync(passName)) {
      reject(new Error('Password file missing'))
    } else {
      if (fs.existsSync(passName)) {
        fs.unlinkSync(passName)
      }
      bcrypt.hash(password, 10).then(hashPassword => {
        fs.writeFileSync(passName, hashPassword)
        resolve()
      }).catch(reject)
    }
  })
}

module.exports = {
  getDB,
  checkAccess
}
