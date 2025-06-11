const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const SnapshotObjectDependency = require('../../src/classes/SnapshotObjectDependency')
const { SnapshotObjectDependency: DBAccess } = require('../../src/db')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

const DEPENDENCY1 = () => new SnapshotObjectDependency('snapshotId1', 'versionId1', 'objectId1')

const DEPENDENCY2 = () => new SnapshotObjectDependency('snapshotId2', 'versionId2', 'objectId2')

const DEPENDENCY_STUB1 = {
  objectVersionId: 'versionId1',
  snapshotId: 'snapshotId1',
  objectId: 'objectId1'
}

const DEPENDENCY_STUB2 = {
  objectVersionId: 'versionId2',
  snapshotId: 'snapshotId2',
  objectId: 'objectId2'
}

const DEPENDENCY_RESULT1 = {
  objectVersionId: 'versionId1',
  snapshotId: 'snapshotId1',
  objectId: 'objectId1'
}

const DEPENDENCY_RESULT2 = {
  objectVersionId: 'versionId2',
  snapshotId: 'snapshotId2',
  objectId: 'objectId2'
}

describe('Classes - SnapshotObjectDependency', () => {
  it('should be a class and have all the static methods', () => {
    expect(SnapshotObjectDependency).to.be.a('function')
    expect(SnapshotObjectDependency).itself.to.respondTo('register')
    expect(SnapshotObjectDependency).itself.to.respondTo('registerMany')
    expect(SnapshotObjectDependency).itself.to.respondTo('getAll')
    expect(SnapshotObjectDependency).itself.to.respondTo('getByParentId')
    expect(SnapshotObjectDependency).itself.to.respondTo('getByChildId')
    expect(SnapshotObjectDependency).itself.to.respondTo('where')
    expect(SnapshotObjectDependency).itself.to.respondTo('find')
    expect(SnapshotObjectDependency).itself.to.respondTo('remove')
    expect(SnapshotObjectDependency).itself.to.respondTo('removeOrphaned')
  })

  it('should create objects correctly', () => {
    const obj1 = DEPENDENCY1()
    expect(obj1).to.eql(DEPENDENCY_RESULT1)

    const obj2 = DEPENDENCY2()
    expect(obj2).to.eql(DEPENDENCY_RESULT2)
  })

  it('should invoke the correct DB handler for the "register" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'register').returns(defer())
    const obj1 = DEPENDENCY1()
    expect(stubResolve).not.to.have.been.called
    const resultResolve = SnapshotObjectDependency.register('name1', obj1)
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', DEPENDENCY_STUB1)
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'register').returns(defer(false))
    const obj2 = DEPENDENCY2()
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.register('name2', obj2)
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', DEPENDENCY_STUB2)
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "registerMany" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'registerMany').returns(defer())
    const obj1 = DEPENDENCY1()
    const obj2 = DEPENDENCY2()
    expect(stubResolve).not.to.have.been.called
    const resultResolve = SnapshotObjectDependency.registerMany('name1', [obj1, obj2])
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', [DEPENDENCY_STUB1, DEPENDENCY_STUB2])
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'registerMany').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.registerMany('name1', [obj1, obj2])
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', [DEPENDENCY_STUB1, DEPENDENCY_STUB2])
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getAll" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'getAll').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotObjectDependency.getAll('name1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1')
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'getAll').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotObjectDependency.getAll('name1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1')
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'getAll').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.getAll('name1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1')
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(SnapshotObjectDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getByParentId" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotObjectDependency.getByParentId('name1', 'id1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { snapshotId: 'id1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotObjectDependency.getByParentId('name1', 'id1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { snapshotId: 'id1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.getByParentId('name1', 'id1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { snapshotId: 'id1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(SnapshotObjectDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getByChildId" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotObjectDependency.getByChildId('name1', 'id1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { objectVersionId: 'id1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotObjectDependency.getByChildId('name1', 'id1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { objectVersionId: 'id1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.getByChildId('name1', 'id1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { objectVersionId: 'id1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(SnapshotObjectDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "where" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotObjectDependency.where('name1', { objectId: 'objectId1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotObjectDependency.where('name1', { objectId: 'objectId1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.where('name1', { objectId: 'objectId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(SnapshotObjectDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "find" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'find').returns(defer(true, null))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotObjectDependency.find('name1', { objectId: 'objectId1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'find').returns(defer(true, DEPENDENCY_STUB1))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotObjectDependency.find('name1', { objectId: 'objectId1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'find').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.find('name1', { objectId: 'objectId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become(null),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data).to.be.an.instanceOf(SnapshotObjectDependency)
        expect(data).to.eql(DEPENDENCY_RESULT1)
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "remove" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'remove').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = SnapshotObjectDependency.remove('name1', { objectId: 'objectId1' })
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'remove').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.remove('name2', { objectId: 'objectId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', { objectId: 'objectId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "removeOrphaned" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'removeOrphaned').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = SnapshotObjectDependency.removeOrphaned('name1')
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1')
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'removeOrphaned').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotObjectDependency.removeOrphaned('name2')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2')
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })
})
