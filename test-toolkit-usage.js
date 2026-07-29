const assert = require('assert')
const ToolkitDependencyMapper = require('./src/parser/toolkit/ToolkitDependencyMapper')

const appObject = {
  id: '25.99999999-9999-4999-8999-999999999999',
  versionId: '2064.99999999-9999-4999-8999-999999999999',
  name: 'Create Customer',
  type: 'process'
}
const versionId = '2064.11111111-1111-4111-8111-111111111111'
const sharedId = '12.22222222-2222-4222-8222-222222222222'
const xml = [
  '<teamworks>',
  `  <versionRef>${versionId}</versionRef>`,
  `  <stableRef>${sharedId}</stableRef>`,
  '</teamworks>'
].join('\n')
const zip = {
  getEntry (entryName) {
    if (entryName !== `objects/${appObject.versionId}.xml`) return null
    return { getData: () => Buffer.from(xml) }
  }
}
const toolkits = [
  {
    metadata: {
      project: { id: 'version-project', name: 'Version Toolkit', shortName: 'VTK' },
      snapshot: { id: '01-version-snapshot', name: '1.0.0' }
    },
    objectCount: 1,
    objects: [{
      id: '12.11111111-1111-4111-8111-111111111111',
      versionId,
      name: 'Version Target',
      type: 'process',
      typeName: 'Service'
    }]
  },
  {
    fileName: '02-shared-a.zip',
    metadata: {
      project: { id: 'shared-a-project', name: 'Shared Toolkit', shortName: 'STK' },
      snapshot: { id: 'shared-a-snapshot', name: '2.0.0' }
    },
    objectCount: 1,
    objects: [{
      id: sharedId,
      versionId: '2064.22222222-2222-4222-8222-222222222222',
      name: 'Shared Target A',
      type: 'twClass',
      typeName: 'Business Object'
    }]
  },
  {
    fileName: '03-shared-b.zip',
    metadata: {
      project: { id: 'shared-b-project', name: 'Shared Toolkit', shortName: 'STK' },
      snapshot: { id: 'shared-b-snapshot', name: '3.0.0' }
    },
    objectCount: 1,
    objects: [{
      id: sharedId,
      versionId: '2064.33333333-3333-4333-8333-333333333333',
      name: 'Shared Target B',
      type: 'twClass',
      typeName: 'Business Object'
    }]
  },
  {
    metadata: {
      project: { id: '04-unused-project', name: 'Unused Toolkit', shortName: 'UTK' },
      snapshot: { name: '4.0.0' }
    },
    objectCount: 1,
    objects: [{
      id: '12.44444444-4444-4444-8444-444444444444',
      versionId: '2064.44444444-4444-4444-8444-444444444444',
      name: 'Unused Target',
      type: 'process',
      typeName: 'Service'
    }]
  }
]
const shuffledToolkits = [toolkits[2], toolkits[0], toolkits[3], toolkits[1]]

const report = new ToolkitDependencyMapper().mapApplicationUsage({
  zip,
  appObjectList: [appObject],
  appObjects: [appObject],
  toolkits: shuffledToolkits,
  toolkitDiagnostics: []
})

const versionLocation = report.toolkits[0].objects[0].locations[0]
const ambiguousLocations = report.toolkits
  .flatMap(toolkit => toolkit.objects)
  .flatMap(object => object.locations)
  .filter(location => location.confidence === 'ambiguous')
const unusedToolkit = report.toolkits.find(toolkit => toolkit.key === '04-unused-project')

assert.equal(report.schemaVersion, 1)
assert.equal(report.toolkits.length, 4)
assert.equal(report.summary.toolkitCount, 4)
assert.deepEqual(report.toolkits.map(toolkit => toolkit.key), [
  '01-version-snapshot',
  '02-shared-a.zip',
  '03-shared-b.zip',
  '04-unused-project'
])
assert.equal(report.toolkits[0].objects[0].locations[0].confidence, 'confirmed')
assert.equal(report.toolkits[0].objects[0].locations[0].evidence, 'version-id')
assert.equal(ambiguousLocations.length, 2)
assert.equal(unusedToolkit.usageStatus, 'not-detected')
assert.equal(versionLocation.lineBasis, 'xml')
assert.ok(versionLocation.line > 0)
assert.ok(versionLocation.column > 0)

const fallbackZip = {
  getEntry (entryName) {
    if (entryName !== `objects/${appObject.id}.xml`) return null
    return { getData: () => Buffer.from(xml) }
  }
}
const fallbackReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: fallbackZip,
  appObjectList: [appObject],
  appObjects: [appObject],
  toolkits: [toolkits[0]],
  toolkitDiagnostics: []
})

assert.equal(fallbackReport.status, 'complete')
assert.equal(fallbackReport.summary.confirmedLocationCount, 1)

const longXml = `<versionRef>${'x'.repeat(300)} ${versionId} ${'y'.repeat(300)}</versionRef>`
const longLineReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => entryName === `objects/${appObject.versionId}.xml`
      ? { getData: () => Buffer.from(longXml) }
      : null
  },
  appObjectList: [appObject],
  appObjects: [appObject],
  toolkits: [toolkits[0]],
  toolkitDiagnostics: []
})
const cappedSnippet = longLineReport.toolkits[0].objects[0].locations[0].snippet

assert.equal(cappedSnippet.length, 240)
assert.ok(cappedSnippet.includes(versionId))

const missingAppObject = {
  id: '25.88888888-8888-4888-8888-888888888888',
  versionId: '2064.88888888-8888-4888-8888-888888888888',
  name: 'Missing Source',
  type: 'process'
}
const partialReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip,
  appObjectList: [missingAppObject, appObject],
  appObjects: [missingAppObject, appObject],
  toolkits,
  toolkitDiagnostics: []
})

assert.equal(partialReport.status, 'partial')
assert.equal(partialReport.diagnostics.length, 1)
assert.equal(partialReport.diagnostics[0].code, 'application-object-xml-missing')
assert.equal(partialReport.diagnostics[0].appObjectId, missingAppObject.id)
assert.equal(partialReport.summary.confirmedLocationCount, 1)

const sameLineXml = `<refs first="${versionId}" second="${versionId}" />`
const sameLineReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => entryName === `objects/${appObject.versionId}.xml`
      ? { getData: () => Buffer.from(sameLineXml) }
      : null
  },
  appObjectList: [appObject],
  appObjects: [appObject],
  toolkits: [toolkits[0]],
  toolkitDiagnostics: []
})
const sameLineLocations = sameLineReport.toolkits[0].objects[0].locations

assert.equal(sameLineLocations.length, 2)
assert.notEqual(sameLineLocations[0].column, sameLineLocations[1].column)

const tiedAppObject = {
  id: '25.77777777-7777-4777-8777-777777777777',
  versionId: '2064.77777777-7777-4777-8777-777777777777',
  name: appObject.name,
  type: appObject.type
}
const tiedLocationReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => [appObject.versionId, tiedAppObject.versionId]
      .some(id => entryName === `objects/${id}.xml`)
      ? { getData: () => Buffer.from(`<ref>${versionId}</ref>`) }
      : null
  },
  appObjectList: [appObject, tiedAppObject],
  appObjects: [appObject, tiedAppObject],
  toolkits: [toolkits[0]],
  toolkitDiagnostics: []
})
const tiedLocationVersions = tiedLocationReport.toolkits[0].objects[0].locations
  .map(location => location.appObjectVersionId)

assert.deepEqual(tiedLocationVersions, [
  tiedAppObject.versionId,
  appObject.versionId
])

const uniqueStableId = '12.55555555-5555-4555-8555-555555555555'
const collisionId = '2064.66666666-6666-4666-8666-666666666666'
const structuralEdgeToolkit = {
  fileName: '05-structural-edges.zip',
  metadata: {
    project: { id: 'structural-edge-project', name: 'Structural Edges', shortName: 'SET' },
    snapshot: { id: 'structural-edge-snapshot', name: '5.0.0' }
  },
  objectCount: 3,
  objects: [
    {
      id: uniqueStableId,
      versionId: '2064.55555555-5555-4555-8555-555555555555',
      name: 'Unique Stable Target',
      type: 'process',
      typeName: 'Service'
    },
    {
      id: '12.66666666-6666-4666-8666-666666666666',
      versionId: collisionId,
      name: 'Version Winner',
      type: 'process',
      typeName: 'Service'
    },
    {
      id: collisionId,
      versionId: '2064.88888888-8888-4888-8888-888888888888',
      name: 'Stable Loser',
      type: 'process',
      typeName: 'Service'
    }
  ]
}
const structuralEdgeXml = [
  `<stableRef>${uniqueStableId}</stableRef>`,
  `<collisionRef>${collisionId}</collisionRef>`
].join('\n')
const structuralEdgeReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => entryName === `objects/${appObject.versionId}.xml`
      ? { getData: () => Buffer.from(structuralEdgeXml) }
      : null
  },
  appObjectList: [appObject],
  appObjects: [appObject],
  toolkits: [structuralEdgeToolkit],
  toolkitDiagnostics: []
})
const structuralEdgeObjects = structuralEdgeReport.toolkits[0].objects
const uniqueStableTarget = structuralEdgeObjects.find(object => object.name === 'Unique Stable Target')
const versionWinner = structuralEdgeObjects.find(object => object.name === 'Version Winner')

assert.equal(uniqueStableTarget.locations[0].confidence, 'confirmed')
assert.equal(uniqueStableTarget.locations[0].evidence, 'object-id')
assert.equal(versionWinner.locations[0].confidence, 'confirmed')
assert.equal(versionWinner.locations[0].evidence, 'version-id')
assert.equal(structuralEdgeObjects.some(object => object.name === 'Stable Loser'), false)

const failedReport = ToolkitDependencyMapper.failedReport(new Error('synthetic mapping failure'))
assert.equal(failedReport.schemaVersion, 1)
assert.equal(failedReport.status, 'partial')
assert.equal(failedReport.toolkits.length, 0)
assert.equal(failedReport.diagnostics.length, 1)
assert.equal(failedReport.diagnostics[0].code, 'toolkit-usage-failed')
assert.equal(failedReport.diagnostics[0].message, 'synthetic mapping failure')

console.log('Toolkit structural usage tests passed')
