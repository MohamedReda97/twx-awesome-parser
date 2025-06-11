const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/EnvironmentVariable')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - Environment Variable', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'EnvironmentVariable.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', 'fb479b21-911b-4d36-9d19-942bfd213f21')
      expect(data).to.eql({
        register: false,
        versionId: 'fb479b21-911b-4d36-9d19-942bfd213f21'
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
      expect(getByIdStub).to.have.been.calledWith('name', 'fb479b21-911b-4d36-9d19-942bfd213f21')
      expect(data).to.eql({
        register: true,
        id: '62.0b946272-4f9c-4cc2-b200-8c7dcd84cced',
        name: 'Environment Variables',
        type: TYPES.EnvironmentVariable,
        dependencies: [],
        versionId: 'fb479b21-911b-4d36-9d19-942bfd213f21',
        description: null,
        isExposed: true
      })
    })
  })
})
