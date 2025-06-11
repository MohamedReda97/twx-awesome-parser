const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/CoachView')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - Coach View', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'CoachView.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', 'cc785f21-0d04-42e2-8fd0-2a8a6d5356b9')
      expect(data).to.eql({
        register: false,
        versionId: 'cc785f21-0d04-42e2-8fd0-2a8a6d5356b9'
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
      expect(getByIdStub).to.have.been.calledWith('name', 'cc785f21-0d04-42e2-8fd0-2a8a6d5356b9')
      expect(data).to.eql({
        register: true,
        id: '64.393eb28a-759f-4d92-9bee-56f7dab3765f',
        name: 'Sem título2',
        type: TYPES.CoachView,
        dependencies: [{
          childReference: '64.af46ef40-d360-4e61-a58a-5dcd3b249894',
          dependencyType: 'coachView'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/61.83235fb9-e985-46fe-a554-8097537e4df0',
          dependencyType: 'previewImage'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/61.5402832f-cd2f-4953-be79-80e5421a9d88',
          dependencyType: 'paletteIcon'
        }, {
          childReference: '/12.60da4770-d3a3-4937-840f-8fd74f8c33ce',
          dependencyType: 'binding',
          dependencyName: 'Untitled'
        }, {
          childReference: '/12.7425eece-319f-484b-a59f-8efeaaec2582',
          dependencyType: 'config',
          dependencyName: 'Untitled1'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/61.61ce8eed-a609-4e20-b0d0-fecea416f1d6',
          dependencyType: 'asset'
        }, {
          childReference: '/50.2641e279-160b-4d0d-bc96-528b36793ecf',
          dependencyType: 'resource'
        }],
        versionId: 'cc785f21-0d04-42e2-8fd0-2a8a6d5356b9',
        description: null,
        isExposed: false
      })
    })
  })
})
