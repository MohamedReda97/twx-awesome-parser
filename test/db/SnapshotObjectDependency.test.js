const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const chaiString = require('chai-string')
let SnapshotObjectDependency = require('../../src/db/SnapshotObjectDependency')
let commonDB = require('../../src/db/common')

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(chaiString)
const { expect } = chai

const DEPENDENCY1 = {
  objectVersionId: 'version1',
  snapshotId: 'snapshot1',
  objectId: 'object1'
}

const DEPENDENCY2 = {
  objectVersionId: 'version2',
  snapshotId: 'snapshot2',
  objectId: 'object2'
}

describe('DB - SnapshotObjectDependency', () => {
  let dbStub

  beforeEach(() => {
    delete require.cache[require.resolve('../../src/db/common')]
    delete require.cache[require.resolve('../../src/db/SnapshotObjectDependency')]
    commonDB = require('../../src/db/common')
    dbStub = sinon.stub(commonDB, 'getDB')
    SnapshotObjectDependency = require('../../src/db/SnapshotObjectDependency')
  })

  afterEach(() => {
    dbStub.restore()
    delete require.cache[require.resolve('../../src/db/SnapshotObjectDependency')]
  })

  it('should have the correct methods', () => {
    expect(SnapshotObjectDependency).to.be.an('object')
    expect(SnapshotObjectDependency).to.respondTo('register')
    expect(SnapshotObjectDependency).to.respondTo('registerMany')
    expect(SnapshotObjectDependency).to.respondTo('getAll')
    expect(SnapshotObjectDependency).to.respondTo('where')
    expect(SnapshotObjectDependency).to.respondTo('find')
    expect(SnapshotObjectDependency).to.respondTo('remove')
    expect(SnapshotObjectDependency).to.respondTo('removeOrphaned')
  })

  it('should reject the "register" method when query execution returns an error', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.register('test.db', DEPENDENCY1)
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`insert into SnapshotObjectDependency (objectVersionId, snapshotId, objectId)
                                          values (?, ?, ?)`)
      expect(args[1]).to.eql(['version1', 'snapshot1', 'object1'])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "register" method when query execution succeeds', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result1 = SnapshotObjectDependency.register('test.db', DEPENDENCY1)
    const result2 = SnapshotObjectDependency.register('test.db', DEPENDENCY2)
    return Promise.all([
      expect(result1).to.eventually.be.fulfilled,
      expect(result2).to.eventually.be.fulfilled
    ]).then(() => {
      expect(dbStub).to.have.been.calledTwice
      expect(dbStub).to.have.been.calledWith('test.db')
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into SnapshotObjectDependency (objectVersionId, snapshotId, objectId)
                                          values (?, ?, ?)`)
      expect(args1[1]).to.eql(['version1', 'snapshot1', 'object1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into SnapshotObjectDependency (objectVersionId, snapshotId, objectId)
                                          values (?, ?, ?)`)
      expect(args2[1]).to.eql(['version2', 'snapshot2', 'object2'])
      expect(closeStub).to.have.been.calledTwice
    })
  })

  it('should reject the "registerMany" method when query execution returns an error', () => {
    const runStub = sinon.stub()
    const execStub = sinon.stub().onSecondCall().callsArgWithAsync(1, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      exec: execStub,
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.registerMany('test.db', [DEPENDENCY1, DEPENDENCY2])
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(execStub).to.have.been.calledTwice
      expect(execStub).to.have.been.calledWith('begin')
      expect(execStub).to.have.been.calledWith('commit')
      expect(runStub).to.have.been.calledTwice
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into SnapshotObjectDependency (objectVersionId, snapshotId, objectId)
                                          values (?, ?, ?)`)
      expect(args1[1]).to.eql(['version1', 'snapshot1', 'object1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into SnapshotObjectDependency (objectVersionId, snapshotId, objectId)
                                          values (?, ?, ?)`)
      expect(args2[1]).to.eql(['version2', 'snapshot2', 'object2'])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "registerMany" method when query execution succeeds', () => {
    const runStub = sinon.stub()
    const execStub = sinon.stub().onSecondCall().callsArgWithAsync(1, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      exec: execStub,
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.registerMany('test.db', [DEPENDENCY1, DEPENDENCY2])
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(execStub).to.have.been.calledTwice
      expect(execStub).to.have.been.calledWith('begin')
      expect(execStub).to.have.been.calledWith('commit')
      expect(runStub).to.have.been.calledTwice
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into SnapshotObjectDependency (objectVersionId, snapshotId, objectId)
                                          values (?, ?, ?)`)
      expect(args1[1]).to.eql(['version1', 'snapshot1', 'object1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into SnapshotObjectDependency (objectVersionId, snapshotId, objectId)
                                          values (?, ?, ?)`)
      expect(args2[1]).to.eql(['version2', 'snapshot2', 'object2'])
      expect(closeStub).to.have.been.calledOnce
    })
  })

  it('should reject the "getAll" method when query execution returns an error', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.getAll('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotObjectDependency')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "getAll" method when query execution succeeds', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, null, [DEPENDENCY1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.getAll('test.db')
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotObjectDependency')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql([DEPENDENCY1])
    })
  })

  it('should reject the "where" method when query execution returns an error', () => {
    const allStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.where('test.db', {
      objectId: 'object1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotObjectDependency where 1 = 1 and objectId = \'object1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "where" method when query execution succeeds', () => {
    const allStub = sinon.stub().callsArgWithAsync(2, null, [DEPENDENCY1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.where('test.db', {
      objectId: 'object1'
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotObjectDependency where 1 = 1 and objectId = \'object1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql([DEPENDENCY1])
    })
  })

  it('should reject the "find" method when query execution returns an error', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.find('test.db', {
      objectId: 'object1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotObjectDependency where 1 = 1 and objectId = \'object1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "find" method when query execution succeeds', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, null, DEPENDENCY1)
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.find('test.db', {
      objectId: ['object1', 'object2']
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotObjectDependency where 1 = 1 and objectId in (\'object1\', \'object2\')')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql(DEPENDENCY1)
    })
  })

  it('should reject the "remove" method when query execution returns an error', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.remove('test.db', {
      objectId: 'object1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from SnapshotObjectDependency where 1 = 1 and objectId = \'object1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "remove" method when query execution succeeds', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.remove('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from SnapshotObjectDependency where 1 = 1')
      expect(closeStub).to.have.been.calledOnce
    })
  })

  it('should reject the "removeOrphaned" method when query execution returns an error', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.removeOrphaned('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from SnapshotObjectDependency
                                          where rowid in (
                                            select sod.rowid
                                            from SnapshotObjectDependency sod
                                            left join AppSnapshot a on a.snapshotId = sod.snapshotId
                                            where a.snapshotId is null
                                          )`)
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "removeOrphaned" method when query execution succeeds', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotObjectDependency.removeOrphaned('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from SnapshotObjectDependency
                                          where rowid in (
                                            select sod.rowid
                                            from SnapshotObjectDependency sod
                                            left join AppSnapshot a on a.snapshotId = sod.snapshotId
                                            where a.snapshotId is null
                                          )`)
      expect(closeStub).to.have.been.calledOnce
    })
  })
})
