/**
 * Test Script for Static Analysis Fixes
 * Tests the three specific fixes:
 * 1. System objects (bpmext, page, TWDate) should not trigger no-undef
 * 2. Scripts with type 'Inline CSS' and 'Coachflow Script Pattern 3' should be skipped
 * 3. Performance warnings (nested loops, if-in-loop) should be reported
 */

const StaticAnalysisService = require('./src/static-analysis/StaticAnalysisService');

// Test scripts
const testScripts = [
    {
        id: 'test-system-objects',
        name: 'Test System Objects',
        scriptType: 'JavaScript',
        content: `
// Test system objects - should NOT report no-undef
function testSystemObjects() {
    var ext = bpmext.ui.getCoachView();
    var currentPage = page.ui.getView();
    var date = new TWDate();
    return { ext, currentPage, date };
}
        `
    },
    {
        id: 'test-inline-css',
        name: 'Inline CSS',
        scriptType: 'Inline CSS',
        content: `
.my-class {
    color: red;
    background: blue;
}
        `
    },
    {
        id: 'test-coachflow-pattern',
        name: 'Coachflow Script Pattern 3',
        scriptType: 'JavaScript',
        content: `
// This should be skipped
function someFunction() {
    return true;
}
        `
    },
    {
        id: 'test-nested-loops',
        name: 'Test Nested Loops',
        scriptType: 'JavaScript',
        content: `
// Test nested loops - should report performance warning
function processMatrix(matrix) {
    for (var i = 0; i < matrix.length; i++) {
        for (var j = 0; j < matrix[i].length; j++) {
            console.log(matrix[i][j]);
        }
    }
}
        `
    },
    {
        id: 'test-if-in-loop',
        name: 'Test If in Loop',
        scriptType: 'JavaScript',
        content: `
// Test if in loop without break - should report performance warning
function findItem(items, target) {
    for (var i = 0; i < items.length; i++) {
        if (items[i] === target) {
            console.log('Found it');
            // No break or continue - should warn
        }
    }
}
        `
    },
    {
        id: 'test-if-in-loop-with-break',
        name: 'Test If in Loop with Break',
        scriptType: 'JavaScript',
        content: `
// Test if in loop WITH break - should NOT warn
function findItemCorrect(items, target) {
    for (var i = 0; i < items.length; i++) {
        if (items[i] === target) {
            console.log('Found it');
            break; // Has break - should NOT warn
        }
    }
}
        `
    }
];

async function runTests() {
    console.log('='.repeat(80));
    console.log('STATIC ANALYSIS FIXES TEST');
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
            console.log(`Type: ${testScripts.find(s => s.id === result.scriptId)?.scriptType || 'Unknown'}`);
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

        const testSystemObjects = results.results.find(r => r.scriptId === 'test-system-objects');
        const testInlineCSS = results.results.find(r => r.scriptId === 'test-inline-css');
        const testCoachflowPattern = results.results.find(r => r.scriptId === 'test-coachflow-pattern');
        const testNestedLoops = results.results.find(r => r.scriptId === 'test-nested-loops');
        const testIfInLoop = results.results.find(r => r.scriptId === 'test-if-in-loop');
        const testIfInLoopWithBreak = results.results.find(r => r.scriptId === 'test-if-in-loop-with-break');

        // Fix 1: System objects should not trigger no-undef
        const hasNoUndefForSystemObjects = !testSystemObjects.issues.some(i => 
            i.rule === 'no-undef' && (
                i.description?.includes('bpmext') || 
                i.description?.includes('page') || 
                i.description?.includes('TWDate')
            )
        );
        console.log('✓ Fix 1 (System Objects - bpmext, page, TWDate): ' + 
            (hasNoUndefForSystemObjects ? '✅ PASS - No no-undef errors for system objects' : '❌ FAIL - System objects trigger no-undef'));

        // Fix 2a: Inline CSS should be skipped (no issues reported)
        const inlineCSSSkipped = testInlineCSS.issues.length === 0 && testInlineCSS.skipped === true;
        console.log('✓ Fix 2a (Skip Inline CSS): ' +
            (inlineCSSSkipped ? '✅ PASS - Inline CSS skipped (no issues)' : '❌ FAIL - Inline CSS not skipped properly'));

        // Fix 2b: Coachflow Script Pattern 3 should be skipped (no issues reported)
        const coachflowSkipped = testCoachflowPattern.issues.length === 0 && testCoachflowPattern.skipped === true;
        console.log('✓ Fix 2b (Skip Coachflow Script Pattern 3): ' +
            (coachflowSkipped ? '✅ PASS - Coachflow pattern skipped (no issues)' : '❌ FAIL - Coachflow pattern not skipped properly'));

        // Fix 3a: Nested loops should report performance warning
        const nestedLoopsWarning = testNestedLoops.issues.some(i => 
            i.rule === 'custom-nested-loops' && 
            i.severity === 'warning' && 
            i.category === 'performance'
        );
        console.log('✓ Fix 3a (Nested Loops Performance Warning): ' + 
            (nestedLoopsWarning ? '✅ PASS - Nested loops warning reported' : '❌ FAIL - Nested loops warning not reported'));

        // Fix 3b: If in loop without break should report performance warning
        const ifInLoopWarning = testIfInLoop.issues.some(i => 
            i.rule === 'custom-if-in-loop-no-break' && 
            i.severity === 'warning' && 
            i.category === 'performance'
        );
        console.log('✓ Fix 3b (If in Loop without Break Warning): ' + 
            (ifInLoopWarning ? '✅ PASS - If-in-loop warning reported' : '❌ FAIL - If-in-loop warning not reported'));

        // Fix 3c: If in loop WITH break should NOT report warning
        const ifInLoopWithBreakNoWarning = !testIfInLoopWithBreak.issues.some(i => 
            i.rule === 'custom-if-in-loop-no-break'
        );
        console.log('✓ Fix 3c (If in Loop with Break - No Warning): ' + 
            (ifInLoopWithBreakNoWarning ? '✅ PASS - No warning when break present' : '❌ FAIL - Warning reported despite break'));

        // Check performance category exists in statistics
        const performanceCategoryExists = results.statistics.issuesByCategory.performance > 0;
        console.log('✓ Performance Category in Statistics: ' + 
            (performanceCategoryExists ? `✅ PASS - ${results.statistics.issuesByCategory.performance} performance issues` : '❌ FAIL - No performance category'));

        console.log('');
        console.log('='.repeat(80));
        
        // Overall result
        const allPassed = hasNoUndefForSystemObjects && 
                         inlineCSSSkipped && 
                         coachflowSkipped && 
                         nestedLoopsWarning && 
                         ifInLoopWarning && 
                         ifInLoopWithBreakNoWarning &&
                         performanceCategoryExists;

        if (allPassed) {
            console.log('🎉 ALL TESTS PASSED! All fixes are working correctly.');
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

