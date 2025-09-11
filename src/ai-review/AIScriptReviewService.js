/**
 * AI Script Review Service
 * Provides AI-powered analysis of JavaScript scripts from TWX objects
 */

const fs = require('fs').promises;
const path = require('path');

class AIScriptReviewService {
    constructor() {
        this.config = null;
        this.analysisCache = new Map();
        this.configPath = path.join(__dirname, '../../config/ai-review-config.json');
        this.resultsPath = path.join(__dirname, '../../output/ai-analysis-results.json');
    }

    /**
     * Initialize the service and load configuration
     */
    async initialize() {
        try {
            await this.loadConfiguration();
            console.log('AI Script Review Service initialized');
        } catch (error) {
            console.warn('AI Script Review Service initialization failed:', error.message);
            this.config = this.getDefaultConfiguration();
        }
    }

    /**
     * Load configuration from file
     */
    async loadConfiguration() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
        } catch (error) {
            // Create default config if file doesn't exist
            this.config = this.getDefaultConfiguration();
            await this.saveConfiguration();
        }
    }

    /**
     * Save configuration to file
     */
    async saveConfiguration() {
        try {
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Failed to save AI configuration:', error);
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfiguration() {
        return {
            provider: 'claude',
            providers: {
                claude: {
                    name: 'Claude (Anthropic)',
                    endpoint: 'https://api.anthropic.com/v1/messages',
                    apiKey: '',
                    model: 'claude-3-sonnet-20240229',
                    maxTokens: 4000,
                    temperature: 0.1
                },
                deepseek: {
                    name: 'DeepSeek',
                    endpoint: 'https://api.deepseek.com/v1/chat/completions',
                    apiKey: '',
                    model: 'deepseek-coder',
                    maxTokens: 4000,
                    temperature: 0.1
                },
                gemini: {
                    name: 'Google Gemini',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                    apiKey: '',
                    model: 'gemini-1.5-pro',
                    maxTokens: 4000,
                    temperature: 0.1
                },
                groq: {
                    name: 'Groq',
                    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
                    apiKey: '',
                    model: 'llama-3.3-70b-versatile',
                    maxTokens: 2000, // Reduced to avoid rate limits
                    temperature: 0.1
                },
                custom: {
                    name: 'Custom Endpoint',
                    endpoint: '',
                    apiKey: '',
                    model: '',
                    maxTokens: 4000,
                    temperature: 0.1,
                    headers: {}
                }
            },
            batchSize: 3, // Reduced default batch size to avoid rate limits
            analysisTimeout: 45000, // Increased timeout for retries
            cacheResults: true,
            analysisFocus: ['syntax', 'performance', 'security', 'best_practices']
        };
    }

    /**
     * Update configuration
     */
    async updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        await this.saveConfiguration();
    }

    /**
     * Get current configuration
     */
    getConfiguration() {
        return this.config;
    }

    /**
     * Test API connectivity
     */
    async testConnection() {
        if (!this.config || !this.config.providers[this.config.provider]) {
            throw new Error('No AI provider configured');
        }

        const provider = this.config.providers[this.config.provider];
        if (!provider.apiKey) {
            throw new Error('API key not configured');
        }

        try {
            const testScript = {
                id: 'test_script',
                name: 'Connection Test',
                source_object: 'test',
                source_type: 'test',
                content: 'console.log("Hello World");'
            };

            const result = await this.analyzeScripts([testScript]);
            return { success: true, message: 'Connection successful', result };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get the current prompt template
     * @returns {Promise<string>} Prompt template
     */
    async getPromptTemplate() {
        const configPath = path.join(this.configDir, 'prompt-template.txt');

        try {
            if (fs.existsSync(configPath)) {
                return fs.readFileSync(configPath, 'utf8');
            }
        } catch (error) {
            console.warn('Error reading prompt template:', error);
        }

        // Return default template if file doesn't exist or can't be read
        return this.getDefaultPromptTemplate();
    }

    /**
     * Save a custom prompt template
     * @param {string} template - Prompt template to save
     */
    async savePromptTemplate(template) {
        const configPath = path.join(this.configDir, 'prompt-template.txt');

        // Ensure config directory exists
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }

        fs.writeFileSync(configPath, template, 'utf8');
    }

    /**
     * Get the default prompt template
     * @returns {string} Default prompt template
     */
    getDefaultPromptTemplate() {
        return `You are an expert JavaScript code reviewer specializing in IBM BPM (Business Process Manager) and TeamWorks applications.

Please analyze the following JavaScript code and provide a comprehensive review focusing on:

1. **Syntax Errors**: Any JavaScript syntax issues or parsing problems
2. **Performance Issues**: Inefficient code patterns, optimization opportunities
3. **Security Vulnerabilities**: XSS risks, injection vulnerabilities, unsafe practices
4. **Best Practices**: Code quality, maintainability, IBM BPM/TeamWorks conventions
5. **TeamWorks Specific**: IBM BPM API usage, tw.* object usage, process variable handling

For each issue found, provide:
- Severity level (critical, warning, info)
- Issue type (syntax, performance, security, best_practice, teamworks_specific)
- Description of the problem
- Line number (if applicable)
- Specific suggestion for improvement

Respond in JSON format:
{
  "issues": [
    {
      "severity": "critical|warning|info",
      "type": "syntax|performance|security|best_practice|teamworks_specific",
      "description": "Clear description of the issue",
      "line_number": 15,
      "suggestion": "Specific recommendation to fix the issue"
    }
  ],
  "overall_score": "A|B|C|D|F",
  "summary": "Brief overall assessment of the code quality"
}

JavaScript Code to Analyze:
{scripts}`;
    }

    /**
     * Collect all scripts from parsed objects
     */
    collectScriptsFromObjects(objects) {
        const scripts = [];
        let scriptId = 1;

        objects.forEach(obj => {
            // Collect from main scripts array
            if (obj.details?.scripts) {
                obj.details.scripts.forEach(script => {
                    const scriptContent = script.content || script.script || script.scriptBlock;
                    if (scriptContent && scriptContent.trim()) {
                        scripts.push({
                            id: `script_${scriptId++}`,
                            name: script.name || 'Unnamed Script',
                            source_object: obj.name,
                            source_type: this.getSourceType(obj),
                            content: scriptContent.trim(),
                            elementType: script.elementType,
                            scriptType: script.scriptType
                        });
                    }
                });
            }

            // Collect from inline scripts (Coach Views)
            if (obj.details?.inlineScripts) {
                obj.details.inlineScripts.forEach(script => {
                    if (script.scriptBlock && script.scriptBlock.trim()) {
                        scripts.push({
                            id: `script_${scriptId++}`,
                            name: script.name || 'Unnamed Inline Script',
                            source_object: obj.name,
                            source_type: this.getSourceType(obj),
                            content: script.scriptBlock.trim(),
                            scriptType: 'inline'
                        });
                    }
                });
            }

            // Collect from loadJsFunction (Coach Views)
            if (obj.details?.loadJsFunction && obj.details.loadJsFunction.trim()) {
                scripts.push({
                    id: `script_${scriptId++}`,
                    name: 'Load JS Function',
                    source_object: obj.name,
                    source_type: this.getSourceType(obj),
                    content: obj.details.loadJsFunction.trim(),
                    scriptType: 'loadJs'
                });
            }
        });

        return scripts;
    }

    /**
     * Get source type from object
     */
    getSourceType(obj) {
        if (obj.type === '64') return 'coach_view';
        if (obj.type === '1' && obj.subType === '10') return 'cshs';
        if (obj.type === '1') return 'service';
        if (obj.type === '7') return 'web_service';
        return 'unknown';
    }

    /**
     * Analyze scripts using AI
     */
    async analyzeScripts(scripts, progressCallback = null) {
        if (!this.config || !scripts || scripts.length === 0) {
            return { analysis_results: [] };
        }

        const results = [];
        const batchSize = this.config.batchSize || 5;
        const totalBatches = Math.ceil(scripts.length / batchSize);

        for (let i = 0; i < scripts.length; i += batchSize) {
            const batch = scripts.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;

            if (progressCallback) {
                progressCallback({
                    current: batchNumber,
                    total: totalBatches,
                    message: `Analyzing batch ${batchNumber} of ${totalBatches}...`
                });
            }

            try {
                const batchResult = await this.analyzeBatch(batch);
                results.push(...batchResult.analysis_results);
                
                // Add delay between batches to respect rate limits
                if (i + batchSize < scripts.length) {
                    await this.delay(1000);
                }
            } catch (error) {
                console.error(`Error analyzing batch ${batchNumber}:`, error);
                // Add error entries for failed batch
                batch.forEach(script => {
                    results.push({
                        script_id: script.id,
                        issues: [{
                            severity: 'warning',
                            type: 'analysis_error',
                            description: `Analysis failed: ${error.message}`,
                            line_number: null,
                            suggestion: 'Review script manually or try again later'
                        }],
                        overall_score: 'N/A',
                        summary: 'Analysis failed'
                    });
                });
            }
        }

        // Cache results
        if (this.config.cacheResults) {
            await this.saveAnalysisResults(results);
        }

        return { analysis_results: results };
    }

    /**
     * Analyze a batch of scripts
     */
    async analyzeBatch(scripts) {
        const provider = this.config.providers[this.config.provider];
        
        const requestData = {
            task: 'javascript_code_review',
            context: 'IBM BPM TeamWorks script analysis',
            scripts: scripts,
            analysis_focus: this.config.analysisFocus,
            response_format: 'structured_json'
        };

        const response = await this.makeAPIRequest(provider, requestData);
        return response;
    }

    /**
     * Make API request to configured provider
     */
    async makeAPIRequest(provider, requestData) {
        const prompt = this.buildAnalysisPrompt(requestData);
        
        let requestBody;
        let headers = {
            'Content-Type': 'application/json',
            ...provider.headers
        };

        // Configure request based on provider
        switch (this.config.provider) {
            case 'claude':
                headers['x-api-key'] = provider.apiKey;
                headers['anthropic-version'] = '2023-06-01';
                requestBody = {
                    model: provider.model,
                    max_tokens: provider.maxTokens,
                    temperature: provider.temperature,
                    messages: [{ role: 'user', content: prompt }]
                };
                break;
                
            case 'deepseek':
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
                requestBody = {
                    model: provider.model,
                    max_tokens: provider.maxTokens,
                    temperature: provider.temperature,
                    messages: [{ role: 'user', content: prompt }]
                };
                break;
                
            case 'custom':
                if (provider.apiKey) {
                    headers['Authorization'] = `Bearer ${provider.apiKey}`;
                }
                requestBody = {
                    model: provider.model,
                    max_tokens: provider.maxTokens,
                    temperature: provider.temperature,
                    prompt: prompt
                };
                break;
        }

        const response = await fetch(provider.endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        return this.parseAPIResponse(responseData);
    }

    /**
     * Build analysis prompt for AI
     */
    buildAnalysisPrompt(requestData) {
        const scriptsText = requestData.scripts.map(script => 
            `Script ID: ${script.id}
Name: ${script.name}
Source: ${script.source_object} (${script.source_type})
Content:
\`\`\`javascript
${script.content}
\`\`\`
`).join('\n---\n');

        return `You are an expert JavaScript code reviewer specializing in IBM BPM/TeamWorks applications. Please analyze the following scripts and provide structured feedback.

SCRIPTS TO ANALYZE:
${scriptsText}

ANALYSIS REQUIREMENTS:
- Focus on: ${requestData.analysis_focus.join(', ')}
- Look for IBM BPM/TeamWorks specific issues (tw.local, tw.system usage, etc.)
- Identify syntax errors, performance issues, security vulnerabilities
- Provide actionable suggestions for improvement

RESPONSE FORMAT (JSON only):
{
  "analysis_results": [
    {
      "script_id": "script_id_here",
      "issues": [
        {
          "severity": "critical|warning|info",
          "type": "syntax|performance|security|best_practice",
          "description": "Brief issue description",
          "line_number": 42,
          "suggestion": "Recommended fix"
        }
      ],
      "overall_score": "A|B|C|D|F",
      "summary": "Brief overall assessment"
    }
  ]
}`;
    }

    /**
     * Parse API response based on provider
     */
    parseAPIResponse(responseData) {
        let content;
        
        switch (this.config.provider) {
            case 'claude':
                content = responseData.content?.[0]?.text || '';
                break;
            case 'deepseek':
                content = responseData.choices?.[0]?.message?.content || '';
                break;
            case 'custom':
                content = responseData.content || responseData.response || responseData.text || '';
                break;
            default:
                content = responseData.content || '';
        }

        // Extract JSON from response
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn('Failed to parse AI response as JSON:', error);
        }

        // Fallback: create structured response from text
        return {
            analysis_results: [{
                script_id: 'unknown',
                issues: [{
                    severity: 'info',
                    type: 'analysis_error',
                    description: 'Could not parse AI response',
                    line_number: null,
                    suggestion: 'Review response manually'
                }],
                overall_score: 'N/A',
                summary: content.substring(0, 200) + '...'
            }]
        };
    }

    /**
     * Save analysis results to file
     */
    async saveAnalysisResults(results) {
        try {
            const outputDir = path.dirname(this.resultsPath);
            await fs.mkdir(outputDir, { recursive: true });
            
            const analysisData = {
                timestamp: new Date().toISOString(),
                totalScripts: results.length,
                results: results
            };
            
            await fs.writeFile(this.resultsPath, JSON.stringify(analysisData, null, 2));
        } catch (error) {
            console.error('Failed to save analysis results:', error);
        }
    }

    /**
     * Load cached analysis results
     */
    async loadAnalysisResults() {
        try {
            const data = await fs.readFile(this.resultsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { timestamp: null, totalScripts: 0, results: [] };
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get analysis statistics
     */
    getAnalysisStatistics(results) {
        const stats = {
            totalScripts: results.length,
            criticalIssues: 0,
            warnings: 0,
            infoIssues: 0,
            scoreDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0, 'N/A': 0 }
        };

        results.forEach(result => {
            result.issues?.forEach(issue => {
                switch (issue.severity) {
                    case 'critical': stats.criticalIssues++; break;
                    case 'warning': stats.warnings++; break;
                    case 'info': stats.infoIssues++; break;
                }
            });
            
            stats.scoreDistribution[result.overall_score] = 
                (stats.scoreDistribution[result.overall_score] || 0) + 1;
        });

        return stats;
    }
}

module.exports = AIScriptReviewService;
