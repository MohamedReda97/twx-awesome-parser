const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const ObjectDependency = require('../../src/classes/ObjectDependency')
const { ObjectDependency: DBAccess } = require('../../src/db')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

const DEPENDENCY1 = () => new ObjectDependency('parent1', 'child1', 'type1', 'name1')

const DEPENDENCY2 = () => new ObjectDependency('parent2', 'child2', 'type2', 'name2')

const DEPENDENCY_STUB1 = {
  parentObjectVersionId: 'parent1',
  childObjectVersionId: 'child1',
  dependencyType: 'type1',
  dependencyName: 'name1'
}

const DEPENDENCY_STUB2 = {
  parentObjectVersionId: 'parent2',
  childObjectVersionId: 'child2',
  dependencyType: 'type2',
  dependencyName: 'name2'
}

const DEPENDENCY_RESULT1 = {
  parentObjectVersionId: 'parent1',
  childObjectVersionId: 'child1',
  dependencyType: 'type1',
  dependencyName: 'name1'
}

const DEPENDENCY_RESULT2 = {
  parentObjectVersionId: 'parent2',
  childObjectVersionId: 'child2',
  dependencyType: 'type2',
  dependencyName: 'name2'
}

describe('Classes - SnapshotDependency', () => {
  it('should be a class and have all the static methods', () => {
    expect(ObjectDependency).to.be.a('function')
    expect(ObjectDependency).itself.to.respondTo('register')
    expect(ObjectDependency).itself.to.respondTo('registerMany')
    expect(ObjectDependency).itself.to.respondTo('getAll')
    expect(ObjectDependency).itself.to.respondTo('getByParentId')
    expect(ObjectDependency).itself.to.respondTo('getByChildId')
    expect(ObjectDependency).itself.to.respondTo('where')
    expect(ObjectDependency).itself.to.respondTo('find')
    expect(ObjectDependency).itself.to.respondTo('remove')
    expect(ObjectDependency).itself.to.respondTo('removeOrphaned')
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
    const resultResolve = ObjectDependency.register('name1', obj1)
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', DEPENDENCY_STUB1)
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'register').returns(defer(false))
    const obj2 = DEPENDENCY2()
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.register('name2', obj2)
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
    const resultResolve = ObjectDependency.registerMany('name1', [obj1, obj2])
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', [DEPENDENCY_STUB1, DEPENDENCY_STUB2])
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'registerMany').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.registerMany('name1', [obj1, obj2])
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
    const resultEmpty = ObjectDependency.getAll('name1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1')
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'getAll').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectDependency.getAll('name1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1')
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'getAll').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.getAll('name1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1')
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(ObjectDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getByParentId" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = ObjectDependency.getByParentId('name1', 'id1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { parentObjectVersionId: 'id1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectDependency.getByParentId('name1', 'id1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { parentObjectVersionId: 'id1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.getByParentId('name1', 'id1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { parentObjectVersionId: 'id1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(ObjectDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getByChildId" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = ObjectDependency.getByChildId('name1', 'id1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { childObjectVersionId: 'id1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectDependency.getByChildId('name1', 'id1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { childObjectVersionId: 'id1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.getByChildId('name1', 'id1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { childObjectVersionId: 'id1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(ObjectDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "where" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = ObjectDependency.where('name1', { objectId: 'objectId1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [DEPENDENCY_STUB1, DEPENDENCY_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectDependency.where('name1', { objectId: 'objectId1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.where('name1', { objectId: 'objectId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(ObjectDependency)
        })
        expect(data).to.eql([DEPENDENCY_RESULT1, DEPENDENCY_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "find" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'find').returns(defer(true, null))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = ObjectDependency.find('name1', { objectId: 'objectId1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'find').returns(defer(true, DEPENDENCY_STUB1))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectDependency.find('name1', { objectId: 'objectId1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'find').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.find('name1', { objectId: 'objectId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become(null),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data).to.be.an.instanceOf(ObjectDependency)
        expect(data).to.eql(DEPENDENCY_RESULT1)
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "remove" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'remove').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = ObjectDependency.remove('name1', { objectId: 'objectId1' })
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'remove').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.remove('name2', { objectId: 'objectId1' })
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
    const resultResolve = ObjectDependency.removeOrphaned('name1')
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1')
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'removeOrphaned').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectDependency.removeOrphaned('name2')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2')
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })
})
