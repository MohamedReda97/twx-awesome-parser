const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const SearchAPI = require('./src/search/search-api');

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
    '.ico': 'image/x-icon',
    '.xml': 'application/xml',
    '.txt': 'text/plain'
};

// Create Express-like request/response handlers
function createRequestHandler(server) {
    return (req, res) => {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        // Log request
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        
        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // Handle API routes
        if (pathname.startsWith('/api/')) {
            // Delegate to the API router
            server.handleApiRequest(req, res, parsedUrl);
            return;
        }
        
        // Handle static files
        server.serveStaticFile(req, res, pathname);
    };
}

class SearchServer {
    constructor(port = 3000) {
        this.port = port;
        this.server = http.createServer(createRequestHandler(this));
        // Use output/xml directory for searching XML files
        this.searchApi = new SearchAPI(this, path.join(__dirname, 'output'));
        console.log(`Search server configured to search in: ${path.join(__dirname, 'output')}`);
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log(`Server running at http://localhost:${this.port}/`);
            console.log(`Search API available at http://localhost:${this.port}/api/search`);
        });
        
        this.server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${this.port} is already in use. Trying port ${this.port + 1}...`);
                this.port += 1;
                this.server.listen(this.port);
            } else {
                console.error('Server error:', error);
            }
        });
    }
    
    async handleApiRequest(req, res, parsedUrl) {
        try {
            console.log(`\n=== New API Request ===`);
            console.log(`Method: ${req.method}`);
            console.log(`URL: ${req.url}`);
            console.log(`Path: ${parsedUrl.pathname}`);
            console.log(`Query:`, parsedUrl.query);
            
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Request-Method', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            
            if (parsedUrl.pathname === '/api/search' && req.method === 'GET') {
                console.log('Search API endpoint called');
                console.log('Query parameters:', parsedUrl.query);
                res.setHeader('Content-Type', 'application/json');
                await this.searchApi.handleSearchRequest(req, res, parsedUrl);
            } else {
                console.log(`Endpoint not found: ${parsedUrl.pathname}`);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not Found' }));
            }
        } catch (error) {
            console.error('API Error:', error);
            res.statusCode = 500;
            const errorResponse = { 
                error: 'Internal Server Error',
                message: error.message,
                stack: error.stack
            };
            console.error('Error response:', errorResponse);
            res.end(JSON.stringify(errorResponse));
        }
    }
    
    serveStaticFile(req, res, pathname) {
        // Default to index file
        let filePath = pathname === '/' ? '/twx-viewer.html' : pathname;
        
        // Remove leading slash and resolve file path
        const fileName = filePath.substring(1) || 'index.html';
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
                        <p>The requested file was not found on this server.</p>
                        <p><a href="/">Go to Home</a></p>
                    </body>
                    </html>
                `);
                return;
            }
            
            // Get file extension and set content type
            const extname = path.extname(fullPath);
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            
            // Read and serve the file
            fs.readFile(fullPath, (error, content) => {
                if (error) {
                    res.writeHead(500);
                    res.end(`Error loading ${filePath}: ${error.code}`);
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content, 'utf-8');
                }
            });
        });
    }
}

// Export the server class for testing
module.exports = SearchServer;

// Start the server if this file is run directly
if (require.main === module) {
    const server = new SearchServer(PORT);
    server.start();
}
