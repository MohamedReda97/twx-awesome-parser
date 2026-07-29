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
const source = `${fs.readFileSync('twx-viewer-new.js', 'utf8')}\nthis.__viewer = { state, viewToolkitUsage };`
const context = { document, window: {}, console, fetch: async () => ({ ok: false }) }
vm.runInNewContext(source, context)
const { state, viewToolkitUsage } = context.__viewer

state.toolkitUsage = {
  summary: { toolkitCount: 3, usedToolkitCount: 1, possibleToolkitCount: 1, unusedToolkitCount: 1 },
  toolkits: [
    {
      name: 'Used <Toolkit>',
      usageStatus: 'used',
      counts: { usedObjects: 3, confirmedLocations: 1, inferredLocations: 1, ambiguousLocations: 1 },
      objects: [
        {
          name: 'Object <confirmed>',
          typeName: 'Type <confirmed>',
          locations: [{
            confidence: 'confirmed', evidence: 'version-id', appObjectName: 'App <Object>', elementName: 'Element <script>', scriptRole: 'script-task', line: 4, snippet: 'tw.<value>()'
          }]
        },
        {
          name: 'Object inferred',
          typeName: 'Type <inferred>',
          locations: [{
            confidence: 'inferred', evidence: 'name match', appObjectName: 'App object', elementName: 'Element inferred', scriptRole: 'service-script', line: 8, snippet: 'var inferred = "<value>";'
          }]
        },
        {
          name: 'Object ambiguous',
          typeName: 'Type <ambiguous>',
          locations: [{
            confidence: 'ambiguous', evidence: 'short name', appObjectName: 'App object', elementName: 'Element ambiguous', scriptRole: 'inline-script', line: 12, snippet: 'tw.local.<ambiguous>'
          }]
        }
      ]
    },
    { name: 'Possible Toolkit', usageStatus: 'possible', counts: { usedObjects: 0 }, objects: [] },
    { name: 'Unused Toolkit', usageStatus: 'not-detected', counts: { usedObjects: 0 }, objects: [] }
  ]
}

const html = viewToolkitUsage()
for (const text of ['Toolkit Usage', 'Used', 'Possible usage', 'No detected usage', 'No application references were detected. This does not prove that the toolkit can be removed.']) assert.ok(html.includes(text), `${text} must be shown`)
for (const text of ['Available toolkits', 'Used toolkits', 'No detected usage', 'Used toolkit objects']) assert.ok(html.includes(text), `${text} must be summarized`)
assert.ok(html.indexOf('Used &lt;Toolkit&gt;') < html.indexOf('Type &lt;confirmed&gt;') && html.indexOf('Type &lt;confirmed&gt;') < html.indexOf('Object &lt;confirmed&gt;') && html.indexOf('Object &lt;confirmed&gt;') < html.indexOf('App &lt;Object&gt;'), 'markup must group toolkit → type → object → location')
for (const className of ['toolkit-usage-group toolkit', 'toolkit-usage-group type', 'toolkit-usage-group object']) assert.ok(html.includes(className), `${className} group must exist`)
assert.ok(!/<details[^>]*\sopen(?:\s|>)/.test(html), 'all disclosures must start collapsed')
for (const text of ['Used <Toolkit>', 'Type <confirmed>', 'Object <confirmed>', 'App <Object>', 'Element <script>', 'tw.<value>()']) assert.ok(!html.includes(text), `${text} must be escaped`)
assert.ok(html.includes('App &lt;Object&gt;') && html.includes('Element &lt;script&gt;') && html.includes('script-task') && html.includes('Line 4'), 'application object, element, script, and line must be visible')
assert.ok(html.includes('Confirmed') && html.includes('Inferred') && html.includes('Ambiguous'), 'confidence and evidence must be visible')
assert.ok(html.includes('toolkit-usage-status unused'), 'not-detected toolkits must use the no-usage status chip')

state.toolkitUsage = null
assert.ok(viewToolkitUsage().includes('Toolkit usage is not available—parse the TWX again.'), 'missing report must explain how to restore it')
state.toolkitUsage = { toolkits: [] }
assert.ok(viewToolkitUsage().includes('No toolkits were found in this TWX file.'), 'empty report must have a clear state')

console.log('toolkit usage UI checks passed')
