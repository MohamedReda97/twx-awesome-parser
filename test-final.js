const a = JSON.parse(require('fs').readFileSync('output/analysis.json','utf8'));
console.log('=== ODC.twx Analysis ===');
console.log('summary:', JSON.stringify(a.summary));
console.log('findings:', a.findings.length);
const byRule = {};
for (const f of a.findings) {
    if (!byRule[f.ruleId]) byRule[f.ruleId] = { c: 0, w: 0 };
    if (f.severity === 'critical') byRule[f.ruleId].c++;
    else byRule[f.ruleId].w++;
}
console.log('by rule:', JSON.stringify(byRule));
const removed = ['empty-script','todo-comment','deprecated-api'];
const found = removed.filter(r => a.findings.some(f => f.ruleId === r));
console.log('removed rules found:', found.length === 0 ? 'NONE (PASS)' : found);

// False positive test
const TWXAnalyzer = require('./src/parser/analyzer');
const analyzer = new TWXAnalyzer([{
    id: 'test', name: 'Test', type: 'process', typeName: 'Process',
    details: { elements: { scriptTasks: [{
        name: 'Good', id: 't1', script: 'log.info("hello"); tw.system.user.name; Math.random(); new TWDate();',
    }]}}
}]);
const result = analyzer.analyze();
const crit = result.findings.filter(f => f.severity === 'critical');
console.log('\n=== False Positive Test ===');
console.log('critical on good script:', crit.length === 0 ? 'PASS (0)' : 'FAIL (' + crit.length + ')');
