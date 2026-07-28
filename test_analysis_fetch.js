const http = require('http');

http.get('http://localhost:51302/analysis.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('✅ analysis.json fetched successfully');
      console.log('   Summary keys:', Object.keys(j.summary).length);
      console.log('   ByType types:', Object.keys(j.byType));
      console.log('   Findings count:', j.findings.length);
      console.log('   Critical findings:', j.findings.filter(f => f.severity === 'critical').length);
      console.log('   Warning findings:', j.findings.filter(f => f.severity === 'warning').length);
    } catch (e) {
      console.log('❌ Parse error:', e.message);
      console.log('   First 200 chars:', data.substring(0, 200));
    }
  });
}).on('error', (e) => {
  console.log('❌ Fetch error:', e.message);
});
