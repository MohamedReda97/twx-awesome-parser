const fs = require('fs'); const a = JSON.parse(fs.readFileSync('output/analysis.json','utf8')); console.log('byType keys:', JSON.stringify(Object.keys(a.byType).sort()));  
