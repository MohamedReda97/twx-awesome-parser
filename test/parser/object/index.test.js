const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const ObjectParser = require('../../../src/parser/object')
const Registry = require('../../../src/classes/Registry')
const ADMZip = require('adm-zip')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object', () => {
  let zipFile, appSnapshotGetByIdStub, appSnapshotMarkProcessedStub, objectVersionGetByIdStub, objectVersionRegisterManyStub,
    objectDependencyRegisterManyStub, snapshotObjectDependencyWhereStub, snapshotObjectDependencyFindStub,
    snapshotDependencyGetByParentIdStub

  beforeEach(() => {
    appSnapshotGetByIdStub = sinon.stub(Registry.AppSnapshot, 'getById')
    appSnapshotMarkProcessedStub = sinon.stub(Registry.AppSnapshot, 'markObjectsProcessed')
    objectVersionGetByIdStub = sinon.stub(Registry.ObjectVersion, 'getById')
    objectVersionRegisterManyStub = sinon.stub(Registry.ObjectVersion, 'registerMany')
    objectDependencyRegisterManyStub = sinon.stub(Registry.ObjectDependency, 'registerMany')
    snapshotObjectDependencyWhereStub = sinon.stub(Registry.SnapshotObjectDependency, 'where')
    snapshotObjectDependencyFindStub = sinon.stub(Registry.SnapshotObjectDependency, 'find')
    snapshotDependencyGetByParentIdStub = sinon.stub(Registry.SnapshotDependency, 'getByParentId')
    zipFile = new ADMZip(fs.readFileSync(path.resolve(__dirname, '..', '..', 'files', 'TestSnapshot.twx')))
  })

  afterEach(() => {
    appSnapshotGetByIdStub.restore()
    appSnapshotMarkProcessedStub.restore()
    objectVersionGetByIdStub.restore()
    objectVersionRegisterManyStub.restore()
    objectDependencyRegisterManyStub.restore()
    snapshotObjectDependencyWhereStub.restore()
    snapshotObjectDependencyFindStub.restore()
    snapshotDependencyGetByParentIdStub.restore()
  })

  it('should create class objects correctly', () => {
    expect(ObjectParser).to.be.a('function')
    const parser = new ObjectParser('name')
    expect(parser).to.be.an('object')
    expect(parser).to.have.property('databaseName', 'name')
    expect(parser).to.respondTo('add')
  })

  it('should not add a file whose objects have already been processed', () => {
    appSnapshotGetByIdStub.returns(defer(true, {
      workspace: 'name1',
      snapshotId: 'id1',
      appId: 'appId1',
      branchId: 'branchId1',
      appShortName: 'appShortName1',
      snapshotName: 'snapshotName1',
      appName: 'appName1',
      branchName: 'branchName1',
      isToolkit: true,
      isObjectsProcessed: true
    }))
    const startStub = sinon.stub()
    const progressStub = sinon.stub()
    const endStub = sinon.stub()
    const parser = new ObjectParser('name')
    parser.on('start', startStub)
    parser.on('progress', progressStub)
    parser.on('end', endStub)

    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(startStub).not.to.have.been.called
    expect(progressStub).not.to.have.been.called
    expect(endStub).not.to.have.been.called

    const result = parser.add(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
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

  it('should add a twx file', () => {
    appSnapshotGetByIdStub.returns(defer(true, {
      workspace: 'name1',
      snapshotId: 'id1',
      appId: 'appId1',
      branchId: 'branchId1',
      appShortName: 'appShortName1',
      snapshotName: 'snapshotName1',
      appName: 'appName1',
      branchName: 'branchName1',
      isToolkit: true,
      isObjectsProcessed: false
    }))
    snapshotDependencyGetByParentIdStub.returns(defer(true, []))
    snapshotDependencyGetByParentIdStub.withArgs('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa').returns([{
      parentSnapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
      childSnapshotId: '2064.1080ded6-d153-4654-947c-2d16fce170ed',
      dependencyId: '2069.2c7ae840-cf8c-4998-839b-2cf42b6b7656'
    }, {
      parentSnapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
      childSnapshotId: '2064.5d120392-1f92-441f-89d6-1f6da7a6e7e3',
      dependencyId: '2069.5e29abb8-9e29-4b27-8fbf-2cc0a4575c6b'
    }, {
      parentSnapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
      childSnapshotId: '2064.739ededc-006c-41ef-ac0d-fba6cdecf8f6',
      dependencyId: '2069.8f88ef72-3ba6-473c-aee7-1ec57acbb1ac'
    }, {
      parentSnapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
      childSnapshotId: '2064.f0619268-2845-4d81-bac9-8a918c3172f7',
      dependencyId: '2069.af325104-4d5d-4315-88c6-6c1de40811b9'
    }, {
      parentSnapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
      childSnapshotId: '2064.c7680890-5385-3f24-bbc9-20da937ac8c4',
      dependencyId: '2069.bbd3ca55-be65-4129-b8b1-fea6ac0d5279'
    }])
    objectVersionGetByIdStub.returns(defer(true, null))
    appSnapshotMarkProcessedStub.returns(defer())
    snapshotObjectDependencyFindStub.returns(defer(true, null))
    snapshotObjectDependencyFindStub.withArgs('name', {
      snapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
      objectId: '1.350b261f-7e76-4fd5-abe4-25817b0090f3'
    }).returns(defer(true, {
      objectVersionId: '1c04d272-5a1d-4c65-8c34-f974aebaa8c9',
      objectId: '1.350b261f-7e76-4fd5-abe4-25817b0090f3',
      name: 'UCA Service',
      type: '1',
      subtype: '6'
    }))
    snapshotObjectDependencyFindStub.withArgs('name', {
      snapshotId: '2064.1080ded6-d153-4654-947c-2d16fce170ed',
      objectId: '12.db884a3c-c533-44b7-bb2d-47bec8ad4022'
    }).returns(defer(true, {
      objectVersionId: '0a22096d-1e34-4ab9-83c9-7936ce1d1601',
      objectId: '12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
      snapshotId: '2064.1080ded6-d153-4654-947c-2d16fce170ed'
    }))
    snapshotObjectDependencyWhereStub.returns(defer(true, []))
    snapshotObjectDependencyWhereStub.withArgs('name', {
      objectId: '64.af46ef40-d360-4e61-a58a-5dcd3b249894'
    }).returns(defer(true, [{
      objectVersionId: 'e860c76a-e058-4ce1-95f6-f20f4a182471',
      objectId: '64.af46ef40-d360-4e61-a58a-5dcd3b249894',
      snapshotId: '2064.1080ded6-d153-4654-947c-2d16fce170ed'
    }]))
    objectDependencyRegisterManyStub.returns(defer())
    objectVersionRegisterManyStub.returns(defer())
    const startStub = sinon.stub()
    const progressStub = sinon.stub()
    const endStub = sinon.stub()
    const parser = new ObjectParser('name')
    parser.on('start', startStub)
    parser.on('progress', progressStub)
    parser.on('end', endStub)

    expect(appSnapshotGetByIdStub).not.to.have.been.called
    expect(snapshotDependencyGetByParentIdStub).not.to.have.been.called
    expect(objectVersionGetByIdStub).not.to.have.been.called
    expect(appSnapshotMarkProcessedStub).not.to.have.been.called
    expect(snapshotObjectDependencyFindStub).not.to.have.been.called
    expect(snapshotObjectDependencyWhereStub).not.to.have.been.called
    expect(objectDependencyRegisterManyStub).not.to.have.been.called
    expect(objectVersionRegisterManyStub).not.to.have.been.called
    expect(startStub).not.to.have.been.called
    expect(progressStub).not.to.have.been.called
    expect(endStub).not.to.have.been.called

    const result = parser.add(zipFile, 'fileName')

    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(appSnapshotGetByIdStub).to.have.been.calledOnce
      expect(appSnapshotGetByIdStub).to.have.been.calledWith('name', '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa')
      expect(snapshotDependencyGetByParentIdStub).to.have.been.callCount(6)
      expect(objectVersionGetByIdStub).to.have.been.callCount(48)
      expect(appSnapshotMarkProcessedStub).to.have.been.calledOnce
      expect(snapshotObjectDependencyFindStub).to.have.been.callCount(49)
      expect(snapshotObjectDependencyWhereStub).to.have.been.callCount(9)
      expect(objectDependencyRegisterManyStub).to.have.been.calledOnce
      expect(objectVersionRegisterManyStub).to.have.been.calledOnce
      expect(startStub).to.have.been.calledOnce
      expect(startStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa',
        name: 'fileName',
        skipped: false,
        total: 48
      })
      expect(endStub).to.have.been.calledOnce
      expect(endStub).to.have.been.calledWith({
        id: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa'
      })
      expect(progressStub).not.to.have.been.callCount(49)

      // TODO: faltam aqui verificações sobre como é que os stubs foram chamados, para garantir que o parse esta a ser bem feito
    })
  })
})
