'use strict'

const assert = require('assert')
const AdmZip = require('adm-zip')
const { XMLParser } = require('fast-xml-parser')
const xml2js = require('xml2js')

function rejectsEntityNameShadowing () {
  const xml = `<?xml version="1.0"?>
<!DOCTYPE root [<!ENTITY l. "INJECTED">]>
<root>&lt;safe&gt;</root>`
  const parsed = new XMLParser().parse(xml)

  assert.equal(parsed.root, '<safe>', 'custom entity names must not shadow built-in XML entities')
}

function preservesZipRoundTrip () {
  const archive = new AdmZip()
  archive.addFile('META-INF/package.xml', Buffer.from('<package name="sample"/>'))

  const reopened = new AdmZip(archive.toBuffer())
  assert.equal(reopened.readAsText('META-INF/package.xml'), '<package name="sample"/>')
}

async function preservesXml2jsParsing () {
  const parsed = await new xml2js.Parser({ explicitArray: false }).parseStringPromise('<package><name>sample</name></package>')

  assert.deepEqual(parsed, { package: { name: 'sample' } })
}

async function main () {
  rejectsEntityNameShadowing()
  preservesZipRoundTrip()
  await preservesXml2jsParsing()
  console.log('dependency security and compatibility checks passed')
}

main().catch(error => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
