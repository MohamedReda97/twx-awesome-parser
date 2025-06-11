const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/WebService')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - WebService', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'WebService.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', 'e96bfdc9-c491-4826-ab89-fd1b05425cad')
      expect(data).to.eql({
        register: false,
        versionId: 'e96bfdc9-c491-4826-ab89-fd1b05425cad'
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
      expect(getByIdStub).to.have.been.calledWith('name', 'e96bfdc9-c491-4826-ab89-fd1b05425cad')
      expect(data).to.eql({
        register: true,
        id: '7.152c331d-06cf-4333-9e3f-3d3988774954',
        name: 'Web',
        type: TYPES.WebService,
        dependencies: [{
          childReference: '/1.143ff27f-5e08-478c-af65-06723fa26d26',
          dependencyName: 'one',
          dependencyType: 'attachedService'
        }, {
          childReference: '/1.0295217c-7383-4a27-b311-333ea889f2bb',
          dependencyName: 'two',
          dependencyType: 'attachedService'
        }],
        versionId: 'e96bfdc9-c491-4826-ab89-fd1b05425cad',
        description: null,
        isExposed: true
      })
    })
  })
})
