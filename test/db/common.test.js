const path = require('path')
const fs = require('fs')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('DB - Common', () => {
  let commonDB
  beforeEach(() => {
    delete require.cache[require.resolve('../../src/db/common')]
    commonDB = require('../../src/db/common')
  })

  it('should have the correct methods', () => {
    expect(commonDB).to.be.an('object')
    expect(commonDB).to.respondTo('getDB')
    expect(commonDB).to.respondTo('checkAccess')
  })

  it('should create a new folder when a new path is given', () => {
    expect(fs.existsSync(process.env.TWXPARSE_DATA_FOLDER)).to.be.true
  })

  it('should open the database correctly', () => {
    const stub = sinon.stub(sqlite3, 'Database').returns({})
    expect(stub).not.to.have.been.called
    const result1 = commonDB.getDB('test.db')
    expect(result1).to.eql({})
    expect(stub).to.have.been.calledOnce
    expect(stub).to.have.been.calledWith(path.join(__dirname, '..', '..', 'test', 'data', 'test.db'))
    const result2 = commonDB.getDB()
    expect(result2).to.eql({})
    expect(stub).to.have.been.calledTwice
    expect(stub).to.have.been.calledWith(path.join(__dirname, '..', '..', 'test', 'data', 'database.db'))
    stub.restore()
  })

  it('should deny access when no database name is given', () => {
    const result = commonDB.checkAccess()
    return expect(result).eventually.be.rejected.then(error => {
      expect(error.message).to.equal('No database name supplied')
    })
  })

  it('should deny access when no password is given', () => {
    const result = commonDB.checkAccess('test.db')
    return expect(result).eventually.be.rejected.then(error => {
      expect(error.message).to.equal('No password supplied')
    })
  })

  it('should always allow to create a new database with any password', () => {
    const stub = sinon.stub(bcrypt, 'hash').returns(defer(true, 'hashedExample'))
    expect(stub).not.to.have.been.called
    const result = commonDB.checkAccess('test.db', 'password')

    return expect(result).eventually.be.fulfilled.then(() => {
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('password', 10)
      const fileContent = fs.readFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db.txt'), 'utf8')
      expect(fileContent).to.equal('hashedExample')
      stub.restore()
    })
  })

  it('should clear any old password files if the database does not exist', () => {
    const stub = sinon.stub(bcrypt, 'hash').returns(defer(true, 'hashedExample'))
    fs.writeFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db.txt'), 'data')
    expect(stub).not.to.have.been.called
    const result = commonDB.checkAccess('test.db', 'password')

    return expect(result).eventually.be.fulfilled.then(() => {
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('password', 10)
      const fileContent = fs.readFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db.txt'), 'utf8')
      expect(fileContent).to.equal('hashedExample')
      stub.restore()
    })
  })

  it('should deny access when the database exists but the password file does not', () => {
    fs.writeFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db'), 'data')
    const result = commonDB.checkAccess('test.db', 'password')

    return expect(result).eventually.be.rejected.then((error) => {
      expect(error.message).to.equal('Password file missing')
    })
  })

  it('should grant access when the password is correct', () => {
    const stub = sinon.stub(bcrypt, 'compare').returns(defer(true, true))
    fs.writeFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db.txt'), 'hashedExample')
    fs.writeFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db'), 'data')
    expect(stub).not.to.have.been.called
    const result = commonDB.checkAccess('test.db', 'password')

    return expect(result).eventually.be.fulfilled.then(() => {
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('password', 'hashedExample')
      stub.restore()
    })
  })

  it('should deny access when the password is incorrect', () => {
    const stub = sinon.stub(bcrypt, 'compare').returns(defer(true, false))
    fs.writeFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db.txt'), 'hashedExample')
    fs.writeFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db'), 'data')
    expect(stub).not.to.have.been.called
    const result = commonDB.checkAccess('test.db', 'password')

    return expect(result).eventually.be.rejected.then((error) => {
      expect(error.message).to.equal('Password mismatch')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('password', 'hashedExample')
      stub.restore()
    })
  })

  it('should deny access when the password comparison encounters an error', () => {
    const stub = sinon.stub(bcrypt, 'compare').returns(defer(false))
    fs.writeFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db.txt'), 'hashedExample')
    fs.writeFileSync(path.resolve(process.env.TWXPARSE_DATA_FOLDER, 'test.db'), 'data')
    expect(stub).not.to.have.been.called
    const result = commonDB.checkAccess('test.db', 'password')

    return expect(result).eventually.be.rejected.then(() => {
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('password', 'hashedExample')
      stub.restore()
    })
  })
})
