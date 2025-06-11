const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const chaiString = require('chai-string')
let AppSnapshot = require('../../src/db/AppSnapshot')
let commonDB = require('../../src/db/common')

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(chaiString)
const { expect } = chai

const SNAPSHOT1 = {
  snapshotId: 'snapshot1',
  appId: 'appId1',
  branchId: 'branchId1',
  appShortName: 'appShortName1',
  snapshotName: 'snapshotName1',
  appName: 'appName1',
  branchName: 'branchName1',
  description: 'description1',
  buildVersion: 'buildVersion1',
  isToolkit: 1,
  isSystem: 1,
  isObjectsProcessed: 0
}

const SNAPSHOT2 = {
  snapshotId: 'snapshot2',
  appId: 'appId2',
  branchId: 'branchId2',
  appShortName: 'appShortName2',
  snapshotName: 'snapshotName2',
  appName: 'appName2',
  branchName: 'branchName2',
  description: 'description2',
  buildVersion: 'buildVersion2',
  isToolkit: 0,
  isSystem: 0,
  isObjectsProcessed: 1
}

describe('DB - AppSnapshot', () => {
  let dbStub

  beforeEach(() => {
    delete require.cache[require.resolve('../../src/db/common')]
    delete require.cache[require.resolve('../../src/db/AppSnapshot')]
    commonDB = require('../../src/db/common')
    dbStub = sinon.stub(commonDB, 'getDB')
    AppSnapshot = require('../../src/db/AppSnapshot')
  })

  afterEach(() => {
    dbStub.restore()
    delete require.cache[require.resolve('../../src/db/AppSnapshot')]
  })

  it('should have the correct methods', () => {
    expect(AppSnapshot).to.be.an('object')
    expect(AppSnapshot).to.respondTo('register')
    expect(AppSnapshot).to.respondTo('update')
    expect(AppSnapshot).to.respondTo('getAll')
    expect(AppSnapshot).to.respondTo('getById')
    expect(AppSnapshot).to.respondTo('where')
    expect(AppSnapshot).to.respondTo('find')
    expect(AppSnapshot).to.respondTo('remove')
    expect(AppSnapshot).to.respondTo('removeOrphaned')
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
    const result = AppSnapshot.register('test.db', SNAPSHOT1)
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`insert into AppSnapshot (snapshotId, appId, branchId, snapshotName, branchName, appShortName, appName, description, buildVersion, 
                                          isToolkit, isSystem, isObjectsProcessed) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      expect(args[1]).to.eql(['snapshot1', 'appId1', 'branchId1', 'snapshotName1', 'branchName1', 'appShortName1', 'appName1', 'description1', 'buildVersion1', 1, 1, 0])
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
    const result1 = AppSnapshot.register('test.db', SNAPSHOT1)
    const result2 = AppSnapshot.register('test.db', SNAPSHOT2)
    return Promise.all([
      expect(result1).to.eventually.be.fulfilled,
      expect(result2).to.eventually.be.fulfilled
    ]).then(() => {
      expect(dbStub).to.have.been.calledTwice
      expect(dbStub).to.have.been.calledWith('test.db')
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into AppSnapshot (snapshotId, appId, branchId, snapshotName, branchName, appShortName, appName, description, buildVersion, 
        isToolkit, isSystem, isObjectsProcessed) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      expect(args1[1]).to.eql(['snapshot1', 'appId1', 'branchId1', 'snapshotName1', 'branchName1', 'appShortName1', 'appName1', 'description1', 'buildVersion1', 1, 1, 0])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into AppSnapshot (snapshotId, appId, branchId, snapshotName, branchName, appShortName, appName, description, buildVersion, 
        isToolkit, isSystem, isObjectsProcessed) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      expect(args2[1]).to.eql(['snapshot2', 'appId2', 'branchId2', 'snapshotName2', 'branchName2', 'appShortName2', 'appName2', 'description2', 'buildVersion2', 0, 0, 1])
      expect(closeStub).to.have.been.calledTwice
    })
  })

  it('should reject the "update" method when query execution returns an error', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = AppSnapshot.update('test.db', 'snapshot1')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('update AppSnapshot set where snapshotId = ?')
      expect(args[1]).to.eql(['snapshot1'])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "update" method when query execution succeeds', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = AppSnapshot.update('test.db', 'snapshot1', {
      snapshotName: 'snapshotName1'
    })
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('update AppSnapshot set snapshotName = ? where snapshotId = ?')
      expect(args[1]).to.eql(['snapshotName1', 'snapshot1'])
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
    const result = AppSnapshot.getAll('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from AppSnapshot')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "getAll" method when query execution succeeds', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, null, [SNAPSHOT1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = AppSnapshot.getAll('test.db')
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from AppSnapshot')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql([SNAPSHOT1])
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
    const result = AppSnapshot.getById('test.db', 'snapshot1')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from AppSnapshot where snapshotId = ?')
      expect(args[1]).to.eql(['snapshot1'])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "getById" method when query execution succeeds', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, null, SNAPSHOT1)
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = AppSnapshot.getById('test.db', 'snapshot1')
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from AppSnapshot where snapshotId = ?')
      expect(args[1]).to.eql(['snapshot1'])
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql(SNAPSHOT1)
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
    const result = AppSnapshot.where('test.db', {
      branchName: 'branchName1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from AppSnapshot where 1 = 1 and branchName = \'branchName1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "where" method when query execution succeeds', () => {
    const allStub = sinon.stub().callsArgWithAsync(2, null, [SNAPSHOT2])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = AppSnapshot.where('test.db', {
      branchName: 'branchName2'
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from AppSnapshot where 1 = 1 and branchName = \'branchName2\'')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql([SNAPSHOT2])
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
    const result = AppSnapshot.find('test.db', {
      branchName: 'branchName1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from AppSnapshot where 1 = 1 and branchName = \'branchName1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "find" method when query execution succeeds', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, null, SNAPSHOT1)
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = AppSnapshot.find('test.db', {
      branchName: ['branchName1', 'branchName2']
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from AppSnapshot where 1 = 1 and branchName in (\'branchName1\', \'branchName2\')')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql(SNAPSHOT1)
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
    const result = AppSnapshot.remove('test.db', {
      snapshotName: 'snapshotName1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from AppSnapshot where 1 = 1 and snapshotName = \'snapshotName1\'')
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
    const result = AppSnapshot.remove('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from AppSnapshot where 1 = 1')
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
    const result = AppSnapshot.removeOrphaned('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from AppSnapshot where snapshotId in (
                                            select childApp.snapshotId
                                            from AppSnapshot childApp
                                            left join SnapshotDependency sd on sd.childSnapshotId = childApp.snapshotId
                                            where childApp.isToolkit = 1 and sd.childSnapshotId is null
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
    const result = AppSnapshot.removeOrphaned('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from AppSnapshot where snapshotId in (
                                            select childApp.snapshotId
                                            from AppSnapshot childApp
                                            left join SnapshotDependency sd on sd.childSnapshotId = childApp.snapshotId
                                            where childApp.isToolkit = 1 and sd.childSnapshotId is null
                                          )`)
      expect(closeStub).to.have.been.calledOnce
    })
  })

  it('should reject the "getWithoutChildren" method when query execution returns an error', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = AppSnapshot.getWithoutChildren('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`select parent.*
                                          from (select * from AppSnapshot) parent
                                          left join (select * from SnapshotDependency) sd on sd.parentSnapshotId = parent.snapshotId
                                          left join AppSnapshot child on child.snapshotId = sd.childSnapshotId
                                          where sd.parentSnapshotId is null`)
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "getWithoutChildren" method when query execution returns an error', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, null, [SNAPSHOT1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result1 = AppSnapshot.getWithoutChildren('test.db', 'snapshotToRemove')
    const result2 = AppSnapshot.getWithoutChildren('test.db', ['snapshotToRemove1', 'snapshotToRemove2'])
    return Promise.all([
      expect(result1).to.eventually.be.fulfilled,
      expect(result2).to.eventually.be.fulfilled
    ]).then((results) => {
      expect(dbStub).to.have.been.calledTwice
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledTwice
      const args1 = allStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`select parent.*
                                          from (select * from AppSnapshot where snapshotId <> 'snapshotToRemove') parent
                                          left join (select * from SnapshotDependency where childSnapshotId <> 'snapshotToRemove') sd on sd.parentSnapshotId = parent.snapshotId
                                          left join AppSnapshot child on child.snapshotId = sd.childSnapshotId
                                          where sd.parentSnapshotId is null`)
      const args2 = allStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`select parent.*
                                          from (select * from AppSnapshot where snapshotId not in ('snapshotToRemove1', 'snapshotToRemove2')) parent
                                          left join (select * from SnapshotDependency where childSnapshotId not in ('snapshotToRemove1', 'snapshotToRemove2')) sd on sd.parentSnapshotId = parent.snapshotId
                                          left join AppSnapshot child on child.snapshotId = sd.childSnapshotId
                                          where sd.parentSnapshotId is null`)
      expect(closeStub).to.have.been.calledTwice
      expect(results[0]).to.eql([SNAPSHOT1])
      expect(results[1]).to.eql([SNAPSHOT1])
    })
  })

  it('should reject the "getWithoutParents" method when query execution returns an error', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = AppSnapshot.getWithoutParents('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`select child.*
                                          from (select * from AppSnapshot) child
                                          left join (select * from SnapshotDependency) sd on sd.childSnapshotId = child.snapshotId
                                          left join AppSnapshot parent on parent.snapshotId = sd.parentSnapshotId
                                          where sd.childSnapshotId is null`)
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "getWithoutParents" method when query execution returns an error', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, null, [SNAPSHOT1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result1 = AppSnapshot.getWithoutParents('test.db', 'snapshotToRemove')
    const result2 = AppSnapshot.getWithoutParents('test.db', ['snapshotToRemove1', 'snapshotToRemove2'])
    return Promise.all([
      expect(result1).to.eventually.be.fulfilled,
      expect(result2).to.eventually.be.fulfilled
    ]).then((results) => {
      expect(dbStub).to.have.been.calledTwice
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledTwice
      const args1 = allStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`select child.*
                                          from (select * from AppSnapshot where snapshotId <> 'snapshotToRemove') child
                                          left join (select * from SnapshotDependency where parentSnapshotId <> 'snapshotToRemove') sd on sd.childSnapshotId = child.snapshotId
                                          left join AppSnapshot parent on parent.snapshotId = sd.parentSnapshotId
                                          where sd.childSnapshotId is null`)
      const args2 = allStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`select child.*
                                          from (select * from AppSnapshot where snapshotId not in ('snapshotToRemove1', 'snapshotToRemove2')) child
                                          left join (select * from SnapshotDependency where parentSnapshotId not in ('snapshotToRemove1', 'snapshotToRemove2')) sd on sd.childSnapshotId = child.snapshotId
                                          left join AppSnapshot parent on parent.snapshotId = sd.parentSnapshotId
                                          where sd.childSnapshotId is null`)
      expect(closeStub).to.have.been.calledTwice
      expect(results[0]).to.eql([SNAPSHOT1])
      expect(results[1]).to.eql([SNAPSHOT1])
    })
  })
})
