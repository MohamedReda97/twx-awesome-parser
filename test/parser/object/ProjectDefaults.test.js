const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/ProjectDefaults')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - Project Defaults', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'ProjectDefaults.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', 'a7220b2e-08ab-47d7-90e8-5b71df1edba4')
      expect(data).to.eql({
        register: false,
        versionId: 'a7220b2e-08ab-47d7-90e8-5b71df1edba4'
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
      expect(getByIdStub).to.have.been.calledWith('name', 'a7220b2e-08ab-47d7-90e8-5b71df1edba4')
      expect(data).to.eql({
        register: true,
        id: '63.550c2db6-dafa-490d-98b5-81a9097f1593',
        name: 'Toolkit Settings',
        type: TYPES.ProjectDefaults,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/61.140920b1-a53c-4d72-b6bb-60776f49f7f2',
          dependencyType: 'xsl'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/61.aabe9f91-df4b-43db-857c-41dbed4820a3',
          dependencyType: 'css'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/72.e77f2a7e-10b4-45ee-90eb-e5b1546cc743',
          dependencyType: 'theme'
        }],
        versionId: 'a7220b2e-08ab-47d7-90e8-5b71df1edba4',
        description: null,
        isExposed: false
      })
    })
  })
})
