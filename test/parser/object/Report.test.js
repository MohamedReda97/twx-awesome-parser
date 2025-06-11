const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/Report')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - Report', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'Report.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', 'a7b0891f-97ef-4d9d-9f1b-25b5fbf61493')
      expect(data).to.eql({
        register: false,
        versionId: 'a7b0891f-97ef-4d9d-9f1b-25b5fbf61493'
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
      expect(getByIdStub).to.have.been.calledWith('name', 'a7b0891f-97ef-4d9d-9f1b-25b5fbf61493')
      expect(data).to.eql({
        register: true,
        id: '11.b744896e-f2fd-4d54-90d4-3bb6658f4690',
        name: 'Report',
        type: TYPES.Report,
        dependencies: [{
          childReference: '/24.a776709d-cf51-4353-9ca5-42a15c712b02',
          dependencyType: 'exposedTo'
        }, {
          childReference: '/14.8ce729e5-ab2b-42ce-b6f5-6f3c94798330',
          dependencyType: 'trackingGroup'
        }, {
          childReference: '/21.ed99f470-25b4-4a03-b89d-888bc265e2aa',
          dependencyType: 'epv'
        }, {
          childReference: '/50.2641e279-160b-4d0d-bc96-528b36793ecf',
          dependencyType: 'resource'
        }],
        versionId: 'a7b0891f-97ef-4d9d-9f1b-25b5fbf61493',
        description: null,
        isExposed: true
      })
    })
  })
})
