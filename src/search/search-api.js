const path = require('path');
const fs = require('fs').promises;
const url = require('url');

class SearchAPI {
    constructor(server, outputDir) {
        this.server = server;
        this.outputDir = outputDir;
    }

    /**
     * Recursively search for a term in an object
     */
    searchInObject(obj, term, path = '') {
        const results = [];
        
        for (const key in obj) {
            const value = obj[key];
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof value === 'string' && value.toLowerCase().includes(term.toLowerCase())) {
                results.push({
                    path: currentPath,
                    value: value,
                    type: typeof value
                });
            } else if (typeof value === 'object' && value !== null) {
                results.push(...this.searchInObject(value, term, currentPath));
            }
        }
        
        return results;
    }

    /**
     * Handle search API requests
     */
    async handleSearchRequest(req, res, parsedUrl) {
        try {
            console.log('Search request received:', parsedUrl);
            const { query } = parsedUrl;
            const searchTerm = query.q;
            
            if (!searchTerm) {
                console.log('No search term provided');
                this.sendJsonResponse(res, 400, { 
                    error: 'Search term (q) is required' 
                });
                return;
            }

            console.log(`Searching for: "${searchTerm}" in directory: ${this.outputDir}`);
            
            // Get all JSON files in the output directory
            let files;
            try {
                files = await fs.readdir(this.outputDir);
                console.log(`Found ${files.length} files in directory`);
            } catch (error) {
                console.error('Error reading directory:', error);
                this.sendJsonResponse(res, 500, { 
                    error: 'Error reading output directory',
                    details: error.message
                });
                return;
            }
            
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            console.log(`Found ${jsonFiles.length} JSON files`);
            
            if (jsonFiles.length === 0) {
                console.log('No JSON files found in output directory');
                this.sendJsonResponse(res, 400, { 
                    error: 'No JSON files found in output directory',
                    details: `Directory: ${this.outputDir}`
                });
                return;
            }
            
            const results = [];
            
            // Search through each JSON file
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(this.outputDir, file);
                    console.log(`Searching in file: ${filePath}`);
                    
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    const jsonData = JSON.parse(fileContent);
                    
                    // Search in the JSON data
                    const matches = this.searchInObject(jsonData, searchTerm);
                    console.log(`Found ${matches.length} matches in ${file}`);
                    
                    if (matches.length > 0) {
                        results.push({
                            file: file,
                            path: path.basename(file, '.json'),
                            matches: matches,
                            matchCount: matches.length
                        });
                    }
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                }
            }

            this.sendJsonResponse(res, 200, {
                query: searchTerm,
                results,
                count: results.length
            });
        } catch (error) {
            console.error('Search error:', error);
            this.sendJsonResponse(res, 500, { 
                error: 'An error occurred during search',
                details: error.message 
            });
        }
    }
    
    /**
     * Check if a directory exists
     * @private
     */
    async checkDirectoryExists(dirPath) {
        const fs = require('fs').promises;
        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                throw new Error(`Path exists but is not a directory: ${dirPath}`);
            }
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Directory not found: ${dirPath}`);
            }
            throw error;
        }
    }
    
    /**
     * Send a JSON response
     * @private
     */
    sendJsonResponse(res, statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }
}

module.exports = SearchAPI;
