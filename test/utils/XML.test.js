const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const xpathLibrary = require('xml2js-xpath')
const XML = require('../../src/utils/XML')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Utils - XML', () => {
  it('should have the correct methods', () => {
    expect(XML).to.be.an('object')
    expect(XML).to.respondTo('parseXML')
    expect(XML).to.respondTo('isNullXML')
    expect(XML).to.respondTo('xpath')
  })

  it('should identify "null" nodes with the "isNullXML" method', () => {
    expect(XML.isNullXML(null)).to.be.true
    expect(XML.isNullXML({ $: { isNull: 'true' } })).to.be.true
    expect(XML.isNullXML({ a: 'a' })).to.be.false
  })

  it('should parse a XML string correctly', () => {
    return expect(XML.parseXML('<tag attr="valueAttr">value</tag>')).to.be.eventually.fulfilled.then(result => {
      expect(result).to.eql({
        tag: {
          _: 'value',
          $: {
            attr: 'valueAttr'
          }
        }
      })
    })
  })

  it('should call the "xml2js-xpath" find method correctly in the "xpath" method', () => {
    const stub = sinon.stub(xpathLibrary, 'find')
    expect(stub).not.to.have.been.called
    XML.xpath({
      tag: 'a'
    }, '/query')
    expect(stub).to.have.been.calledOnce
    expect(stub).to.have.been.calledWith({
      tag: 'a'
    }, '/query')
    stub.restore()
  })
})
