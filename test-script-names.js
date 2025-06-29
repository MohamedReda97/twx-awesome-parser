const TWXExtractor = require('./src/parser/twx-extractor');
const path = require('path');

console.log('Testing script name extraction fix...\n');

async function testScriptNames() {
  try {
    const extractor = new TWXExtractor();
    
    // Test with the TWX example directory
    const twxExamplePath = './TWX example';
    console.log(`Extracting from: ${twxExamplePath}`);
    
    const results = await extractor.extractFromDirectory(twxExamplePath);
    
    console.log(`\nExtracted ${results.objects.length} objects`);
    
    // Find services and check their script names
    let servicesWithScripts = 0;
    let totalScripts = 0;
    let namedScripts = 0;
    
    results.objects.forEach(obj => {
      if (obj.details?.processType === '12' && obj.details?.scripts?.length > 0) {
        servicesWithScripts++;
        console.log(`\n=== Service: ${obj.name} ===`);
        console.log(`Scripts: ${obj.details.scripts.length}`);
        
        obj.details.scripts.forEach((script, idx) => {
          totalScripts++;
          console.log(`  ${idx + 1}. Name: "${script.name}"`);
          
          if (script.name && script.name !== 'Unnamed Script') {
            namedScripts++;
          }
        });
      }
    });
    
    console.log(`\n📊 Results:`);
    console.log(`   Services with scripts: ${servicesWithScripts}`);
    console.log(`   Total scripts: ${totalScripts}`);
    console.log(`   Scripts with proper names: ${namedScripts}`);
    console.log(`   Scripts still unnamed: ${totalScripts - namedScripts}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testScriptNames();
