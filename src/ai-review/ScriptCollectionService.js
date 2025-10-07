/**
 * Script Collection Service
 * Collects and prepares JavaScript scripts from parsed TWX objects for AI analysis
 */

class ScriptCollectionService {
    constructor() {
        this.collectedScripts = [];
        this.scriptIndex = 0;
        this.seenScriptContents = new Map(); // Track script content hashes to prevent duplicates
    }

    /**
     * Collect all scripts from parsed objects
     * @param {Array} objects - Array of parsed TWX objects
     * @returns {Array} Array of script objects ready for AI analysis
     */
    collectAllScripts(objects) {
        this.collectedScripts = [];
        this.scriptIndex = 0;
        this.seenScriptContents.clear(); // Reset deduplication map

        if (!objects || !Array.isArray(objects)) {
            console.log('❌ No objects provided or not an array:', typeof objects, objects?.length);
            return [];
        }

        console.log(`📊 Starting script collection from ${objects.length} objects`);

        objects.forEach((obj, index) => {
            console.log(`🔍 Processing object ${index + 1}/${objects.length}: ${obj.name} (${obj.type})`);
            this.collectScriptsFromObject(obj);
        });

        console.log(`✅ Collected ${this.collectedScripts.length} unique scripts for AI analysis`);
        console.log(`🔍 Duplicates prevented: ${this.seenScriptContents.size - this.collectedScripts.length}`);
        return this.collectedScripts;
    }

    /**
     * Collect scripts from a single object
     * @param {Object} obj - Parsed TWX object
     */
    collectScriptsFromObject(obj) {
        if (!obj || !obj.details) {
            console.log(`⚠️ Skipping object without details:`, obj?.name || 'unnamed', obj?.type);
            return;
        }

        // Skip toolkit objects if they shouldn't be analyzed
        if (obj.source === 'toolkit') {
            console.log(`🚫 Skipping toolkit object: ${obj.name} (${obj.type})`);
            return;
        }

        const sourceType = this.getSourceType(obj);
        const sourceName = obj.name || 'Unnamed Object';

        // Store object metadata for use in script collection
        this.currentObjectMetadata = {
            object_id: obj.id,
            object_name: obj.name,
            object_type: obj.type,
            object_source: obj.source
        };

        console.log(`🔍 Processing ${sourceType}: ${sourceName} (source: ${obj.source || 'unknown'})`);

        // 1. Collect from main scripts array
        if (obj.details.scripts && Array.isArray(obj.details.scripts)) {
            console.log(`  📜 Found ${obj.details.scripts.length} main scripts`);
            obj.details.scripts.forEach(script => {
                const content = this.getScriptContent(script);
                if (content && content.trim()) {
                    console.log(`    ✅ Adding script: ${script.name || 'Unnamed'} (${content.length} chars)`);
                    this.addScript({
                        name: script.name || 'Unnamed Script',
                        source_object: sourceName,
                        source_type: sourceType,
                        content: content,
                        elementType: script.elementType,
                        scriptType: script.scriptType,
                        elementId: script.elementId
                    });
                } else {
                    console.log(`    ❌ Skipping empty script: ${script.name || 'Unnamed'}`);
                }
            });
        } else {
            console.log(`  ❌ No main scripts array found`);
        }

        // 2. Collect from inline scripts (Coach Views)
        if (obj.details.inlineScripts && Array.isArray(obj.details.inlineScripts)) {
            obj.details.inlineScripts.forEach(script => {
                const content = script.scriptBlock || script.content || script.script;
                if (content && content.trim()) {
                    this.addScript({
                        name: script.name || 'Inline Script',
                        source_object: sourceName,
                        source_type: sourceType,
                        content: content.trim(),
                        scriptType: 'inline'
                    });
                }
            });
        }

        // 3. Collect from loadJsFunction (Coach Views)
        if (obj.details.loadJsFunction && obj.details.loadJsFunction.trim()) {
            this.addScript({
                name: 'Load JS Function',
                source_object: sourceName,
                source_type: sourceType,
                content: obj.details.loadJsFunction.trim(),
                scriptType: 'loadJs'
            });
        }

        // 4. Collect from process elements (CSHS objects)
        if (obj.details.elements) {
            this.collectScriptsFromElements(obj.details.elements, sourceName, sourceType);
        }

        // 5. Collect from service operations (Web Services)
        if (obj.details.operations && Array.isArray(obj.details.operations)) {
            obj.details.operations.forEach(operation => {
                if (operation.script && operation.script.trim()) {
                    this.addScript({
                        name: `${operation.name || 'Unnamed Operation'} (Operation)`,
                        source_object: sourceName,
                        source_type: sourceType,
                        content: operation.script.trim(),
                        scriptType: 'operation',
                        operationName: operation.name
                    });
                }
            });
        }
    }

    /**
     * Collect scripts from process elements
     * @param {Object} elements - Process elements object
     * @param {string} sourceName - Source object name
     * @param {string} sourceType - Source object type
     */
    collectScriptsFromElements(elements, sourceName, sourceType) {
        const elementTypes = ['scriptTasks', 'formTasks', 'callActivities', 'exclusiveGateways'];

        elementTypes.forEach(elementType => {
            if (elements[elementType] && Array.isArray(elements[elementType])) {
                elements[elementType].forEach(element => {
                    // Main script
                    if (element.script && element.script.trim()) {
                        this.addScript({
                            name: `${element.name || 'Unnamed'} (${this.getElementTypeName(elementType)})`,
                            source_object: sourceName,
                            source_type: sourceType,
                            content: element.script.trim(),
                            elementType: elementType.slice(0, -1), // Remove 's' from plural
                            elementId: element.id,
                            scriptType: 'main'
                        });
                    }

                    // Pre-assignment script
                    if (element.preScript && element.preScript.trim()) {
                        this.addScript({
                            name: `${element.name || 'Unnamed'} (Pre-Assignment)`,
                            source_object: sourceName,
                            source_type: sourceType,
                            content: element.preScript.trim(),
                            elementType: elementType.slice(0, -1),
                            elementId: element.id,
                            scriptType: 'preAssignment'
                        });
                    }

                    // Post-assignment script
                    if (element.postScript && element.postScript.trim()) {
                        this.addScript({
                            name: `${element.name || 'Unnamed'} (Post-Assignment)`,
                            source_object: sourceName,
                            source_type: sourceType,
                            content: element.postScript.trim(),
                            elementType: elementType.slice(0, -1),
                            elementId: element.id,
                            scriptType: 'postAssignment'
                        });
                    }
                });
            }
        });
    }

    /**
     * Add a script to the collection
     * @param {Object} scriptData - Script data object
     */
    addScript(scriptData) {
        if (!scriptData.content || !scriptData.content.trim()) {
            return;
        }

        // Clean and validate content first
        scriptData.content = this.cleanScriptContent(scriptData.content);

        // Only process if content is substantial (more than just whitespace/comments)
        if (!this.isSubstantialScript(scriptData.content)) {
            return;
        }

        // Create a content hash for deduplication
        // Normalize content by removing all whitespace and comments for comparison
        const normalizedContent = this.normalizeContentForComparison(scriptData.content);
        const contentHash = this.hashString(normalizedContent);

        // Check if we've already seen this exact script content
        if (this.seenScriptContents.has(contentHash)) {
            const existingScript = this.seenScriptContents.get(contentHash);
            console.log(`    ⚠️ Duplicate script detected! Skipping "${scriptData.name}"`);
            console.log(`       Already collected as: "${existingScript.name}" from ${existingScript.source_object}`);
            return; // Skip this duplicate
        }

        // Generate unique ID
        scriptData.id = `script_${++this.scriptIndex}`;

        // Add object metadata if available
        if (this.currentObjectMetadata) {
            scriptData.object_id = this.currentObjectMetadata.object_id;
            scriptData.object_name = this.currentObjectMetadata.object_name;
            scriptData.object_type = this.currentObjectMetadata.object_type;
            scriptData.object_source = this.currentObjectMetadata.object_source;
        }

        // Add to collection and mark content as seen
        this.collectedScripts.push(scriptData);
        this.seenScriptContents.set(contentHash, {
            name: scriptData.name,
            source_object: scriptData.source_object,
            id: scriptData.id
        });
    }

    /**
     * Get script content from various formats
     * @param {Object} script - Script object
     * @returns {string} Script content
     */
    getScriptContent(script) {
        return script.content || script.script || script.scriptBlock || script.scriptContent || '';
    }

    /**
     * Get source type from object
     * @param {Object} obj - TWX object
     * @returns {string} Source type
     */
    getSourceType(obj) {
        if (obj.type === '64') return 'coach_view';
        if (obj.type === '1' && obj.subType === '10') return 'cshs';
        if (obj.type === '1') return 'service';
        if (obj.type === '7') return 'web_service';
        return 'unknown';
    }

    /**
     * Get human-readable element type name
     * @param {string} elementType - Element type
     * @returns {string} Human-readable name
     */
    getElementTypeName(elementType) {
        const typeMap = {
            'scriptTasks': 'Script Task',
            'formTasks': 'Form Task',
            'callActivities': 'Call Activity',
            'exclusiveGateways': 'Exclusive Gateway'
        };
        return typeMap[elementType] || elementType;
    }

    /**
     * Clean script content
     * @param {string} content - Raw script content
     * @returns {string} Cleaned script content
     */
    cleanScriptContent(content) {
        if (!content) return '';

        return content
            .replace(/\r\r\n/g, '\n')  // Convert \r\r\n to \n
            .replace(/\r\n/g, '\n')    // Convert \r\n to \n
            .replace(/\r/g, '\n')      // Convert standalone \r to \n
            .replace(/&lt;/g, '<')     // Decode HTML entities
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    }

    /**
     * Check if script content is substantial enough for analysis
     * @param {string} content - Script content
     * @returns {boolean} True if substantial
     */
    isSubstantialScript(content) {
        if (!content || content.trim().length < 10) {
            return false;
        }

        // Remove comments and whitespace to check actual code content
        const codeOnly = content
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/.*$/gm, '')         // Remove line comments
            .replace(/\s+/g, ' ')             // Normalize whitespace
            .trim();

        return codeOnly.length > 5;
    }

    /**
     * Get collection statistics
     * @returns {Object} Statistics about collected scripts
     */
    getCollectionStatistics() {
        const stats = {
            totalScripts: this.collectedScripts.length,
            bySourceType: {},
            byScriptType: {},
            totalLines: 0,
            averageLength: 0
        };

        this.collectedScripts.forEach(script => {
            // Count by source type
            stats.bySourceType[script.source_type] = (stats.bySourceType[script.source_type] || 0) + 1;
            
            // Count by script type
            const scriptType = script.scriptType || 'main';
            stats.byScriptType[scriptType] = (stats.byScriptType[scriptType] || 0) + 1;
            
            // Calculate lines
            const lines = script.content.split('\n').length;
            stats.totalLines += lines;
        });

        if (stats.totalScripts > 0) {
            stats.averageLength = Math.round(stats.totalLines / stats.totalScripts);
        }

        return stats;
    }

    /**
     * Filter scripts by criteria
     * @param {Object} criteria - Filter criteria
     * @returns {Array} Filtered scripts
     */
    filterScripts(criteria = {}) {
        let filtered = [...this.collectedScripts];

        if (criteria.sourceType) {
            filtered = filtered.filter(script => script.source_type === criteria.sourceType);
        }

        if (criteria.scriptType) {
            filtered = filtered.filter(script => script.scriptType === criteria.scriptType);
        }

        if (criteria.minLength) {
            filtered = filtered.filter(script => script.content.length >= criteria.minLength);
        }

        if (criteria.maxLength) {
            filtered = filtered.filter(script => script.content.length <= criteria.maxLength);
        }

        if (criteria.searchTerm) {
            const term = criteria.searchTerm.toLowerCase();
            filtered = filtered.filter(script => 
                script.name.toLowerCase().includes(term) ||
                script.source_object.toLowerCase().includes(term) ||
                script.content.toLowerCase().includes(term)
            );
        }

        return filtered;
    }

    /**
     * Normalize script content for comparison (remove whitespace and comments)
     * @param {string} content - Script content
     * @returns {string} Normalized content
     */
    normalizeContentForComparison(content) {
        if (!content) return '';

        return content
            // Remove single-line comments
            .replace(/\/\/.*$/gm, '')
            // Remove multi-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove all whitespace (spaces, tabs, newlines)
            .replace(/\s+/g, '')
            // Convert to lowercase for case-insensitive comparison
            .toLowerCase();
    }

    /**
     * Create a simple hash from a string
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    hashString(str) {
        if (!str) return '0';

        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36); // Convert to base-36 string
    }

    /**
     * Get scripts ready for AI analysis
     * @param {Object} criteria - Optional filter criteria
     * @returns {Array} Scripts formatted for AI analysis
     */
    getScriptsForAnalysis(criteria = {}) {
        const scripts = this.filterScripts(criteria);
        
        return scripts.map(script => ({
            id: script.id,
            name: script.name,
            source_object: script.source_object,
            source_type: script.source_type,
            content: script.content,
            metadata: {
                elementType: script.elementType,
                scriptType: script.scriptType,
                elementId: script.elementId,
                operationName: script.operationName,
                lineCount: script.content.split('\n').length,
                characterCount: script.content.length
            }
        }));
    }

    /**
     * Clear collected scripts
     */
    clear() {
        this.collectedScripts = [];
        this.scriptIndex = 0;
    }
}

module.exports = ScriptCollectionService;
