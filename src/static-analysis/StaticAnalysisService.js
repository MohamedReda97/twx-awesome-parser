const { ESLint } = require('eslint');
const prettier = require('prettier');
const fs = require('fs');
const path = require('path');
const IssueDeduplicator = require('./IssueDeduplicator');

/**
 * Static Analysis Service for JavaScript code review
 * Implements Prettier → ESLint workflow with critical-only error reporting
 * Following the static analysis plan: format first, then analyze formatted code
 */
class StaticAnalysisService {
    constructor() {
        this.eslint = null;
        this.prettierConfig = null;
        this.initialized = false;
        this.deduplicator = new IssueDeduplicator();

        // Don't call initializeTools here - it's async
    }

    /**
     * Initialize ESLint and Prettier
     * ESLint is configured to use critical-only rules from .eslintrc.cjs
     * Prettier is configured to format code before ESLint analysis
     */
    async initializeTools() {
        try {
            // Force ESLint to use legacy config system
            process.env.ESLINT_USE_FLAT_CONFIG = 'false';

            // Initialize ESLint with critical-only configuration
            this.eslint = new ESLint({
                overrideConfigFile: path.join(process.cwd(), '.eslintrc.cjs'),
                useEslintrc: false, // Ignore any other config files
                fix: false // We don't want to modify the original code
            });

            // Load Prettier configuration with defaults matching the plan
            this.prettierConfig = await prettier.resolveConfig(process.cwd()) || {
                parser: 'babel',
                semi: true,
                singleQuote: true,
                tabWidth: 2,
                printWidth: 120
            };

            this.initialized = true;
            console.log('✅ Static analysis tools initialized (Prettier → ESLint critical-only workflow)');
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

        // Reset deduplicator for new analysis batch
        this.deduplicator.reset();

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

        // Skip CSS scripts and specific script types entirely
        if (this.isCSSScript(script)) {
            const scriptName = script.name || 'Unknown Script';

            console.log(`⏭️ Skipping script from analysis results: ${scriptName}`);

            // Return result with NO issues so it doesn't appear in the results table
            return {
                scriptId: script.id,
                scriptName: scriptName,
                objectName: script.source_object || 'Unknown Object',
                objectType: script.source_type || 'Unknown Type',
                issues: [], // Empty array - no issues to report
                metrics: this.calculateMetrics(originalContent),
                skipped: true, // Mark as skipped for statistics
                skipReason: scriptName.startsWith('Coachflow Script Pattern')
                    ? 'Coachflow Pattern'
                    : (scriptName === 'Inline CSS' || scriptName.toLowerCase().includes('css'))
                    ? 'CSS Content'
                    : 'Non-JavaScript Content'
            };
        }

        let formattedContent = originalContent;

        // Only format if content appears to be JavaScript
        if (this.isJavaScriptContent(originalContent)) {
            try {
                // Step 1: Clean content before formatting
                const cleanedContent = this.cleanJavaScriptContent(originalContent);

                // Step 2: Format with Prettier (SILENT - no issues reported)
                // This is the first step in our Prettier → ESLint workflow
                formattedContent = await prettier.format(cleanedContent, this.prettierConfig);

                // Prettier succeeded - no output, just formatted code for ESLint
            } catch (prettierError) {
                // If Prettier fails, use original content for ESLint
                // This is expected for code with syntax errors or non-standard JavaScript
                console.log(`ℹ️ Prettier formatting skipped for ${script.name}: ${prettierError.message.substring(0, 100)}`);
                formattedContent = originalContent;

                // Only report syntax errors if they're truly critical AND not in comments
                if (this.isCriticalSyntaxError(prettierError)) {
                    const errorLine = this.extractLineFromError(prettierError);
                    const lines = originalContent.split('\n');
                    const errorLineContent = lines[errorLine - 1] || '';

                    // Don't report errors in commented lines
                    const trimmedErrorLine = errorLineContent.trim();
                    if (!trimmedErrorLine.startsWith('//') && !trimmedErrorLine.startsWith('/*') && !trimmedErrorLine.startsWith('*')) {
                        issues.push({
                            line: errorLine,
                            column: this.extractColumnFromError(prettierError),
                            severity: 'error',
                            category: 'syntax',
                            rule: 'syntax-error',
                            description: 'Critical syntax error: ' + this.simplifyErrorMessage(prettierError.message),
                            code: errorLineContent.trim(),
                            codeContext: this.getCodeContext(originalContent, errorLine),
                            codeContextHtml: this.getCodeContext(originalContent, errorLine).formattedHtml,
                            suggestion: 'Fix the syntax error in the code'
                        });
                    }
                }
            }
        }

        // Only run JavaScript-specific analysis on JavaScript content
        if (this.isJavaScriptContent(originalContent)) {

            console.log(`\n=== Analyzing Script: ${script.name} (ID: ${script.id}) ===`);

            // Step 2: Run ESLint analysis on formatted code (critical errors only)
            const scriptForESLint = {
                id: script.id,
                name: script.name,
                content: formattedContent
            };
            const eslintResults = await this.runESLintAnalysis(scriptForESLint);
            console.log(`ESLint found ${eslintResults.length} valid issues (after filtering)`);
            issues.push(...eslintResults);

            // Step 3: Run custom analysis for nested loops and conditions
            const customResults = this.runCustomAnalysis(scriptForESLint);
            console.log(`Custom analysis found ${customResults.length} issues`);

            issues.push(...customResults);

            console.log(`Total issues for this script: ${issues.length}`);
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
     * Run ESLint analysis on a script (formatted code only)
     * Only reports CRITICAL errors as defined in .eslintrc.cjs
     * @param {Object} script - Script object
     * @returns {Promise<Array>} Array of critical issues found
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
            // Extract variables declared in this script to avoid false positives
            const scriptGlobals = this.extractScriptVariables(script.content);

            // Create a custom ESLint instance with script-specific globals if needed
            let eslintInstance = this.eslint;
            if (Object.keys(scriptGlobals).length > 0) {
                eslintInstance = new ESLint({
                    overrideConfigFile: path.join(process.cwd(), '.eslintrc.cjs'),
                    useEslintrc: false, // Ignore any other config files
                    fix: false,
                    overrideConfig: {
                        globals: {
                            ...scriptGlobals
                        }
                    }
                });
            }

            const results = await eslintInstance.lintText(script.content, {
                filePath: `${script.id}.js`
            });

            const issues = [];
            const lines = script.content.split('\n');
            let skippedUnknown = 0;
            let skippedNonCritical = 0;

            // Define critical rules that should be reported
            const criticalRules = [
                // Runtime errors
                'no-undef',
                'no-dupe-keys',
                'no-dupe-args',
                'no-unreachable',
                'no-invalid-regexp',
                'no-unsafe-negation',
                'for-direction',
                'no-compare-neg-zero',
                'no-cond-assign',
                'no-constant-condition',
                'no-debugger',
                'no-empty',
                'no-ex-assign',
                'no-func-assign',
                'no-inner-declarations',
                'no-obj-calls',
                'no-sparse-arrays',
                'valid-typeof',
                // Security issues
                'no-eval',
                'no-implied-eval',
                'no-new-func',
                'security/detect-eval-with-expression'
            ];

            for (const result of results) {
                for (const message of result.messages) {
                    // Skip issues with no ruleId (parsing errors that ESLint can't categorize)
                    if (!message.ruleId) {
                        skippedUnknown++;
                        console.log(`Skipping UNKNOWN ESLint issue at line ${message.line}: ${message.message.substring(0, 50)}`);
                        continue;
                    }

                    // CRITICAL FILTER: Only report errors (severity 2) from critical rules
                    if (message.severity !== 2 || !criticalRules.includes(message.ruleId)) {
                        skippedNonCritical++;
                        continue;
                    }

                    // Skip issues in commented lines
                    const lineContent = lines[message.line - 1] || '';
                    const trimmedLine = lineContent.trim();

                    // Skip if line is a comment
                    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
                        console.log(`Skipping ESLint issue in commented line ${message.line}: ${message.ruleId}`);
                        continue;
                    }

                    const codeContext = this.getCodeContext(script.content, message.line);
                    issues.push({
                        severity: this.mapESLintSeverity(message.severity),
                        category: this.categorizeESLintRule(message.ruleId),
                        rule: message.ruleId,
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

            if (skippedUnknown > 0) {
                console.log(`Total UNKNOWN issues skipped in ${script.name}: ${skippedUnknown}`);
            }
            if (skippedNonCritical > 0) {
                console.log(`Total NON-CRITICAL issues skipped in ${script.name}: ${skippedNonCritical}`);
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
     * Matches the categorization from the static analysis plan
     * @param {string} ruleId - ESLint rule ID
     * @returns {string} Category name
     */
    categorizeESLintRule(ruleId) {
        if (!ruleId) return 'CRITICAL_ERROR';

        // Security issues
        if (ruleId.includes('security') || ruleId.includes('eval')) {
            return 'security';
        }

        // Runtime errors
        if (ruleId.includes('undef') || ruleId.includes('no-dupe')) {
            return 'runtime_error';
        }

        // Other critical runtime errors
        const runtimeErrorRules = [
            'no-unreachable', 'no-invalid-regexp', 'no-unsafe-negation',
            'for-direction', 'no-compare-neg-zero', 'no-cond-assign',
            'no-constant-condition', 'no-debugger', 'no-empty',
            'no-ex-assign', 'no-func-assign', 'no-inner-declarations',
            'no-obj-calls', 'no-sparse-arrays', 'valid-typeof'
        ];

        if (runtimeErrorRules.includes(ruleId)) {
            return 'runtime_error';
        }

        // Security rules
        const securityRules = ['no-eval', 'no-implied-eval', 'no-new-func'];
        if (securityRules.includes(ruleId)) {
            return 'security';
        }

        return 'critical_error';
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

        // Create simple plain text context
        const contextLinesArray = [];
        const contextHtmlLines = [];

        for (let i = startLine; i < endLine; i++) {
            const displayLineNumber = i + 1;
            const lineContent = lines[i] || '';

            // For contextLines array (legacy compatibility)
            const isCurrentLine = i === lineNumber - 1;
            const prefix = isCurrentLine ? '>>> ' : '    ';
            contextLinesArray.push(`${displayLineNumber.toString().padStart(3, ' ')}: ${prefix}${lineContent}`);

            // For HTML display with line highlighting
            const escapedLineContent = this.escapeHtml(lineContent);
            const lineNumberPadded = displayLineNumber.toString().padStart(3, ' ');

            if (isCurrentLine) {
                // Highlight the error line
                contextHtmlLines.push(`<div class="code-line error-line"><span class="line-number">${lineNumberPadded}:</span> <span class="line-content">${escapedLineContent}</span></div>`);
            } else {
                contextHtmlLines.push(`<div class="code-line"><span class="line-number">${lineNumberPadded}:</span> <span class="line-content">${escapedLineContent}</span></div>`);
            }
        }

        // Create enhanced HTML with line-by-line highlighting
        const formattedHtml = `<div class="code-context-enhanced">${contextHtmlLines.join('')}</div>`;

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
        const seenIssues = new Set(); // Deduplicate within custom analysis

        // Track nested loops with proper brace counting
        let braceDepth = 0;
        const loopStack = []; // Stack of { line, braceDepth, type }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const trimmedLine = line.trim();

            // Skip commented lines
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
                continue;
            }

            // Count braces on this line
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;

            // Remove completed loops from stack BEFORE processing this line
            // A loop is complete when we close back to its starting depth
            while (loopStack.length > 0 && braceDepth < loopStack[loopStack.length - 1].braceDepth) {
                loopStack.pop();
            }

            // Detect loop starts
            const loopRegex = /\b(for|while|do)\s*\(/;
            if (loopRegex.test(trimmedLine)) {
                const currentLoopDepth = loopStack.length + 1;

                // Push this loop onto the stack with the CURRENT brace depth
                // The loop body will be at a deeper level
                loopStack.push({
                    line: lineNumber,
                    braceDepth: braceDepth, // Store current depth, not future depth
                    type: 'loop'
                });

                // Check for nested loops (depth > 1)
                if (currentLoopDepth > 1) {
                    const issueKey = `nested-loop-${lineNumber}`;

                    if (!seenIssues.has(issueKey)) {
                        seenIssues.add(issueKey);
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
            }

            // Update brace depth AFTER processing the line
            braceDepth += openBraces - closeBraces;

            // Detect if conditions inside loops without break/continue
            if (loopStack.length > 0 && /\bif\s*\(/.test(trimmedLine)) {
                // Check if this if statement has break or continue in the next few lines
                let hasBreakOrContinue = false;
                const lookAheadLines = 5; // Check next 5 lines for break/continue

                for (let j = i; j < Math.min(i + lookAheadLines, lines.length); j++) {
                    const lookAheadLine = lines[j].trim();
                    // Skip commented lines in lookahead
                    if (lookAheadLine.startsWith('//') || lookAheadLine.startsWith('/*') || lookAheadLine.startsWith('*')) {
                        continue;
                    }
                    if (/\b(break|continue)\b/.test(lines[j])) {
                        hasBreakOrContinue = true;
                        break;
                    }
                }

                if (!hasBreakOrContinue) {
                    const issueKey = `if-in-loop-${lineNumber}`;

                    if (!seenIssues.has(issueKey)) {
                        seenIssues.add(issueKey);
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
     * Extract variable declarations from script content to avoid false positives
     * @param {string} content - Script content
     * @returns {Object} Object with variable names as keys and 'readonly' as values
     */
    extractScriptVariables(content) {
        if (!content || typeof content !== 'string') {
            return {};
        }

        const variables = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip comments and empty lines
            if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
                continue;
            }

            // Match variable declarations: var, let, const
            const varMatches = [
                ...trimmedLine.matchAll(/\b(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)
            ];

            for (const match of varMatches) {
                if (match[1]) {
                    variables[match[1]] = 'readonly';
                }
            }

            // Match function declarations
            const funcMatches = [
                ...trimmedLine.matchAll(/\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)
            ];

            for (const match of funcMatches) {
                if (match[1]) {
                    variables[match[1]] = 'readonly';
                }
            }

            // Match assignment patterns that create variables (like _this = this)
            const assignMatches = [
                ...trimmedLine.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*[^=]/g)
            ];

            for (const match of assignMatches) {
                if (match[1] && !['if', 'for', 'while', 'switch', 'return'].includes(match[1])) {
                    variables[match[1]] = 'readonly';
                }
            }
        }

        return variables;
    }

    /**
     * Check if a script should be excluded from JavaScript analysis
     * Includes CSS content and specific script types/names
     * @param {Object} script - Script object
     * @returns {boolean} True if script should be skipped
     */
    isCSSScript(script) {
        if (!script) return false;

        const scriptName = script.name || '';
        const scriptType = script.scriptType || script.type || '';

        // Check script name for specific patterns to skip
        // "Inline CSS" can be in name or scriptType
        // "Coachflow Script Pattern 3" is in the name
        if (scriptName === 'Inline CSS' || scriptType === 'Inline CSS') {
            return true;
        }

        if (scriptName.startsWith('Coachflow Script Pattern')) {
            return true;
        }

        // Check script name for CSS indicators (lowercase check)
        const scriptNameLower = scriptName.toLowerCase();
        if (scriptNameLower.includes('css') || scriptNameLower.includes('style')) {
            return true;
        }

        // Check script content for CSS patterns
        const content = this.getScriptContent(script);
        if (!content) return false;

        const trimmedContent = content.trim();

        // More comprehensive CSS detection patterns
        const cssPatterns = [
            /^\s*\/\*[\s\S]*?\*\/\s*\.[a-zA-Z-_][\w-]*\s*\{/,  // CSS comment followed by class
            /^\s*\.[a-zA-Z-_][\w-]*\s*\{[\s\S]*?\}/,           // CSS class with complete block
            /^\s*#[a-zA-Z-_][\w-]*\s*\{[\s\S]*?\}/,            // CSS ID with complete block
            /^\s*@media\s/,                                     // CSS media queries
            /^\s*@import\s/,                                    // CSS imports
            /^\s*@keyframes\s/,                                 // CSS keyframes
            /^\s*body\s*\{/,                                    // CSS body selector
            /^\s*html\s*\{/,                                    // CSS html selector
            /^\s*\*\s*\{/,                                      // CSS universal selector
            /^\s*[a-zA-Z-_][\w-]*\s*\{[\s\S]*?color\s*:/,      // CSS with color property
            /^\s*[a-zA-Z-_][\w-]*\s*\{[\s\S]*?background\s*:/, // CSS with background property
            /^\s*[a-zA-Z-_][\w-]*\s*\{[\s\S]*?font-\w+\s*:/,   // CSS with font properties
        ];

        return cssPatterns.some(pattern => pattern.test(trimmedContent));
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
            // Security issues
            'no-eval': 'Use JSON.parse() or safer alternatives instead of eval()',
            'no-implied-eval': 'Avoid setTimeout/setInterval with string arguments',
            'no-new-func': 'Avoid using Function constructor for security',
            'security/detect-eval-with-expression': 'Avoid dynamic code evaluation for security',

            // Runtime errors
            'no-undef': 'Declare the variable or add it to globals configuration',
            'no-dupe-keys': 'Remove duplicate object keys',
            'no-dupe-args': 'Remove duplicate function arguments',
            'no-unreachable': 'Remove unreachable code after return/throw',
            'no-invalid-regexp': 'Fix the regular expression syntax',
            'no-unsafe-negation': 'Use parentheses to clarify negation intent',
            'for-direction': 'Fix loop direction to avoid infinite loop',
            'no-compare-neg-zero': 'Use Object.is(x, -0) to compare with -0',
            'no-cond-assign': 'Use comparison (===) instead of assignment (=) in condition',
            'no-constant-condition': 'Remove or fix constant condition',
            'no-debugger': 'Remove debugger statement before production',
            'no-empty': 'Add code to empty block or remove it',
            'no-ex-assign': 'Do not reassign exception parameter',
            'no-func-assign': 'Do not reassign function declarations',
            'no-inner-declarations': 'Move function declaration to outer scope',
            'no-obj-calls': 'Do not call global objects as functions',
            'no-sparse-arrays': 'Remove holes in array or use explicit undefined',
            'valid-typeof': 'Use valid typeof comparison values'
        };

        return suggestions[ruleId] || 'Fix this critical error to prevent runtime issues';
    }

    /**
     * Filter messages to only include critical issues
     * Implements the filterCriticalIssues logic from the static analysis plan
     * @param {Array} messages - ESLint messages
     * @returns {Array} Filtered critical issues only
     */
    filterCriticalIssues(messages) {
        const criticalRules = [
            'no-undef',
            'no-dupe-keys',
            'no-dupe-args',
            'no-unreachable',
            'no-invalid-regexp',
            'no-unsafe-negation',
            'no-eval',
            'no-implied-eval',
            'security/detect-eval-with-expression',
            'security/detect-object-injection',
            'security/detect-unsafe-regex'
        ];

        return messages.filter(msg =>
            criticalRules.includes(msg.ruleId) &&
            msg.severity === 2 // Errors only
        );
    }
}

module.exports = StaticAnalysisService;
