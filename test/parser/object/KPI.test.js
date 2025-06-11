const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/KPI')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - KPI', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'KPI.xml')
    jsonData = await ParseUtils.parseXML(fs.readFileSync(filePath, 'utf8'), 'filename')
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
    const result = parseObject('name', jsonData)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '00358551-6701-4f1f-bdcf-afde9191a189')
      expect(data).to.eql({
        register: false,
        versionId: '00358551-6701-4f1f-bdcf-afde9191a189'
      })
    })
  })

  it('should process objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonData)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '00358551-6701-4f1f-bdcf-afde9191a189')
      expect(data).to.eql({
        register: true,
        id: '49.84290403-04af-4258-a028-700286b03e06',
        name: 'KPI',
        type: TYPES.KPI,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/49.d5da2c80-b2af-40a6-981d-9de4df12ed12',
          dependencyType: 'rollupMetric'
        }],
        versionId: '00358551-6701-4f1f-bdcf-afde9191a189',
        description: null,
        isExposed: false
      })
    })
  })
})
