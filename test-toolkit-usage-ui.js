const assert = require('assert')
const fs = require('fs')
const vm = require('vm')

const document = {
  addEventListener: () => {},
  createElement: () => {
    const node = { innerHTML: '' }
    Object.defineProperty(node, 'textContent', {
      get: () => node.innerHTML,
      set: value => {
        node.innerHTML = String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      }
    })
    return node
  }
}
const source = `${fs.readFileSync('twx-viewer-new.js', 'utf8')}\nthis.__viewer = { state, viewToolkitUsage, buildToolkitUsageViewModel, buildToolkitUsageExportHtml };`
const context = { document, window: {}, console, fetch: async () => ({ ok: false }) }
vm.runInNewContext(source, context)
const { state, viewToolkitUsage, buildToolkitUsageViewModel, buildToolkitUsageExportHtml } = context.__viewer

state.toolkitUsage = {
  toolkits: [
    {
      name: 'Used <Toolkit>',
      projectId: 'toolkit-used',
      shortName: 'USED',
      snapshotName: 'snapshot A',
      usageStatus: 'possible',
      totalObjectCount: 2,
      objects: [{
        id: 'object-one',
        name: 'Object <confirmed>',
        typeName: 'Business Object',
        locations: [
          { confidence: 'ambiguous', evidence: 'old name matching', appObjectName: 'App <Object>', appObjectId: 'app-one', appObjectTypeName: 'CSHS', elementName: 'Element <script>', line: 4, snippet: 'tw.<value>()' },
          { confidence: 'ambiguous', evidence: 'old name matching', appObjectName: 'App <Object>', appObjectId: 'app-one', appObjectTypeName: 'CSHS', elementName: 'Another element', line: 8 }
        ]
      }]
    },
    {
      name: 'Used duplicate snapshot',
      projectId: 'toolkit-used',
      shortName: 'USED',
      snapshotName: 'snapshot B',
      usageStatus: 'used',
      totalObjectCount: 2,
      objects: [{
        id: 'object-one',
        name: 'Object <confirmed>',
        typeName: 'Business Object',
        locations: [{ confidence: 'confirmed', evidence: 'version-id', appObjectName: 'App <Object>', appObjectId: 'app-one', appObjectTypeName: 'CSHS' }]
      }]
    },
    { name: 'Unused Toolkit', projectId: 'toolkit-unused', usageStatus: 'not-detected', totalObjectCount: 4, objects: [] }
  ]
}

const model = buildToolkitUsageViewModel(state.toolkitUsage)
assert.strictEqual(model.toolkits.length, 2, 'duplicate toolkit snapshots must be merged')
assert.strictEqual(model.toolkits[0].objects.length, 1, 'duplicate toolkit objects must be merged')
assert.strictEqual(model.toolkits[0].objects[0].locations.length, 1, 'repeated usage within one application object must be grouped')
assert.strictEqual(model.toolkits[0].objects[0].locations[0].label, 'App <Object> (CSHS)', 'locations must stop at the application object and use the normalized type label')
assert.strictEqual(model.summary.usedToolkitCount, 1, 'merged usage status must retain confirmed use')

const html = viewToolkitUsage()
for (const text of ['Toolkit Usage', 'Used', 'No detected usage', 'Generate HTML report', 'Select used', 'Select all']) assert.ok(html.includes(text), `${text} must be shown`)
for (const text of ['Available toolkits', 'Used toolkits', 'No detected usage', 'Used toolkit objects']) assert.ok(html.includes(text), `${text} must be summarized`)
assert.ok(html.indexOf('Used &lt;Toolkit&gt;') < html.indexOf('Business Object') && html.indexOf('Business Object') < html.indexOf('Object &lt;confirmed&gt;') && html.indexOf('Object &lt;confirmed&gt;') < html.indexOf('App &lt;Object&gt; (CSHS)'), 'markup must group toolkit → type → object → application object')
for (const className of ['toolkit-usage-group toolkit', 'toolkit-usage-group type', 'toolkit-usage-group object']) assert.ok(html.includes(className), `${className} group must exist`)
assert.ok(!/<details[^>]*\sopen(?:\s|>)/.test(html), 'all disclosures must start collapsed')
for (const text of ['Element <script>', 'tw.<value>()', 'Line 4', 'old name matching', 'version-id']) assert.ok(!html.includes(text), `${text} must not be rendered`)
assert.ok(html.includes('App &lt;Object&gt; (CSHS)'), 'the application object and normalized type must be visible')
assert.ok(html.includes('data-toolkit-usage-select'), 'toolkits must be selectable for export')

const report = buildToolkitUsageExportHtml(model, ['project:toolkit-used'])
assert.ok(report.includes('Used &lt;Toolkit&gt;') && report.includes('App &lt;Object&gt; (CSHS)'), 'report must contain the selected toolkit and concise locations')
assert.ok(!report.includes('Unused Toolkit') && !report.includes('Element &lt;script&gt;'), 'report must exclude unselected toolkits and low-level evidence')

state.toolkitUsage = null
assert.ok(viewToolkitUsage().includes('Toolkit usage is not available—parse the TWX again.'), 'missing report must explain how to restore it')
state.toolkitUsage = { toolkits: [] }
assert.ok(viewToolkitUsage().includes('No toolkits were found in this TWX file.'), 'empty report must have a clear state')

console.log('toolkit usage UI checks passed')
