const { startServer } = require('./src/server/web-server');
const http = require('http');

(async () => {
  const server = await startServer();
  const port = server.port;

  // Test 1: dependencies.json
  await new Promise((resolve) => {
    http.get(`http://localhost:${port}/dependencies.json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`dependencies.json: HTTP ${res.statusCode}`);
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          console.log(`  Count: ${json.count}`);
        }
        resolve();
      });
    });
  });

  // Test 2: root page
  await new Promise((resolve) => {
    http.get(`http://localhost:${port}/`, (res) => {
      console.log(`Root page: HTTP ${res.statusCode}`);
      res.resume();
      res.on('end', resolve);
    });
  });

  server.stop(() => process.exit(0));
})();
