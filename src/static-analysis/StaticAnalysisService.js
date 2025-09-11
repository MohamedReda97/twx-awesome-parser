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
        this.initializeTools();
    }

    /**
     * Initialize ESLint and Prettier
     */
    async initializeTools() {
        try {
            // Initialize ESLint with our configuration
            this.eslint = new ESLint({
                overrideConfigFile: path.join(process.cwd(), 'eslint.config.cjs'),
                useEslintrc: false,
                fix: false // We don't want to modify the original code
            });

            // Load Prettier configuration
            this.prettierConfig = await prettier.resolveConfig(process.cwd()) || {};

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
        const issues = [];
        
        // Run ESLint analysis
        const eslintResults = await this.runESLintAnalysis(script);
        issues.push(...eslintResults);

        // Run Prettier formatting check
        const prettierIssues = await this.runPrettierAnalysis(script);
        issues.push(...prettierIssues);

        // Calculate basic metrics
        const metrics = this.calculateMetrics(script.content);

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
        if (!script.content || !script.content.trim()) {
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
     * Run Prettier formatting analysis
     * @param {Object} script - Script object
     * @returns {Promise<Array>} Array of formatting issues
     */
    async runPrettierAnalysis(script) {
        if (!script.content || !script.content.trim()) {
            return [];
        }

        try {
            const formatted = await prettier.format(script.content, {
                ...this.prettierConfig,
                parser: 'babel'
            });

            if (formatted.trim() !== script.content.trim()) {
                return [{
                    severity: 'info',
                    category: 'style',
                    rule: 'prettier-formatting',
                    description: 'Code formatting could be improved',
                    line: 1,
                    column: 1,
                    code: script.content.split('\n')[0] || '',
                    suggestion: 'Run Prettier to auto-format this code'
                }];
            }

            return [];
        } catch (error) {
            // Prettier parsing error usually indicates syntax issues
            return [{
                severity: 'warning',
                category: 'syntax',
                rule: 'prettier-parse-error',
                description: `Formatting check failed: ${error.message}`,
                line: 1,
                column: 1,
                code: script.content.split('\n')[0] || '',
                suggestion: 'Check for syntax errors that prevent code formatting'
            }];
        }
    }

    /**
     * Calculate basic code metrics
     * @param {string} content - Script content
     * @returns {Object} Metrics object
     */
    calculateMetrics(content) {
        if (!content) {
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
     * @returns {Object} Object with currentLine and contextLines array
     */
    getCodeContext(content, lineNumber, contextLines = 3) {
        if (!content || !lineNumber) {
            return { currentLine: '', contextLines: [] };
        }

        const lines = content.split('\n');
        const currentLine = lines[lineNumber - 1] || '';

        // Calculate range for context
        const startLine = Math.max(0, lineNumber - contextLines - 1);
        const endLine = Math.min(lines.length, lineNumber + contextLines);

        const contextLinesArray = [];
        for (let i = startLine; i < endLine; i++) {
            const isCurrentLine = i === lineNumber - 1;
            const displayLineNumber = i + 1;
            const lineContent = lines[i] || '';

            // Mark the current line with an indicator
            const prefix = isCurrentLine ? '>>> ' : '    ';
            contextLinesArray.push(`${displayLineNumber.toString().padStart(3, ' ')}: ${prefix}${lineContent}`);
        }

        return {
            currentLine: currentLine.trim(),
            contextLines: contextLinesArray
        };
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
