const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/UserAttribute')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - User Attribute', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'UserAttribute.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', '8c83b5e9-4b59-4fa6-b725-abbc6193f6af')
      expect(data).to.eql({
        register: false,
        versionId: '8c83b5e9-4b59-4fa6-b725-abbc6193f6af'
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
      expect(getByIdStub).to.have.been.calledWith('name', '8c83b5e9-4b59-4fa6-b725-abbc6193f6af')
      expect(data).to.eql({
        register: true,
        id: '51.beda80b4-2aab-4083-9c9e-b4f651def006',
        name: 'Atributo1',
        type: TYPES.UserAttribute,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'dataType'
        }],
        versionId: '8c83b5e9-4b59-4fa6-b725-abbc6193f6af',
        description: '',
        isExposed: false
      })
    })
  })
})
