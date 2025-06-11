const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const AppSnapshot = require('../../src/classes/AppSnapshot')
const { AppSnapshot: DBAccess } = require('../../src/db')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

const APP_SNAPSHOT1 = () =>
  new AppSnapshot('snapshot1', 'appId1', 'branchId1', 'appShortName1', 'snapshotName1', 'appName1', 'branchName1', 'description1', 'buildVersion1', true, true, true)

const APP_SNAPSHOT2 = () =>
  new AppSnapshot('snapshot2', 'appId2', 'branchId2', 'appShortName2', 'snapshotName2', 'appName2', 'branchName2', 'description2', 'buildVersion2', false, false, false)

const APP_SNAPSHOT_STUB1 = {
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
  isObjectsProcessed: 1
}

const APP_SNAPSHOT_STUB2 = {
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
  isObjectsProcessed: 0
}

const APP_SNAPSHOT_RESULT1 = {
  snapshotId: 'snapshot1',
  appId: 'appId1',
  branchId: 'branchId1',
  appShortName: 'appShortName1',
  snapshotName: 'snapshotName1',
  appName: 'appName1',
  branchName: 'branchName1',
  description: 'description1',
  buildVersion: 'buildVersion1',
  isToolkit: true,
  isSystem: true,
  isObjectsProcessed: true
}

const APP_SNAPSHOT_RESULT2 = {
  snapshotId: 'snapshot2',
  appId: 'appId2',
  branchId: 'branchId2',
  appShortName: 'appShortName2',
  snapshotName: 'snapshotName2',
  appName: 'appName2',
  branchName: 'branchName2',
  description: 'description2',
  buildVersion: 'buildVersion2',
  isToolkit: false,
  isSystem: false,
  isObjectsProcessed: false
}

describe('Classes - AppSnapshot', () => {
  it('should be a class and have all the static methods', () => {
    expect(AppSnapshot).to.be.a('function')
    expect(AppSnapshot).itself.to.respondTo('register')
    expect(AppSnapshot).itself.to.respondTo('markObjectsProcessed')
    expect(AppSnapshot).itself.to.respondTo('getAll')
    expect(AppSnapshot).itself.to.respondTo('getById')
    expect(AppSnapshot).itself.to.respondTo('where')
    expect(AppSnapshot).itself.to.respondTo('find')
    expect(AppSnapshot).itself.to.respondTo('remove')
    expect(AppSnapshot).itself.to.respondTo('removeOrphaned')
  })

  it('should create objects correctly', () => {
    const obj1 = APP_SNAPSHOT1()
    expect(obj1).to.eql(APP_SNAPSHOT_RESULT1)

    const obj2 = APP_SNAPSHOT2()
    expect(obj2).to.eql(APP_SNAPSHOT_RESULT2)
  })

  it('should invoke the correct DB handler for the "register" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'register').returns(defer())
    const obj1 = APP_SNAPSHOT1()
    expect(stubResolve).not.to.have.been.called
    const resultResolve = AppSnapshot.register('name1', obj1)
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', APP_SNAPSHOT_STUB1)
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'register').returns(defer(false))
    const obj2 = APP_SNAPSHOT2()
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.register('name2', obj2)
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', APP_SNAPSHOT_STUB2)
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "markObjectsProcessed" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'update').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = AppSnapshot.markObjectsProcessed('name1', 'id1')
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', 'id1', { isObjectsProcessed: 1 })
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'update').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.markObjectsProcessed('name2', 'id2')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', 'id2', { isObjectsProcessed: 1 })
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getAll" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'getAll').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = AppSnapshot.getAll('name1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1')
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'getAll').returns(defer(true, [APP_SNAPSHOT_STUB1, APP_SNAPSHOT_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = AppSnapshot.getAll('name1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1')
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'getAll').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.getAll('name1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1')
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(AppSnapshot)
        })
        expect(data).to.eql([APP_SNAPSHOT_RESULT1, APP_SNAPSHOT_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getById" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'getById').returns(defer(true, null))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = AppSnapshot.getById('name1', 'id1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', 'id1')
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'getById').returns(defer(true, APP_SNAPSHOT_STUB1))
    expect(stubResults).not.to.have.been.called
    const resultResults = AppSnapshot.getById('name1', 'id1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', 'id1')
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'getById').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.getById('name1', 'id1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', 'id1')
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become(null),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data).to.be.an.instanceOf(AppSnapshot)
        expect(data).to.eql(APP_SNAPSHOT_RESULT1)
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "where" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = AppSnapshot.where('name1', { appName: 'appName1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [APP_SNAPSHOT_STUB1, APP_SNAPSHOT_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = AppSnapshot.where('name1', { appName: 'appName1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.where('name1', { appName: 'appName1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(AppSnapshot)
        })
        expect(data).to.eql([APP_SNAPSHOT_RESULT1, APP_SNAPSHOT_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "find" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'find').returns(defer(true, null))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = AppSnapshot.find('name1', { appName: 'appName1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'find').returns(defer(true, APP_SNAPSHOT_STUB1))
    expect(stubResults).not.to.have.been.called
    const resultResults = AppSnapshot.find('name1', { appName: 'appName1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'find').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.find('name1', { appName: 'appName1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become(null),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data).to.be.an.instanceOf(AppSnapshot)
        expect(data).to.eql(APP_SNAPSHOT_RESULT1)
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "remove" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'remove').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = AppSnapshot.remove('name1', { appName: 'appName1' })
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'remove').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.remove('name2', { appName: 'appName1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', { appName: 'appName1' })
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "removeOrphaned" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'removeOrphaned').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = AppSnapshot.removeOrphaned('name1')
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1')
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'removeOrphaned').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.removeOrphaned('name2')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2')
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getWithoutChildren" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'getWithoutChildren').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = AppSnapshot.getWithoutChildren('name1')
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1')
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'getWithoutChildren').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.getWithoutChildren('name2', 'snapshot1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', 'snapshot1')
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getWithoutParents" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'getWithoutParents').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = AppSnapshot.getWithoutParents('name1')
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1')
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'getWithoutParents').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = AppSnapshot.getWithoutParents('name2', 'snapshot1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', 'snapshot1')
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })
})
