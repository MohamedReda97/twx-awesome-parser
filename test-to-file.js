/**
 * File-based diagnostic test
 */
const fs = require('fs');

async function testToFile() {
    const logFile = './diagnostic-output.txt';
    const log = (message) => {
        console.log(message);
        fs.appendFileSync(logFile, message + '\n');
    };
    
    // Clear previous log
    if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
    }
    
    log('TWX Parser Diagnostics - ' + new Date().toISOString());
    log('='.repeat(50));
    
    try {
        // Test basic file operations
        log('Testing basic file operations...');
        const testFile = './temp/TWX Example.twx';
        
        if (fs.existsSync(testFile)) {
            const stats = fs.statSync(testFile);
            log(`✅ Test file exists: ${stats.size} bytes`);
        } else {
            log('❌ Test file not found');
            return;
        }
        
        // Test ZIP loading
        log('Testing ZIP functionality...');
        const ADMZip = require('adm-zip');
        const zip = new ADMZip(testFile);
        log(`✅ ZIP loaded with ${zip.getEntries().length} entries`);
        
        // Test TWX extractor
        log('Testing TWX extractor...');
        const TWXExtractor = require('./src/parser/twx-extractor');
        const extractor = new TWXExtractor();
        log('✅ TWX extractor created');
        
        // Attempt extraction
        log('Attempting extraction...');
        const result = await extractor.extractTWX(testFile);
        log(`✅ Extraction successful: ${result.objects.length} objects`);
        
        log('🎉 All tests passed!');
        
    } catch (error) {
        log(`❌ Error: ${error.message}`);
        log(`Stack: ${error.stack}`);
    }
}

testToFile();
