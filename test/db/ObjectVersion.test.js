const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const chaiString = require('chai-string')
let ObjectVersion = require('../../src/db/ObjectVersion')
let commonDB = require('../../src/db/common')

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(chaiString)
const { expect } = chai

const OBJECT1 = {
  objectVersionId: 'version1',
  objectId: 'objectId1',
  name: 'name1',
  description: 'description1',
  type: 'type1',
  subtype: 'subtype1',
  isExposed: 1
}

const OBJECT2 = {
  objectVersionId: 'version2',
  objectId: 'objectId2',
  name: 'name2',
  description: 'description2',
  type: 'type2',
  subtype: 'subtype2',
  isExposed: 0
}

describe('DB - ObjectVersion', () => {
  let dbStub

  beforeEach(() => {
    delete require.cache[require.resolve('../../src/db/common')]
    delete require.cache[require.resolve('../../src/db/ObjectVersion')]
    commonDB = require('../../src/db/common')
    dbStub = sinon.stub(commonDB, 'getDB')
    ObjectVersion = require('../../src/db/ObjectVersion')
  })

  afterEach(() => {
    dbStub.restore()
    delete require.cache[require.resolve('../../src/db/ObjectVersion')]
  })

  it('should have the correct methods', () => {
    expect(ObjectVersion).to.be.an('object')
    expect(ObjectVersion).to.respondTo('register')
    expect(ObjectVersion).to.respondTo('registerMany')
    expect(ObjectVersion).to.respondTo('getAll')
    expect(ObjectVersion).to.respondTo('getById')
    expect(ObjectVersion).to.respondTo('where')
    expect(ObjectVersion).to.respondTo('find')
    expect(ObjectVersion).to.respondTo('remove')
    expect(ObjectVersion).to.respondTo('removeOrphaned')
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
    const result = ObjectVersion.register('test.db', OBJECT1)
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed) values (?, ?, ?, ?, ?, ?, ?)')
      expect(args[1]).to.eql(['version1', 'objectId1', 'name1', 'description1', 'type1', 'subtype1', 1])
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
    const result1 = ObjectVersion.register('test.db', OBJECT1)
    const result2 = ObjectVersion.register('test.db', OBJECT2)
    return Promise.all([
      expect(result1).to.eventually.be.fulfilled,
      expect(result2).to.eventually.be.fulfilled
    ]).then(() => {
      expect(dbStub).to.have.been.calledTwice
      expect(dbStub).to.have.been.calledWith('test.db')
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces('insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed) values (?, ?, ?, ?, ?, ?, ?)')
      expect(args1[1]).to.eql(['version1', 'objectId1', 'name1', 'description1', 'type1', 'subtype1', 1])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces('insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed) values (?, ?, ?, ?, ?, ?, ?)')
      expect(args2[1]).to.eql(['version2', 'objectId2', 'name2', 'description2', 'type2', 'subtype2', 0])
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
    const result = ObjectVersion.registerMany('test.db', [OBJECT1, OBJECT2])
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(execStub).to.have.been.calledTwice
      expect(execStub).to.have.been.calledWith('begin')
      expect(execStub).to.have.been.calledWith('commit')
      expect(runStub).to.have.been.calledTwice
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces('insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed) values (?, ?, ?, ?, ?, ?, ?)')
      expect(args1[1]).to.eql(['version1', 'objectId1', 'name1', 'description1', 'type1', 'subtype1', 1])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces('insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed) values (?, ?, ?, ?, ?, ?, ?)')
      expect(args2[1]).to.eql(['version2', 'objectId2', 'name2', 'description2', 'type2', 'subtype2', 0])
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
    const result = ObjectVersion.registerMany('test.db', [OBJECT1, OBJECT2])
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(execStub).to.have.been.calledTwice
      expect(execStub).to.have.been.calledWith('begin')
      expect(execStub).to.have.been.calledWith('commit')
      expect(runStub).to.have.been.calledTwice
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces('insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed) values (?, ?, ?, ?, ?, ?, ?)')
      expect(args1[1]).to.eql(['version1', 'objectId1', 'name1', 'description1', 'type1', 'subtype1', 1])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces('insert into ObjectVersion (objectVersionId, objectId, name, description, type, subtype, isExposed) values (?, ?, ?, ?, ?, ?, ?)')
      expect(args2[1]).to.eql(['version2', 'objectId2', 'name2', 'description2', 'type2', 'subtype2', 0])
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
    const result = ObjectVersion.getAll('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectVersion')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "getAll" method when query execution succeeds', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, null, [OBJECT1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = ObjectVersion.getAll('test.db')
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectVersion')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql([OBJECT1])
    })
  })

  it('should reject the "getById" method when query execution returns an error', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = ObjectVersion.getById('test.db', 'version1')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectVersion where objectVersionId = ?')
      expect(args[1]).to.eql(['version1'])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "getById" method when query execution succeeds', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, null, OBJECT1)
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = ObjectVersion.getById('test.db', 'version1')
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectVersion where objectVersionId = ?')
      expect(args[1]).to.eql(['version1'])
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql(OBJECT1)
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
    const result = ObjectVersion.where('test.db', {
      objectId: 'objectId1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`select distinct ov.*
                                            from ObjectVersion ov
                                            inner join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                                            inner join AppSnapshot a on a.snapshotId = sod.snapshotId
                                            where 1 = 1 and ov.objectId = 'objectId1'`)
      expect(args[1]).to.eql([])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "where" method when query execution succeeds', () => {
    const allStub = sinon.stub().callsArgWithAsync(2, null, [OBJECT1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = ObjectVersion.where('test.db', {
      objectId: 'objectId1'
    }, {
      snapshotId: 'snapshot1'
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`select distinct ov.*
                                            from ObjectVersion ov
                                            inner join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                                            inner join AppSnapshot a on a.snapshotId = sod.snapshotId
                                            where 1 = 1 and ov.objectId = 'objectId1' and a.snapshotId = 'snapshot1'`)
      expect(args[1]).to.eql([])
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql([OBJECT1])
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
    const result = ObjectVersion.find('test.db', {
      objectId: 'objectId1'
    }, {
      snapshotId: ['snapshot1', 'snapshot2']
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`select distinct ov.*
                                            from ObjectVersion ov
                                            inner join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                                            inner join AppSnapshot a on a.snapshotId = sod.snapshotId
                                            where 1 = 1 and ov.objectId = 'objectId1' and a.snapshotId in ('snapshot1', 'snapshot2')`)
      expect(args[1]).to.eql([])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "find" method when query execution succeeds', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, null, OBJECT1)
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = ObjectVersion.find('test.db', {
      objectId: ['objectId1', 'objectId2']
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`select distinct ov.*
                                            from ObjectVersion ov
                                            inner join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                                            inner join AppSnapshot a on a.snapshotId = sod.snapshotId
                                            where 1 = 1 and ov.objectId in ('objectId1', 'objectId2')`)
      expect(args[1]).to.eql([])
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql(OBJECT1)
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
    const result = ObjectVersion.remove('test.db', {
      objectId: 'objectId1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from ObjectVersion ov where 1 = 1 and ov.objectId = \'objectId1\'')
      expect(args[1]).to.eql([])
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
    const result = ObjectVersion.remove('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from ObjectVersion ov where 1 = 1')
      expect(args[1]).to.eql([])
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
    const result = ObjectVersion.removeOrphaned('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from ObjectVersion
                                            where rowid in (
                                              select ov.rowid
                                              from ObjectVersion ov
                                              left join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                                              where sod.objectVersionId is null
                                            )`)
      expect(args[1]).to.eql([])
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
    const result = ObjectVersion.removeOrphaned('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from ObjectVersion
                                            where rowid in (
                                              select ov.rowid
                                              from ObjectVersion ov
                                              left join SnapshotObjectDependency sod on sod.objectVersionId = ov.objectVersionId
                                              where sod.objectVersionId is null
                                            )`)
      expect(args[1]).to.eql([])
      expect(closeStub).to.have.been.calledOnce
    })
  })
})
