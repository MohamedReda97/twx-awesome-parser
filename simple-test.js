// Simple test script
console.log('Testing Node.js basic functionality...');

try {
    const fs = require('fs');
    console.log('✅ fs module loaded');
    
    const path = require('path');
    console.log('✅ path module loaded');
    
    // Check if TWX file exists
    const twxFile = './temp/TWX Example.twx';
    if (fs.existsSync(twxFile)) {
        console.log('✅ TWX file exists');
        const stats = fs.statSync(twxFile);
        console.log(`File size: ${stats.size} bytes`);
    } else {
        console.log('❌ TWX file not found');
    }
    
    // Try to import TWX extractor
    const TWXExtractor = require('./src/parser/twx-extractor');
    console.log('✅ TWXExtractor imported successfully');
    
    // Create instance
    const extractor = new TWXExtractor();
    console.log('✅ TWXExtractor instance created');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
}
