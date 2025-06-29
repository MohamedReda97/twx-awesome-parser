console.log('Script extraction test starting...');

try {
  const fs = require('fs');
  const processData = JSON.parse(fs.readFileSync('output/objects-process.json', 'utf8'));
  
  console.log('File loaded successfully');
  console.log('Total objects:', processData.objects.length);
  
  let servicesCount = 0;
  let scriptsFound = 0;
  
  for (let i = 0; i < Math.min(5, processData.objects.length); i++) {
    const process = processData.objects[i];
    console.log(`\nProcess ${i + 1}: ${process.name}`);
    console.log(`  Type: ${process.type}`);
    console.log(`  ProcessType: ${process.details?.processType || 'N/A'}`);
    
    if (process.details?.processType === '12') {
      servicesCount++;
      console.log(`  -> This is a SERVICE!`);
      
      if (process.details.scripts) {
        console.log(`  -> Scripts found: ${process.details.scripts.length}`);
        scriptsFound += process.details.scripts.length;
        
        process.details.scripts.forEach((script, idx) => {
          console.log(`    Script ${idx + 1}: "${script.name}" (${script.script.length} chars)`);
        });
      } else {
        console.log(`  -> No scripts property found`);
      }
    }
  }
  
  console.log(`\nSummary: Found ${servicesCount} services with ${scriptsFound} scripts in first 5 objects`);
  
} catch (error) {
  console.log('Error:', error.message);
}
