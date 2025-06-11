const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
let db = require('../../src/db/index')
let commonDB = require('../../src/db/common')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('DB - Index', () => {
  let checkAccessStub, getDBStub
  beforeEach(() => {
    delete require.cache[require.resolve('../../src/db/common')]
    delete require.cache[require.resolve('../../src/db/index')]
    commonDB = require('../../src/db/common')
    checkAccessStub = sinon.stub(commonDB, 'checkAccess')
    getDBStub = sinon.stub(commonDB, 'getDB')
    db = require('../../src/db/index')
  })
  afterEach(() => {
    checkAccessStub.restore()
    getDBStub.restore()
  })

  it('should have the correct methods and objects', () => {
    expect(db).to.be.an('object')
    expect(db).to.respondTo('initialize')
    expect(db).to.have.property('AppSnapshot')
    expect(db).to.have.property('ObjectVersion')
    expect(db).to.have.property('SnapshotDependency')
    expect(db).to.have.property('SnapshotObjectDependency')
    expect(db).to.have.property('ObjectDependency')
  })

  it('should reject initialization when check password fails', () => {
    checkAccessStub.returns(defer(false))
    expect(checkAccessStub).not.to.have.been.called
    const result = db.initialize('username', 'password')
    expect(checkAccessStub).to.have.been.calledOnce
    expect(checkAccessStub).to.have.been.calledWith('username', 'password')
    return expect(result).to.eventually.be.rejected
  })

  it('should reject initialization when sql execution fails', () => {
    checkAccessStub.returns(defer(true))
    getDBStub.returns({
      exec: sinon.stub().callsArgWith(1, new Error('error')),
      close: sinon.stub().resolves()
    })
    expect(checkAccessStub).not.to.have.been.called
    expect(getDBStub).not.to.have.been.called
    const result = db.initialize('username', 'password')
    expect(checkAccessStub).to.have.been.calledOnce
    expect(checkAccessStub).to.have.been.calledWith('username', 'password')
    return expect(result).to.eventually.be.rejected.then((error) => {
      expect(getDBStub).to.have.been.calledOnce
      expect(getDBStub).to.have.been.calledWith('username')
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve initialization when sql execution succeeds', () => {
    checkAccessStub.returns(defer(true))
    getDBStub.returns({
      exec: sinon.stub().callsArgWith(1, null),
      close: sinon.stub().resolves()
    })
    expect(checkAccessStub).not.to.have.been.called
    expect(getDBStub).not.to.have.been.called
    const result = db.initialize('username', 'password')
    expect(checkAccessStub).to.have.been.calledOnce
    expect(checkAccessStub).to.have.been.calledWith('username', 'password')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(getDBStub).to.have.been.calledOnce
      expect(getDBStub).to.have.been.calledWith('username')
    })
  })
})
