const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/Theme')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - Theme', () => {
  let getByIdStub, jsonData
  before(async () => {
    const filePath = path.resolve(__dirname, '..', '..', 'files', 'Theme.xml')
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
      expect(getByIdStub).to.have.been.calledWith('name', 'fefea6bb-a80f-47ff-ba26-04ce0c5d878c')
      expect(data).to.eql({
        register: false,
        versionId: 'fefea6bb-a80f-47ff-ba26-04ce0c5d878c'
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
      expect(getByIdStub).to.have.been.calledWith('name', 'fefea6bb-a80f-47ff-ba26-04ce0c5d878c')
      expect(data).to.eql({
        register: true,
        id: '72.e77f2a7e-10b4-45ee-90eb-e5b1546cc743',
        name: 'BPM Theme',
        type: TYPES.Theme,
        dependencies: [],
        versionId: 'fefea6bb-a80f-47ff-ba26-04ce0c5d878c',
        description: '<div><i>Replace this documentation text and describe your theme.</i></div><div><br/></div><div>In a theme, you define the variables that coach views use in their dynamic stylesheets. When a coach view is used in a coach of a human service, the runtime CSS file for the coach view is created from combining the variable values with the dynamic stylesheets.</div>',
        isExposed: false
      })
    })
  })
})
