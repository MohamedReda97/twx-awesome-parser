const fs = require('fs');

console.log('Testing script name extraction...\n');

try {
  const processData = JSON.parse(fs.readFileSync('output/objects-process.json', 'utf8'));
  
  console.log('Looking for services with scripts...\n');
  
  let foundScripts = 0;
  let namedScripts = 0;
  
  for (const process of processData.objects) {
    if (process.details?.processType === '12' && process.details?.scripts?.length > 0) {
      console.log(`\n=== Service: ${process.name} ===`);
      console.log(`Scripts: ${process.details.scripts.length}`);
      
      process.details.scripts.forEach((script, idx) => {
        foundScripts++;
        console.log(`  ${idx + 1}. Name: "${script.name}"`);
        console.log(`     Length: ${script.script.length} chars`);
        console.log(`     Preview: ${script.script.substring(0, 60)}...`);
        
        if (script.name && script.name !== 'Unnamed Script') {
          namedScripts++;
        }
      });
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Total scripts found: ${foundScripts}`);
  console.log(`   Scripts with proper names: ${namedScripts}`);
  console.log(`   Scripts with 'Unnamed Script': ${foundScripts - namedScripts}`);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Make sure you run this from the twx-parse-1.7.0 directory');
}
