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
const source = `${fs.readFileSync('twx-viewer-new.js', 'utf8')}\nthis.__viewer = { state, viewAnalyzer };`
const context = { document, window: {}, console, fetch: async () => ({ ok: false }) }
vm.runInNewContext(source, context)
const { state, viewAnalyzer } = context.__viewer
const finding = (status, severity, ruleName, suffix, overrides = {}) => ({
  id: suffix,
  status,
  severity,
  ruleName,
  objectId: `object-${suffix}`,
  objectName: `Object <${suffix}>`,
  objectType: 'Service',
  elementId: `element-${suffix}`,
  elementName: `Element <${suffix}>`,
  elementType: 'scriptTask',
  message: `Message ${suffix}`,
  location: { line: 1, column: 1, snippet: 'var x = 1;' },
  ...overrides
})

state.analysisData = {
  status: 'complete',
  meta: {},
  summary: {},
  coverage: {},
  byAppType: {},
  findings: [
    finding('confirmed', 'critical', 'Syntax rule', 'critical-1', { objectId: 'critical-object', elementId: 'critical-a', elementName: 'Duplicate <name>' }),
    finding('confirmed', 'critical', 'Syntax rule', 'critical-2', { objectId: 'critical-object', elementId: 'critical-a', elementName: 'Duplicate <name>' }),
    finding('confirmed', 'critical', 'Syntax rule', 'critical-3', { objectId: 'critical-object', elementId: 'critical-b', elementName: 'Duplicate <name>' }),
    finding('confirmed', 'warning', 'Warning rule', 'warning'),
    finding('needs-review', null, null, 'review')
  ]
}

const html = viewAnalyzer()
const details = []
const stack = []
for (const match of html.matchAll(/<\/?details\b[^>]*>/g)) {
  if (match[0].startsWith('</')) {
    stack.pop().end = match.index + match[0].length
    continue
  }
  const node = { classes: match[0].match(/class="([^"]+)"/)[1].split(' '), start: match.index, children: [] }
  if (stack.length) stack[stack.length - 1].children.push(node)
  else details.push(node)
  stack.push(node)
}
const summary = node => html.slice(node.start, html.indexOf('</summary>', node.start))
const cards = node => (html.slice(node.start, node.end).match(/<article class="analyzer-finding/g) || []).length
const child = (node, level) => node.children.find(item => item.classes.includes(level))

for (const [tone, label, rule, element] of [
  ['critical', 'Confirmed critical', 'Syntax rule', 'Duplicate &lt;name&gt;'],
  ['warning', 'Confirmed warnings', 'Warning rule', 'Element &lt;warning&gt;'],
  ['review', 'Needs review', 'Other finding', 'Element &lt;review&gt;']
]) {
  const section = details.find(node => node.classes.includes(tone) && node.classes.includes('section'))
  const type = child(section, 'rule')
  const item = child(type, 'element')
  assert.ok(section && type && item && cards(item), `${label} must nest rule, element, and finding levels`)
  assert.ok(summary(section).includes(label))
  assert.ok(summary(type).includes(rule))
  assert.ok(summary(item).includes(element))
}
const criticalRule = child(details.find(node => node.classes.includes('critical')), 'rule')
assert.strictEqual(criticalRule.children.length, 2, 'element IDs, not duplicate names, must define element groups')
assert.ok(summary(criticalRule).includes('3 findings · 2 elements'))
assert.deepStrictEqual(criticalRule.children.map(cards).sort(), [1, 2])
assert.ok(!/<details[^>]*\sopen(?:\s|>)/.test(html), 'all disclosures must start collapsed')
assert.ok(!html.includes('Duplicate <name>'), 'display names must remain escaped')

console.log('analyzer UI checks passed')
