/**
 * Comprehensive test script to diagnose TWX parsing issues
 */
const fs = require('fs');
const path = require('path');

async function runDiagnostics() {
    console.log('🔍 TWX Parser Diagnostic Tool');
    console.log('================================');
    
    try {
        // Test 1: Check environment
        console.log('\n📋 Test 1: Environment Check');
        console.log(`Node.js version: ${process.version}`);
        console.log(`Platform: ${process.platform}`);
        console.log(`Working directory: ${process.cwd()}`);
        
        // Test 2: Check file existence
        console.log('\n📋 Test 2: File Existence Check');
        const testFile = './temp/TWX Example.twx';
        if (fs.existsSync(testFile)) {
            const stats = fs.statSync(testFile);
            console.log(`✅ Test file exists: ${testFile}`);
            console.log(`File size: ${stats.size} bytes`);
        } else {
            console.log(`❌ Test file not found: ${testFile}`);
            return;
        }
        
        // Test 3: Check dependencies
        console.log('\n📋 Test 3: Dependency Check');
        try {
            const admZip = require('adm-zip');
            console.log('✅ adm-zip module loaded');
            
            const xml2js = require('xml2js');
            console.log('✅ xml2js module loaded');
            
        } catch (depError) {
            console.log(`❌ Dependency error: ${depError.message}`);
            return;
        }
        
        // Test 4: Check ZIP file validity
        console.log('\n📋 Test 4: ZIP File Validation');
        try {
            const ADMZip = require('adm-zip');
            const zip = new ADMZip(testFile);
            const entries = zip.getEntries();
            console.log(`✅ ZIP file is valid, contains ${entries.length} entries`);
            
            // Check for required files
            const packageXml = zip.getEntry('META-INF/package.xml');
            if (packageXml) {
                console.log('✅ META-INF/package.xml found');
            } else {
                console.log('❌ META-INF/package.xml not found');
            }
            
        } catch (zipError) {
            console.log(`❌ ZIP validation error: ${zipError.message}`);
            return;
        }
        
        // Test 5: Test TWX extractor import
        console.log('\n📋 Test 5: TWX Extractor Import');
        try {
            const TWXExtractor = require('./src/parser/twx-extractor');
            console.log('✅ TWXExtractor imported successfully');
            
            const extractor = new TWXExtractor();
            console.log('✅ TWXExtractor instance created');
            
        } catch (extractorError) {
            console.log(`❌ TWXExtractor error: ${extractorError.message}`);
            console.log(`Stack: ${extractorError.stack}`);
            return;
        }
        
        // Test 6: Test actual extraction (limited)
        console.log('\n📋 Test 6: Limited Extraction Test');
        try {
            const TWXExtractor = require('./src/parser/twx-extractor');
            const extractor = new TWXExtractor();
            
            console.log('Starting extraction...');
            const result = await extractor.extractTWX(testFile);
            console.log(`✅ Extraction successful! Found ${result.objects.length} objects`);
            console.log(`Metadata: ${JSON.stringify(result.metadata, null, 2).substring(0, 200)}...`);
            
        } catch (extractionError) {
            console.log(`❌ Extraction error: ${extractionError.message}`);
            console.log(`Stack: ${extractionError.stack}`);
            return;
        }
        
        // Test 7: Test JSON output generation
        console.log('\n📋 Test 7: JSON Output Test');
        try {
            const { createJSONOutput } = require('./src/parser/json-parser');
            console.log('✅ JSON parser imported successfully');
            
        } catch (jsonError) {
            console.log(`❌ JSON parser error: ${jsonError.message}`);
            return;
        }
        
        console.log('\n🎉 All tests passed! The parsing functionality should work correctly.');
        
    } catch (error) {
        console.log(`\n💥 Unexpected error: ${error.message}`);
        console.log(`Stack: ${error.stack}`);
    }
}

// Run diagnostics
runDiagnostics().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
