/**
 * Test search functionality
 */
const { searchXMLFiles } = require('./src/search/xml-search');
const path = require('path');

async function testSearch() {
    console.log('Testing search functionality...');
    
    try {
        // Test JSON search through the web server method
        const webServer = require('./src/server/web-server');
        const server = new webServer.TWXWebServer();
        
        console.log('Testing JSON search...');
        const results = await server.searchInJSONFiles('message', './output');
        
        console.log(`Found ${results.length} results:`);
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.objectName} (${result.objectType})`);
            console.log(`   Preview: ${result.preview.substring(0, 100)}...`);
            console.log(`   Matches: ${result.matchCount}`);
            console.log('');
        });
        
        console.log('✅ Search test completed!');
        
    } catch (error) {
        console.error('❌ Search test failed:', error);
        console.error('Stack:', error.stack);
    }
}

testSearch();
