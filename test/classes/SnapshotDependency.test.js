const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const SnapshotDependency = require('../../src/classes/SnapshotDependency')
const { SnapshotDependency: DBAccess } = require('../../src/db')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

const DEPENDENCY1 = () => new SnapshotDependency('parent1', 'child1', 1, 'dependencyId1')

const DEPENDENCY2 = () => new SnapshotDependency('parent2', 'child2', 2, 'dependencyId2')

const DEPENDENCY_STUB1 = {
  parentSnapshotId: 'parent1',
  childSnapshotId: 'child1',
  rank: 1,
  dependencyId: 'dependencyId1'
}

const DEPENDENCY_STUB2 = {
  parentSnapshotId: 'parent2',
  childSnapshotId: 'child2',
  rank: 2,
  dependencyId: 'dependencyId2'
}

const DEPENDENCY_RESULT1 = {
  parentSnapshotId: 'parent1',
  childSnapshotId: 'child1',
  rank: 1,
  dependencyId: 'dependencyId1'
}

const DEPENDENCY_RESULT2 = {
  parentSnapshotId: 'parent2',
  childSnapshotId: 'child2',
  rank: 2,
  dependencyId: 'dependencyId2'
}

describe('Classes - SnapshotDependency', () => {
  it('should be a class and have all the static methods', () => {
    expect(SnapshotDependency).to.be.a('function')
    expect(SnapshotDependency).itself.to.respondTo('register')
    expect(SnapshotDependency).itself.to.respondTo('registerMany')
    expect(SnapshotDependency).itself.to.respondTo('getAll')
    expect(SnapshotDependency).itself.to.respondTo('getByParentId')
    expect(SnapshotDependency).itself.to.respondTo('getByChildId')
    expect(SnapshotDependency).itself.to.respondTo('where')
    expect(SnapshotDependency).itself.to.respondTo('find')
    expect(SnapshotDependency).itself.to.respondTo('remove')
    expect(SnapshotDependency).itself.to.respondTo('removeOrphaned')
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
    const resultResolve = SnapshotDependency.register('name1', obj1)
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', DEPENDENCY_STUB1)
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'register').returns(defer(false))
    const obj2 = DEPENDENCY2()
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.register('name2', obj2)
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
    const resultResolve = SnapshotDependency.registerMany('name1', [obj1, obj2])
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', [DEPENDENCY_STUB1, DEPENDENCY_STUB2])
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'registerMany').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.registerMany('name1', [obj1, obj2])
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
    const resultEmpty = SnapshotDependency.getAll('name1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1')
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'getAll').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotDependency.getAll('name1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1')
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'getAll').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.getAll('name1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1')
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(SnapshotDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getByParentId" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotDependency.getByParentId('name1', 'id1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { parentSnapshotId: 'id1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotDependency.getByParentId('name1', 'id1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { parentSnapshotId: 'id1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.getByParentId('name1', 'id1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { parentSnapshotId: 'id1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(SnapshotDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getByChildId" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotDependency.getByChildId('name1', 'id1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { childSnapshotId: 'id1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotDependency.getByChildId('name1', 'id1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { childSnapshotId: 'id1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.getByChildId('name1', 'id1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { childSnapshotId: 'id1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(SnapshotDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "where" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotDependency.where('name1', { dependendyId: 'dependencyId1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { dependendyId: 'dependencyId1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotDependency.where('name1', { dependendyId: 'dependencyId1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { dependendyId: 'dependencyId1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.where('name1', { dependendyId: 'dependencyId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { dependendyId: 'dependencyId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(SnapshotDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "find" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'find').returns(defer(true, null))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = SnapshotDependency.find('name1', { dependendyId: 'dependencyId1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { dependendyId: 'dependencyId1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'find').returns(defer(true, DEPENDENCY_STUB1))
    expect(stubResults).not.to.have.been.called
    const resultResults = SnapshotDependency.find('name1', { dependendyId: 'dependencyId1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { dependendyId: 'dependencyId1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'find').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.find('name1', { dependendyId: 'dependencyId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { dependendyId: 'dependencyId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become(null),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data).to.be.an.instanceOf(SnapshotDependency)
        expect(data).to.eql(DEPENDENCY_RESULT1)
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "remove" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'remove').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = SnapshotDependency.remove('name1', { dependendyId: 'dependencyId1' })
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', { dependendyId: 'dependencyId1' })
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'remove').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.remove('name2', { dependendyId: 'dependencyId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', { dependendyId: 'dependencyId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "removeOrphaned" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'removeOrphaned').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = SnapshotDependency.removeOrphaned('name1')
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1')
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'removeOrphaned').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = SnapshotDependency.removeOrphaned('name2')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2')
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })
})
