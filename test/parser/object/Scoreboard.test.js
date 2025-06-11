const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/Scoreboard')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - Scoreboard', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'Scoreboard.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', '383f46cc-46e2-42cf-95e4-07a7bb137595')
      expect(data).to.eql({
        register: false,
        versionId: '383f46cc-46e2-42cf-95e4-07a7bb137595'
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
      expect(getByIdStub).to.have.been.calledWith('name', '383f46cc-46e2-42cf-95e4-07a7bb137595')
      expect(data).to.eql({
        register: true,
        id: '13.c6a2ed15-ce98-4ad7-b369-f4aec0d76f7b',
        name: 'Score',
        type: TYPES.Scoreboard,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/20.0e1432ca-ea6f-46e5-9003-df49972624ee',
          dependencyType: 'layout'
        }, {
          childReference: '/24.2a87eb22-940b-4664-be65-5806a5d01ac8',
          dependencyType: 'exposedTo'
        }, {
          childReference: '/11.b744896e-f2fd-4d54-90d4-3bb6658f4690',
          dependencyType: 'report'
        }],
        versionId: '383f46cc-46e2-42cf-95e4-07a7bb137595',
        description: null,
        isExposed: true
      })
    })
  })
})
