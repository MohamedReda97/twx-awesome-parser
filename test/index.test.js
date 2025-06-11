const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const twxParser = require('../src')
const db = require('../src/db')
const { defer } = require('./test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Index', () => {
  it('should have the correct methods', () => {
    expect(twxParser).to.be.an('object')
    expect(twxParser).to.respondTo('getWorkspace')
  })

  it('should create a workspace', () => {
    const stub = sinon.stub(db, 'initialize').returns(defer())
    expect(stub).not.to.have.been.called
    const result = twxParser.getWorkspace('user', 'password')
    return expect(result).to.be.eventually.fulfilled.then((workspace) => {
      expect(stub).to.have.been.calledOnce
      expect(stub).to.have.been.calledWith('user.db', 'password')
      expect(workspace).to.be.an('object')
      expect(workspace).to.have.property('name', 'user.db')
    })
  })
})
