const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/EventSubscription')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - Event Subscription', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'EventSubscription.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', 'de7fddea-d1af-4efa-8a96-a7118032d440')
      expect(data).to.eql({
        register: false,
        versionId: 'de7fddea-d1af-4efa-8a96-a7118032d440'
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
      expect(getByIdStub).to.have.been.calledWith('name', 'de7fddea-d1af-4efa-8a96-a7118032d440')
      expect(data).to.eql({
        register: true,
        id: '71.be51c18b-fbcd-4a02-a662-ac3b51507644',
        name: 'Event1',
        type: TYPES.EventSubscription,
        dependencies: [{
          childReference: '/1.0295217c-7383-4a27-b311-333ea889f2bb',
          dependencyType: 'attachedService'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/24.da7e4d23-78cb-4483-98ed-b9c238308a03',
          dependencyType: 'exposedTo'
        }],
        versionId: 'de7fddea-d1af-4efa-8a96-a7118032d440',
        description: null,
        isExposed: true
      })
    })
  })
})
