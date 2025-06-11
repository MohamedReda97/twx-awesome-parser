const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/UCA')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - UCA', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'UCA.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', '489feab5-9618-4da1-b827-23d616dab054')
      expect(data).to.eql({
        register: false,
        versionId: '489feab5-9618-4da1-b827-23d616dab054'
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
      expect(getByIdStub).to.have.been.calledWith('name', '489feab5-9618-4da1-b827-23d616dab054')
      expect(data).to.eql({
        register: true,
        id: '4.f32f2065-49b8-4e77-8c58-90d96ffce088',
        name: 'UCA1',
        type: TYPES.UCA,
        dependencies: [{
          childReference: '/1.350b261f-7e76-4fd5-abe4-25817b0090f3',
          dependencyType: 'attachedService'
        }],
        versionId: '489feab5-9618-4da1-b827-23d616dab054',
        description: null,
        isExposed: false
      })
    })
  })
})
