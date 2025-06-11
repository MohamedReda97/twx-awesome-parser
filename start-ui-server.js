const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // Parse URL and remove query parameters
    let filePath = req.url.split('?')[0];
    
    // Default to index file
    if (filePath === '/') {
        filePath = '/twx-viewer.html';
    }

    // Remove leading slash and resolve file path
    const fileName = filePath.substring(1);
    const fullPath = path.join(__dirname, fileName);

    // Check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>404 - File Not Found</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h1 { color: #e74c3c; }
                    </style>
                </head>
                <body>
                    <h1>404 - File Not Found</h1>
                    <p>The requested file <strong>${filePath}</strong> was not found.</p>
                    <p><a href="/">Go to TWX Viewer</a></p>
                </body>
                </html>
            `);
            return;
        }

        // Get file extension and corresponding MIME type
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        // Read and serve the file
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>500 - Server Error</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h1 { color: #e74c3c; }
                        </style>
                    </head>
                    <body>
                        <h1>500 - Server Error</h1>
                        <p>Error reading file: ${err.message}</p>
                        <p><a href="/">Go to TWX Viewer</a></p>
                    </body>
                    </html>
                `);
                return;
            }

            // Set appropriate headers
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log('🚀 TWX Viewer Server Started!');
    console.log(`📱 Server running at: http://localhost:${PORT}`);
    console.log(`🌐 Open your browser and navigate to: http://localhost:${PORT}`);
    console.log('');
    console.log('Available endpoints:');
    console.log(`  • Main UI: http://localhost:${PORT}/`);
    console.log(`  • Data API: http://localhost:${PORT}/parsing-results.json`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped successfully');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
