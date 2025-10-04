/**
 * Test Script for Static Analysis Implementation
 * Tests the Prettier → ESLint workflow with critical-only reporting
 */

const StaticAnalysisService = require('./src/static-analysis/StaticAnalysisService');

// Test scripts with various issues
const testScripts = [
    {
        id: 'test-1',
        name: 'Style Issues Only (Should NOT Report)',
        content: `
// This has style issues but should NOT be reported
var x=1;  // no-var, spacing issues
var y = 2
console.log(x,y)  // missing semicolon
        `
    },
    {
        id: 'test-2',
        name: 'Critical Runtime Error (Should Report)',
        content: `
// This has undefined variable - CRITICAL
function test() {
    return undefinedVariable; // no-undef - SHOULD REPORT
}
        `
    },
    {
        id: 'test-3',
        name: 'Security Issue (Should Report)',
        content: `
// This has eval - CRITICAL SECURITY
function dangerous(code) {
    eval(code); // no-eval - SHOULD REPORT
}
        `
    },
    {
        id: 'test-4',
        name: 'Duplicate Keys (Should Report)',
        content: `
// Duplicate object keys - CRITICAL
const obj = {
    name: 'first',
    name: 'second' // no-dupe-keys - SHOULD REPORT
};
        `
    },
    {
        id: 'test-5',
        name: 'Clean Code (Should NOT Report)',
        content: `
// This is clean code
function add(a, b) {
    return a + b;
}

const result = add(1, 2);
console.log(result);
        `
    },
    {
        id: 'test-6',
        name: 'Nested Loops (Custom Warning)',
        content: `
// Nested loops - custom analysis
for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
        console.log(i, j);
    }
}
        `
    }
];

async function runTests() {
    console.log('='.repeat(80));
    console.log('STATIC ANALYSIS TEST - Prettier → ESLint Critical-Only Workflow');
    console.log('='.repeat(80));
    console.log('');

    const service = new StaticAnalysisService();
    
    try {
        // Initialize the service
        await service.initializeTools();
        console.log('');

        // Analyze all test scripts
        const results = await service.analyzeScripts(testScripts);

        console.log('');
        console.log('='.repeat(80));
        console.log('TEST RESULTS SUMMARY');
        console.log('='.repeat(80));
        console.log('');
        console.log(`Total Scripts Analyzed: ${results.statistics.totalScripts}`);
        console.log(`Scripts with Issues: ${results.statistics.scriptsWithIssues}`);
        console.log(`Total Issues Found: ${results.statistics.totalIssues}`);
        console.log('');
        console.log('Issues by Severity:');
        console.log(`  - Errors: ${results.statistics.issuesBySeverity.error}`);
        console.log(`  - Warnings: ${results.statistics.issuesBySeverity.warning}`);
        console.log(`  - Info: ${results.statistics.issuesBySeverity.info}`);
        console.log('');
        console.log('Issues by Category:');
        Object.entries(results.statistics.issuesByCategory).forEach(([category, count]) => {
            console.log(`  - ${category}: ${count}`);
        });
        console.log('');

        // Detailed results for each script
        console.log('='.repeat(80));
        console.log('DETAILED RESULTS BY SCRIPT');
        console.log('='.repeat(80));
        console.log('');

        results.results.forEach(result => {
            console.log(`Script: ${result.scriptName} (ID: ${result.scriptId})`);
            console.log(`Issues Found: ${result.issues.length}`);
            
            if (result.issues.length > 0) {
                result.issues.forEach((issue, index) => {
                    console.log(`  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.rule}`);
                    console.log(`     Line ${issue.line}, Column ${issue.column}`);
                    console.log(`     Category: ${issue.category}`);
                    console.log(`     Message: ${issue.description}`);
                    console.log(`     Code: ${issue.code}`);
                    console.log('');
                });
            } else {
                console.log('  ✅ No issues found');
            }
            console.log('-'.repeat(80));
            console.log('');
        });

        // Validation
        console.log('='.repeat(80));
        console.log('VALIDATION CHECKS');
        console.log('='.repeat(80));
        console.log('');

        const test1 = results.results.find(r => r.scriptId === 'test-1');
        const test2 = results.results.find(r => r.scriptId === 'test-2');
        const test3 = results.results.find(r => r.scriptId === 'test-3');
        const test4 = results.results.find(r => r.scriptId === 'test-4');
        const test5 = results.results.find(r => r.scriptId === 'test-5');

        console.log('✓ Test 1 (Style Issues): ' + 
            (test1.issues.length === 0 ? '✅ PASS - No style issues reported' : '❌ FAIL - Style issues reported'));
        
        console.log('✓ Test 2 (Undefined Variable): ' + 
            (test2.issues.some(i => i.rule === 'no-undef') ? '✅ PASS - Critical error detected' : '❌ FAIL - Critical error missed'));
        
        console.log('✓ Test 3 (Security - eval): ' + 
            (test3.issues.some(i => i.rule === 'no-eval') ? '✅ PASS - Security issue detected' : '❌ FAIL - Security issue missed'));
        
        console.log('✓ Test 4 (Duplicate Keys): ' + 
            (test4.issues.some(i => i.rule === 'no-dupe-keys') ? '✅ PASS - Runtime error detected' : '❌ FAIL - Runtime error missed'));
        
        console.log('✓ Test 5 (Clean Code): ' + 
            (test5.issues.length === 0 ? '✅ PASS - No false positives' : '❌ FAIL - False positives detected'));

        console.log('');
        console.log('='.repeat(80));
        console.log('TEST COMPLETE');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

