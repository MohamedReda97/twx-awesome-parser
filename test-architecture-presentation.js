'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'TWX-Architecture-Presentation.html');
assert.ok(fs.existsSync(file), 'standalone architecture presentation must exist');

const html = fs.readFileSync(file, 'utf8');

for (const section of [
  'overview',
  'capabilities',
  'pipeline',
  'type-identification',
  'analyzer',
  'components',
  'outputs',
  'boundaries'
]) {
  assert.match(html, new RegExp(`id=["']${section}["']`), `missing ${section} section`);
}

for (const fact of [
  'META-INF/package.xml',
  'objects/&lt;versionId&gt;.xml',
  'PackageXmlParser',
  'ObjectExtractor',
  'TWXExtractor',
  'JSONParser',
  'eslint-scope',
  'acorn-walk',
  'toolkits are context',
  'BAW 19, 20, 21, 23 and 24'
]) {
  assert.ok(html.includes(fact), `missing architecture fact: ${fact}`);
}

assert.ok((html.match(/<svg\b/g) || []).length >= 4, 'expected at least four architecture drawings');
assert.match(html, /data-trace=/, 'missing interactive component trace controls');
assert.match(html, /data-object-type=/, 'missing interactive object type classifier');
assert.match(html, /data-context-mode=/, 'missing analyzer context comparison');
assert.match(html, /IntersectionObserver/, 'missing presenter navigation state');
assert.match(html, /prefers-reduced-motion/, 'missing reduced-motion support');
assert.match(html, /@media print/, 'missing printable architecture handout mode');

assert.match(
  html,
  /\.split\s*\{[^}]*grid-template-columns:\s*1fr/s,
  'complex diagrams must use the full content width'
);
assert.match(
  html,
  /<svg viewBox="0 0 820 340"[^>]*aria-labelledby="archive-title"/,
  'archive diagram must reserve a safe right margin'
);
assert.match(
  html,
  /<svg viewBox="0 0 1000 420"[^>]*aria-labelledby="type-tree-title"/,
  'type decision diagram must use the non-overlapping layout'
);
assert.doesNotMatch(html, /transform="rotate\(90/, 'diagram labels must not be clipped vertically');

assert.doesNotMatch(html, /<script[^>]+src=/i, 'presentation must not load external scripts');
assert.doesNotMatch(html, /<link[^>]+href=/i, 'presentation must not load external stylesheets');
assert.doesNotMatch(html, /https?:\/\//i, 'presentation must be fully self-contained');

console.log('Architecture presentation checks passed.');
