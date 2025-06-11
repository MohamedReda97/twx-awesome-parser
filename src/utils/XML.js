const xml2js = require('xml2js')
const xpathLibrary = require('xml2js-xpath')
const xmlProcessors = require('xml2js/lib/processors')
const Performance = require('./Performance')

const xml2jsParser = new xml2js.Parser({
  tagNameProcessors: [xmlProcessors.stripPrefix]
})

const isNullXML = Performance.makeMeasurable(xmlNode => {
  return !!(xmlNode === undefined || xmlNode === null || (xmlNode.$ && xmlNode.$.isNull === 'true'))
}, 'isNullXML')

const parseXML = Performance.makeMeasurable((data) => {
  return xml2jsParser.parseStringPromise(data)
}, 'parseXML')

const xpath = Performance.makeMeasurable((doc, query) => {
  return xpathLibrary.find(doc, query)
}, 'xpath')

module.exports = {
  parseXML,
  isNullXML,
  xpath
}
