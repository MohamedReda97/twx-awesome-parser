const fs = require('fs');

// Read the process objects file
const processData = JSON.parse(fs.readFileSync('./output/objects-process.json', 'utf8'));

console.log('🔍 Analyzing Script Extraction Results\n');

let totalProcesses = processData.objects.length;
let servicesCount = 0;
let servicesWithScripts = 0;
let totalScripts = 0;

processData.objects.forEach(process => {
  // Check if it's a service (processType = 12)
  if (process.details && process.details.processType === '12') {
    servicesCount++;
    
    // Check if it has scripts
    if (process.details.scripts && process.details.scripts.length > 0) {
      servicesWithScripts++;
      totalScripts += process.details.scripts.length;
      
      console.log(`📋 Service: ${process.name}`);
      console.log(`   Scripts Found: ${process.details.scripts.length}`);
      process.details.scripts.forEach((script, index) => {
        console.log(`   ${index + 1}. Name: "${script.name}"`);
        console.log(`      Script Length: ${script.script.length} characters`);
        console.log(`      Script Preview: ${script.script.substring(0, 100)}...`);
      });
      console.log('');
    }
  }
});

console.log('📊 Summary:');
console.log(`   Total Processes: ${totalProcesses}`);
console.log(`   Services (processType=12): ${servicesCount}`);
console.log(`   Services with Scripts: ${servicesWithScripts}`);
console.log(`   Total Scripts Extracted: ${totalScripts}`);
