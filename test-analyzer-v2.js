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
      name: 'Duplicated script', script: `
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

assert.equal(result.schemaVersion, 2, 'analyzer must emit schema v2')
assert.equal(result.status, 'partial', 'invalid scripts must make the report partial')
assert.equal(result.meta.targetBawVersion, '24', 'BAW version must be inferred from metadata')
assert.equal(result.meta.toolkitsUsedAsContext, 1, 'toolkits must be counted as context')
assert.equal(result.coverage.eligibleAppElements, 2, 'duplicate extractor representations must be analyzed once')
assert.equal(result.coverage.analyzedAppElements, 1, 'only strict-parsed app scripts count as analyzed')
assert.equal(result.coverage.skippedAppElements, 1, 'invalid app scripts must be recorded as skipped')
assert.equal(result.byAppType.Service.elements, 2, 'only app server-side script units belong in coverage')
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
assert.ok(result.findings.every(finding => finding.id === new TWXAnalyzer([app], { toolkits: [toolkit], metadata: { buildInfo: { buildVersion: 'BAW 24.0.0' } } }).analyze().findings.find(other => other.ruleId === finding.ruleId && other.location.line === finding.location.line)?.id || finding.ruleId === 'javascript-syntax-error'), 'finding IDs must be stable')
assert.equal(new TWXAnalyzer([], { targetBawVersion: '21' }).analyze().meta.targetVersionSource, 'override')
assert.equal(new TWXAnalyzer([]).analyze().meta.targetVersionSource, 'unknown')

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
    const failed = JSON.parse(fs.readFileSync(path.join(tempDir, 'output', 'analysis.json'), 'utf8'))
    assert.equal(failed.status, 'failed', 'a failed analysis must replace the previous success report')
    assert.deepEqual(failed.findings, [])
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
