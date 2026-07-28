require('./src/server/web-server').startServer().then(port => { console.log('PORT:' + port); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })
