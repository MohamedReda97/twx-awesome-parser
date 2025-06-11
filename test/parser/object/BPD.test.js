const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/BPD')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES, SUBTYPES: { BPD: BPD_TYPES } } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - BPD', () => {
  let getByIdStub, jsonData1, jsonData2
  before(async () => {
    const filePath1 = path.resolve(__dirname, '..', '..', 'files', 'BPD1.xml')
    jsonData1 = await ParseUtils.parseXML(fs.readFileSync(filePath1, 'utf8'), 'filename')
    const filePath2 = path.resolve(__dirname, '..', '..', 'files', 'BPD2.xml')
    jsonData2 = await ParseUtils.parseXML(fs.readFileSync(filePath2, 'utf8'), 'filename')
  })
  beforeEach(() => {
    getByIdStub = sinon.stub(Registry.ObjectVersion, 'getById')
  })
  afterEach(() => {
    getByIdStub.restore()
  })

  it('should be a function', () => {
    expect(parseObject).to.be.a('function')
  })

  it('should ignore object versions that already exist', () => {
    getByIdStub.returns(defer(true, {
      workspace: 'name1',
      objectVersionId: 'versionId1',
      objectId: 'objectId1',
      name: 'versionName1',
      description: 'description1',
      type: 'type1',
      subtype: 'subtype1',
      isExposed: true
    }))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonData1)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', 'a8be0ae5-1b04-4588-9019-2ed2411737b5')
      expect(data).to.eql({
        register: false,
        versionId: 'a8be0ae5-1b04-4588-9019-2ed2411737b5'
      })
    })
  })

  it('should process objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result1 = parseObject('name', jsonData1)
    const result2 = parseObject('name', jsonData2)
    expect(result1).to.be.an.instanceOf(Promise)
    expect(result2).to.be.an.instanceOf(Promise)
    return Promise.all([
      expect(result1).to.be.eventually.fulfilled,
      expect(result2).to.be.eventually.fulfilled
    ]).then(([data1, data2]) => {
      expect(getByIdStub).to.have.been.calledTwice
      expect(getByIdStub).to.have.been.calledWith('name', 'a8be0ae5-1b04-4588-9019-2ed2411737b5')
      expect(getByIdStub).to.have.been.calledWith('name', 'f50ca6d3-ee1f-4ada-8ca1-b3e19aadb2fb')
      expect(data1).to.eql({
        register: true,
        id: '25.0dcc9130-7c0a-4fe9-9055-9e6688d6be01',
        name: 'Process2',
        description: null,
        type: TYPES.BPD,
        dependencies: [{
          childReference: '/24.a776709d-cf51-4353-9ca5-42a15c712b02',
          dependencyType: 'exposedTo'
        }, {
          childReference: '/24.2a87eb22-940b-4664-be65-5806a5d01ac8',
          dependencyType: 'dataExposedTo'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'performanceExposedTo'
        }, {
          childReference: '/24.a776709d-cf51-4353-9ca5-42a15c712b02',
          dependencyType: 'owner'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'binding',
          dependencyName: 'Untitled1'
        }, {
          childReference: '/12.7425eece-319f-484b-a59f-8efeaaec2582',
          dependencyType: 'binding',
          dependencyName: 'Untitled2'
        }, {
          childReference: '/49.84290403-04af-4258-a028-700286b03e06',
          dependencyType: 'metric'
        }, {
          childReference: '/12.60da4770-d3a3-4937-840f-8fd74f8c33ce',
          dependencyType: 'variable',
          dependencyName: 'Untitled3'
        }, {
          childReference: '/21.ed99f470-25b4-4a03-b89d-888bc265e2aa',
          dependencyType: 'epv'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.6fd38d02-81cf-48ab-bd42-8ff4c0a1628b',
          dependencyType: 'participant'
        }, {
          childReference: '/24.a776709d-cf51-4353-9ca5-42a15c712b02',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.581a472b-5016-479a-b5b5-0a9701c2c42c',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.6fd38d02-81cf-48ab-bd42-8ff4c0a1628b',
          dependencyType: 'participant'
        }, {
          childReference: '/24.2a87eb22-940b-4664-be65-5806a5d01ac8',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.6fd38d02-81cf-48ab-bd42-8ff4c0a1628b',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.6fd38d02-81cf-48ab-bd42-8ff4c0a1628b',
          dependencyType: 'participant'
        }, {
          childReference: '/4.f32f2065-49b8-4e77-8c58-90d96ffce088',
          dependencyType: 'uca'
        }, {
          childReference: '/4.f32f2065-49b8-4e77-8c58-90d96ffce088',
          dependencyType: 'uca'
        }, {
          childReference: '/1.143ff27f-5e08-478c-af65-06723fa26d26',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.0295217c-7383-4a27-b311-333ea889f2bb',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.22a9a945-649d-4bc1-9ac0-75f837f4d494',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.0295217c-7383-4a27-b311-333ea889f2bb',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.22a9a945-649d-4bc1-9ac0-75f837f4d494',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/1.93e1b747-f286-401a-8a24-be2eaf96c231',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/25.9358aeb8-22e5-49a5-91ec-e308642efab7',
          dependencyType: 'attachedProcess'
        }],
        versionId: 'a8be0ae5-1b04-4588-9019-2ed2411737b5',
        subType: BPD_TYPES.BPD,
        isExposed: true
      })
      expect(data2).to.eql({
        register: true,
        id: '25.05eef081-e788-4d4c-8465-1fcea678278c',
        name: 'Sem título',
        description: '',
        type: TYPES.BPD,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.6fd38d02-81cf-48ab-bd42-8ff4c0a1628b',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'participant'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.6fd38d02-81cf-48ab-bd42-8ff4c0a1628b',
          dependencyType: 'participant'
        }, {
          childReference: '/1.58e2b9fc-0846-494a-b2c4-8c0421da19b8',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.82b84887-27a8-4ed1-a944-29be95a9b7e5',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.f24c65ec-bf84-4145-86bf-c3d6aac64167',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.61a0bf71-b88b-4fc3-b79b-f023825ed63e',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.bdd3fc6b-5583-46c6-9ddf-91408b409b0f',
          dependencyType: 'attachedActivity'
        }, {
          childReference: '/1.7f6199ee-84e0-4fd4-aed2-6df579139f8f',
          dependencyType: 'attachedActivity'
        }],
        versionId: 'f50ca6d3-ee1f-4ada-8ca1-b3e19aadb2fb',
        subType: BPD_TYPES.Process,
        isExposed: false
      })
    })
  })
})
