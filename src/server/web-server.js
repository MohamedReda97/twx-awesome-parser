const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Import existing functionality
const { searchXMLFiles } = require('../search/xml-search');

// AI Review Services
const AIScriptReviewService = require('../ai-review/AIScriptReviewService');
const ScriptCollectionService = require('../ai-review/ScriptCollectionService');
const AIProviderService = require('../ai-review/AIProviderService');
const AnalysisResultsStorage = require('../ai-review/AnalysisResultsStorage');

/**
 * Web server for TWX Parser UI
 */
class TWXWebServer {
  constructor() {
    this.server = null;
    this.port = 0;

    // Initialize AI services
    this.aiReviewService = new AIScriptReviewService();
    this.scriptCollectionService = new ScriptCollectionService();
    this.analysisStorage = new AnalysisResultsStorage();
    this.aiProviderService = null; // Will be initialized when config is loaded
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

        // Initialize AI services
        this.initializeAIServices();

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
      case '/api/ai-config':
        await this.handleAIConfigAPI(req, res);
        break;
      case '/api/ai-test-connection':
        await this.handleAITestConnection(req, res);
        break;
      case '/api/ai-collect-scripts':
        await this.handleAICollectScripts(req, res);
        break;
      case '/api/ai-analyze-scripts':
        await this.handleAIAnalyzeScripts(req, res);
        break;
      case '/api/ai-export-results':
        await this.handleAIExportResults(req, res);
        break;
      case '/api/ai-analyze-scripts-stream':
        await this.handleAIAnalyzeScriptsStream(req, res, query);
        break;
      case '/api/ai-analyze-scripts-progressive':
        await this.handleAIAnalyzeScriptsProgressive(req, res);
        break;
      default:
        this.send404(res);
    }
  }





  /**
   * Parse JSON body from request
   */
  async parseJSONBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
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
      
      // Phase 2: Resolve cross-references for business objects
      const businessObjects = extractedData.objects.filter(obj => obj.type === 'twClass');
      if (businessObjects.length > 0) {
        console.log(`🔗 Phase 2: Resolving cross-references for ${businessObjects.length} business objects...`);
        extractor.resolveBusinessObjectCrossReferences(businessObjects);
      }
      
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
  }  /**
   * Serve static files
   */
  async serveFile(res, filePath, contentType) {
    try {
      let content = null;
      
      // In a pkg bundled environment, try to read from the snapshot filesystem
      if (process.pkg) {
        try {
          // pkg stores assets in the snapshot directory
          const snapshotPath = path.join(__dirname, '../../', filePath);
          content = fs.readFileSync(snapshotPath);
        } catch (snapshotError) {
          // If snapshot read fails, the file might be an asset that needs to be accessed directly
          try {
            content = fs.readFileSync(filePath);
          } catch (directError) {
            console.log(`Bundled asset read failed for ${filePath}:`, snapshotError.message, directError.message);
          }
        }
      }
      
      // If not bundled or bundle read failed, try regular filesystem paths
      if (!content) {
        const possiblePaths = [
          path.join(__dirname, '../../', filePath),  // Development
          path.join(process.cwd(), filePath),        // Current working directory
          filePath // Direct path
        ];
        
        // Try each possible path
        for (const testPath of possiblePaths) {
          try {
            if (fs.existsSync(testPath)) {
              content = fs.readFileSync(testPath);
              break;
            }
          } catch (readError) {
            console.log(`Failed to read ${testPath}:`, readError.message);
          }
        }
      }
      
      if (!content) {
        const attemptedPaths = process.pkg ? 
          [path.join(__dirname, '../../', filePath), filePath] :
          [
            path.join(__dirname, '../../', filePath),
            path.join(process.cwd(), filePath),
            filePath
          ];
        
        console.warn(`File not found: ${filePath}, tried paths: [${attemptedPaths.map(p => `'${p}'`).join(', ')}]`);
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
   * Send JSON response
   */
  sendJSON(res, data) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Initialize AI services
   */
  async initializeAIServices() {
    try {
      await this.aiReviewService.initialize();
      await this.analysisStorage.initialize();
      console.log('AI services initialized successfully');
    } catch (error) {
      console.warn('AI services initialization failed:', error.message);
    }
  }

  /**
   * Handle AI configuration API
   */
  async handleAIConfigAPI(req, res) {
    if (req.method === 'GET') {
      // Get current configuration
      const config = this.aiReviewService.getConfiguration();
      this.sendJSON(res, config);
    } else if (req.method === 'POST') {
      // Update configuration
      try {
        const body = await this.parseRequestBody(req);
        const config = JSON.parse(body);

        await this.aiReviewService.updateConfiguration(config);

        // Reinitialize provider service with new config
        this.aiProviderService = new AIProviderService(config);

        this.sendJSON(res, { success: true, message: 'Configuration updated' });
      } catch (error) {
        this.send500(res, 'Failed to update AI configuration: ' + error.message);
      }
    }
  }

  /**
   * Handle AI connection test API
   */
  async handleAITestConnection(req, res) {
    try {
      const body = await this.parseRequestBody(req);
      const config = JSON.parse(body);

      // Create temporary provider service for testing
      const testProviderService = new AIProviderService(config);
      const result = await testProviderService.testConnection();

      this.sendJSON(res, result);
    } catch (error) {
      this.sendJSON(res, { success: false, message: error.message });
    }
  }

  /**
   * Handle script collection API
   */
  async handleAICollectScripts(req, res) {
    try {
      const body = await this.parseRequestBody(req);
      const { objects } = JSON.parse(body);

      console.log(`📊 Script collection request: ${objects?.length || 0} objects received`);

      const scripts = this.scriptCollectionService.collectAllScripts(objects);
      const statistics = this.scriptCollectionService.getCollectionStatistics();

      console.log(`✅ Script collection completed: ${scripts.length} scripts found`);

      this.sendJSON(res, { scripts, statistics });
    } catch (error) {
      console.error('❌ Script collection failed:', error);
      this.send500(res, 'Failed to collect scripts: ' + error.message);
    }
  }

  /**
   * Handle AI script analysis API
   */
  async handleAIAnalyzeScripts(req, res) {
    try {
      const body = await this.parseRequestBody(req);
      const { scripts } = JSON.parse(body);

      console.log(`🤖 Starting AI analysis for ${scripts.length} scripts`);

      if (!this.aiProviderService) {
        const config = this.aiReviewService.getConfiguration();
        this.aiProviderService = new AIProviderService(config);
        console.log(`🔧 Initialized AI provider: ${config.provider}`);
      }

      // Progress callback for logging
      const progressCallback = (progress) => {
        console.log(`📊 Progress: ${progress.current}/${progress.total} - ${progress.message}`);
      };

      const results = await this.aiProviderService.analyzeScripts(scripts, progressCallback);

      console.log(`✅ AI analysis completed: ${results.analysis_results?.length || 0} results`);

      // Save results
      const config = this.aiReviewService.getConfiguration();
      await this.analysisStorage.saveAnalysisResults(results.analysis_results, {
        provider: config.provider,
        model: config.providers[config.provider]?.model,
        config: config
      });

      this.sendJSON(res, results);
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      this.send500(res, 'AI analysis failed: ' + error.message);
    }
  }

  /**
   * Handle AI results export API
   */
  async handleAIExportResults(req, res) {
    try {
      const body = await this.parseRequestBody(req);
      const { results, format } = JSON.parse(body);

      const exportPath = await this.analysisStorage.exportResults(results, format);
      const filename = path.basename(exportPath);

      this.sendJSON(res, { success: true, filename, path: exportPath });
    } catch (error) {
      this.send500(res, 'Export failed: ' + error.message);
    }
  }

  /**
   * Handle AI script analysis with Server-Sent Events for progress tracking
   */
  async handleAIAnalyzeScriptsStream(req, res, query) {
    try {
      const scripts = JSON.parse(decodeURIComponent(query.scripts));

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial message
      res.write(`data: ${JSON.stringify({ type: 'start', message: 'Starting analysis...' })}\n\n`);

      if (!this.aiProviderService) {
        const config = this.aiReviewService.getConfiguration();
        this.aiProviderService = new AIProviderService(config);
      }

      // Progress callback
      const progressCallback = (progress) => {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          current: progress.current,
          total: progress.total,
          processed: progress.processed,
          totalScripts: progress.totalScripts,
          message: progress.message
        })}\n\n`);
      };

      // Perform analysis
      const results = await this.aiProviderService.analyzeScripts(scripts, progressCallback);

      // Save results
      const config = this.aiReviewService.getConfiguration();
      await this.analysisStorage.saveAnalysisResults(results.analysis_results, {
        provider: config.provider,
        model: config.providers[config.provider]?.model,
        config: config
      });

      // Send completion message
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        results: results.analysis_results,
        message: 'Analysis completed successfully'
      })}\n\n`);

      res.end();
    } catch (error) {
      console.error('AI analysis stream error:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error.message
      })}\n\n`);
      res.end();
    }
  }

  /**
   * Handle AI script analysis with progressive results
   */
  async handleAIAnalyzeScriptsProgressive(req, res) {
    try {
      const body = await this.parseRequestBody(req);
      const { scripts } = JSON.parse(body);

      console.log(`🤖 Starting progressive AI analysis for ${scripts.length} scripts`);

      // Set up streaming response
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      if (!this.aiProviderService) {
        const config = this.aiReviewService.getConfiguration();
        this.aiProviderService = new AIProviderService(config);
      }

      // Progress callback
      const progressCallback = (progress) => {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          ...progress
        })}\n\n`);
      };

      // Batch complete callback for progressive results
      const batchCompleteCallback = (batchInfo) => {
        res.write(`data: ${JSON.stringify({
          type: 'batch_complete',
          ...batchInfo
        })}\n\n`);
      };

      // Perform analysis with progressive callbacks
      const results = await this.aiProviderService.analyzeScripts(scripts, progressCallback, batchCompleteCallback);

      // Save results
      const config = this.aiReviewService.getConfiguration();
      await this.analysisStorage.saveAnalysisResults(results.analysis_results, {
        provider: config.provider,
        model: config.providers[config.provider]?.model,
        config: config
      });

      // Send completion message
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        results: results.analysis_results,
        message: 'Analysis completed successfully'
      })}\n\n`);

      res.end();
    } catch (error) {
      console.error('❌ Progressive AI analysis failed:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error.message
      })}\n\n`);
      res.end();
    }
  }

  /**
   * Parse request body
   */
  async parseRequestBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
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
