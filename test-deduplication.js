/**
 * Test Script for Duplicate Issue Detection and Prevention
 * Tests that the same script content is not collected multiple times
 */

const ScriptCollectionService = require('./src/ai-review/ScriptCollectionService');

// Create test objects with duplicate script content
const testObjects = [
    {
        id: 'obj1',
        name: 'Test Process',
        type: '1',
        subType: '10',
        source: 'process',
        details: {
            // Main scripts array
            scripts: [
                {
                    name: 'Validation (Script Task)',
                    content: `
// Validation script
if (tw.local.odsRequest.stepLog.action == tw.env.VALIDATION_ACTION) {
    mandatory(tw.local.odsRequest.stepLog.comment, "Comment is mandatory");
}

if (true) {
    // Some validation logic
    mandatory(tw.local.odsRequest.BasicDetails.expiryDate, "Expiry date is mandatory");
    mandatory(tw.local.odsRequest.BasicDetails.paymentDate, "Payment date is mandatory");
}
                    `,
                    elementType: 'scriptTask',
                    scriptType: 'main'
                }
            ],
            // Process elements (might contain the same script)
            elements: {
                scriptTasks: [
                    {
                        id: 'task1',
                        name: 'Validation',
                        script: `
// Validation script
if (tw.local.odsRequest.stepLog.action == tw.env.VALIDATION_ACTION) {
    mandatory(tw.local.odsRequest.stepLog.comment, "Comment is mandatory");
}

if (true) {
    // Some validation logic
    mandatory(tw.local.odsRequest.BasicDetails.expiryDate, "Expiry date is mandatory");
    mandatory(tw.local.odsRequest.BasicDetails.paymentDate, "Payment date is mandatory");
}
                        `
                    }
                ]
            }
        }
    },
    {
        id: 'obj2',
        name: 'Test Coach View',
        type: '64',
        source: 'coachview',
        details: {
            scripts: [
                {
                    name: 'Client-Side Script',
                    content: `
// VALIDATE DATE OBJECT
if (field && field.getTime && isFinite(field.getTime())) {
    // Valid date
} else {
    addError(fieldName, message, message, true);
    mandatoryTriggered = true;
}
                    `,
                    scriptType: 'clientSide'
                }
            ],
            inlineScripts: [
                {
                    name: 'Inline Validation',
                    scriptBlock: `
// VALIDATE DATE OBJECT
if (field && field.getTime && isFinite(field.getTime())) {
    // Valid date
} else {
    addError(fieldName, message, message, true);
    mandatoryTriggered = true;
}
                    `
                }
            ]
        }
    },
    {
        id: 'obj3',
        name: 'Another Process',
        type: '1',
        subType: '10',
        source: 'process',
        details: {
            elements: {
                scriptTasks: [
                    {
                        id: 'task2',
                        name: 'Empty Block Check',
                        script: `
default:

// VALIDATE DATE OBJECT
if (field && field.getTime && isFinite(field.getTime())) {
} else {
    addError(fieldName, message, message, true);
    mandatoryTriggered = true;
}
                        `
                    }
                ]
            }
        }
    }
];

async function runDeduplicationTest() {
    console.log('='.repeat(80));
    console.log('DUPLICATE SCRIPT DETECTION TEST');
    console.log('='.repeat(80));
    console.log('');

    const service = new ScriptCollectionService();
    
    console.log('📊 Test Setup:');
    console.log(`   - Object 1: Has same script in both "scripts" array and "scriptTasks"`);
    console.log(`   - Object 2: Has same script in both "scripts" array and "inlineScripts"`);
    console.log(`   - Object 3: Has a script with same content (different formatting)`);
    console.log('');

    // Collect scripts
    const collectedScripts = service.collectAllScripts(testObjects);

    console.log('');
    console.log('='.repeat(80));
    console.log('COLLECTION RESULTS');
    console.log('='.repeat(80));
    console.log('');

    console.log(`Total scripts collected: ${collectedScripts.length}`);
    console.log('');

    console.log('Scripts collected:');
    collectedScripts.forEach((script, index) => {
        console.log(`  ${index + 1}. ${script.name}`);
        console.log(`     Source: ${script.source_object} (${script.source_type})`);
        console.log(`     Content length: ${script.content.length} chars`);
        console.log(`     First 50 chars: ${script.content.substring(0, 50).replace(/\n/g, ' ')}...`);
        console.log('');
    });

    console.log('='.repeat(80));
    console.log('VALIDATION CHECKS');
    console.log('='.repeat(80));
    console.log('');

    // Check 1: Should not have duplicate "Validation" scripts
    const validationScripts = collectedScripts.filter(s => 
        s.name.includes('Validation') || s.content.includes('tw.local.odsRequest.stepLog.action')
    );
    const noDuplicateValidation = validationScripts.length === 1;
    console.log('✓ Check 1 (No duplicate Validation scripts): ' + 
        (noDuplicateValidation ? 
            `✅ PASS - Only 1 validation script collected` : 
            `❌ FAIL - ${validationScripts.length} validation scripts found (expected 1)`));

    // Check 2: Should not have duplicate "Client-Side" / "Inline" scripts
    // Note: "Empty Block Check" has different content (has "default:" prefix), so it's not a duplicate
    const clientSideScripts = collectedScripts.filter(s =>
        (s.name.includes('Client-Side') || s.name.includes('Inline')) &&
        !s.name.includes('Empty')
    );
    const noDuplicateClientSide = clientSideScripts.length === 1;
    console.log('✓ Check 2 (No duplicate Client-Side scripts): ' +
        (noDuplicateClientSide ?
            `✅ PASS - Only 1 client-side script collected` :
            `❌ FAIL - ${clientSideScripts.length} client-side scripts found (expected 1)`));

    // Check 3: Total unique scripts should be 3 (Validation, Client-Side, Empty Block Check)
    const expectedTotal = 3;
    const correctTotal = collectedScripts.length === expectedTotal;
    console.log('✓ Check 3 (Correct total count): ' + 
        (correctTotal ? 
            `✅ PASS - ${collectedScripts.length} unique scripts` : 
            `❌ FAIL - ${collectedScripts.length} scripts (expected ${expectedTotal})`));

    console.log('');
    console.log('='.repeat(80));

    // Overall result
    const allPassed = noDuplicateValidation && noDuplicateClientSide && correctTotal;

    if (allPassed) {
        console.log('🎉 ALL TESTS PASSED! Deduplication is working correctly.');
    } else {
        console.log('⚠️  SOME TESTS FAILED. Duplicates may still be present.');
    }
    
    console.log('='.repeat(80));
}

// Run test
runDeduplicationTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});

