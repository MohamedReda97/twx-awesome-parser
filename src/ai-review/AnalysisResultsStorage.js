/**
 * Analysis Results Storage
 * Handles local storage and caching of AI analysis results
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AnalysisResultsStorage {
    constructor(outputDir = './output') {
        this.outputDir = outputDir;
        this.resultsFile = path.join(outputDir, 'ai-analysis-results.json');
        this.cacheDir = path.join(outputDir, 'ai-cache');
        this.cache = new Map();
    }

    /**
     * Initialize storage system
     */
    async initialize() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            await fs.mkdir(this.cacheDir, { recursive: true });
            await this.loadCache();
            console.log('Analysis Results Storage initialized');
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }
    }

    /**
     * Save analysis results
     * @param {Array} results - Analysis results
     * @param {Object} metadata - Analysis metadata
     * @returns {Promise<string>} Saved file path
     */
    async saveAnalysisResults(results, metadata = {}) {
        try {
            const analysisData = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                metadata: {
                    totalScripts: results.length,
                    provider: metadata.provider,
                    model: metadata.model,
                    analysisConfig: metadata.config,
                    ...metadata
                },
                statistics: this.calculateStatistics(results),
                results: results
            };

            // Save main results file
            await fs.writeFile(this.resultsFile, JSON.stringify(analysisData, null, 2));

            // Save timestamped backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.outputDir, `ai-analysis-${timestamp}.json`);
            await fs.writeFile(backupFile, JSON.stringify(analysisData, null, 2));

            // Update cache
            await this.updateCache(results);

            console.log(`Analysis results saved: ${results.length} scripts analyzed`);
            return this.resultsFile;
        } catch (error) {
            console.error('Failed to save analysis results:', error);
            throw error;
        }
    }

    /**
     * Load analysis results
     * @returns {Promise<Object>} Analysis data
     */
    async loadAnalysisResults() {
        try {
            const data = await fs.readFile(this.resultsFile, 'utf8');
            const analysisData = JSON.parse(data);
            
            // Validate structure
            if (!analysisData.results || !Array.isArray(analysisData.results)) {
                throw new Error('Invalid analysis results format');
            }

            return analysisData;
        } catch (error) {
            console.warn('No existing analysis results found or invalid format');
            return {
                timestamp: null,
                version: '1.0',
                metadata: { totalScripts: 0 },
                statistics: this.getEmptyStatistics(),
                results: []
            };
        }
    }

    /**
     * Load cache from disk
     */
    async loadCache() {
        try {
            const cacheFiles = await fs.readdir(this.cacheDir);
            
            for (const file of cacheFiles) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.cacheDir, file);
                        const data = await fs.readFile(filePath, 'utf8');
                        const cacheEntry = JSON.parse(data);
                        this.cache.set(cacheEntry.hash, cacheEntry);
                    } catch (error) {
                        console.warn(`Failed to load cache file ${file}:`, error);
                    }
                }
            }
            
            console.log(`Loaded ${this.cache.size} cached analysis results`);
        } catch (error) {
            console.warn('Failed to load cache:', error);
        }
    }

    /**
     * Update cache with new results
     * @param {Array} results - Analysis results
     */
    async updateCache(results) {
        try {
            for (const result of results) {
                const hash = this.generateScriptHash(result.script_id);
                const cacheEntry = {
                    hash: hash,
                    script_id: result.script_id,
                    timestamp: new Date().toISOString(),
                    result: result
                };

                this.cache.set(hash, cacheEntry);

                // Save to disk
                const cacheFile = path.join(this.cacheDir, `${hash}.json`);
                await fs.writeFile(cacheFile, JSON.stringify(cacheEntry, null, 2));
            }
        } catch (error) {
            console.error('Failed to update cache:', error);
        }
    }

    /**
     * Get cached result for script
     * @param {string} scriptId - Script ID
     * @param {string} scriptContent - Script content for hash generation
     * @returns {Object|null} Cached result or null
     */
    getCachedResult(scriptId, scriptContent) {
        const hash = this.generateScriptHash(scriptId, scriptContent);
        const cacheEntry = this.cache.get(hash);
        
        if (cacheEntry) {
            // Check if cache is still valid (e.g., less than 7 days old)
            const cacheAge = Date.now() - new Date(cacheEntry.timestamp).getTime();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (cacheAge < maxAge) {
                return cacheEntry.result;
            } else {
                // Remove expired cache
                this.cache.delete(hash);
                this.deleteCacheFile(hash);
            }
        }
        
        return null;
    }

    /**
     * Generate hash for script caching
     * @param {string} scriptId - Script ID
     * @param {string} scriptContent - Script content
     * @returns {string} Hash
     */
    generateScriptHash(scriptId, scriptContent = '') {
        const hashInput = `${scriptId}:${scriptContent}`;
        return crypto.createHash('md5').update(hashInput).digest('hex');
    }

    /**
     * Delete cache file
     * @param {string} hash - Cache hash
     */
    async deleteCacheFile(hash) {
        try {
            const cacheFile = path.join(this.cacheDir, `${hash}.json`);
            await fs.unlink(cacheFile);
        } catch (error) {
            // Ignore errors for missing files
        }
    }

    /**
     * Calculate statistics from results
     * @param {Array} results - Analysis results
     * @returns {Object} Statistics
     */
    calculateStatistics(results) {
        const stats = {
            totalScripts: results.length,
            totalIssues: 0,
            severityBreakdown: { critical: 0, warning: 0, info: 0 },
            typeBreakdown: {},
            scoreDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0, 'N/A': 0 },
            sourceTypeBreakdown: {},
            averageIssuesPerScript: 0
        };

        results.forEach(result => {
            // Count issues by severity
            if (result.issues && Array.isArray(result.issues)) {
                stats.totalIssues += result.issues.length;
                
                result.issues.forEach(issue => {
                    stats.severityBreakdown[issue.severity] = (stats.severityBreakdown[issue.severity] || 0) + 1;
                    stats.typeBreakdown[issue.type] = (stats.typeBreakdown[issue.type] || 0) + 1;
                });
            }
            
            // Count score distribution
            stats.scoreDistribution[result.overall_score] = (stats.scoreDistribution[result.overall_score] || 0) + 1;
        });

        if (stats.totalScripts > 0) {
            stats.averageIssuesPerScript = Math.round((stats.totalIssues / stats.totalScripts) * 100) / 100;
        }

        return stats;
    }

    /**
     * Get empty statistics structure
     * @returns {Object} Empty statistics
     */
    getEmptyStatistics() {
        return {
            totalScripts: 0,
            totalIssues: 0,
            severityBreakdown: { critical: 0, warning: 0, info: 0 },
            typeBreakdown: {},
            scoreDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0, 'N/A': 0 },
            sourceTypeBreakdown: {},
            averageIssuesPerScript: 0
        };
    }

    /**
     * Export results to different formats
     * @param {Array} results - Analysis results
     * @param {string} format - Export format ('json', 'csv')
     * @returns {Promise<string>} Export file path
     */
    async exportResults(results, format = 'json') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        switch (format.toLowerCase()) {
            case 'json':
                return await this.exportToJSON(results, timestamp);
            case 'csv':
                return await this.exportToCSV(results, timestamp);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export results to JSON
     * @param {Array} results - Analysis results
     * @param {string} timestamp - Timestamp for filename
     * @returns {Promise<string>} Export file path
     */
    async exportToJSON(results, timestamp) {
        const exportFile = path.join(this.outputDir, `ai-analysis-export-${timestamp}.json`);
        const exportData = {
            exportTimestamp: new Date().toISOString(),
            totalResults: results.length,
            results: results
        };
        
        await fs.writeFile(exportFile, JSON.stringify(exportData, null, 2));
        return exportFile;
    }

    /**
     * Export results to CSV
     * @param {Array} results - Analysis results
     * @param {string} timestamp - Timestamp for filename
     * @returns {Promise<string>} Export file path
     */
    async exportToCSV(results, timestamp) {
        const exportFile = path.join(this.outputDir, `ai-analysis-export-${timestamp}.csv`);
        
        const csvHeaders = [
            'Script ID', 'Source Object', 'Source Type', 'Overall Score',
            'Issue Severity', 'Issue Type', 'Issue Description', 'Line Number', 'Suggestion'
        ];
        
        const csvRows = [csvHeaders.join(',')];
        
        results.forEach(result => {
            if (result.issues && result.issues.length > 0) {
                result.issues.forEach(issue => {
                    const row = [
                        this.escapeCsvValue(result.script_id),
                        this.escapeCsvValue(result.source_object || ''),
                        this.escapeCsvValue(result.source_type || ''),
                        this.escapeCsvValue(result.overall_score),
                        this.escapeCsvValue(issue.severity),
                        this.escapeCsvValue(issue.type),
                        this.escapeCsvValue(issue.description),
                        issue.line_number || '',
                        this.escapeCsvValue(issue.suggestion || '')
                    ];
                    csvRows.push(row.join(','));
                });
            } else {
                // No issues
                const row = [
                    this.escapeCsvValue(result.script_id),
                    this.escapeCsvValue(result.source_object || ''),
                    this.escapeCsvValue(result.source_type || ''),
                    this.escapeCsvValue(result.overall_score),
                    '', '', 'No issues found', '', ''
                ];
                csvRows.push(row.join(','));
            }
        });
        
        await fs.writeFile(exportFile, csvRows.join('\n'));
        return exportFile;
    }

    /**
     * Escape CSV value
     * @param {string} value - Value to escape
     * @returns {string} Escaped value
     */
    escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    /**
     * Clear all cached results
     */
    async clearCache() {
        try {
            const cacheFiles = await fs.readdir(this.cacheDir);
            for (const file of cacheFiles) {
                await fs.unlink(path.join(this.cacheDir, file));
            }
            this.cache.clear();
            console.log('Analysis cache cleared');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStatistics() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        this.cache.forEach(entry => {
            const age = now - new Date(entry.timestamp).getTime();
            if (age < maxAge) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        });

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            cacheHitRate: this.cacheHitRate || 0
        };
    }
}

module.exports = AnalysisResultsStorage;
