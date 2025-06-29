const fs = require('fs').promises;
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

class XMLSearch {
    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
    }

    /**
     * Search for text in XML files within a directory
     * @param {string} searchTerm - The text to search for
     * @param {string} directory - Directory containing XML files
     * @param {Object} options - Search options
     * @param {number} [options.contextLines=2] - Number of lines to include around the match
     * @returns {Promise<Array>} Array of search results
     */
    async searchInXMLFiles(searchTerm, directory, options = {}) {
        const { contextLines = 2 } = options;
        const results = [];
        
        try {
            // Get all XML files in the directory
            const files = await this.findFilesByExtension(directory, '.xml');
            
            // Process each file
            for (const file of files) {
                try {
                    const fileResults = await this.searchInFile(file, searchTerm, { contextLines });
                    if (fileResults && fileResults.matches.length > 0) {
                        results.push(fileResults);
                    }
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error during XML search:', error);
            throw error;
        }
    }

    /**
     * Find files by extension in a directory (recursively)
     * @private
     */
    async findFilesByExtension(dir, ext) {
        let results = [];
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                // Recursively search in subdirectories
                const subResults = await this.findFilesByExtension(fullPath, ext);
                results = results.concat(subResults);
            } else if (item.isFile() && path.extname(item.name).toLowerCase() === ext) {
                results.push(fullPath);
            }
        }
        
        return results;
    }

    /**
     * Search for text in a single XML file
     * @private
     */
    async searchInFile(filePath, searchTerm, options) {
        const { contextLines = 2 } = options;
        const matches = [];
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        // Extract object ID from filename (assuming format: {id}.xml)
        const objectId = path.basename(filePath, '.xml');
        
        // Simple text search with context
        const lines = fileContent.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const index = line.toLowerCase().indexOf(searchTerm.toLowerCase());
            
            if (index !== -1) {
                // Get context lines
                const startLine = Math.max(0, i - contextLines);
                const endLine = Math.min(lines.length - 1, i + contextLines);
                const context = lines.slice(startLine, endLine + 1).join('\n');
                
                matches.push({
                    line: i + 1,
                    column: index + 1,
                    context,
                    snippet: this.extractSnippet(line, index, 50) // Extract 50 chars around the match
                });
            }
        }
        
        if (matches.length === 0) {
            return null;
        }
        
        return {
            filePath,
            objectId,
            matches,
            matchCount: matches.length
        };
    }
    
    /**
     * Extract a snippet of text around the match
     * @private
     */
    extractSnippet(line, index, charsAround) {
        const start = Math.max(0, index - charsAround);
        const end = Math.min(line.length, index + searchTerm.length + charsAround);
        let snippet = line.substring(start, end);
        
        // Add ellipsis if not at the start/end
        if (start > 0) snippet = '...' + snippet;
        if (end < line.length) snippet = snippet + '...';
        
        // Highlight the match
        return snippet.replace(
            new RegExp(`(${searchTerm})`, 'gi'),
            '<span class="highlight">$1</span>'
        );
    }
}

/**
 * Convenience function to search for text in XML files
 * @param {string} searchTerm - The text to search for
 * @param {string} directory - Directory containing XML files
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of search results
 */
async function searchXMLFiles(searchTerm, directory, options = {}) {
    const searcher = new XMLSearch();
    return await searcher.searchInXMLFiles(searchTerm, directory, options);
}

module.exports = { XMLSearch, searchXMLFiles };
