/**
 * Test Script for New Warning Rules and Nested Loop Depth
 * Tests:
 * 1. Nested loops only report at depth 3+
 * 2. New warning rules: no-unused-vars, no-unmodified-loop-condition, 
 *    no-unreachable-loop, sonarjs/no-identical-expressions, sonarjs/no-identical-functions
 */

const StaticAnalysisService = require('./src/static-analysis/StaticAnalysisService');

// Test scripts
const testScripts = [
    {
        id: 'test-2-level-nested-loops',
        name: 'Test 2-Level Nested Loops (Should NOT warn)',
        scriptType: 'JavaScript',
        content: `
// 2-level nested loops - should NOT report warning
function process2D(matrix) {
    for (var i = 0; i < matrix.length; i++) {
        for (var j = 0; j < matrix[i].length; j++) {
            console.log(matrix[i][j]);
        }
    }
}
        `
    },
    {
        id: 'test-3-level-nested-loops',
        name: 'Test 3-Level Nested Loops (Should WARN)',
        scriptType: 'JavaScript',
        content: `
// 3-level nested loops - should report warning
function process3D(cube) {
    for (var i = 0; i < cube.length; i++) {
        for (var j = 0; j < cube[i].length; j++) {
            for (var k = 0; k < cube[i][j].length; k++) {
                console.log(cube[i][j][k]);
            }
        }
    }
}
        `
    },
    {
        id: 'test-unused-vars',
        name: 'Test Unused Variables',
        scriptType: 'JavaScript',
        content: `
// Unused variables - should warn
function testUnused() {
    var unusedVar = 10;
    var usedVar = 20;
    return usedVar;
}
        `
    },
    {
        id: 'test-unmodified-loop-condition',
        name: 'Test Unmodified Loop Condition',
        scriptType: 'JavaScript',
        content: `
// Unmodified loop condition - should warn
function testUnmodifiedLoop() {
    var flag = true;
    while (flag) {
        console.log('This will loop forever');
        // flag is never modified
    }
}
        `
    },
    {
        id: 'test-unreachable-loop',
        name: 'Test Unreachable Loop',
        scriptType: 'JavaScript',
        content: `
// Unreachable loop - should warn
function testUnreachableLoop(items) {
    for (var i = 0; i < items.length; i++) {
        console.log(items[i]);
        return; // Loop can only run once
    }
}
        `
    },
    {
        id: 'test-identical-expressions',
        name: 'Test Identical Expressions',
        scriptType: 'JavaScript',
        content: `
// Identical expressions - should warn
function testIdenticalExpressions(x) {
    if (x > 10 || x > 10) {
        return true;
    }
    return false;
}
        `
    },
    {
        id: 'test-identical-functions',
        name: 'Test Identical Functions',
        scriptType: 'JavaScript',
        content: `
// Identical functions - should warn (need at least 3 statements for sonarjs)
function processA(data) {
    var result = data * 2;
    var adjusted = result + 10;
    return adjusted;
}

function processB(data) {
    var result = data * 2;
    var adjusted = result + 10;
    return adjusted;
}
        `
    }
];

async function runTests() {
    console.log('='.repeat(80));
    console.log('NEW WARNING RULES AND NESTED LOOP DEPTH TEST');
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
                    console.log(`     Category: ${issue.category}`);
                    console.log(`     Message: ${issue.description || issue.message}`);
                    if (issue.line) {
                        console.log(`     Line ${issue.line}, Column ${issue.column || 1}`);
                    }
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

        const test2Level = results.results.find(r => r.scriptId === 'test-2-level-nested-loops');
        const test3Level = results.results.find(r => r.scriptId === 'test-3-level-nested-loops');
        const testUnusedVars = results.results.find(r => r.scriptId === 'test-unused-vars');
        const testUnmodifiedLoop = results.results.find(r => r.scriptId === 'test-unmodified-loop-condition');
        const testUnreachableLoop = results.results.find(r => r.scriptId === 'test-unreachable-loop');
        const testIdenticalExpr = results.results.find(r => r.scriptId === 'test-identical-expressions');
        const testIdenticalFunc = results.results.find(r => r.scriptId === 'test-identical-functions');

        // Check 1: 2-level nested loops should NOT warn
        const no2LevelWarning = !test2Level.issues.some(i => i.rule === 'custom-nested-loops');
        console.log('✓ Check 1 (2-Level Nested Loops - No Warning): ' + 
            (no2LevelWarning ? '✅ PASS - No warning for 2-level nesting' : '❌ FAIL - Warning reported for 2-level nesting'));

        // Check 2: 3-level nested loops should warn
        const has3LevelWarning = test3Level.issues.some(i => 
            i.rule === 'custom-nested-loops' && 
            i.severity === 'warning' && 
            i.category === 'performance'
        );
        console.log('✓ Check 2 (3-Level Nested Loops - Warning): ' + 
            (has3LevelWarning ? '✅ PASS - Warning reported for 3-level nesting' : '❌ FAIL - No warning for 3-level nesting'));

        // Check 3: Unused vars should warn
        const hasUnusedVarsWarning = testUnusedVars.issues.some(i => 
            i.rule === 'no-unused-vars' && 
            i.severity === 'warning'
        );
        console.log('✓ Check 3 (no-unused-vars): ' + 
            (hasUnusedVarsWarning ? '✅ PASS - Warning reported' : '❌ FAIL - No warning'));

        // Check 4: Unmodified loop condition should warn
        const hasUnmodifiedLoopWarning = testUnmodifiedLoop.issues.some(i => 
            i.rule === 'no-unmodified-loop-condition' && 
            i.severity === 'warning'
        );
        console.log('✓ Check 4 (no-unmodified-loop-condition): ' + 
            (hasUnmodifiedLoopWarning ? '✅ PASS - Warning reported' : '❌ FAIL - No warning'));

        // Check 5: Unreachable loop should warn
        const hasUnreachableLoopWarning = testUnreachableLoop.issues.some(i => 
            i.rule === 'no-unreachable-loop' && 
            i.severity === 'warning'
        );
        console.log('✓ Check 5 (no-unreachable-loop): ' + 
            (hasUnreachableLoopWarning ? '✅ PASS - Warning reported' : '❌ FAIL - No warning'));

        // Check 6: Identical expressions should warn
        const hasIdenticalExprWarning = testIdenticalExpr.issues.some(i => 
            i.rule === 'sonarjs/no-identical-expressions' && 
            i.severity === 'warning'
        );
        console.log('✓ Check 6 (sonarjs/no-identical-expressions): ' + 
            (hasIdenticalExprWarning ? '✅ PASS - Warning reported' : '❌ FAIL - No warning'));

        // Check 7: Identical functions should warn
        const hasIdenticalFuncWarning = testIdenticalFunc.issues.some(i => 
            i.rule === 'sonarjs/no-identical-functions' && 
            i.severity === 'warning'
        );
        console.log('✓ Check 7 (sonarjs/no-identical-functions): ' + 
            (hasIdenticalFuncWarning ? '✅ PASS - Warning reported' : '❌ FAIL - No warning'));

        // Check warnings are in code_quality category
        const hasCodeQualityCategory = results.statistics.issuesByCategory.code_quality > 0;
        console.log('✓ Check 8 (code_quality category exists): ' + 
            (hasCodeQualityCategory ? `✅ PASS - ${results.statistics.issuesByCategory.code_quality} code quality issues` : '❌ FAIL - No code_quality category'));

        console.log('');
        console.log('='.repeat(80));
        
        // Overall result
        const allPassed = no2LevelWarning && 
                         has3LevelWarning && 
                         hasUnusedVarsWarning && 
                         hasUnmodifiedLoopWarning && 
                         hasUnreachableLoopWarning && 
                         hasIdenticalExprWarning && 
                         hasIdenticalFuncWarning &&
                         hasCodeQualityCategory;

        if (allPassed) {
            console.log('🎉 ALL TESTS PASSED! All new features are working correctly.');
        } else {
            console.log('⚠️  SOME TESTS FAILED. Please review the results above.');
        }
        
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

