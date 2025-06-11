const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const chaiSubset = require('chai-subset')
const Workspace = require('../../src/classes/Workspace')
const Registry = require('../../src/classes/Registry')
const Parser = require('../../src/parser')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(chaiSubset)
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
  isToolkit: true,
  isSystem: true,
  isObjectsProcessed: false
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
  isToolkit: false,
  isSystem: false,
  isObjectsProcessed: true
}

const SNAPSHOT3 = {
  snapshotId: 'snapshot3',
  appId: 'appId3',
  branchId: 'branchId3',
  appShortName: 'appShortName3',
  snapshotName: 'snapshotName3',
  appName: 'appName3',
  branchName: 'branchName3',
  description: 'description3',
  buildVersion: 'buildVersion3',
  isToolkit: true,
  isSystem: false,
  isObjectsProcessed: false
}

const SNAPSHOT4 = {
  snapshotId: 'snapshot4',
  appId: 'appId4',
  branchId: 'branchId4',
  appShortName: 'appShortName4',
  snapshotName: 'snapshotName4',
  appName: 'appName4',
  branchName: 'branchName4',
  description: 'description4',
  buildVersion: 'buildVersion4',
  isToolkit: true,
  isSystem: false,
  isObjectsProcessed: false
}

const SNAPSHOT5 = {
  snapshotId: 'snapshot5',
  appId: 'appId5',
  branchId: 'branchId5',
  appShortName: 'appShortName5',
  snapshotName: 'snapshotName5',
  appName: 'appName5',
  branchName: 'branchName5',
  description: 'description5',
  buildVersion: 'buildVersion5',
  isToolkit: true,
  isSystem: true,
  isObjectsProcessed: false
}

const SNAPSHOT_DEPENDENCY = (i, j) => {
  return {
    parentSnapshotId: `snapshot${i}`,
    childSnapshotId: `snapshot${j}`,
    rank: 1,
    dependencyId: `dependency${i}_${j}`
  }
}

const OBJECT1 = {
  objectVersionId: 'version1',
  objectId: 'objectId1',
  name: 'name1',
  description: 'description1',
  type: 'type1',
  subtype: 'subtype1',
  isExposed: true
}

const OBJECT2 = {
  objectVersionId: 'version2',
  objectId: 'objectId2',
  name: 'name2',
  description: 'description2',
  type: 'type2',
  subtype: 'subtype2',
  isExposed: false
}

const OBJECT3 = {
  objectVersionId: 'version3',
  objectId: 'objectId3',
  name: 'name3',
  description: 'description3',
  type: 'type3',
  subtype: 'subtype3',
  isExposed: true
}

const OBJECT_DEPENDENCY = (i, j) => {
  return {
    parentObjectVersionId: `version${i}`,
    childObjectVersionId: `version${j}`,
    dependencyType: `type${i}${j}`,
    dependencyName: `name${i}${j}`
  }
}

const SNAPSHOT_OBJECT_DEPENDENCY = (i, j) => {
  return {
    snapshotId: `snapshot${i}`,
    objectVersionId: `version${j}`,
    objectId: `objectId${j}`
  }
}

describe('Classes - Workspace', () => {
  let workspace, parser

  beforeEach(() => {
    workspace = new Workspace('name1')
    parser = workspace.parser
  })
  it('should be a class', () => {
    expect(Workspace).to.be.a('function')
  })

  it('should create objects correctly', () => {
    expect(workspace).to.have.property('name', 'name1')
    expect(workspace).to.have.property('parser')
    expect(workspace.parser).to.be.an.instanceOf(Parser)
    expect(workspace).to.respondTo('addFile')
    expect(workspace).to.respondTo('removeFile')
    expect(workspace).to.respondTo('getSnapshots')
    expect(workspace).to.respondTo('getSnapshotDependencies')
    expect(workspace).to.respondTo('getSnapshotWhereUsed')
    expect(workspace).to.respondTo('getSnapshotObjects')
    expect(workspace).to.respondTo('getObjects')
    expect(workspace).to.respondTo('getObjectDependencies')
    expect(workspace).to.respondTo('getObjectWhereUsed')
    expect(workspace).to.respondTo('getObjectSnapshots')
  })

  it('should emit events received from the parser', () => {
    const events = ['packageStart', 'packageProgress', 'packageEnd', 'objectStart', 'objectProgress', 'objectEnd']
    events.map(event => {
      const stub = sinon.stub()
      workspace.on(event, stub)
      expect(stub).not.to.have.been.called
      parser.emit(event, 'data')
      expect(stub).to.have.been.calledWith('data')
      workspace.off(event, stub)
    })
  })

  it('should make all the correct calls in the "addFile" method', () => {
    const stub = sinon.stub(parser, 'addFile').returns(defer())
    expect(stub).not.to.have.been.called
    const result = workspace.addFile('file')
    expect(stub).to.have.been.calledWith('file')
    return expect(result).to.eventually.be.fulfilled
  })

  it('should make all the correct calls in the "removeFile" method', () => {
    const stub = sinon.stub(parser, 'removeFile').returns(defer())
    expect(stub).not.to.have.been.called
    const result = workspace.removeFile('file')
    expect(stub).to.have.been.calledWith('file')
    return expect(result).to.eventually.be.fulfilled
  })

  it('should make all the correct calls in the "getSnapshots" method', () => {
    const stubEmpty = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = workspace.getSnapshots({ appName: 'appName1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT1, SNAPSHOT2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = workspace.getSnapshots({ appName: 'appName1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubResults.restore()

    const stubReject = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = workspace.getSnapshots({ appName: 'appName1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { appName: 'appName1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        expect(data).to.eql([SNAPSHOT1, SNAPSHOT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should return an array of snapshots when the "getSnapshotDependencies" method is invoked with a single snapshot', () => {
    const stubDependencies = sinon.stub(Registry.SnapshotDependency, 'getByParentId').returns(defer(true, [SNAPSHOT_DEPENDENCY(1, 2), SNAPSHOT_DEPENDENCY(1, 3)]))
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT2, SNAPSHOT3]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubSnapshots).not.to.have.been.called

    const result = workspace.getSnapshotDependencies({ snapshotId: 'snapshot1' })
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', 'snapshot1')
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', { snapshotId: ['snapshot2', 'snapshot3'] })
      stubSnapshots.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([SNAPSHOT2, SNAPSHOT3])
    })
  })

  it('should return an array of arrays of snapshots when the "getSnapshotDependencies" method is invoked with an array of snapshots', () => {
    const stubDependencies = sinon.stub(Registry.SnapshotDependency, 'getByParentId')
      .returns(defer(true, [SNAPSHOT_DEPENDENCY(1, 2), SNAPSHOT_DEPENDENCY(1, 3), SNAPSHOT_DEPENDENCY(1, 4), SNAPSHOT_DEPENDENCY(3, 2)]))
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT2, SNAPSHOT3, SNAPSHOT4]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubSnapshots).not.to.have.been.called

    const result = workspace.getSnapshotDependencies([{ snapshotId: 'snapshot1' }, { snapshotId: 'snapshot3' }])
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot1', 'snapshot3'])
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', { snapshotId: ['snapshot2', 'snapshot3', 'snapshot4', 'snapshot2'] })
      stubSnapshots.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([
        [SNAPSHOT2, SNAPSHOT3, SNAPSHOT4],
        [SNAPSHOT2]
      ])
    })
  })

  it('should return an array of snapshots when the "getSnapshotWhereUsed" method is invoked with a single snapshot', () => {
    const stubDependencies = sinon.stub(Registry.SnapshotDependency, 'getByChildId').returns(defer(true, [SNAPSHOT_DEPENDENCY(1, 2), SNAPSHOT_DEPENDENCY(3, 2)]))
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT1, SNAPSHOT3]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubSnapshots).not.to.have.been.called

    const result = workspace.getSnapshotWhereUsed({ snapshotId: 'snapshot2' })
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', 'snapshot2')
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', { snapshotId: ['snapshot1', 'snapshot3'] })
      stubSnapshots.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([SNAPSHOT1, SNAPSHOT3])
    })
  })

  it('should return an array of arrays of snapshots when the "getSnapshotWhereUsed" method is invoked with an array of snapshots', () => {
    const stubDependencies = sinon.stub(Registry.SnapshotDependency, 'getByChildId').returns(defer(true, [SNAPSHOT_DEPENDENCY(1, 2), SNAPSHOT_DEPENDENCY(1, 3), SNAPSHOT_DEPENDENCY(3, 2)]))
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT1, SNAPSHOT3]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubSnapshots).not.to.have.been.called

    const result = workspace.getSnapshotWhereUsed([{ snapshotId: 'snapshot2' }, { snapshotId: 'snapshot3' }])
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot2', 'snapshot3'])
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', { snapshotId: ['snapshot1', 'snapshot1', 'snapshot3'] })
      stubSnapshots.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([
        [SNAPSHOT1, SNAPSHOT3],
        [SNAPSHOT1]
      ])
    })
  })

  it('should return an array of objects when the "getSnapshotObjects" method is invoked with a single snapshot', () => {
    const stubDependencies = sinon.stub(Registry.SnapshotObjectDependency, 'getByParentId').returns(defer(true, [SNAPSHOT_OBJECT_DEPENDENCY(1, 1), SNAPSHOT_OBJECT_DEPENDENCY(1, 2)]))
    const stubObjects = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT1, OBJECT2]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubObjects).not.to.have.been.called

    const result = workspace.getSnapshotObjects({ snapshotId: 'snapshot1' })
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', 'snapshot1')
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubObjects).to.have.been.calledOnce
      expect(stubObjects).to.have.been.calledWith('name1', { objectVersionId: ['version1', 'version2'] })
      stubObjects.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([OBJECT1, OBJECT2])
    })
  })

  it('should return an array of arrays of objects when the "getSnapshotObjects" method is invoked with an array of snapshots', () => {
    const stubDependencies = sinon.stub(Registry.SnapshotObjectDependency, 'getByParentId')
      .returns(defer(true, [SNAPSHOT_OBJECT_DEPENDENCY(1, 1), SNAPSHOT_OBJECT_DEPENDENCY(1, 2), SNAPSHOT_OBJECT_DEPENDENCY(2, 2)]))
    const stubObjects = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT1, OBJECT2]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubObjects).not.to.have.been.called

    const result = workspace.getSnapshotObjects([{ snapshotId: 'snapshot1' }, { snapshotId: 'snapshot2' }])
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot1', 'snapshot2'])
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubObjects).to.have.been.calledOnce
      expect(stubObjects).to.have.been.calledWith('name1', { objectVersionId: ['version1', 'version2', 'version2'] })
      stubObjects.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([
        [OBJECT1, OBJECT2],
        [OBJECT2]
      ])
    })
  })

  it('should make all the correct calls in the "getObjects" method', () => {
    const stubEmpty = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, []))
    expect(stubEmpty).not.to.have.been.called
    const resultEmpty = workspace.getObjects({ objectId: 'objectId1' })
    expect(stubEmpty).to.have.been.calledOnce
    expect(stubEmpty).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubEmpty.restore()

    const stubResults = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT1, OBJECT2]))
    expect(stubResults).not.to.have.been.called
    const resultResults = workspace.getObjects({ objectId: 'objectId1' })
    expect(stubResults).to.have.been.calledOnce
    expect(stubResults).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubResults.restore()

    const stubReject = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(false))
    expect(stubReject).not.to.have.been.called
    const resultReject = workspace.getObjects({ objectId: 'objectId1' })
    expect(stubReject).to.have.been.calledOnce
    expect(stubReject).to.have.been.calledWith('name1', { objectId: 'objectId1' })
    stubReject.restore()

    return Promise.all([
      expect(resultEmpty).to.eventually.become([]),
      expect(resultResults).to.eventually.be.fulfilled.then(data => {
        expect(data.length).to.equal(2)
        expect(data).to.eql([OBJECT1, OBJECT2])
      }),
      expect(resultReject).to.eventually.be.rejected
    ])
  })

  it('should return an array of objects when the "getObjectDependencies" method is invoked with a single object version', () => {
    const stubDependencies = sinon.stub(Registry.ObjectDependency, 'getByParentId').returns(defer(true, [OBJECT_DEPENDENCY(1, 2), OBJECT_DEPENDENCY(1, 3)]))
    const stubObjects = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT2, OBJECT3]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubObjects).not.to.have.been.called

    const result = workspace.getObjectDependencies({ objectVersionId: 'version1' })
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', 'version1')
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubObjects).to.have.been.calledOnce
      expect(stubObjects).to.have.been.calledWith('name1', { objectVersionId: ['version2', 'version3'] })
      stubObjects.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([OBJECT2, OBJECT3])
    })
  })

  it('should return an array of arrays of objects when the "getObjectDependencies" method is invoked with an array of object versions', () => {
    const stubDependencies = sinon.stub(Registry.ObjectDependency, 'getByParentId').returns(defer(true, [OBJECT_DEPENDENCY(1, 2), OBJECT_DEPENDENCY(1, 3), OBJECT_DEPENDENCY(3, 2)]))
    const stubObjects = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT2, OBJECT3]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubObjects).not.to.have.been.called

    const result = workspace.getObjectDependencies([{ objectVersionId: 'version1' }, { objectVersionId: 'version3' }])
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', ['version1', 'version3'])
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubObjects).to.have.been.calledOnce
      expect(stubObjects).to.have.been.calledWith('name1', { objectVersionId: ['version2', 'version3', 'version2'] })
      stubObjects.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([
        [OBJECT2, OBJECT3],
        [OBJECT2]
      ])
    })
  })

  it('should filter results when the "getObjectDependencies" method is invoked with snapshot context', () => {
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT1]))
    const stubSnapshotObjectsDependencies = sinon.stub(Registry.SnapshotObjectDependency, 'getByParentId')
      .returns(defer(true, [SNAPSHOT_OBJECT_DEPENDENCY(1, 2), SNAPSHOT_OBJECT_DEPENDENCY(2, 3)]))
    const stubObjectDependencies = sinon.stub(Registry.ObjectDependency, 'getByParentId').returns(defer(true, [OBJECT_DEPENDENCY(1, 2), OBJECT_DEPENDENCY(1, 3)]))
    const stubObjects = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT2, OBJECT3]))
    expect(stubSnapshots).not.to.have.been.called
    expect(stubSnapshotObjectsDependencies).not.to.have.been.called
    expect(stubObjectDependencies).not.to.have.been.called
    expect(stubObjects).not.to.have.been.called

    const result = workspace.getObjectDependencies({ objectVersionId: 'version1' }, { snapshotId: 'snapshot1' })
    expect(stubObjectDependencies).to.have.been.calledOnce
    expect(stubObjectDependencies).to.have.been.calledWith('name1', 'version1')
    stubObjectDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', { snapshotId: 'snapshot1' })
      expect(stubSnapshotObjectsDependencies).to.have.been.calledOnce
      expect(stubSnapshotObjectsDependencies).to.have.been.calledWith('name1', ['snapshot1'])
      expect(stubObjects).to.have.been.calledTwice
      expect(stubObjects).to.have.been.calledWith('name1', { objectVersionId: ['version2', 'version3'] })
      stubObjects.restore()
      stubSnapshots.restore()
      stubSnapshotObjectsDependencies.restore()
      expect(data.length).to.equal(1)
      expect(data).to.eql([OBJECT2])
    })
  })

  it('should return an array of objects when the "getObjectWhereUsed" method is invoked with a single object version', () => {
    const stubDependencies = sinon.stub(Registry.ObjectDependency, 'getByChildId').returns(defer(true, [OBJECT_DEPENDENCY(1, 2), OBJECT_DEPENDENCY(3, 2)]))
    const stubObjects = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT1, OBJECT3]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubObjects).not.to.have.been.called

    const result = workspace.getObjectWhereUsed({ objectVersionId: 'version2' })
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', 'version2')
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubObjects).to.have.been.calledOnce
      expect(stubObjects).to.have.been.calledWith('name1', { objectVersionId: ['version1', 'version3'] })
      stubObjects.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([OBJECT1, OBJECT3])
    })
  })

  it('should return an array of arrays of objects when the "getObjectWhereUsed" method is invoked with an array of object versions', () => {
    const stubDependencies = sinon.stub(Registry.ObjectDependency, 'getByChildId').returns(defer(true, [OBJECT_DEPENDENCY(1, 2), OBJECT_DEPENDENCY(3, 2), OBJECT_DEPENDENCY(1, 3)]))
    const stubObjects = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT1, OBJECT3]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubObjects).not.to.have.been.called

    const result = workspace.getObjectWhereUsed([{ objectVersionId: 'version2' }, { objectVersionId: 'version3' }])
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', ['version2', 'version3'])
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubObjects).to.have.been.calledOnce
      expect(stubObjects).to.have.been.calledWith('name1', { objectVersionId: ['version1', 'version3', 'version1'] })
      stubObjects.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([
        [OBJECT1, OBJECT3],
        [OBJECT1]
      ])
    })
  })

  it('should filter results when the "getObjectWhereUsed" method is invoked with snapshot context', () => {
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT1]))
    const stubSnapshotObjectsDependencies = sinon.stub(Registry.SnapshotObjectDependency, 'getByParentId')
      .returns(defer(true, [SNAPSHOT_OBJECT_DEPENDENCY(1, 1), SNAPSHOT_OBJECT_DEPENDENCY(2, 3)]))
    const stubObjectDependencies = sinon.stub(Registry.ObjectDependency, 'getByChildId').returns(defer(true, [OBJECT_DEPENDENCY(1, 2), OBJECT_DEPENDENCY(3, 2)]))
    const stubObjects = sinon.stub(Registry.ObjectVersion, 'where').returns(defer(true, [OBJECT1, OBJECT3]))
    expect(stubSnapshots).not.to.have.been.called
    expect(stubSnapshotObjectsDependencies).not.to.have.been.called
    expect(stubObjectDependencies).not.to.have.been.called
    expect(stubObjects).not.to.have.been.called

    const result = workspace.getObjectWhereUsed({ objectVersionId: 'version2' }, { snapshotId: 'snapshot1' })
    expect(stubObjectDependencies).to.have.been.calledOnce
    expect(stubObjectDependencies).to.have.been.calledWith('name1', 'version2')
    stubObjectDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', { snapshotId: 'snapshot1' })
      expect(stubSnapshotObjectsDependencies).to.have.been.calledOnce
      expect(stubSnapshotObjectsDependencies).to.have.been.calledWith('name1', ['snapshot1'])
      expect(stubObjects).to.have.been.calledTwice
      expect(stubObjects).to.have.been.calledWith('name1', { objectVersionId: ['version1', 'version3'] })
      stubObjects.restore()
      stubSnapshots.restore()
      stubSnapshotObjectsDependencies.restore()
      expect(data.length).to.equal(1)
      expect(data).to.eql([OBJECT1])
    })
  })

  it('should return an array of snapshots when the "getObjectSnapshots" method is invoked with a single object version', () => {
    const stubDependencies = sinon.stub(Registry.SnapshotObjectDependency, 'getByChildId').returns(defer(true, [SNAPSHOT_OBJECT_DEPENDENCY(1, 1), SNAPSHOT_OBJECT_DEPENDENCY(2, 1)]))
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT1, SNAPSHOT2]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubSnapshots).not.to.have.been.called

    const result = workspace.getObjectSnapshots({ objectVersionId: 'version1' })
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', 'version1')
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', { snapshotId: ['snapshot1', 'snapshot2'] })
      stubSnapshots.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([SNAPSHOT1, SNAPSHOT2])
    })
  })

  it('should return an array of arrays of snapshots when the "getObjectSnapshots" method is invoked with an array of object versions', () => {
    const stubDependencies = sinon.stub(Registry.SnapshotObjectDependency, 'getByChildId')
      .returns(defer(true, [SNAPSHOT_OBJECT_DEPENDENCY(1, 1), SNAPSHOT_OBJECT_DEPENDENCY(2, 1), SNAPSHOT_OBJECT_DEPENDENCY(2, 3)]))
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT1, SNAPSHOT2]))
    expect(stubDependencies).not.to.have.been.called
    expect(stubSnapshots).not.to.have.been.called

    const result = workspace.getObjectSnapshots([{ objectVersionId: 'version1' }, { objectVersionId: 'version3' }])
    expect(stubDependencies).to.have.been.calledOnce
    expect(stubDependencies).to.have.been.calledWith('name1', ['version1', 'version3'])
    stubDependencies.restore()

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', { snapshotId: ['snapshot1', 'snapshot2', 'snapshot2'] })
      stubSnapshots.restore()
      expect(data.length).to.equal(2)
      expect(data).to.eql([
        [SNAPSHOT1, SNAPSHOT2],
        [SNAPSHOT2]
      ])
    })
  })

  it('should return leaf nodes when the "getLeafNodes" method is invoked', () => {
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'getWithoutChildren').returns(defer(true, [SNAPSHOT1]))
    const stubDependencies = sinon.stub(Registry.SnapshotDependency, 'getByChildId').returns(defer(true, [SNAPSHOT_DEPENDENCY(2, 1), SNAPSHOT_DEPENDENCY(3, 1)]))
    const stubParents = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT2, SNAPSHOT3]))
    expect(stubSnapshots).not.to.have.been.called
    expect(stubDependencies).not.to.have.been.called
    expect(stubParents).not.to.have.been.called

    const result = workspace.getLeafNodes()
    expect(result).to.be.an.instanceOf(Promise)

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', [])
      expect(stubDependencies).to.have.been.calledOnce
      expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot1'])
      expect(stubParents).to.have.been.calledOnce
      expect(stubParents).to.have.been.calledWith('name1', {
        snapshotId: ['snapshot2', 'snapshot3']
      })
      expect(data).to.containSubset({
        level: 1,
        items: [{
          snapshot: SNAPSHOT1,
          parents: [SNAPSHOT2, SNAPSHOT3]
        }]
      })
      expect(data).to.respondTo('getNextLevel')

      stubSnapshots.restore()
      stubDependencies.restore()
      stubParents.restore()
    })
  })

  it('should return leaf nodes next level when the "getLeafNodes" method is invoked and next level is requested', () => {
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'getWithoutChildren')
      .onFirstCall().returns(defer(true, [SNAPSHOT1]))
      .onSecondCall().returns(defer(true, [SNAPSHOT2, SNAPSHOT3]))
    const stubDependencies = sinon.stub(Registry.SnapshotDependency, 'getByChildId')
      .onFirstCall().returns(defer(true, [SNAPSHOT_DEPENDENCY(2, 1), SNAPSHOT_DEPENDENCY(3, 1)]))
      .onSecondCall().returns(defer(true, [SNAPSHOT_DEPENDENCY(4, 2), SNAPSHOT_DEPENDENCY(5, 3)]))
    const stubParents = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT2, SNAPSHOT3]))
      .onSecondCall().returns(defer(true, [SNAPSHOT4, SNAPSHOT5]))
    expect(stubSnapshots).not.to.have.been.called
    expect(stubDependencies).not.to.have.been.called
    expect(stubParents).not.to.have.been.called

    const result1 = workspace.getLeafNodes()
    expect(result1).to.be.an.instanceOf(Promise)

    return expect(result1).to.eventually.be.fulfilled.then(data1 => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', [])
      expect(stubDependencies).to.have.been.calledOnce
      expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot1'])
      expect(stubParents).to.have.been.calledOnce
      expect(stubParents).to.have.been.calledWith('name1', {
        snapshotId: ['snapshot2', 'snapshot3']
      })
      expect(data1).to.containSubset({
        level: 1,
        items: [{
          snapshot: SNAPSHOT1,
          parents: [SNAPSHOT2, SNAPSHOT3]
        }]
      })
      expect(data1).to.respondTo('getNextLevel')

      const result2 = data1.getNextLevel()
      expect(result2).to.be.an.instanceOf(Promise)

      return expect(result2).to.eventually.be.fulfilled.then(data2 => {
        expect(stubSnapshots).to.have.been.calledTwice
        expect(stubSnapshots).to.have.been.calledWith('name1', ['snapshot1'])
        expect(stubDependencies).to.have.been.calledTwice
        expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot2', 'snapshot3'])
        expect(stubParents).to.have.been.calledTwice
        expect(stubParents).to.have.been.calledWith('name1', {
          snapshotId: ['snapshot4', 'snapshot5']
        })

        expect(data2).to.containSubset({
          level: 2,
          items: [{
            snapshot: SNAPSHOT2,
            parents: [SNAPSHOT4]
          }, {
            snapshot: SNAPSHOT3,
            parents: [SNAPSHOT5]
          }]
        })
        expect(data2).to.respondTo('getNextLevel')

        stubSnapshots.restore()
        stubDependencies.restore()
        stubParents.restore()
      })
    })
  })

  it('should return top level nodes when the "getTopLevelNodes" method is invoked', () => {
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'getWithoutParents').returns(defer(true, [SNAPSHOT1]))
    const stubDependencies = sinon.stub(Registry.SnapshotDependency, 'getByParentId').returns(defer(true, [SNAPSHOT_DEPENDENCY(1, 2), SNAPSHOT_DEPENDENCY(1, 3)]))
    const stubChildren = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT2, SNAPSHOT3]))
    expect(stubSnapshots).not.to.have.been.called
    expect(stubDependencies).not.to.have.been.called
    expect(stubChildren).not.to.have.been.called

    const result = workspace.getTopLevelNodes()
    expect(result).to.be.an.instanceOf(Promise)

    return expect(result).to.eventually.be.fulfilled.then(data => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', [])
      expect(stubDependencies).to.have.been.calledOnce
      expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot1'])
      expect(stubChildren).to.have.been.calledOnce
      expect(stubChildren).to.have.been.calledWith('name1', {
        snapshotId: ['snapshot2', 'snapshot3']
      })
      expect(data).to.containSubset({
        level: 1,
        items: [{
          snapshot: SNAPSHOT1,
          children: [SNAPSHOT2, SNAPSHOT3]
        }]
      })
      expect(data).to.respondTo('getNextLevel')

      stubSnapshots.restore()
      stubDependencies.restore()
      stubChildren.restore()
    })
  })

  it('should return tep level nodes next level when the "getTopLevelNodes" method is invoked and next level is requested', () => {
    const stubSnapshots = sinon.stub(Registry.AppSnapshot, 'getWithoutParents')
      .onFirstCall().returns(defer(true, [SNAPSHOT1]))
      .onSecondCall().returns(defer(true, [SNAPSHOT2, SNAPSHOT3]))
    const stubDependencies = sinon.stub(Registry.SnapshotDependency, 'getByParentId')
      .onFirstCall().returns(defer(true, [SNAPSHOT_DEPENDENCY(1, 2), SNAPSHOT_DEPENDENCY(1, 3)]))
      .onSecondCall().returns(defer(true, [SNAPSHOT_DEPENDENCY(2, 4), SNAPSHOT_DEPENDENCY(3, 5)]))
    const stubChildren = sinon.stub(Registry.AppSnapshot, 'where').returns(defer(true, [SNAPSHOT2, SNAPSHOT3]))
      .onSecondCall().returns(defer(true, [SNAPSHOT4, SNAPSHOT5]))
    expect(stubSnapshots).not.to.have.been.called
    expect(stubDependencies).not.to.have.been.called
    expect(stubChildren).not.to.have.been.called

    const result1 = workspace.getTopLevelNodes()
    expect(result1).to.be.an.instanceOf(Promise)

    return expect(result1).to.eventually.be.fulfilled.then(data1 => {
      expect(stubSnapshots).to.have.been.calledOnce
      expect(stubSnapshots).to.have.been.calledWith('name1', [])
      expect(stubDependencies).to.have.been.calledOnce
      expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot1'])
      expect(stubChildren).to.have.been.calledOnce
      expect(stubChildren).to.have.been.calledWith('name1', {
        snapshotId: ['snapshot2', 'snapshot3']
      })
      expect(data1).to.containSubset({
        level: 1,
        items: [{
          snapshot: SNAPSHOT1,
          children: [SNAPSHOT2, SNAPSHOT3]
        }]
      })
      expect(data1).to.respondTo('getNextLevel')

      const result2 = data1.getNextLevel()
      expect(result2).to.be.an.instanceOf(Promise)

      return expect(result2).to.eventually.be.fulfilled.then(data2 => {
        expect(stubSnapshots).to.have.been.calledTwice
        expect(stubSnapshots).to.have.been.calledWith('name1', ['snapshot1'])
        expect(stubDependencies).to.have.been.calledTwice
        expect(stubDependencies).to.have.been.calledWith('name1', ['snapshot2', 'snapshot3'])
        expect(stubChildren).to.have.been.calledTwice
        expect(stubChildren).to.have.been.calledWith('name1', {
          snapshotId: ['snapshot4', 'snapshot5']
        })

        expect(data2).to.containSubset({
          level: 2,
          items: [{
            snapshot: SNAPSHOT2,
            children: [SNAPSHOT4]
          }, {
            snapshot: SNAPSHOT3,
            children: [SNAPSHOT5]
          }]
        })
        expect(data2).to.respondTo('getNextLevel')

        stubSnapshots.restore()
        stubDependencies.restore()
        stubChildren.restore()
      })
    })
  })
})
