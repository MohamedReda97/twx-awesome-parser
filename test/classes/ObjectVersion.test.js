const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const ObjectVersion = require('../../src/classes/ObjectVersion')
const { ObjectVersion: DBAccess } = require('../../src/db')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

const OBJECT1 = () =>
  new ObjectVersion('versionId1', 'objectId1', 'versionName1', 'description1', 'type1', 'subtype1', true)

const OBJECT2 = () =>
  new ObjectVersion('versionId2', 'objectId2', 'versionName2', 'description2', 'type2', 'subtype2', false)

const OBJECT_STUB1 = {
  objectVersionId: 'versionId1',
  objectId: 'objectId1',
  name: 'versionName1',
  description: 'description1',
  type: 'type1',
  subtype: 'subtype1',
  isExposed: 1
}

const OBJECT_STUB2 = {
  objectVersionId: 'versionId2',
  objectId: 'objectId2',
  name: 'versionName2',
  description: 'description2',
  type: 'type2',
  subtype: 'subtype2',
  isExposed: 0
}

const OBJECT_RESULT1 = {
  objectVersionId: 'versionId1',
  objectId: 'objectId1',
  name: 'versionName1',
  description: 'description1',
  type: 'type1',
  subtype: 'subtype1',
  isExposed: true
}

const OBJECT_RESULT2 = {
  objectVersionId: 'versionId2',
  objectId: 'objectId2',
  name: 'versionName2',
  description: 'description2',
  type: 'type2',
  subtype: 'subtype2',
  isExposed: false
}

describe('Classes - ObjectVersion', () => {
  it('should be a class and have all the static methods', () => {
    expect(ObjectVersion).to.be.a('function')
    expect(ObjectVersion).itself.to.respondTo('register')
    expect(ObjectVersion).itself.to.respondTo('registerMany')
    expect(ObjectVersion).itself.to.respondTo('getAll')
    expect(ObjectVersion).itself.to.respondTo('getById')
    expect(ObjectVersion).itself.to.respondTo('where')
    expect(ObjectVersion).itself.to.respondTo('find')
    expect(ObjectVersion).itself.to.respondTo('remove')
    expect(ObjectVersion).itself.to.respondTo('removeOrphaned')
  })

  it('should create objects correctly', () => {
    const obj1 = OBJECT1()
    expect(obj1).to.eql(OBJECT_RESULT1)

    const obj2 = OBJECT2()
    expect(obj2).to.eql(OBJECT_RESULT2)
  })

  it('should invoke the correct DB handler for the "register" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'register').returns(defer())
    const obj1 = OBJECT1()
    expect(stubResolve).not.to.have.been.called
    const resultResolve = ObjectVersion.register('name1', obj1)
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', OBJECT_STUB1)
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'register').returns(defer(false))
    const obj2 = OBJECT2()
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectVersion.register('name2', obj2)
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', OBJECT_STUB2)
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "registerMany" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'registerMany').returns(defer())
    const obj1 = OBJECT1()
    const obj2 = OBJECT2()
    expect(stubResolve).not.to.have.been.called
    const resultResolve = ObjectVersion.registerMany('name1', [obj1, obj2])
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', [OBJECT_STUB1, OBJECT_STUB2])
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'registerMany').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectVersion.registerMany('name1', [obj1, obj2])
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', [OBJECT_STUB1, OBJECT_STUB2])
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getAll" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'getAll').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = ObjectVersion.getAll('name1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1')
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'getAll').returns(defer(true, [OBJECT_STUB1, OBJECT_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectVersion.getAll('name1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1')
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'getAll').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectVersion.getAll('name1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1')
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(ObjectVersion)
        })
        expect(data).to.eql([OBJECT_RESULT1, OBJECT_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "getById" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'getById').returns(defer(true, null))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = ObjectVersion.getById('name1', 'id1')
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', 'id1')
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'getById').returns(defer(true, OBJECT_STUB1))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectVersion.getById('name1', 'id1')
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', 'id1')
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'getById').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectVersion.getById('name1', 'id1')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', 'id1')
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become(null),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data).to.be.an.instanceOf(ObjectVersion)
        expect(data).to.eql(OBJECT_RESULT1)
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "where" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = ObjectVersion.where('name1', { name: 'versionName1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { name: 'versionName1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'where').returns(defer(true, [OBJECT_STUB1, OBJECT_STUB2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectVersion.where('name1', { name: 'versionName1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { name: 'versionName1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectVersion.where('name1', { name: 'versionName1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { name: 'versionName1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        data.map(item => {
          expect(item).to.be.an.instanceOf(ObjectVersion)
        })
        expect(data).to.eql([OBJECT_RESULT1, OBJECT_RESULT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "find" method', () => {
    const stubEmpty = sinon.stub(DBAccess, 'find').returns(defer(true, null))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = ObjectVersion.find('name1', { name: 'versionName1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { name: 'versionName1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(DBAccess, 'find').returns(defer(true, OBJECT_STUB1))
    expect(stubResults).not.to.have.been.called
    const resultResults = ObjectVersion.find('name1', { name: 'versionName1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { name: 'versionName1' })
    stubResults.restore()

    const stubReject = sinon.stub(DBAccess, 'find').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectVersion.find('name1', { name: 'versionName1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { name: 'versionName1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become(null),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data).to.be.an.instanceOf(ObjectVersion)
        expect(data).to.eql(OBJECT_RESULT1)
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "remove" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'remove').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = ObjectVersion.remove('name1', { name: 'versionName1' })
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1', { name: 'versionName1' })
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'remove').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectVersion.remove('name2', { name: 'versionName1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2', { name: 'versionName1' })
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should invoke the correct DB handler for the "removeOrphaned" method', () => {
    const stubResolve = sinon.stub(DBAccess, 'removeOrphaned').returns(defer())
    expect(stubResolve).not.to.have.been.called
    const resultResolve = ObjectVersion.removeOrphaned('name1')
    expect(stubResolve).to.have.been.calledOnce
    expect(stubResolve).to.have.been.calledWith('name1')
    stubResolve.restore()

    const stubReject = sinon.stub(DBAccess, 'removeOrphaned').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = ObjectVersion.removeOrphaned('name2')
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name2')
    stubReject.restore()

    return Promise.all([
      expect(resultResolve).to.eventually.be.fulfilled,
      expect(resultReject).to.eventually.be.rejected
    ])
  })
})
