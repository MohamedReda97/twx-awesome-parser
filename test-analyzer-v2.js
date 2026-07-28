const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const TWXAnalyzer = require('./src/parser/analyzer')
const { JSONParser } = require('./src/parser/json-parser')

const app = {
  id: 'app-service',
  name: 'App Service',
  type: 'process',
  subType: '12',
  details: {
    variables: { input: [], output: [], private: [{ name: 'declared' }] },
    elements: {
      scriptTasks: [{
        id: 'main-script', name: 'Main script', script: `
        var zero = 0;
        var nothing = null;
        5 / zero;
        nothing.name;
        eval(tw.local.userInput);
        while (true) { log.info('still here'); }
        try { missingFunction(); } catch (error) {}
        var query = 'select * from users where id=' + tw.local.userInput;
        var password = 'hunter2';
        ToolkitUtility();
        tw.local.declared;
        tw.local.missing;
      `
      }, { id: 'broken-script', name: 'Broken script', script: 'var = ;' }]
    },
    scripts: [{
      name: 'Main script', script: `
        var zero = 0;
        var nothing = null;
        5 / zero;
        nothing.name;
        eval(tw.local.userInput);
        while (true) { log.info('still here'); }
        try { missingFunction(); } catch (error) {}
        var query = 'select * from users where id=' + tw.local.userInput;
        var password = 'hunter2';
        ToolkitUtility();
        tw.local.declared;
        tw.local.missing;
      `
    }]
  }
}
const toolkit = {
  objects: [{ id: 'toolkit-service', name: 'ToolkitUtility', type: 'process', subType: '12', details: { scripts: [{ name: 'Ignored broken toolkit script', script: 'var = ;' }] } }]
}
const result = new TWXAnalyzer([app], {
  toolkits: [toolkit], metadata: { buildInfo: { buildVersion: 'BAW 24.0.0' } }, sourceFile: 'sample.twx'
}).analyze()
const rules = new Set(result.findings.map(finding => finding.ruleId))
const ruleIds = source => new TWXAnalyzer([{
  id: 'boundary-service',
  name: 'Boundary service',
  type: 'process',
  subType: '12',
  details: { elements: { scriptTasks: [{ id: 'boundary', name: 'Boundary', script: source }] } }
}]).analyze().findings.map(finding => finding.ruleId)

assert.equal(result.schemaVersion, 2, 'analyzer must emit schema v2')
assert.equal(result.status, 'partial', 'invalid scripts must make the report partial')
assert.equal(result.meta.targetBawVersion, '24', 'BAW version must be inferred from metadata')
assert.equal(result.meta.toolkitsUsedAsContext, 1, 'toolkits must be counted as context')
assert.equal(result.coverage.eligibleAppElements, 3, 'different extractor identities must remain separate')
assert.equal(result.coverage.analyzedAppElements, 2, 'only strict-parsed app scripts count as analyzed')
assert.equal(result.coverage.skippedAppElements, 1, 'invalid app scripts must be recorded as skipped')
assert.equal(result.byAppType.Service.elements, 3, 'only app server-side script units belong in coverage')
assert.ok(rules.has('javascript-syntax-error'))
assert.ok(rules.has('undefined-identifier'))
assert.ok(rules.has('division-by-zero'))
assert.ok(rules.has('null-or-undefined-access'))
assert.ok(rules.has('unsafe-dynamic-execution'))
assert.ok(rules.has('undeclared-process-variable'))
assert.ok(rules.has('loop-with-no-demonstrable-exit'))
assert.ok(rules.has('empty-catch'))
assert.ok(rules.has('dynamic-sql'))
assert.ok(rules.has('embedded-secret'))
assert.ok(!result.findings.some(finding => finding.objectId === 'toolkit-service'), 'toolkit scripts must never produce findings')
assert.ok(!result.findings.some(finding => /ToolkitUtility is referenced/.test(finding.message)), 'toolkit declarations must resolve app references')
const repeatedIds = new TWXAnalyzer([app], {
  toolkits: [toolkit], metadata: { buildInfo: { buildVersion: 'BAW 24.0.0' } }
}).analyze().findings.map(finding => finding.id)
assert.deepEqual(result.findings.map(finding => finding.id), repeatedIds, 'finding IDs must be stable')
assert.equal(new TWXAnalyzer([], { targetBawVersion: '21' }).analyze().meta.targetVersionSource, 'override')
assert.equal(new TWXAnalyzer([]).analyze().meta.targetVersionSource, 'unknown')
assert.deepEqual(ruleIds('var value; value = 2; 10 / value;'), [], 'uninitialized declarations must not crash or report a division')
assert.ok(!ruleIds('var divisor = 0; divisor = 2; 10 / divisor;').includes('division-by-zero'), 'reassignment must invalidate a zero proof')
assert.ok(!ruleIds('var divisor = 2; if (false) divisor = 0; 10 / divisor;').includes('division-by-zero'), 'branch assignments are not definite')
assert.ok(!ruleIds('var receiver = null; receiver = {}; receiver.value;').includes('null-or-undefined-access'), 'reassignment must invalidate a null proof')
assert.ok(!ruleIds('new TWSearchColumn();').includes('undefined-identifier'), 'known BAW globals must not be reported')
assert.ok(ruleIds('var result = 10 / 0;').includes('division-by-zero'), 'literal zero in an initializer is definite')
assert.ok(ruleIds('function run () { return 10 / 0; }').includes('division-by-zero'), 'literal zero in a nested function is definite')
assert.ok(!ruleIds('var nullValue = null; nullValue?.property;').includes('null-or-undefined-access'), 'optional chaining guards a null receiver')
assert.equal(ruleIds('missing();').length, 1)

const identicalScripts = {
  ...app,
  details: {
    elements: {
      scriptTasks: [
        { id: 'first', name: 'First', script: 'missing();' },
        { id: 'second', name: 'Second', script: 'missing();' }
      ]
    }
  }
}
const identicalResult = new TWXAnalyzer([identicalScripts]).analyze()
assert.equal(identicalResult.coverage.eligibleAppElements, 2, 'identical source in different elements must remain separate')
assert.deepEqual(identicalResult.findings.map(finding => finding.elementId).sort(), ['first', 'second'])
assert.ok(ruleIds('while (true) { switch (1) { case 1: break; } }').includes('loop-with-no-demonstrable-exit'), 'a switch break does not exit the loop')
assert.ok(!ruleIds('outer: while (true) { for (;;) { break outer; } }').includes('loop-with-no-demonstrable-exit'), 'a labelled outer break exits the loop')
assert.ok(ruleIds('while (true) { inner: { break inner; } }').includes('loop-with-no-demonstrable-exit'), 'an inner label break does not exit the loop')

const dedupedScripts = {
  ...app,
  details: {
    elements: { scriptTasks: [{ id: 'service-Main script', name: 'Main script', script: 'missing();' }] },
    scripts: [{ name: 'Main script', script: 'missing();' }]
  }
}
assert.equal(new TWXAnalyzer([dedupedScripts]).analyze().coverage.eligibleAppElements, 1, 'identical extractor representations with the same identity must be deduplicated')

async function parserChecks () {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'twx-analyzer-v2-'))
  const previousDir = process.cwd()
  const analyzerPath = require.resolve('./src/parser/analyzer')
  const originalAnalyzer = require.cache[analyzerPath].exports
  try {
    process.chdir(tempDir)
    const extractedData = {
      objects: [app],
      toolkits: [toolkit],
      allObjects: [app, ...toolkit.objects],
      dependencies: [],
      metadata: { buildInfo: { buildVersion: 'BAW 24.0.0' } },
      extractedAt: '2026-07-28T00:00:00.000Z',
      sourceFile: 'sample.twx'
    }
    await new JSONParser(path.join(tempDir, 'output')).generateOutputFiles(extractedData)
    const outputReport = fs.readFileSync(path.join(tempDir, 'output', 'analysis.json'), 'utf8')
    assert.equal(outputReport, fs.readFileSync(path.join(tempDir, 'analysis.json'), 'utf8'), 'both analysis copies must come from one serialization')
    assert.equal(JSON.parse(outputReport).meta.toolkitsUsedAsContext, 1)

    require.cache[analyzerPath].exports = class { analyze () { throw new Error('injected analyzer failure') } }
    await new JSONParser(path.join(tempDir, 'output')).generateOutputFiles(extractedData)
    const failedReport = fs.readFileSync(path.join(tempDir, 'output', 'analysis.json'), 'utf8')
    const failed = JSON.parse(failedReport)
    assert.equal(failed.status, 'failed', 'a failed analysis must replace the previous success report')
    assert.deepEqual(failed.findings, [])
    assert.equal(failedReport, fs.readFileSync(path.join(tempDir, 'analysis.json'), 'utf8'), 'the root report must be replaced after failure too')
  } finally {
    require.cache[analyzerPath].exports = originalAnalyzer
    process.chdir(previousDir)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

parserChecks()
  .then(() => console.log('analyzer v2 checks passed'))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
