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

const versionToolkit = report.toolkits.find(toolkit => toolkit.key === '01-version-snapshot')
const versionLocation = versionToolkit.objects[0].locations[0]
const ambiguousLocations = report.toolkits
  .flatMap(toolkit => toolkit.objects)
  .flatMap(object => object.locations)
  .filter(location => location.confidence === 'ambiguous')
const unusedToolkit = report.toolkits.find(toolkit => toolkit.key === '04-unused-project')

assert.equal(report.schemaVersion, 1)
assert.equal(report.toolkits.length, 4)
assert.equal(report.summary.toolkitCount, 4)
assert.deepEqual(report.toolkits.map(toolkit => toolkit.key), [
  '03-shared-b.zip',
  '01-version-snapshot',
  '04-unused-project',
  '02-shared-a.zip'
])
assert.equal(versionLocation.confidence, 'confirmed')
assert.equal(versionLocation.evidence, 'version-id')
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

const nonstandardVersionId = 'custom.version+target'
const nonstandardStableId = 'custom-stable-target'
const nonstandardAmbiguousId = 'custom-shared-target'
const nonstandardCollisionId = 'custom-version-wins'
const nonstandardContinuations = ['/', ':', '+', '@', '#', '$', '%', '~']
const nonstandardToolkits = [
  {
    fileName: '08-nonstandard-a.zip',
    metadata: {
      project: { id: 'nonstandard-a-project', name: 'Nonstandard A', shortName: 'NSA' },
      snapshot: { id: 'nonstandard-a-snapshot', name: '8.0.0' }
    },
    objectCount: 5,
    objects: [
      {
        id: 'custom-version-stable',
        versionId: nonstandardVersionId,
        name: 'Nonstandard Version',
        type: 'process',
        typeName: 'Service'
      },
      {
        id: nonstandardStableId,
        versionId: 'custom-stable-version',
        name: 'Nonstandard Stable',
        type: 'process',
        typeName: 'Service'
      },
      {
        id: nonstandardAmbiguousId,
        versionId: 'custom-shared-a-version',
        name: 'Nonstandard Shared A',
        type: 'process',
        typeName: 'Service'
      },
      {
        id: 'custom-collision-stable',
        versionId: nonstandardCollisionId,
        name: 'Nonstandard Version Winner',
        type: 'process',
        typeName: 'Service'
      },
      {
        id: nonstandardCollisionId,
        versionId: 'custom-collision-other-version',
        name: 'Nonstandard Stable Loser',
        type: 'process',
        typeName: 'Service'
      }
    ]
  },
  {
    fileName: '09-nonstandard-b.zip',
    metadata: {
      project: { id: 'nonstandard-b-project', name: 'Nonstandard B', shortName: 'NSB' },
      snapshot: { id: 'nonstandard-b-snapshot', name: '9.0.0' }
    },
    objectCount: 1,
    objects: [{
      id: nonstandardAmbiguousId,
      versionId: 'custom-shared-b-version',
      name: 'Nonstandard Shared B',
      type: 'process',
      typeName: 'Service'
    }]
  }
]
const nonstandardXml = [
  `<partial>prefix${nonstandardVersionId}suffix</partial>`,
  ...nonstandardContinuations.map(character => `<partial>${nonstandardVersionId}${character}suffix</partial>`),
  `<attachedActivityId>/${nonstandardVersionId}</attachedActivityId>`,
  `<versionRef>${nonstandardVersionId}</versionRef>`,
  `<stableRef>${nonstandardStableId}</stableRef>`,
  `<ambiguousRef>${nonstandardAmbiguousId}</ambiguousRef>`,
  `<collisionRef>${nonstandardCollisionId}</collisionRef>`
].join('\n')
const nonstandardReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => entryName === `objects/${appObject.versionId}.xml`
      ? { getData: () => Buffer.from(nonstandardXml) }
      : null
  },
  appObjectList: [appObject],
  appObjects: [appObject],
  toolkits: nonstandardToolkits,
  toolkitDiagnostics: []
})
const nonstandardObjects = nonstandardReport.toolkits.flatMap(toolkit => toolkit.objects)
const nonstandardVersion = nonstandardObjects.find(object => object.name === 'Nonstandard Version')
const nonstandardStable = nonstandardObjects.find(object => object.name === 'Nonstandard Stable')
const nonstandardShared = nonstandardObjects.filter(object => object.name.startsWith('Nonstandard Shared'))
const nonstandardVersionWinner = nonstandardObjects.find(object => object.name === 'Nonstandard Version Winner')

assert.ok(nonstandardVersion, 'exact nonstandard version ID should be reported')
assert.ok(nonstandardStable, 'exact nonstandard stable ID should be reported')
assert.ok(nonstandardVersionWinner, 'nonstandard version ID should win a stable-ID collision')
for (const character of nonstandardContinuations) {
  assert.ok(
    !nonstandardVersion.locations.some(location => location.snippet.includes(`${nonstandardVersionId}${character}suffix`)),
    `nonstandard ID must not match before ${JSON.stringify(character)}`
  )
}
const slashPrefixedVersionLocations = nonstandardVersion.locations.filter(location =>
  location.snippet === `<attachedActivityId>/${nonstandardVersionId}</attachedActivityId>` &&
  location.confidence === 'confirmed' &&
  location.evidence === 'version-id')

assert.equal(slashPrefixedVersionLocations.length, 1, 'slash-prefixed nonstandard version ID should match once')
assert.equal(nonstandardVersion.locations.length, 2)
assert.equal(nonstandardVersion.locations[0].evidence, 'version-id')
assert.equal(nonstandardStable.locations[0].confidence, 'confirmed')
assert.equal(nonstandardStable.locations[0].evidence, 'object-id')
assert.equal(nonstandardShared.length, 2)
assert.ok(nonstandardShared.every(object => object.locations[0].confidence === 'ambiguous'))
assert.ok(nonstandardShared.every(object => object.locations[0].evidence === 'ambiguous-id'))
assert.equal(nonstandardVersionWinner.locations[0].evidence, 'version-id')
assert.equal(nonstandardObjects.some(object => object.name === 'Nonstandard Stable Loser'), false)

const processReferenceObject = {
  ...appObject,
  details: {
    elements: {
      callActivities: [{
        id: 'call-toolkit-service',
        name: 'Call toolkit service',
        callsTargetId: versionId
      }]
    }
  }
}
const processReferenceReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => entryName === `objects/${appObject.versionId}.xml`
      ? { getData: () => Buffer.from(`<target>${versionId}</target>`) }
      : null
  },
  appObjectList: [appObject],
  appObjects: [processReferenceObject],
  toolkits: [toolkits[0]],
  toolkitDiagnostics: []
})
const processReferenceLocation = processReferenceReport.toolkits[0].objects[0].locations[0]

assert.equal(processReferenceLocation.elementId, 'call-toolkit-service')
assert.equal(processReferenceLocation.elementName, 'Call toolkit service')
assert.equal(processReferenceLocation.elementType, 'callActivity')

const schemaObject = {
  id: '12.12121212-1212-4212-8212-121212121212',
  versionId: '2064.12121212-1212-4212-8212-121212121212',
  name: 'Order Data',
  type: 'twClass',
  details: {
    schema: {
      properties: [
        { name: 'ServiceByClass', classRef: versionId },
        { name: 'ServiceByReference', referencedObjectId: uniqueStableId }
      ]
    }
  }
}
const schemaReferenceReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => entryName === `objects/${schemaObject.versionId}.xml`
      ? { getData: () => Buffer.from(`<class>${versionId}</class>\n<reference>${uniqueStableId}</reference>`) }
      : null
  },
  appObjectList: [schemaObject],
  appObjects: [schemaObject],
  toolkits: [toolkits[0], structuralEdgeToolkit],
  toolkitDiagnostics: []
})
const schemaReferenceObjects = schemaReferenceReport.toolkits.flatMap(toolkit => toolkit.objects)
const classReferenceLocation = schemaReferenceObjects.find(object => object.name === 'Version Target').locations[0]
const objectReferenceLocation = schemaReferenceObjects.find(object => object.name === 'Unique Stable Target').locations[0]

assert.deepEqual(
  [classReferenceLocation.elementId, classReferenceLocation.elementName, classReferenceLocation.elementType],
  ['ServiceByClass', 'ServiceByClass', 'property']
)
assert.deepEqual(
  [objectReferenceLocation.elementId, objectReferenceLocation.elementName, objectReferenceLocation.elementType],
  ['ServiceByReference', 'ServiceByReference', 'property']
)

const duplicateReferenceObject = {
  id: '25.13131313-1313-4313-8313-131313131313',
  versionId: '2064.13131313-1313-4313-8313-131313131313',
  name: 'Duplicate structured references',
  type: 'process',
  details: {
    elements: {
      callActivities: [
        { id: 'duplicate-a', name: 'Duplicate A', callsTargetId: versionId },
        { id: 'duplicate-b', name: 'Duplicate B', callsTargetId: versionId }
      ]
    }
  }
}
const unrelatedReferenceObject = {
  id: '25.14141414-1414-4414-8414-141414141414',
  versionId: '2064.14141414-1414-4414-8414-141414141414',
  name: 'Unrelated structured reference',
  type: 'process',
  details: {
    arbitrary: [{ id: 'not-an-element', name: 'Not an element', callsTargetId: versionId }]
  }
}
const fallbackXmlEntries = new Map([
  [`objects/${duplicateReferenceObject.versionId}.xml`, `<target>${versionId}</target>`],
  [`objects/${unrelatedReferenceObject.versionId}.xml`, `<target>${versionId}</target>`]
])
const elementFallbackReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => fallbackXmlEntries.has(entryName)
      ? { getData: () => Buffer.from(fallbackXmlEntries.get(entryName)) }
      : null
  },
  appObjectList: [duplicateReferenceObject, unrelatedReferenceObject],
  appObjects: [duplicateReferenceObject, unrelatedReferenceObject],
  toolkits: [toolkits[0]],
  toolkitDiagnostics: []
})
const fallbackLocations = elementFallbackReport.toolkits[0].objects[0].locations

assert.equal(fallbackLocations.length, 2)
assert.ok(fallbackLocations.every(location => !('elementId' in location)))
assert.ok(fallbackLocations.every(location => !('elementName' in location)))
assert.ok(fallbackLocations.every(location => !('elementType' in location)))

const scriptSource = [
  'new tw.object.CustomerData();',
  'services["Run Service"]();',
  'AccountNumber();',
  'customerdata();',
  'SharedHelper();'
].join('\n')
const scriptToolkit = {
  fileName: '06-script-usage.zip',
  metadata: {
    project: { id: 'script-project', name: 'Script Toolkit', shortName: 'JSK' },
    snapshot: { id: 'script-snapshot', name: '6.0.0' }
  },
  objectCount: 4,
  objects: [
    {
      id: '12.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      versionId: '2064.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'CustomerData',
      type: 'twClass',
      typeName: 'Business Object',
      details: { scripts: [{ name: 'Toolkit code', script: 'Account();' }] }
    },
    {
      id: '12.bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      versionId: '2064.bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      name: 'Run Service',
      type: 'process',
      typeName: 'Service'
    },
    {
      id: '12.cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      versionId: '2064.cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      name: 'Account',
      type: 'twClass',
      typeName: 'Business Object'
    },
    {
      id: '12.dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      versionId: '2064.dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      name: 'SharedHelper',
      type: 'process',
      typeName: 'Service'
    }
  ]
}
const sharedNameToolkit = {
  fileName: '07-shared-name.zip',
  metadata: {
    project: { id: 'shared-name-project', name: 'Shared Name Toolkit', shortName: 'SNT' },
    snapshot: { id: 'shared-name-snapshot', name: '7.0.0' }
  },
  objectCount: 1,
  objects: [{
    id: '12.eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    versionId: '2064.eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    name: 'SharedHelper',
    type: 'process',
    typeName: 'Service'
  }]
}
const scriptAppObject = {
  ...appObject,
  source: 'application',
  details: {
    elements: {
      scriptTasks: [{
        id: 'usage-script-task',
        name: 'Detect toolkit usage',
        script: scriptSource,
        scriptFormat: 'text/javascript',
        preAssignment: 'SharedHelper();',
        postAssignment: 'SharedHelper();'
      }],
      formTasks: [{
        id: 'usage-form',
        name: 'Prepare form',
        preAssignment: 'SharedHelper();',
        postAssignment: 'SharedHelper();'
      }],
      callActivities: [{
        id: 'usage-call',
        name: 'Call activity',
        preAssignment: 'SharedHelper();',
        postAssignment: 'SharedHelper();'
      }]
    },
    scripts: [
      { name: 'Detect toolkit usage', script: scriptSource, scriptFormat: 'text/javascript' },
      { name: 'Run service implementation', script: 'services["Run Service"]();' },
      {
        name: 'JavaScript property keys',
        script: [
          'const refs = { CustomerData: 1, "Run Service": 2 };',
          'class Keyed { CustomerData () {} "Run Service" () {} }'
        ].join('\n')
      },
      { name: 'Repeated source name', script: 'CustomerData(); // first' },
      { name: 'Repeated source name', script: 'CustomerData(); // second' },
      { name: 'Plain template', script: 'Account();', scriptFormat: 'text/plain' },
      { name: 'HTML template', script: 'Account();', scriptFormat: 'text/html' },
      { name: 'Named template', script: 'Account();', scriptFormat: 'application/javascript-template' },
      { name: 'Empty script', script: ' ' }
    ]
  }
}
const coachAppObject = {
  id: '64.aaaaaaaa-1111-4111-8111-111111111111',
  versionId: '2064.aaaaaaaa-1111-4111-8111-111111111111',
  name: 'Customer Coach',
  type: 'coachView',
  source: 'application',
  details: {
    scripts: {
      loadJsFunction: 'new tw.object.CustomerData();',
      unloadJsFunction: 'new tw.object.CustomerData();',
      viewJsFunction: 'new tw.object.CustomerData();',
      changeJsFunction: 'new tw.object.CustomerData();',
      collaborationJsFunction: 'new tw.object.CustomerData();',
      validateJsFunction: 'new tw.object.CustomerData();',
      inlineScripts: [
        { context: 'Shared helper inline', script: 'SharedHelper();' },
        { context: 'Shared helper inline', script: 'SharedHelper();' },
        { context: 'Shared helper inline', script: 'SharedHelper(); // distinct unit' }
      ],
      html: '<script>Account();</script>'
    },
    layout: '<div>Account</div>'
  }
}
const malformedAppObject = {
  id: '25.aaaaaaaa-2222-4222-8222-222222222222',
  versionId: '2064.aaaaaaaa-2222-4222-8222-222222222222',
  name: 'Malformed Script Source',
  type: 'process',
  source: 'application',
  details: {
    elements: {
      scriptTasks: [{
        id: 'malformed-script-task',
        name: 'Malformed script',
        script: 'var = ;'
      }]
    },
    scripts: [{ name: 'Malformed script', script: 'var = ;' }]
  }
}
const scriptXml = new Map([
  [`objects/${scriptAppObject.versionId}.xml`, xml],
  [`objects/${coachAppObject.versionId}.xml`, '<coachView />'],
  [`objects/${malformedAppObject.versionId}.xml`, '<process />']
])
const scriptReport = new ToolkitDependencyMapper().mapApplicationUsage({
  zip: {
    getEntry: entryName => scriptXml.has(entryName)
      ? { getData: () => Buffer.from(scriptXml.get(entryName)) }
      : null
  },
  appObjectList: [appObject, coachAppObject, malformedAppObject],
  appObjects: [scriptAppObject, coachAppObject, malformedAppObject],
  toolkits: [toolkits[0], scriptToolkit, sharedNameToolkit],
  toolkitDiagnostics: []
})
const scriptObjects = scriptReport.toolkits.flatMap(toolkit => toolkit.objects)
const customerData = scriptObjects.find(object => object.name === 'CustomerData')
const runService = scriptObjects.find(object => object.name === 'Run Service')
const sharedHelpers = scriptObjects.filter(object => object.name === 'SharedHelper')
const structuralAfterScriptError = scriptObjects.find(object => object.name === 'Version Target')

assert.ok(customerData, 'CustomerData should be inferred from exact JavaScript tokens')
assert.ok(runService, 'Run Service should be inferred from exact JavaScript strings')
assert.equal(sharedHelpers.length, 2)
assert.equal(scriptReport.status, 'partial')
assert.equal(scriptReport.diagnostics.length, 1)
assert.equal(scriptReport.diagnostics[0].code, 'javascript-syntax-error')
assert.equal(scriptReport.diagnostics[0].appObjectId, malformedAppObject.id)
assert.equal(scriptReport.diagnostics[0].elementId, 'malformed-script-task')
assert.equal(structuralAfterScriptError.locations[0].confidence, 'confirmed')
assert.equal(structuralAfterScriptError.locations[0].evidence, 'version-id')
assert.equal(customerData.locations.length, 11)
assert.ok(customerData.locations.every(location => location.confidence === 'inferred'))
assert.ok(customerData.locations.some(location => location.evidence === 'script-member'))
assert.ok(customerData.locations.some(location => location.evidence === 'script-identifier'))
assert.equal(runService.locations.length, 4)
assert.ok(runService.locations.every(location => location.evidence === 'script-string'))
assert.equal(scriptObjects.some(object => object.name === 'Account'), false)
for (const sharedHelper of sharedHelpers) {
  assert.equal(sharedHelper.locations.length, 9)
  assert.ok(sharedHelper.locations.every(location => location.confidence === 'ambiguous'))
  assert.ok(sharedHelper.locations.every(location => location.evidence === 'ambiguous-name'))
  assert.equal(new Set(sharedHelper.locations.map(location => `${location.elementId}\0${location.scriptRole}`)).size, 9)
}
const repeatedServiceLocations = customerData.locations.filter(location => location.elementName === 'Repeated source name')
const repeatedInlineLocations = sharedHelpers[0].locations.filter(location => location.elementName === 'Shared helper inline')
const assignmentLocationIds = sharedHelpers[0].locations
  .filter(location => location.scriptRole.includes('assignment'))
  .map(location => location.elementId)
  .sort()
const coachLifecycleIds = customerData.locations
  .filter(location => location.appObjectId === coachAppObject.id && location.scriptRole === 'lifecycle')
  .map(location => location.elementId)
  .sort()

assert.equal(repeatedServiceLocations.length, 2)
assert.equal(new Set(repeatedServiceLocations.map(location => location.elementId)).size, 2)
assert.equal(repeatedInlineLocations.length, 2)
assert.equal(new Set(repeatedInlineLocations.map(location => location.elementId)).size, 2)
assert.deepEqual(assignmentLocationIds, [
  'usage-call-post',
  'usage-call-pre',
  'usage-form-post',
  'usage-form-pre',
  'usage-script-task-post',
  'usage-script-task-pre'
])
assert.deepEqual(coachLifecycleIds, [
  'changeJsFunction',
  'collaborationJsFunction',
  'loadJsFunction',
  'unloadJsFunction',
  'validateJsFunction',
  'viewJsFunction'
])
const serverMemberLocation = customerData.locations.find(location => location.elementId === 'usage-script-task')

assert.equal(serverMemberLocation.appObjectId, scriptAppObject.id)
assert.equal(serverMemberLocation.appObjectVersionId, scriptAppObject.versionId)
assert.equal(serverMemberLocation.appObjectName, scriptAppObject.name)
assert.equal(serverMemberLocation.appObjectType, scriptAppObject.type)
assert.equal(serverMemberLocation.elementName, 'Detect toolkit usage')
assert.equal(serverMemberLocation.elementType, 'scriptTask')
assert.equal(serverMemberLocation.scriptRole, 'script-task')
assert.equal(serverMemberLocation.lineBasis, 'script')
assert.equal(serverMemberLocation.line, 1)
assert.ok(serverMemberLocation.column > 0)
assert.equal(serverMemberLocation.snippet, 'new tw.object.CustomerData();')

const precedenceTarget = { locations: [] }
const confirmedScriptLocation = {
  appObjectId: appObject.id,
  appObjectVersionId: appObject.versionId,
  elementId: 'precedence-script',
  elementName: 'Precedence script',
  scriptRole: 'script-task',
  lineBasis: 'script',
  line: 1,
  column: 1,
  confidence: 'confirmed',
  evidence: 'version-id'
}
const precedenceMapper = new ToolkitDependencyMapper()

precedenceMapper._appendLocation(precedenceTarget, {
  ...confirmedScriptLocation,
  confidence: 'inferred',
  evidence: 'script-identifier'
})
precedenceMapper._appendLocation(precedenceTarget, confirmedScriptLocation)
assert.equal(precedenceTarget.locations.length, 1)
assert.equal(precedenceTarget.locations[0].confidence, 'confirmed')
assert.equal(precedenceTarget.locations[0].evidence, 'version-id')

const failedReport = ToolkitDependencyMapper.failedReport(new Error('synthetic mapping failure'))
assert.equal(failedReport.schemaVersion, 1)
assert.equal(failedReport.status, 'partial')
assert.equal(failedReport.toolkits.length, 0)
assert.equal(failedReport.diagnostics.length, 1)
assert.equal(failedReport.diagnostics[0].code, 'toolkit-usage-failed')
assert.equal(failedReport.diagnostics[0].message, 'synthetic mapping failure')

console.log('Toolkit usage tests passed')
