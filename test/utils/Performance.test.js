
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
let Performance = require('../../src/utils/Performance')
const { defer } = require('../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Utils - Performance', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('../../src/utils/Performance')]
    process.env.TWXPARSE_PERFORMANCE_ENABLED = '1'
    Performance = require('../../src/utils/Performance')
  })

  afterEach(() => {
    delete require.cache[require.resolve('../../src/utils/Performance')]
  })

  it('should have the correct methods', () => {
    expect(Performance).to.be.an('object')
    expect(Performance).to.respondTo('makeMeasurable')
    expect(Performance).to.respondTo('getMeasures')
    expect(Performance).to.respondTo('getAverage')
    expect(Performance).to.respondTo('listAll')
  })

  it('should not do anything when the TWXPARSE_PERFORMANCE_ENABLED is not enabled', () => {
    delete require.cache[require.resolve('../../src/utils/Performance')]
    process.env.TWXPARSE_PERFORMANCE_ENABLED = '0'
    Performance = require('../../src/utils/Performance')
    const method = sinon.stub().returns('test output')
    const newMethod = Performance.makeMeasurable(method, 'method')
    expect(newMethod).to.equal(method)
    const result = newMethod()
    expect(result).to.eql('test output')
    expect(Performance.getMeasures('method')).to.eql(undefined)
    expect(Performance.getAverage('method')).to.equal(0)
  })

  it('should record data for given methods', () => {
    const method1 = sinon.stub().returns('output 1')
    const method2 = sinon.stub().returns(defer(true, 'output 2', 20))
    const newMethod1 = Performance.makeMeasurable(method1, 'method1')
    const newMethod2 = Performance.makeMeasurable(method2, 'method2')
    expect(newMethod1).not.to.equal(method1)
    expect(newMethod2).not.to.equal(method2)
    const result1 = newMethod1()
    const result2 = newMethod2()
    expect(result1).to.equal('output 1')
    expect(result2).to.be.an.instanceOf(Promise)
    return expect(result2).to.be.eventually.fulfilled.then((result) => {
      expect(result).to.equal('output 2')
      expect(Performance.getMeasures('method1')).to.have.length(1)
      expect(Performance.getMeasures('method2')).to.have.length(1)
      expect(Performance.getMeasures('method3')).to.equal(undefined)
      expect(Performance.getAverage('method2')).to.be.greaterThan(15)
    })
  })

  it('should list all entries', () => {
    const stub = sinon.stub(console, 'log')
    const method1 = sinon.stub().returns('output 1')
    const method2 = sinon.stub().returns(defer(true, 'output 2', 20))
    const method3 = sinon.stub().returns('output 3')
    const newMethod1 = Performance.makeMeasurable(method1, 'method1')
    const newMethod2 = Performance.makeMeasurable(method2, 'method2')
    const newMethod3 = Performance.makeMeasurable(method3, 'method3')
    const newMethod4 = Performance.makeMeasurable(method1, 'method1')
    const result1 = newMethod1()
    const result2 = newMethod2()
    const result3 = newMethod3()
    const result4 = newMethod4()
    expect(result1).to.equal('output 1')
    expect(result3).to.equal('output 3')
    expect(result4).to.equal('output 1')
    return expect(result2).to.be.eventually.fulfilled.then(result => {
      expect(result).to.equal('output 2')
      expect(stub).not.to.have.been.called
      Performance.listAll()
      expect(stub).to.have.been.calledThrice
      stub.restore()
    })
  })
})
