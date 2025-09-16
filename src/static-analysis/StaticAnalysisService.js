const { ESLint } = require('eslint');
const prettier = require('prettier');
const fs = require('fs');
const path = require('path');

/**
 * Static Analysis Service for JavaScript code review
 * Uses ESLint, Prettier, and other static analysis tools
 */
class StaticAnalysisService {
    constructor() {
        this.eslint = null;
        this.prettierConfig = null;
        this.initialized = false;

        // Don't call initializeTools here - it's async
    }

    /**
     * Initialize ESLint and Prettier
     */
    async initializeTools() {
        try {
            // Force ESLint to use legacy config system
            process.env.ESLINT_USE_FLAT_CONFIG = 'false';

            // Initialize ESLint with our configuration
            this.eslint = new ESLint({
                overrideConfigFile: path.join(process.cwd(), '.eslintrc.cjs'),
                useEslintrc: true,
                fix: false // We don't want to modify the original code
            });

            // Load Prettier configuration
            this.prettierConfig = await prettier.resolveConfig(process.cwd()) || {};

            this.initialized = true;
            console.log('Static analysis tools initialized successfully');
        } catch (error) {
            console.error('Error initializing static analysis tools:', error);
            throw error;
        }
    }

    /**
     * Analyze a collection of scripts
     * @param {Array} scripts - Array of script objects with id, name, content, etc.
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeScripts(scripts) {
        if (!this.eslint) {
            await this.initializeTools();
        }

        const results = [];
        const statistics = {
            totalScripts: scripts.length,
            scriptsWithIssues: 0,
            totalIssues: 0,
            issuesBySeverity: { error: 0, warning: 0, info: 0 },
            issuesByCategory: {}
        };

        for (const script of scripts) {
            try {
                const scriptResult = await this.analyzeScript(script);
                results.push(scriptResult);

                // Update statistics
                if (scriptResult.issues.length > 0) {
                    statistics.scriptsWithIssues++;
                    statistics.totalIssues += scriptResult.issues.length;

                    scriptResult.issues.forEach(issue => {
                        statistics.issuesBySeverity[issue.severity]++;
                        if (!statistics.issuesByCategory[issue.category]) {
                            statistics.issuesByCategory[issue.category] = 0;
                        }
                        statistics.issuesByCategory[issue.category]++;
                    });
                }
            } catch (error) {
                console.error(`Error analyzing script ${script.id}:`, error);
                results.push({
                    scriptId: script.id,
                    scriptName: script.name || 'Unknown Script',
                    objectName: script.source_object || 'Unknown Object',
                    objectType: script.source_type || 'Unknown Type',
                    issues: [{
                        severity: 'error',
                        category: 'analysis_error',
                        rule: 'analysis-error',
                        description: `Analysis failed: ${error.message}`,
                        line: 1,
                        column: 1,
                        code: script.content ? script.content.split('\n')[0] : '',
                        suggestion: 'Check script syntax and content'
                    }],
                    metrics: {
                        complexity: 0,
                        lines: script.content ? script.content.split('\n').length : 0,
                        maintainability: 0
                    }
                });
            }
        }

        return {
            results,
            statistics,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Analyze a single script
     * @param {Object} script - Script object with content and metadata
     * @returns {Promise<Object>} Script analysis result
     */
    async analyzeScript(script) {
        // Ensure tools are initialized
        if (!this.initialized) {
            await this.initializeTools();
        }

        const issues = [];

        // Extract script content from different possible property names
        const originalContent = this.getScriptContent(script);
        if (!originalContent) {
            console.warn(`Script ${script.id || script.name} has no content to analyze`);
            return {
                scriptId: script.id,
                scriptName: script.name || 'Unknown Script',
                issues: [],
                metrics: { linesOfCode: 0, nonEmptyLines: 0, commentLines: 0 }
            };
        }

        let formattedContent = originalContent;

        // Only format if content appears to be JavaScript
        if (this.isJavaScriptContent(originalContent)) {
            try {
                // Step 1: Clean content before formatting
                const cleanedContent = this.cleanJavaScriptContent(originalContent);

                // Step 2: Format with Prettier (silent - no issues reported)
                formattedContent = await prettier.format(cleanedContent, {
                    parser: 'babel',
                    semi: true,
                    singleQuote: true,
                    tabWidth: 2,
                    printWidth: 120
                });
            } catch (prettierError) {
                // If Prettier fails, try with original content for ESLint
                console.warn('Prettier formatting failed, using original content:', prettierError.message);
                formattedContent = originalContent;

                // Only report syntax errors if they're truly critical
                if (this.isCriticalSyntaxError(prettierError)) {
                    issues.push({
                        line: this.extractLineFromError(prettierError),
                        column: this.extractColumnFromError(prettierError),
                        severity: 'error',
                        category: 'Syntax Error',
                        rule: 'syntax-error',
                        message: 'Critical syntax error: ' + this.simplifyErrorMessage(prettierError.message),
                        codeContext: this.getCodeContext(originalContent, this.extractLineFromError(prettierError))
                    });
                }
            }
        }

        // Only run JavaScript-specific analysis on JavaScript content
        if (this.isJavaScriptContent(originalContent)) {


            // Step 2: Run ESLint analysis on formatted code (critical errors only)
            const scriptForESLint = {
                id: script.id,
                name: script.name,
                content: formattedContent
            };
            const eslintResults = await this.runESLintAnalysis(scriptForESLint);
            issues.push(...eslintResults);

            // Step 3: Run custom analysis for nested loops and conditions
            const customResults = this.runCustomAnalysis(scriptForESLint);
            issues.push(...customResults);
        } else {

            // For non-JavaScript content, add a note
            issues.push({
                line: 1,
                column: 1,
                severity: 'info',
                category: 'Content Type',
                rule: 'non-javascript-content',
                message: 'Content appears to be non-JavaScript (CSS, HTML, or XML). JavaScript analysis skipped.',
                codeContext: this.getCodeContext(originalContent, 1)
            });
        }

        // Calculate basic metrics
        const metrics = this.calculateMetrics(originalContent);

        return {
            scriptId: script.id,
            scriptName: script.name || 'Unknown Script',
            objectName: script.source_object || 'Unknown Object',
            objectType: script.source_type || 'Unknown Type',
            issues,
            metrics
        };
    }

    /**
     * Run ESLint analysis on a script
     * @param {Object} script - Script object
     * @returns {Promise<Array>} Array of issues found
     */
    async runESLintAnalysis(script) {
        if (!script.content || typeof script.content !== 'string' || !script.content.trim()) {
            return [];
        }

        if (!this.eslint) {
            console.error('ESLint not initialized!');
            return [];
        }

        try {
            const results = await this.eslint.lintText(script.content, {
                filePath: `${script.id}.js`
            });

            const issues = [];
            for (const result of results) {
                for (const message of result.messages) {
                    const codeContext = this.getCodeContext(script.content, message.line);
                    issues.push({
                        severity: this.mapESLintSeverity(message.severity),
                        category: this.categorizeESLintRule(message.ruleId),
                        rule: message.ruleId || 'unknown',
                        description: message.message,
                        line: message.line,
                        column: message.column,
                        code: codeContext.currentLine,
                        codeContext: codeContext.contextLines,
                        codeContextHtml: codeContext.formattedHtml,
                        suggestion: this.getESLintSuggestion(message.ruleId, message.message)
                    });
                }
            }

            return issues;
        } catch (error) {
            console.error('ESLint analysis error:', error);
            return [{
                severity: 'error',
                category: 'syntax',
                rule: 'syntax-error',
                description: `Syntax error: ${error.message}`,
                line: 1,
                column: 1,
                code: script.content.split('\n')[0] || '',
                suggestion: 'Fix syntax errors in the script'
            }];
        }
    }



    /**
     * Calculate basic code metrics
     * @param {string} content - Script content
     * @returns {Object} Metrics object
     */
    calculateMetrics(content) {
        if (!content || typeof content !== 'string') {
            return { complexity: 0, lines: 0, maintainability: 0 };
        }

        const lines = content.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        
        // Simple cyclomatic complexity calculation
        const complexityKeywords = /\b(if|else|while|for|switch|case|catch|&&|\|\||\?)\b/g;
        const matches = content.match(complexityKeywords) || [];
        const complexity = matches.length + 1; // Base complexity is 1

        // Simple maintainability index (0-100)
        const maintainability = Math.max(0, Math.min(100, 
            100 - (complexity * 2) - (nonEmptyLines.length * 0.1)
        ));

        return {
            complexity,
            lines: lines.length,
            nonEmptyLines: nonEmptyLines.length,
            maintainability: Math.round(maintainability)
        };
    }

    /**
     * Map ESLint severity to our severity levels
     * @param {number} eslintSeverity - ESLint severity (1=warn, 2=error)
     * @returns {string} Our severity level
     */
    mapESLintSeverity(eslintSeverity) {
        switch (eslintSeverity) {
            case 2: return 'error';
            case 1: return 'warning';
            default: return 'info';
        }
    }

    /**
     * Categorize ESLint rules into logical groups
     * @param {string} ruleId - ESLint rule ID
     * @returns {string} Category name
     */
    categorizeESLintRule(ruleId) {
        if (!ruleId) return 'unknown';

        if (ruleId.startsWith('security/')) return 'security';
        if (ruleId.startsWith('promise/')) return 'async';
        if (ruleId.startsWith('sonarjs/')) return 'complexity';
        if (ruleId.startsWith('n/')) return 'node';
        
        // Common categories
        const syntaxRules = ['no-undef', 'no-unused-vars', 'no-redeclare', 'no-use-before-define'];
        const securityRules = ['no-eval', 'no-implied-eval', 'no-new-func', 'no-script-url'];
        const bestPracticeRules = ['no-console', 'no-alert', 'no-shadow'];

        if (syntaxRules.includes(ruleId)) return 'syntax';
        if (securityRules.includes(ruleId)) return 'security';
        if (bestPracticeRules.includes(ruleId)) return 'best_practice';

        return 'general';
    }

    /**
     * Get a specific line of code
     * @param {string} content - Full script content
     * @param {number} lineNumber - Line number (1-based)
     * @returns {string} The code line
     */
    getCodeLine(content, lineNumber) {
        if (!content || !lineNumber) return '';

        const lines = content.split('\n');
        const line = lines[lineNumber - 1];
        return line ? line.trim() : '';
    }

    /**
     * Get code context around a specific line
     * @param {string} content - Full script content
     * @param {number} lineNumber - Line number (1-based)
     * @param {number} contextLines - Number of lines before and after to include
     * @returns {Object} Object with currentLine, contextLines array, and formatted HTML
     */
    getCodeContext(content, lineNumber, contextLines = 3) {
        if (!content || typeof content !== 'string' || !lineNumber) {
            return {
                currentLine: '',
                contextLines: [],
                formattedHtml: '<div class="code-context-empty">No code context available</div>'
            };
        }

        const lines = content.split('\n');
        const currentLine = lines[lineNumber - 1] || '';

        // Calculate range for context
        const startLine = Math.max(0, lineNumber - contextLines - 1);
        const endLine = Math.min(lines.length, lineNumber + contextLines);

        const contextLinesArray = [];
        let formattedHtml = '<div class="code-context">';

        for (let i = startLine; i < endLine; i++) {
            const isCurrentLine = i === lineNumber - 1;
            const displayLineNumber = i + 1;
            const lineContent = lines[i] || '';

            // Create plain text version for contextLines array
            const prefix = isCurrentLine ? '>>> ' : '    ';
            contextLinesArray.push(`${displayLineNumber.toString().padStart(3, ' ')}: ${prefix}${lineContent}`);

            // Create HTML version with highlighting
            const lineClass = isCurrentLine ? 'code-line current-line' : 'code-line';
            const escapedContent = this.escapeHtml(lineContent);

            formattedHtml += `
                <div class="${lineClass}" data-line="${displayLineNumber}">
                    <span class="line-number">${displayLineNumber}</span>
                    <span class="line-content">${escapedContent}</span>
                </div>
            `;
        }

        formattedHtml += '</div>';

        return {
            currentLine: currentLine.trim(),
            contextLines: contextLinesArray,
            formattedHtml: formattedHtml
        };
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Run custom analysis for patterns not covered by ESLint
     * @param {Object} script - Script object
     * @returns {Array} Array of custom issues found
     */
    runCustomAnalysis(script) {
        if (!script.content || typeof script.content !== 'string' || !script.content.trim()) {
            return [];
        }

        const issues = [];
        const lines = script.content.split('\n');

        // Track nested loops
        let loopDepth = 0;
        const loopStack = [];

        // Track if conditions in loops
        const ifInLoopIssues = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const trimmedLine = line.trim();

            // Detect loop starts
            const loopRegex = /\b(for|while|do)\s*\(/;
            if (loopRegex.test(trimmedLine)) {
                loopDepth++;
                loopStack.push({ line: lineNumber, type: 'loop' });

                // Check for nested loops
                if (loopDepth > 1) {
                    const codeContext = this.getCodeContext(script.content, lineNumber);
                    issues.push({
                        severity: 'warning',
                        category: 'performance',
                        rule: 'custom-nested-loops',
                        description: 'Nested loops detected. Consider refactoring for better performance.',
                        line: lineNumber,
                        column: 1,
                        code: codeContext.currentLine,
                        codeContext: codeContext.contextLines,
                        codeContextHtml: codeContext.formattedHtml,
                        suggestion: 'Consider using more efficient algorithms, breaking loops early, or refactoring into separate functions.'
                    });
                }
            }

            // Detect loop ends (simplified - looks for closing braces)
            if (trimmedLine.includes('}') && loopStack.length > 0) {
                // This is a simplified approach - in a real parser we'd track braces properly
                const openBraces = (line.match(/{/g) || []).length;
                const closeBraces = (line.match(/}/g) || []).length;
                if (closeBraces > openBraces && loopDepth > 0) {
                    loopDepth = Math.max(0, loopDepth - 1);
                    loopStack.pop();
                }
            }

            // Detect if conditions inside loops without break/continue
            if (loopDepth > 0 && /\bif\s*\(/.test(trimmedLine)) {
                // Check if this if statement has break or continue in the next few lines
                let hasBreakOrContinue = false;
                const lookAheadLines = 5; // Check next 5 lines for break/continue

                for (let j = i; j < Math.min(i + lookAheadLines, lines.length); j++) {
                    if (/\b(break|continue)\b/.test(lines[j])) {
                        hasBreakOrContinue = true;
                        break;
                    }
                }

                if (!hasBreakOrContinue) {
                    const codeContext = this.getCodeContext(script.content, lineNumber);
                    issues.push({
                        severity: 'warning',
                        category: 'performance',
                        rule: 'custom-if-in-loop-no-break',
                        description: 'If condition inside loop without break or continue may cause unnecessary iterations.',
                        line: lineNumber,
                        column: 1,
                        code: codeContext.currentLine,
                        codeContext: codeContext.contextLines,
                        codeContextHtml: codeContext.formattedHtml,
                        suggestion: 'Consider adding break/continue statements or refactoring the logic to reduce loop iterations.'
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Clean JavaScript content to make it more parseable by Prettier
     * @param {string} content - Original JavaScript content
     * @returns {string} Cleaned content
     */
    cleanJavaScriptContent(content) {
        if (!content || typeof content !== 'string') {
            return '';
        }

        let cleaned = content;

        // Replace problematic escape sequences that might confuse Prettier
        cleaned = cleaned.replace(/\\t\\r\\r\\n/g, '\n'); // Fix the specific error pattern
        cleaned = cleaned.replace(/\\t/g, '\t');           // Convert \t to actual tabs
        cleaned = cleaned.replace(/\\r\\n/g, '\n');        // Convert \r\n to \n
        cleaned = cleaned.replace(/\\n/g, '\n');           // Convert \n to actual newlines
        cleaned = cleaned.replace(/\\r/g, '\r');           // Convert \r to actual carriage returns

        // Remove or fix other problematic patterns
        cleaned = cleaned.replace(/\r\n/g, '\n');          // Normalize line endings
        cleaned = cleaned.replace(/\r/g, '\n');            // Convert remaining \r to \n

        // Remove null characters and other control characters that might cause issues
        cleaned = cleaned.replace(/\0/g, '');              // Remove null characters
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove other control chars

        return cleaned;
    }

    /**
     * Check if a Prettier error represents a critical syntax error
     * @param {Error} error - Prettier error
     * @returns {boolean} True if error is critical
     */
    isCriticalSyntaxError(error) {
        const message = error.message.toLowerCase();

        // Only report truly critical syntax errors
        const criticalPatterns = [
            'unexpected end of input',
            'unexpected token',
            'unterminated string',
            'unterminated comment',
            'invalid regular expression',
            'missing closing bracket',
            'missing closing brace',
            'missing closing parenthesis'
        ];

        return criticalPatterns.some(pattern => message.includes(pattern));
    }

    /**
     * Simplify error message for user display
     * @param {string} message - Original error message
     * @returns {string} Simplified message
     */
    simplifyErrorMessage(message) {
        // Remove file paths and technical details
        let simplified = message.replace(/file:\/\/\/[^\s]+/g, '');
        simplified = simplified.replace(/at [^\n]+/g, '');
        simplified = simplified.replace(/\s+/g, ' ').trim();

        // Extract the core error
        const match = simplified.match(/SyntaxError:\s*(.+?)(?:\s*\(|$)/);
        if (match) {
            return match[1];
        }

        return simplified.substring(0, 100) + (simplified.length > 100 ? '...' : '');
    }

    /**
     * Extract column number from error
     * @param {Error} error - Error object
     * @returns {number} Column number
     */
    extractColumnFromError(error) {
        if (error.loc && error.loc.start && error.loc.start.column !== undefined) {
            return error.loc.start.column + 1; // Convert to 1-based
        }

        const match = error.message.match(/\((\d+):(\d+)\)/);
        if (match) {
            return parseInt(match[2]);
        }

        return 1;
    }

    /**
     * Check if content appears to be JavaScript code
     * @param {string} content - Content to check
     * @returns {boolean} True if content appears to be JavaScript
     */
    isJavaScriptContent(content) {
        if (!content || typeof content !== 'string') {
            return false;
        }

        const trimmedContent = content.trim();

        // Empty content is not JavaScript
        if (!trimmedContent) {
            return false;
        }

        // Check for obvious CSS patterns (must be very specific to avoid false positives)
        const cssPatterns = [
            /^\s*\.[a-zA-Z-_][\w-]*\s*\{[\s\S]*\}/,  // CSS class with complete block
            /^\s*#[a-zA-Z-_][\w-]*\s*\{[\s\S]*\}/,   // CSS ID with complete block
            /^\s*@media\s/,                          // CSS media queries
            /^\s*@import\s/,                         // CSS imports
            /^\s*@keyframes\s/,                      // CSS keyframes
        ];

        // Check for obvious HTML patterns
        const htmlPatterns = [
            /^\s*<!DOCTYPE/i,                        // DOCTYPE declaration
            /^\s*<html/i,                           // HTML root element
            /^\s*<head/i,                           // HTML head
            /^\s*<body/i,                           // HTML body
            /^\s*<div[^>]*>[\s\S]*<\/div>/i,        // Complete div blocks
        ];

        // Check for obvious XML patterns
        const xmlPatterns = [
            /^\s*<\?xml/i,                          // XML declaration
            /^\s*<[a-zA-Z][^>]*xmlns/i,             // XML with namespace
        ];

        // Only exclude if it's clearly CSS, HTML, or XML
        if (cssPatterns.some(pattern => pattern.test(trimmedContent)) ||
            htmlPatterns.some(pattern => pattern.test(trimmedContent)) ||
            xmlPatterns.some(pattern => pattern.test(trimmedContent))) {
            return false;
        }

        // Default to JavaScript for everything else
        // This is more permissive and allows most content to be analyzed
        return true;
    }

    /**
     * Extract script content from different possible property names
     * @param {Object} script - Script object
     * @returns {string|null} Script content or null if not found
     */
    getScriptContent(script) {
        // Try different property names for script content
        const content = script.content || script.script || script.scriptBlock;

        // Ensure it's a string and has content
        if (typeof content === 'string' && content.trim()) {
            return content.trim();
        }

        // Handle array format (some scripts are stored as arrays)
        if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'string') {
            return content[0].trim();
        }

        return null;
    }

    /**
     * Extract line number from Prettier error message
     * @param {Error} error - Prettier error
     * @returns {number} Line number or 1 if not found
     */
    extractLineFromError(error) {
        const match = error.message.match(/\((\d+):(\d+)\)/);
        return match ? parseInt(match[1]) : 1;
    }

    /**
     * Get suggestion for ESLint rule violations
     * @param {string} ruleId - ESLint rule ID
     * @param {string} message - ESLint message
     * @returns {string} Suggestion text
     */
    getESLintSuggestion(ruleId, message) {
        const suggestions = {
            'no-eval': 'Use JSON.parse() or safer alternatives instead of eval()',
            'no-console': 'Use IBM BPM logging mechanisms instead of console.log()',
            'no-alert': 'Use IBM BPM notification APIs instead of alert()',
            'no-undef': 'Declare the variable or add it to globals configuration',
            'no-unused-vars': 'Remove unused variables or prefix with underscore',
            'security/detect-eval-with-expression': 'Avoid dynamic code evaluation for security',
            'promise/catch-or-return': 'Add .catch() handler or return the promise',
            'sonarjs/cognitive-complexity': 'Break down complex functions into smaller ones'
        };

        return suggestions[ruleId] || 'Follow ESLint best practices for this rule';
    }
}

module.exports = StaticAnalysisService;
