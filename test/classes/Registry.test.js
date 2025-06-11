const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const Registry = require('../../src/classes/Registry')
const AppSnapshot = require('../../src/classes/AppSnapshot')
const ObjectVersion = require('../../src/classes/ObjectVersion')
const SnapshotDependency = require('../../src/classes/SnapshotDependency')
const SnapshotObjectDependency = require('../../src/classes/SnapshotObjectDependency')
const ObjectDependency = require('../../src/classes/ObjectDependency')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Classes - Registry', () => {
  it('should have all properties and have all the methods in each property', () => {
    expect(Registry).to.be.an('object')
    expect(Registry).to.have.property('AppSnapshot')
    expect(Registry).to.have.property('ObjectVersion')
    expect(Registry).to.have.property('SnapshotDependency')
    expect(Registry).to.have.property('SnapshotObjectDependency')
    expect(Registry).to.have.property('ObjectDependency')

    expect(Registry.AppSnapshot).to.respondTo('register')
    expect(Registry.AppSnapshot).to.respondTo('markObjectsProcessed')
    expect(Registry.AppSnapshot).to.respondTo('getAll')
    expect(Registry.AppSnapshot).to.respondTo('getById')
    expect(Registry.AppSnapshot).to.respondTo('where')
    expect(Registry.AppSnapshot).to.respondTo('find')
    expect(Registry.AppSnapshot).to.respondTo('remove')
    expect(Registry.AppSnapshot).to.respondTo('removeOrphaned')

    expect(Registry.ObjectVersion).to.respondTo('register')
    expect(Registry.ObjectVersion).to.respondTo('registerMany')
    expect(Registry.ObjectVersion).to.respondTo('getAll')
    expect(Registry.ObjectVersion).to.respondTo('getById')
    expect(Registry.ObjectVersion).to.respondTo('where')
    expect(Registry.ObjectVersion).to.respondTo('find')
    expect(Registry.ObjectVersion).to.respondTo('remove')
    expect(Registry.ObjectVersion).to.respondTo('removeOrphaned')

    expect(Registry.SnapshotDependency).to.respondTo('register')
    expect(Registry.SnapshotDependency).to.respondTo('registerMany')
    expect(Registry.SnapshotDependency).to.respondTo('getAll')
    expect(Registry.SnapshotDependency).to.respondTo('getByParentId')
    expect(Registry.SnapshotDependency).to.respondTo('getByChildId')
    expect(Registry.SnapshotDependency).to.respondTo('where')
    expect(Registry.SnapshotDependency).to.respondTo('find')
    expect(Registry.SnapshotDependency).to.respondTo('remove')
    expect(Registry.SnapshotDependency).to.respondTo('removeOrphaned')

    expect(Registry.SnapshotObjectDependency).to.respondTo('register')
    expect(Registry.SnapshotObjectDependency).to.respondTo('registerMany')
    expect(Registry.SnapshotObjectDependency).to.respondTo('getAll')
    expect(Registry.SnapshotObjectDependency).to.respondTo('getByParentId')
    expect(Registry.SnapshotObjectDependency).to.respondTo('getByChildId')
    expect(Registry.SnapshotObjectDependency).to.respondTo('where')
    expect(Registry.SnapshotObjectDependency).to.respondTo('find')
    expect(Registry.SnapshotObjectDependency).to.respondTo('remove')
    expect(Registry.SnapshotObjectDependency).to.respondTo('removeOrphaned')

    expect(Registry.ObjectDependency).to.respondTo('register')
    expect(Registry.ObjectDependency).to.respondTo('registerMany')
    expect(Registry.ObjectDependency).to.respondTo('getAll')
    expect(Registry.ObjectDependency).to.respondTo('getByParentId')
    expect(Registry.ObjectDependency).to.respondTo('getByChildId')
    expect(Registry.ObjectDependency).to.respondTo('where')
    expect(Registry.ObjectDependency).to.respondTo('find')
    expect(Registry.ObjectDependency).to.respondTo('remove')
    expect(Registry.ObjectDependency).to.respondTo('removeOrphaned')
  })

  describe('AppSnapshot', () => {
    it('should proxy correctly the "register" method', () => {
      const stub = sinon.stub(AppSnapshot, 'register').returns(defer())
      const obj1 = new AppSnapshot('id1', 'appId1', 'branchId1', 'appShortName1', 'snapshotName1', 'appName1', 'branchName1', 'description1', 'buildVersion1', true, true, true)
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.register('name1', obj1)
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', obj1)
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "markObjectsProcessed" method', () => {
      const stub = sinon.stub(AppSnapshot, 'markObjectsProcessed').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.markObjectsProcessed('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getAll" method', () => {
      const stub = sinon.stub(AppSnapshot, 'getAll').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.getAll('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getById" method', () => {
      const stub = sinon.stub(AppSnapshot, 'getById').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.getById('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "where" method', () => {
      const stub = sinon.stub(AppSnapshot, 'where').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.where('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "find" method', () => {
      const stub = sinon.stub(AppSnapshot, 'find').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.find('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "remove" method', () => {
      const stub = sinon.stub(AppSnapshot, 'remove').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.remove('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "removeOrphaned" method', () => {
      const stub = sinon.stub(AppSnapshot, 'removeOrphaned').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.removeOrphaned('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getWithoutChildren" method', () => {
      const stub = sinon.stub(AppSnapshot, 'getWithoutChildren').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.getWithoutChildren('name1', 'snapshotIdToExclude')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'snapshotIdToExclude')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getWithoutParents" method', () => {
      const stub = sinon.stub(AppSnapshot, 'getWithoutParents').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.AppSnapshot.getWithoutParents('name1', ['snapshotIdToExclude'])
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', ['snapshotIdToExclude'])
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })
  })

  describe('ObjectVersion', () => {
    it('should proxy correctly the "register" method', () => {
      const stub = sinon.stub(ObjectVersion, 'register').returns(defer())
      const obj1 = new ObjectVersion('versionId1', 'objectId1', 'versionName1', 'description1', 'type1', 'subtype1', true)
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectVersion.register('name1', obj1)
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', obj1)
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "registerMany" method', () => {
      const stub = sinon.stub(ObjectVersion, 'registerMany').returns(defer())
      const obj1 = new ObjectVersion('versionId1', 'objectId1', 'versionName1', 'description1', 'type1', 'subtype1', true)
      const obj2 = new ObjectVersion('versionId2', 'objectId2', 'versionName2', 'description2', 'type2', 'subtype2', false)
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectVersion.registerMany('name1', [obj1, obj2])
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', [obj1, obj2])
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getAll" method', () => {
      const stub = sinon.stub(ObjectVersion, 'getAll').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectVersion.getAll('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getById" method', () => {
      const stub = sinon.stub(ObjectVersion, 'getById').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectVersion.getById('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "where" method', () => {
      const stub = sinon.stub(ObjectVersion, 'where').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectVersion.where('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "find" method', () => {
      const stub = sinon.stub(ObjectVersion, 'find').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectVersion.find('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "remove" method', () => {
      const stub = sinon.stub(ObjectVersion, 'remove').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectVersion.remove('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "removeOrphaned" method', () => {
      const stub = sinon.stub(ObjectVersion, 'removeOrphaned').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectVersion.removeOrphaned('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })
  })

  describe('SnapshotDependency', () => {
    it('should proxy correctly the "register" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'register').returns(defer())
      const obj1 = new SnapshotDependency('parent1', 'child1', 1, 'dependencyId1')
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.register('name1', obj1)
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', obj1)
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "registerMany" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'registerMany').returns(defer())
      const obj1 = new SnapshotDependency('parent1', 'child1', 1, 'dependencyId1')
      const obj2 = new SnapshotDependency('parent2', 'child2', 2, 'dependencyId2')
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.registerMany('name1', [obj1, obj2])
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', [obj1, obj2])
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getAll" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'getAll').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.getAll('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getByParentId" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'getByParentId').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.getByParentId('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getByChildId" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'getByChildId').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.getByChildId('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "where" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'where').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.where('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "find" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'find').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.find('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "remove" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'remove').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.remove('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "removeOrphaned" method', () => {
      const stub = sinon.stub(SnapshotDependency, 'removeOrphaned').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotDependency.removeOrphaned('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })
  })

  describe('SnapshotObjectDependency', () => {
    it('should proxy correctly the "register" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'register').returns(defer())
      const obj1 = new SnapshotObjectDependency('snapshotId1', 'versionId1', 'objectId1')
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.register('name1', obj1)
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', obj1)
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "registerMany" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'registerMany').returns(defer())
      const obj1 = new SnapshotObjectDependency('snapshotId1', 'versionId1', 'objectId1')
      const obj2 = new SnapshotObjectDependency('snapshotId2', 'versionId2', 'objectId2')
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.registerMany('name1', [obj1, obj2])
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', [obj1, obj2])
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getAll" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'getAll').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.getAll('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getByParentId" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'getByParentId').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.getByParentId('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getByChildId" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'getByChildId').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.getByChildId('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "where" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'where').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.where('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "find" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'find').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.find('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "remove" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'remove').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.remove('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "removeOrphaned" method', () => {
      const stub = sinon.stub(SnapshotObjectDependency, 'removeOrphaned').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.SnapshotObjectDependency.removeOrphaned('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })
  })

  describe('ObjectDependency', () => {
    it('should proxy correctly the "register" method', () => {
      const stub = sinon.stub(ObjectDependency, 'register').returns(defer())
      const obj1 = new ObjectDependency('parent1', 'child1', 'type1', 'name1')
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.register('name1', obj1)
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', obj1)
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "registerMany" method', () => {
      const stub = sinon.stub(ObjectDependency, 'registerMany').returns(defer())
      const obj1 = new ObjectDependency('parent1', 'child1', 'type1', 'name1')
      const obj2 = new ObjectDependency('parent2', 'child2', 'type2', 'name2')
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.registerMany('name1', [obj1, obj2])
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', [obj1, obj2])
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getAll" method', () => {
      const stub = sinon.stub(ObjectDependency, 'getAll').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.getAll('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getByParentId" method', () => {
      const stub = sinon.stub(ObjectDependency, 'getByParentId').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.getByParentId('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "getByChildId" method', () => {
      const stub = sinon.stub(ObjectDependency, 'getByChildId').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.getByChildId('name1', 'id1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', 'id1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "where" method', () => {
      const stub = sinon.stub(ObjectDependency, 'where').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.where('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "find" method', () => {
      const stub = sinon.stub(ObjectDependency, 'find').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.find('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "remove" method', () => {
      const stub = sinon.stub(ObjectDependency, 'remove').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.remove('name1', { snapshotId: 'id1' })
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1', { snapshotId: 'id1' })
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })

    it('should proxy correctly the "removeOrphaned" method', () => {
      const stub = sinon.stub(ObjectDependency, 'removeOrphaned').returns(defer())
      expect(stub).not.to.have.been.called
      const result = Registry.ObjectDependency.removeOrphaned('name1')
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('name1')
      stub.restore()
      return expect(result).to.eventually.be.fulfilled
    })
  })
})
