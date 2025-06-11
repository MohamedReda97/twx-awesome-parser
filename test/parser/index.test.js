const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const Parser = require('../../src/parser')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Index', () => {
  it('should create class objects correctly', () => {
    expect(Parser).to.be.a('function')
    const parser = new Parser('name')
    expect(parser).to.be.an('object')
    expect(parser).to.have.property('packageParser')
    expect(parser).to.have.property('objectParser')
    expect(parser).to.respondTo('addFile')
    expect(parser).to.respondTo('removeFile')
  })

  it('should emit events correctly', () => {
    const parser = new Parser('name')
    const stubPackageStart = sinon.stub()
    const stubPackageProgress = sinon.stub()
    const stubPackageEnd = sinon.stub()
    const stubObjectStart = sinon.stub()
    const stubObjectProgress = sinon.stub()
    const stubObjectEnd = sinon.stub()
    parser.on('packageStart', stubPackageStart)
    parser.on('packageProgress', stubPackageProgress)
    parser.on('packageEnd', stubPackageEnd)
    parser.on('objectStart', stubObjectStart)
    parser.on('objectProgress', stubObjectProgress)
    parser.on('objectEnd', stubObjectEnd)
    expect(stubPackageStart).not.to.have.been.called
    expect(stubPackageProgress).not.to.have.been.called
    expect(stubPackageEnd).not.to.have.been.called
    expect(stubObjectStart).not.to.have.been.called
    expect(stubObjectProgress).not.to.have.been.called
    expect(stubObjectEnd).not.to.have.been.called
    parser.packageParser.emit('start', 'data1')
    expect(stubPackageStart).to.have.been.calledOnce
    expect(stubPackageStart).to.have.been.calledWith('data1')
    parser.packageParser.emit('progress', 'data2')
    expect(stubPackageProgress).to.have.been.calledOnce
    expect(stubPackageProgress).to.have.been.calledWith('data2')
    parser.packageParser.emit('end', 'data3')
    expect(stubPackageEnd).to.have.been.calledOnce
    expect(stubPackageEnd).to.have.been.calledWith('data3')
    parser.objectParser.emit('start', 'data4')
    expect(stubObjectStart).to.have.been.calledOnce
    expect(stubObjectStart).to.have.been.calledWith('data4')
    parser.objectParser.emit('progress', 'data5')
    expect(stubObjectProgress).to.have.been.calledOnce
    expect(stubObjectProgress).to.have.been.calledWith('data5')
    parser.objectParser.emit('end', 'data6')
    expect(stubObjectEnd).to.have.been.calledOnce
    expect(stubObjectEnd).to.have.been.calledWith('data6')
  })

  it('should add files', () => {
    const parser = new Parser('name')
    const addPackageStub = sinon.stub(parser.packageParser, 'add').returns(defer())
    const addObjectsStub = sinon.stub(parser.objectParser, 'add').returns(defer())
    const filePath = path.resolve(__dirname, '..', 'files', 'TestSnapshot.twx')
    expect(addPackageStub).not.to.have.been.called
    expect(addObjectsStub).not.to.have.been.called
    const result = parser.addFile(filePath)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(addPackageStub).to.have.been.callCount(7)
      expect(addObjectsStub).to.have.been.callCount(7)
    })
  })

  it('should remove files', () => {
    const parser = new Parser('name')
    const removePackageStub = sinon.stub(parser.packageParser, 'remove').returns(defer())
    const filePath = path.resolve(__dirname, '..', 'files', 'TestSnapshot.twx')
    expect(removePackageStub).not.to.have.been.called
    const result = parser.removeFile(filePath)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(() => {
      expect(removePackageStub).to.have.been.calledOnce
    })
  })
})
