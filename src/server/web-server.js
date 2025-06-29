const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Import existing functionality
const { searchXMLFiles } = require('../search/xml-search');

/**
 * Web server for TWX Parser UI
 */
class TWXWebServer {
  constructor() {
    this.server = null;
    this.port = 0;
  }

  /**
   * Start the web server
   * @returns {Promise<number>} Port number
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.handleRequest.bind(this));
      
      // Find available port starting from 3000
      this.server.listen(0, 'localhost', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        this.port = this.server.address().port;
        console.log(`Web server started on port ${this.port}`);
        resolve(this.port);
      });
    });
  }

  /**
   * Handle HTTP requests
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {
      // API routes
      if (pathname.startsWith('/api/')) {
        await this.handleApiRequest(req, res, pathname, parsedUrl.query);
        return;
      }

      // Static file serving
      if (pathname === '/' || pathname === '/index.html') {
        await this.serveFile(res, 'twx-viewer-new.html', 'text/html');
      } else if (pathname.endsWith('.js')) {
        await this.serveFile(res, pathname.slice(1), 'application/javascript');
      } else if (pathname.endsWith('.css')) {
        await this.serveFile(res, pathname.slice(1), 'text/css');
      } else if (pathname.endsWith('.json')) {
        await this.serveFile(res, pathname.slice(1), 'application/json');
      } else {
        this.send404(res);
      }
    } catch (error) {
      console.error('Request error:', error);
      this.send500(res, error.message);
    }
  }

  /**
   * Handle API requests
   */
  async handleApiRequest(req, res, pathname, query) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    switch (pathname) {
      case '/api/search':
        await this.handleSearch(req, res, query);
        break;
      case '/api/objects':
        await this.handleGetObjects(req, res);
        break;
      case '/api/parse':
        await this.handleParseTWX(req, res);
        break;
      default:
        this.send404(res);
    }
  }

  /**
   * Handle search API requests
   */
  async handleSearch(req, res, query) {
    const searchTerm = query.q;
    if (!searchTerm) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search term required' }));
      return;
    }

    try {
      console.log(`Searching for: "${searchTerm}"`);
      
      // Search in the temp directory (extracted TWX files) for XML content
      const tempDir = './temp';
      let results = [];
      
      if (fs.existsSync(tempDir)) {
        try {
          const { searchXMLFiles } = require('../search/xml-search');
          results = await searchXMLFiles(searchTerm, tempDir);
          console.log(`Found ${results.length} XML search results`);
        } catch (xmlError) {
          console.log('XML search failed, falling back to JSON search:', xmlError.message);
        }
      }
      
      // If no XML results or XML search failed, search in JSON files
      if (results.length === 0) {
        results = await this.searchInJSONFiles(searchTerm, './output');
        console.log(`Found ${results.length} JSON search results`);
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    } catch (error) {
      console.error('Search error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Search in JSON files as fallback
   */
  async searchInJSONFiles(searchTerm, directory) {
    const results = [];
    
    try {
      const files = fs.readdirSync(directory).filter(f => f.endsWith('.json') && f.startsWith('objects-'));
      console.log(`Searching in ${files.length} JSON files for "${searchTerm}"`);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Search in the objects array
        if (data.objects && Array.isArray(data.objects)) {
          for (const obj of data.objects) {
            const matches = this.searchInObject(obj, searchTerm, obj);
            if (matches.length > 0) {
              // Create a result for each match, but group by object
              const objectResult = {
                fileName: file,
                filePath: filePath,
                objectName: obj.name || 'Unknown Object',
                objectType: obj.typeName || obj.type || 'Unknown Type',
                objectId: obj.id || '',
                preview: this.createPreviewFromMatches(matches, searchTerm),
                matches: matches,
                matchCount: matches.length
              };
              results.push(objectResult);
            }
          }
        }
      }
      
      console.log(`JSON search completed: ${results.length} results found`);
      return results;
    } catch (error) {
      console.error('JSON search error:', error);
      return [];
    }
  }

  /**
   * Recursively search in an object
   */
  searchInObject(obj, searchTerm, rootObject) {
    const matches = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    const search = (value, path, depth = 0) => {
      // Prevent infinite recursion
      if (depth > 10) return;
      
      if (typeof value === 'string' && value.toLowerCase().includes(lowerSearchTerm)) {
        matches.push({
          context: path,
          snippet: this.createSnippet(value, searchTerm),
          lineNumber: 0,
          objectName: rootObject.name || 'Unknown Object',
          objectType: rootObject.typeName || rootObject.type || 'Unknown Type',
          objectId: rootObject.id || ''
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [key, val] of Object.entries(value)) {
          // Skip circular references and focus on meaningful data
          if (key !== 'parent' && key !== 'root' && typeof val !== 'function') {
            search(val, path ? `${path}.${key}` : key, depth + 1);
          }
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (index < 100) { // Limit array processing to prevent performance issues
            search(item, `${path}[${index}]`, depth + 1);
          }
        });
      }
    };
    
    search(obj, '', 0);
    return matches;
  }

  /**
   * Create a snippet around the found text
   */
  createSnippet(text, searchTerm) {
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (index === -1) return text.substring(0, 100);
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + searchTerm.length + 50);
    let snippet = text.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    // Highlight the search term
    return snippet.replace(
      new RegExp(`(${searchTerm})`, 'gi'),
      '<span class="highlight">$1</span>'
    );
  }

  /**
   * Create preview text from matches
   */
  createPreviewFromMatches(matches, searchTerm) {
    if (matches.length === 0) return 'No matches found';
    
    // Get the first few matches for preview
    const previewMatches = matches.slice(0, 3);
    const previews = previewMatches.map(match => {
      const context = match.context ? `${match.context}: ` : '';
      return `${context}${match.snippet || 'Match found'}`;
    });
    
    let preview = previews.join(' | ');
    if (matches.length > 3) {
      preview += ` ... and ${matches.length - 3} more matches`;
    }
    
    return preview;
  }

  /**
   * Handle get objects API requests
   */
  async handleGetObjects(req, res) {
    try {
      const outputDir = './output';
      const objects = {};
      
      // Read all object type files
      const files = fs.readdirSync(outputDir).filter(f => f.startsWith('objects-') && f.endsWith('.json'));
      
      for (const file of files) {
        const filePath = path.join(outputDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const type = file.replace('objects-', '').replace('.json', '');
        objects[type] = data;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(objects));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle TWX file parsing API requests
   */
  async handleParseTWX(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      console.log('Parsing TWX file upload request...');
      
      // Parse multipart form data
      const { fileData, fileName } = await this.parseMultipartForm(req);
      
      if (!fileData || !fileName) {
        console.error('No file data received');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No file uploaded' }));
        return;
      }

      console.log(`Received file: ${fileName}, size: ${fileData.length} bytes`);

      // Validate file extension
      if (!fileName.toLowerCase().endsWith('.twx')) {
        console.error(`Invalid file extension: ${fileName}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid file type. Please upload a .twx file' }));
        return;
      }

      // Save uploaded file temporarily
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, fileName);
      console.log(`Saving file to: ${tempFilePath}`);
      fs.writeFileSync(tempFilePath, fileData);

      console.log(`Processing uploaded TWX file: ${fileName}`);

      // Ensure output directory exists
      const outputDir = './output';
      if (!fs.existsSync(outputDir)) {
        console.log('Creating output directory...');
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Import and use TWX extractor
      console.log('Loading TWX extractor...');
      const TWXExtractor = require('../parser/twx-extractor');
      const { createJSONOutput } = require('../parser/json-parser');
      console.log('Modules loaded successfully');
      
      const extractor = new TWXExtractor();
      console.log('TWX extractor instance created');
      
      // Extract TWX file
      console.log('Starting TWX extraction...');
      const extractedData = await extractor.extractTWX(tempFilePath);
      console.log(`Extraction completed. Found ${extractedData.objects.length} objects`);
      
      // Generate JSON output
      console.log('Generating JSON output...');
      await createJSONOutput(extractedData, outputDir);
      console.log('JSON output generated successfully');
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFilePath);
        console.log('Temporary file cleaned up');
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError.message);
      }
      
      console.log(`Successfully processed ${fileName}: ${extractedData.objects.length} objects`);

      // Return success response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        fileName: fileName,
        objectCount: extractedData.objects.length,
        message: 'TWX file parsed successfully'
      }));

    } catch (error) {
      console.error('Parse error:', error);
      console.error('Error stack:', error.stack);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: `Failed to parse TWX file: ${error.message}` 
      }));
    }
  }

  /**
   * Parse multipart form data (robust implementation for file uploads)
   */
  async parseMultipartForm(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let totalLength = 0;
      
      req.on('data', chunk => {
        chunks.push(chunk);
        totalLength += chunk.length;
        // Prevent extremely large uploads (100MB limit)
        if (totalLength > 100 * 1024 * 1024) {
          reject(new Error('File too large (max 100MB)'));
          return;
        }
      });
      
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks, totalLength);
          console.log(`Received multipart data: ${body.length} bytes`);
          
          const contentType = req.headers['content-type'] || '';
          const boundaryMatch = contentType.match(/boundary=(.+)$/);
          
          if (!boundaryMatch) {
            reject(new Error('No boundary found in Content-Type header'));
            return;
          }
          
          const boundary = boundaryMatch[1].trim();
          console.log(`Using boundary: ${boundary}`);
          
          // Split by boundary
          const boundaryBuffer = Buffer.from(`--${boundary}`);
          const parts = this.splitBuffer(body, boundaryBuffer);
          
          console.log(`Found ${parts.length} parts`);
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.length === 0) continue;
            
            // Look for Content-Disposition header
            const headerEndIndex = part.indexOf(Buffer.from('\r\n\r\n'));
            if (headerEndIndex === -1) continue;
            
            const headers = part.slice(0, headerEndIndex).toString('utf8');
            console.log(`Part ${i} headers:`, headers.substring(0, 200));
            
            if (headers.includes('Content-Disposition: form-data') && headers.includes('filename=')) {
              // Extract filename
              const filenameMatch = headers.match(/filename="([^"]+)"/);
              const fileName = filenameMatch ? filenameMatch[1] : 'unknown.twx';
              
              // Extract file data
              const fileData = part.slice(headerEndIndex + 4);
              
              // Remove trailing CRLF and boundary markers
              let cleanFileData = fileData;
              
              // Remove trailing \r\n if present
              if (cleanFileData.length >= 2 && 
                  cleanFileData[cleanFileData.length - 2] === 0x0D && 
                  cleanFileData[cleanFileData.length - 1] === 0x0A) {
                cleanFileData = cleanFileData.slice(0, -2);
              }
              
              console.log(`Extracted file: ${fileName}, size: ${cleanFileData.length} bytes`);
              resolve({ fileData: cleanFileData, fileName });
              return;
            }
          }
          
          console.log('No file found in multipart data');
          resolve({ fileData: null, fileName: null });
          
        } catch (error) {
          console.error('Multipart parsing error:', error);
          reject(error);
        }
      });
      
      req.on('error', error => {
        console.error('Request error:', error);
        reject(error);
      });
    });
  }

  /**
   * Split buffer by delimiter (binary-safe)
   */
  splitBuffer(buffer, delimiter) {
    const parts = [];
    let start = 0;
    let pos = 0;
    
    while (pos <= buffer.length - delimiter.length) {
      if (buffer.slice(pos, pos + delimiter.length).equals(delimiter)) {
        parts.push(buffer.slice(start, pos));
        start = pos + delimiter.length;
        pos = start;
      } else {
        pos++;
      }
    }
    
    if (start < buffer.length) {
      parts.push(buffer.slice(start));
    }
    
    return parts;
  }

  /**
   * Serve static files
   */
  async serveFile(res, filePath, contentType) {
    try {
      // Handle bundled environment paths
      const possiblePaths = [
        path.join(__dirname, '../../', filePath),  // Development
        path.join(process.cwd(), filePath),        // Bundled executable
        path.join(__dirname, '../..', filePath),   // Alternative bundled path
        filePath // Direct path
      ];
      
      let fullPath = null;
      let content = null;
      
      // Try each possible path
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          fullPath = testPath;
          content = fs.readFileSync(fullPath);
          break;
        }
      }
      
      if (!content) {
        console.warn(`File not found: ${filePath}, tried paths:`, possiblePaths);
        this.send404(res);
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      console.error(`Error serving file ${filePath}:`, error);
      this.send404(res);
    }
  }

  /**
   * Send 404 response
   */
  send404(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  /**
   * Send 500 response
   */
  send500(res, message) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

/**
 * Start the server and return the port
 */
async function startServer() {
  const webServer = new TWXWebServer();
  return await webServer.startServer();
}

module.exports = { startServer, TWXWebServer };
