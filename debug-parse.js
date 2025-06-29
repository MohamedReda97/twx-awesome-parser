/**
 * Debug script to test TWX parsing
 */
const path = require('path');
const TWXExtractor = require('./src/parser/twx-extractor');
const { createJSONOutput } = require('./src/parser/json-parser');

async function testParsing() {
  try {
    console.log('Starting TWX parsing test...');
    
    const twxFile = './temp/TWX Example.twx';
    console.log(`Testing file: ${twxFile}`);
    
    const extractor = new TWXExtractor();
    console.log('Extractor created');
    
    // Test extraction
    const extractedData = await extractor.extractTWX(twxFile);
    console.log(`Extraction successful! Found ${extractedData.objects.length} objects`);
    
    // Test JSON generation
    await createJSONOutput(extractedData, './output');
    console.log('JSON output generated successfully');
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

testParsing();
