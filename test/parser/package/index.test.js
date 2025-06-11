const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const PackageParser = require('../../../src/parser/package')
const Registry = require('../../../src/classes/Registry')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

const SNAPSHOT1 = {
  workspace: 'name1',
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
  workspace: 'name1',
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
  workspace: 'name1',
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

describe('Parser - Package', () => {
  let zipFile, zipFileMock, appSnapshotGetByIdStub, appSnapshotRemoveStub, appSnapshotRegisterStub, appSnapshotGetAllStub,
    appSnapshotRemoveOrphanedStub, objectVersionRemoveOrphanedStub, snapshotDependencyRegisterManyStub, snapshotDependencyRemoveStub,
    snapshotDependencyGetByChildIdStub, snapshotDependencyRemoveOrphanedStub, objectDependencyRemoveOrphanedStub,
    snapshotObjectDependencyRegisterManyStub, snapshotObjectDependencyRemoveStub, snapshotObjectDependencyRemoveOrphanedStub

  beforeEach(() => {
    appSnapshotGetByIdStub = sinon.stub(Registry.AppSnapshot, 'getById')
    appSnapshotRemoveStub = sinon.stub(Registry.AppSnapshot, 'remove')
    appSnapshotRegisterStub = sinon.stub(Registry.AppSnapshot, 'register')
    appSnapshotGetAllStub = sinon.stub(Registry.AppSnapshot, 'getAll')
    appSnapshotRemoveOrphanedStub = sinon.stub(Registry.AppSnapshot, 'removeOrphaned')
    objectVersionRemoveOrphanedStub = sinon.stub(Registry.ObjectVersion, 'removeOrphaned')
    snapshotDependencyRegisterManyStub = sinon.stub(Registry.SnapshotDependency, 'registerMany')
    snapshotDependencyRemoveStub = sinon.stub(Registry.SnapshotDependency, 'remove')
    snapshotDependencyGetByChildIdStub = sinon.stub(Registry.SnapshotDependency, 'getByChildId')
    snapshotDependencyRemoveOrphanedStub = sinon.stub(Registry.SnapshotDependency, 'removeOrphaned')
    objectDependencyRemoveOrphanedStub = sinon.stub(Registry.ObjectDependency, 'removeOrphaned')
    snapshotObjectDependencyRegisterManyStub = sinon.stub(Registry.SnapshotObjectDependency, 'registerMany')
    snapshotObjectDependencyRemoveStub = sinon.stub(Registry.SnapshotObjectDependency, 'remove')
    snapshotObjectDependencyRemoveOrphanedStub = sinon.stub(Registry.SnapshotObjectDependency, 'removeOrphaned')
    zipFileMock = sinon.stub()
    zipFile = {
      getEntry: () => {
        return {
          getData: () => {
            return {
              toString: zipFileMock
            }
          }
        }
      }
    }
  })
  afterEach(() => {
    appSnapshotGetByIdStub.restore()
    appSnapshotRemoveStub.restore()
    appSnapshotRegisterStub.restore()
    appSnapshotGetAllStub.restore()
    appSnapshotRemoveOrphanedStub.restore()
    objectVersionRemoveOrphanedStub.restore()
    snapshotDependencyRegisterManyStub.restore()
    snapshotDependencyRemoveStub.restore()
    snapshotDependencyGetByChildIdStub.restore()
    snapshotDependencyRemoveOrphanedStub.restore()
    objectDependencyRemoveOrphanedStub.restore()
    snapshotObjectDependencyRegisterManyStub.restore()
    snapshotObjectDependencyRemoveStub.restore()
    snapshotObjectDependencyRemoveOrphanedStub.restore()
  })

  it('should create class objects correctly', () => {
    expect(PackageParser).to.be.a('function')
    const parser = new PackageParser('name')
    expect(parser).to.be.an('object')
    expect(parser).to.have.property('databaseName', 'name')
    expect(parser).to.respondTo('add')
    expect(parser).to.respondTo('remove')
  })

  it('should not add a file if is has been processed before', () => {
    const xmlData = fs.readFileSync(path.resolve(__dirname, '..', '..', 'files', 'package_app.xml'))
    zipFileMock.returns(xmlData)
    appSnapshotGetByIdStub.returns(defer(true, SNAPSHOT1))
    const startStub = sinon.stub()
    const progressStub = sinon.stub()
    const endStub = sinon.stub()
    const parser = new PackageParser('name')
    parser.on('start', startStub)
    parser.on('progress', progressStub)
    parser.on('end', endStub)

    expect(zipFileMock).not.to.have.been.called
    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(startStub).not.to.have.been.called
    expect(progressStub).not.to.have.been.called
    expect(endStub).not.to.have.been.called

    const result = parser.add(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(zipFileMock).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledWith('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa')
      expect(startStub).to.have.been.calledOnce
      expect(startStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
        name: 'fileName',
        skipped: true,
        total: 0 // 53
      })
      expect(endStub).to.have.been.calledOnce
      expect(endStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa'
      })
      expect(progressStub).not.to.have.been.called
    })
  })

  it('should add an application file with dependencies and objects', () => {
    const xmlData = fs.readFileSync(path.resolve(__dirname, '..', '..', 'files', 'package_app.xml'))
    zipFileMock.returns(xmlData)
    appSnapshotGetByIdStub.returns(defer(true, null))
    appSnapshotRegisterStub.returns(defer())
    snapshotDependencyRegisterManyStub.returns(defer())
    snapshotObjectDependencyRegisterManyStub.returns(defer())
    const startStub = sinon.stub()
    const progressStub = sinon.stub()
    const endStub = sinon.stub()
    const parser = new PackageParser('name')
    parser.on('start', startStub)
    parser.on('progress', progressStub)
    parser.on('end', endStub)

    expect(zipFileMock).not.to.have.been.called
    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(appSnapshotRegisterStub).not.to.have.been.called
    expect(snapshotDependencyRegisterManyStub).not.to.have.been.called
    expect(snapshotObjectDependencyRegisterManyStub).not.to.have.been.called
    expect(startStub).not.to.have.been.called
    expect(progressStub).not.to.have.been.called
    expect(endStub).not.to.have.been.called

    const result = parser.add(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(zipFileMock).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledWith('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa')
      expect(startStub).to.have.been.calledOnce
      expect(startStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
        name: 'fileName',
        skipped: false,
        total: 53
      })
      expect(endStub).to.have.been.calledOnce
      expect(endStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa'
      })
      expect(progressStub).to.have.been.calledTwice
    })
  })

  it('should add an application file without dependencies and objects', () => {
    const xmlData = fs.readFileSync(path.resolve(__dirname, '..', '..', 'files', 'package_empty.xml'))
    zipFileMock.returns(xmlData)
    appSnapshotGetByIdStub.returns(defer(true, null))
    appSnapshotRegisterStub.returns(defer())
    snapshotDependencyRegisterManyStub.returns(defer())
    snapshotObjectDependencyRegisterManyStub.returns(defer())
    const startStub = sinon.stub()
    const progressStub = sinon.stub()
    const endStub = sinon.stub()
    const parser = new PackageParser('name')
    parser.on('start', startStub)
    parser.on('progress', progressStub)
    parser.on('end', endStub)

    expect(zipFileMock).not.to.have.been.called
    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(appSnapshotRegisterStub).not.to.have.been.called
    expect(snapshotDependencyRegisterManyStub).not.to.have.been.called
    expect(snapshotObjectDependencyRegisterManyStub).not.to.have.been.called
    expect(startStub).not.to.have.been.called
    expect(progressStub).not.to.have.been.called
    expect(endStub).not.to.have.been.called

    const result = parser.add(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(zipFileMock).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledWith('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa')
      expect(startStub).to.have.been.calledOnce
      expect(startStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
        name: 'fileName',
        skipped: false,
        total: 0
      })
      expect(endStub).to.have.been.calledOnce
      expect(endStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa'
      })
      expect(progressStub).not.to.have.been.called
    })
  })

  it('should not remove an application that does not exists', () => {
    const xmlData = fs.readFileSync(path.resolve(__dirname, '..', '..', 'files', 'package_app.xml'))
    zipFileMock.returns(xmlData)
    appSnapshotGetByIdStub.returns(defer(true, null))
    snapshotDependencyGetByChildIdStub.returns(defer(true, []))
    const startStub = sinon.stub()
    const progressStub = sinon.stub()
    const endStub = sinon.stub()
    const parser = new PackageParser('name')
    parser.on('start', startStub)
    parser.on('progress', progressStub)
    parser.on('end', endStub)

    expect(zipFileMock).not.to.have.been.called
    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(snapshotDependencyGetByChildIdStub).not.to.have.been.called
    expect(appSnapshotRemoveStub).not.to.have.been.called
    expect(startStub).not.to.have.been.called
    expect(progressStub).not.to.have.been.called
    expect(endStub).not.to.have.been.called

    const result = parser.remove(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(zipFileMock).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledWith('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa')
      expect(snapshotDependencyGetByChildIdStub).not.to.have.been.called
      expect(appSnapshotRemoveStub).not.to.have.been.called
      expect(startStub).to.have.been.calledOnce
      expect(startStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
        name: 'fileName',
        skipped: true,
        total: 0
      })
      expect(endStub).to.have.been.calledOnce
      expect(endStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa'
      })
      expect(progressStub).not.to.have.been.called
    })
  })

  it('should not remove an application that other applications depend on', () => {
    const xmlData = fs.readFileSync(path.resolve(__dirname, '..', '..', 'files', 'package_app.xml'))
    zipFileMock.returns(xmlData)
    appSnapshotGetByIdStub.returns(defer(true, SNAPSHOT1))
    snapshotDependencyGetByChildIdStub.returns(defer(true, [{
      parentSnapshotId: 'snapshot2',
      childSnapshotId: 'snapshot1',
      rank: 1,
      dependencyId: 'dependency1'
    }]))
    const startStub = sinon.stub()
    const progressStub = sinon.stub()
    const endStub = sinon.stub()
    const parser = new PackageParser('name')
    parser.on('start', startStub)
    parser.on('progress', progressStub)
    parser.on('end', endStub)

    expect(zipFileMock).not.to.have.been.called
    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(appSnapshotRemoveStub).not.to.have.been.called
    expect(snapshotDependencyGetByChildIdStub).not.to.have.been.called
    expect(startStub).not.to.have.been.called
    expect(progressStub).not.to.have.been.called
    expect(endStub).not.to.have.been.called

    const result = parser.remove(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(zipFileMock).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledWith('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa')
      expect(snapshotDependencyGetByChildIdStub).to.have.been.calledOnce
      expect(snapshotDependencyGetByChildIdStub).to.have.been.calledWith('name', 'snapshot1')
      expect(appSnapshotRemoveStub).not.to.have.been.called
      expect(startStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
        name: 'fileName',
        skipped: true,
        total: 0
      })
      expect(endStub).to.have.been.calledOnce
      expect(endStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa'
      })
      expect(progressStub).not.to.have.been.called
    })
  })

  it('should remove an application that exists', () => {
    const xmlData = fs.readFileSync(path.resolve(__dirname, '..', '..', 'files', 'package_app.xml'))
    zipFileMock.returns(xmlData)
    appSnapshotGetByIdStub.returns(defer(true, SNAPSHOT1))
    snapshotDependencyGetByChildIdStub.returns(defer(true, []))
    appSnapshotRemoveStub.returns(defer())
    snapshotDependencyRemoveStub.returns(defer())
    snapshotObjectDependencyRemoveStub.returns(defer())
    appSnapshotRemoveOrphanedStub.returns(defer())
    objectVersionRemoveOrphanedStub.returns(defer())
    snapshotDependencyRemoveOrphanedStub.returns(defer())
    snapshotObjectDependencyRemoveOrphanedStub.returns(defer())
    objectDependencyRemoveOrphanedStub.returns(defer())
    appSnapshotGetAllStub.returns(defer(true, [SNAPSHOT2]))
    const startStub = sinon.stub()
    const progressStub = sinon.stub()
    const endStub = sinon.stub()
    const parser = new PackageParser('name')
    parser.on('start', startStub)
    parser.on('progress', progressStub)
    parser.on('end', endStub)

    expect(zipFileMock).not.to.have.been.called
    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(snapshotDependencyGetByChildIdStub).not.to.have.been.called
    expect(appSnapshotRemoveStub).not.to.have.been.called
    expect(snapshotDependencyRemoveStub).not.to.have.been.called
    expect(snapshotObjectDependencyRemoveStub).not.to.have.been.called
    expect(appSnapshotRemoveOrphanedStub).not.to.have.been.called
    expect(objectVersionRemoveOrphanedStub).not.to.have.been.called
    expect(snapshotDependencyRemoveOrphanedStub).not.to.have.been.called
    expect(snapshotObjectDependencyRemoveOrphanedStub).not.to.have.been.called
    expect(objectDependencyRemoveOrphanedStub).not.to.have.been.called
    expect(appSnapshotGetAllStub).not.to.have.been.called
    expect(startStub).not.to.have.been.called
    expect(progressStub).not.to.have.been.called
    expect(endStub).not.to.have.been.called

    const result = parser.remove(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(zipFileMock).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledWith('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa')
      expect(snapshotDependencyGetByChildIdStub).to.have.been.calledOnce
      expect(snapshotDependencyGetByChildIdStub).to.have.been.calledWith('name', 'snapshot1')
      expect(appSnapshotRemoveStub).to.have.been.calledOnce
      expect(appSnapshotRemoveStub).to.have.been.calledWith('name', { snapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa' })
      expect(snapshotDependencyRemoveStub).to.have.been.calledOnce
      expect(snapshotDependencyRemoveStub).to.have.been.calledWith('name', { parentSnapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa' })
      expect(snapshotObjectDependencyRemoveStub).to.have.been.calledOnce
      expect(snapshotObjectDependencyRemoveStub).to.have.been.calledWith('name', { snapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa' })
      expect(appSnapshotGetAllStub).to.have.been.calledTwice
      expect(appSnapshotGetAllStub).to.have.been.calledWith('name')

      expect(appSnapshotRemoveOrphanedStub).to.have.been.calledOnce
      expect(appSnapshotRemoveOrphanedStub).to.have.been.calledWith('name')
      expect(objectVersionRemoveOrphanedStub).to.have.been.calledOnce
      expect(objectVersionRemoveOrphanedStub).to.have.been.calledWith('name')
      expect(snapshotDependencyRemoveOrphanedStub).to.have.been.calledOnce
      expect(snapshotDependencyRemoveOrphanedStub).to.have.been.calledWith('name')
      expect(snapshotObjectDependencyRemoveOrphanedStub).to.have.been.calledOnce
      expect(snapshotObjectDependencyRemoveOrphanedStub).to.have.been.calledWith('name')
      expect(objectDependencyRemoveOrphanedStub).to.have.been.calledOnce
      expect(objectDependencyRemoveOrphanedStub).to.have.been.calledWith('name')

      expect(startStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
        name: 'fileName',
        skipped: false,
        total: 0
      })
      expect(endStub).to.have.been.calledOnce
      expect(endStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa'
      })
      expect(progressStub).not.to.have.been.called
    })
  })

  it('should remove orphaned items recursively until no more changes happen', () => {
    const xmlData = fs.readFileSync(path.resolve(__dirname, '..', '..', 'files', 'package_app.xml'))
    zipFileMock.returns(xmlData)
    appSnapshotGetByIdStub.returns(defer(true, SNAPSHOT1))
    snapshotDependencyGetByChildIdStub.returns(defer(true, []))
    appSnapshotRemoveStub.returns(defer())
    snapshotDependencyRemoveStub.returns(defer())
    snapshotObjectDependencyRemoveStub.returns(defer())
    appSnapshotRemoveOrphanedStub.returns(defer())
    objectVersionRemoveOrphanedStub.returns(defer())
    snapshotDependencyRemoveOrphanedStub.returns(defer())
    snapshotObjectDependencyRemoveOrphanedStub.returns(defer())
    objectDependencyRemoveOrphanedStub.returns(defer())
    appSnapshotGetAllStub.onFirstCall().returns(defer(true, [SNAPSHOT2, SNAPSHOT3]))
    appSnapshotGetAllStub.onSecondCall().returns(defer(true, [SNAPSHOT2]))
    appSnapshotGetAllStub.onThirdCall().returns(defer(true, []))
    appSnapshotGetAllStub.onCall(3).returns(defer(true, []))
    const parser = new PackageParser('name')

    expect(zipFileMock).not.to.have.been.called
    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(snapshotDependencyGetByChildIdStub).not.to.have.been.called
    expect(appSnapshotRemoveStub).not.to.have.been.called
    expect(snapshotDependencyRemoveStub).not.to.have.been.called
    expect(snapshotObjectDependencyRemoveStub).not.to.have.been.called
    expect(appSnapshotRemoveOrphanedStub).not.to.have.been.called
    expect(objectVersionRemoveOrphanedStub).not.to.have.been.called
    expect(snapshotDependencyRemoveOrphanedStub).not.to.have.been.called
    expect(snapshotObjectDependencyRemoveOrphanedStub).not.to.have.been.called
    expect(objectDependencyRemoveOrphanedStub).not.to.have.been.called
    expect(appSnapshotGetAllStub).not.to.have.been.called

    const result = parser.remove(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(zipFileMock).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledWith('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa')
      expect(snapshotDependencyGetByChildIdStub).to.have.been.calledOnce
      expect(snapshotDependencyGetByChildIdStub).to.have.been.calledWith('name', 'snapshot1')
      expect(appSnapshotRemoveStub).to.have.been.calledOnce
      expect(appSnapshotRemoveStub).to.have.been.calledWith('name', { snapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa' })
      expect(snapshotDependencyRemoveStub).to.have.been.calledOnce
      expect(snapshotDependencyRemoveStub).to.have.been.calledWith('name', { parentSnapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa' })
      expect(snapshotObjectDependencyRemoveStub).to.have.been.calledOnce
      expect(snapshotObjectDependencyRemoveStub).to.have.been.calledWith('name', { snapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa' })
      expect(appSnapshotGetAllStub).to.have.been.callCount(4)
      expect(appSnapshotGetAllStub).to.have.been.calledWith('name')

      expect(appSnapshotRemoveOrphanedStub).to.have.been.calledThrice
      expect(appSnapshotRemoveOrphanedStub).to.have.been.calledWith('name')
      expect(objectVersionRemoveOrphanedStub).to.have.been.calledThrice
      expect(objectVersionRemoveOrphanedStub).to.have.been.calledWith('name')
      expect(snapshotDependencyRemoveOrphanedStub).to.have.been.calledThrice
      expect(snapshotDependencyRemoveOrphanedStub).to.have.been.calledWith('name')
      expect(snapshotObjectDependencyRemoveOrphanedStub).to.have.been.calledThrice
      expect(snapshotObjectDependencyRemoveOrphanedStub).to.have.been.calledWith('name')
      expect(objectDependencyRemoveOrphanedStub).to.have.been.calledThrice
      expect(objectDependencyRemoveOrphanedStub).to.have.been.calledWith('name')
    })
  })
})
