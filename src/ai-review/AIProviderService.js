/**
 * AI Provider Service
 * Handles communication with different AI providers (Claude, DeepSeek, Custom)
 */

const fetch = require('node-fetch');

class AIProviderService {
    constructor(config) {
        this.config = config;
        this.requestCount = 0;
        this.lastRequestTime = 0;
    }

    /**
     * Update configuration
     * @param {Object} config - New configuration
     */
    updateConfig(config) {
        this.config = config;
    }

    /**
     * Analyze scripts using the configured AI provider
     * @param {Array} scripts - Scripts to analyze
     * @param {Function} progressCallback - Progress callback function
     * @param {Function} batchCompleteCallback - Called after each batch completes with results
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeScripts(scripts, progressCallback = null, batchCompleteCallback = null) {
        if (!this.config || !scripts || scripts.length === 0) {
            return { analysis_results: [] };
        }

        const provider = this.config.providers[this.config.provider];
        if (!provider || !provider.apiKey) {
            throw new Error(`AI provider ${this.config.provider} not properly configured`);
        }

        const results = [];
        let currentBatchSize = this.config.batchSize || 5;

        // Start with smaller batches for providers with low rate limits
        if (this.config.provider === 'groq') {
            currentBatchSize = Math.min(currentBatchSize, 2); // Start with smaller batches for Groq
        }

        let totalBatches = Math.ceil(scripts.length / currentBatchSize);
        let processedScripts = 0;

        while (processedScripts < scripts.length) {
            const remainingScripts = scripts.length - processedScripts;
            const batch = scripts.slice(processedScripts, processedScripts + currentBatchSize);
            const batchNumber = Math.floor(processedScripts / currentBatchSize) + 1;

            // Recalculate total batches as batch size might change
            totalBatches = Math.ceil(scripts.length / currentBatchSize);

            if (progressCallback) {
                progressCallback({
                    current: batchNumber,
                    total: totalBatches,
                    processed: processedScripts,
                    totalScripts: scripts.length,
                    message: `Analyzing batch ${batchNumber} of ${totalBatches} (${batch.length} scripts)...`
                });
            }

            console.log(`🤖 Analyzing batch ${batchNumber}/${totalBatches} (${batch.length} scripts, batch size: ${currentBatchSize})`);

            try {
                // Rate limiting
                await this.enforceRateLimit();

                const batchResult = await this.analyzeBatch(batch);
                if (batchResult && batchResult.analysis_results) {
                    results.push(...batchResult.analysis_results);

                    // Call batch complete callback with incremental results
                    if (batchCompleteCallback) {
                        batchCompleteCallback({
                            batchNumber,
                            totalBatches,
                            batchResults: batchResult.analysis_results,
                            allResults: [...results], // Copy of all results so far
                            completed: batchNumber,
                            remaining: totalBatches - batchNumber
                        });
                    }

                    // Successful batch - can try increasing batch size slightly
                    if (currentBatchSize < (this.config.batchSize || 5) && this.config.provider === 'groq') {
                        currentBatchSize = Math.min(currentBatchSize + 1, this.config.batchSize || 5);
                        console.log(`📈 Increasing batch size to ${currentBatchSize}`);
                    }
                }

                processedScripts += batch.length;

                // Add delay between batches to respect rate limits
                if (processedScripts < scripts.length) {
                    const delayTime = this.config.provider === 'groq' ? 2000 : 1000; // Longer delay for Groq
                    await this.delay(delayTime);
                }

            } catch (error) {
                console.error(`Error analyzing batch ${batchNumber}:`, error);

                // If it's a rate limit error that wasn't handled, reduce batch size
                if (error.message.includes('Rate limit') || error.message.includes('429')) {
                    currentBatchSize = Math.max(1, Math.floor(currentBatchSize / 2));
                    console.log(`📉 Reducing batch size to ${currentBatchSize} due to rate limits`);
                }

                // Add error entries for failed batch
                const errorResults = batch.map(script => ({
                    script_id: script.id,
                    issues: [{
                        severity: 'warning',
                        type: 'analysis_error',
                        description: `Analysis failed: ${error.message}`,
                        line_number: null,
                        suggestion: 'Review script manually or try again later'
                    }],
                    overall_score: 'N/A',
                    summary: 'Analysis failed due to API error'
                }));

                results.push(...errorResults);

                // Call batch complete callback even for errors
                if (batchCompleteCallback) {
                    batchCompleteCallback({
                        batchNumber,
                        totalBatches,
                        batchResults: errorResults,
                        allResults: [...results],
                        completed: batchNumber,
                        remaining: totalBatches - batchNumber,
                        error: error.message
                    });
                }

                processedScripts += batch.length;

                // Add extra delay after errors
                if (processedScripts < scripts.length) {
                    await this.delay(3000);
                }
            }
        }

        return { analysis_results: results };
    }

    /**
     * Analyze a batch of scripts
     * @param {Array} scripts - Scripts to analyze
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeBatch(scripts) {
        const provider = this.config.providers[this.config.provider];
        
        const requestData = {
            task: 'javascript_code_review',
            context: 'IBM BPM TeamWorks script analysis',
            scripts: scripts,
            analysis_focus: this.config.analysisFocus || ['syntax', 'performance', 'security', 'best_practices'],
            response_format: 'structured_json'
        };

        const response = await this.makeAPIRequest(provider, requestData);
        return response;
    }

    /**
     * Make API request to configured provider with retry logic
     * @param {Object} provider - Provider configuration
     * @param {Object} requestData - Request data
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<Object>} API response
     */
    async makeAPIRequest(provider, requestData, retryCount = 0) {
        const prompt = this.buildAnalysisPrompt(requestData);

        let requestBody;
        let endpoint = provider.endpoint;
        let headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'TWX-Parser-AI-Review/1.0',
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

            case 'gemini':
                // Gemini uses API key as query parameter and model in URL
                endpoint = provider.endpoint.replace('{model}', provider.model) + `?key=${provider.apiKey}`;
                requestBody = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: provider.temperature,
                        maxOutputTokens: provider.maxTokens
                    }
                };
                break;

            case 'groq':
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
                requestBody = {
                    model: provider.model,
                    max_completion_tokens: provider.maxTokens,
                    temperature: provider.temperature,
                    messages: [{ role: 'user', content: prompt }],
                    stream: false, // We'll use non-streaming for simplicity
                    top_p: 1,
                    stop: null
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

            default:
                throw new Error(`Unsupported AI provider: ${this.config.provider}`);
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                timeout: this.config.analysisTimeout || 30000
            });

            if (!response.ok) {
                const errorText = await response.text();

                // Handle rate limit errors specifically
                if (response.status === 429) {
                    return await this.handleRateLimit(errorText, provider, requestData, retryCount);
                }

                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const responseData = await response.json();
            return this.parseAPIResponse(responseData);

        } catch (error) {
            // Handle network errors and other exceptions
            if (error.name === 'AbortError') {
                throw error; // Don't retry if user cancelled
            }

            // Retry on network errors (up to 2 retries)
            if (retryCount < 2 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
                console.log(`🔄 Network error, retrying in ${(retryCount + 1) * 2} seconds...`);
                await this.delay((retryCount + 1) * 2000);
                return this.makeAPIRequest(provider, requestData, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Build analysis prompt for AI
     * @param {Object} requestData - Request data
     * @returns {string} Formatted prompt
     */
    buildAnalysisPrompt(requestData) {
        const scriptsText = requestData.scripts.map(script => 
            `Script ID: ${script.id}
Name: ${script.name}
Source: ${script.source_object} (${script.source_type})
${script.metadata ? `Lines: ${script.metadata.lineCount}, Characters: ${script.metadata.characterCount}` : ''}
Content:
\`\`\`javascript
${script.content}
\`\`\`
`).join('\n---\n');

        return `You are an expert JavaScript code reviewer specializing in IBM BPM/TeamWorks applications. Please analyze the following scripts and provide structured feedback.

CONTEXT:
- These scripts are from IBM BPM Process Applications and Toolkits
- Common patterns include tw.local, tw.system, tw.env usage
- Scripts may contain TeamWorks-specific APIs and functions
- Focus on practical issues that could affect production systems

SCRIPTS TO ANALYZE:
${scriptsText}

ANALYSIS REQUIREMENTS:
- Focus areas: ${requestData.analysis_focus.join(', ')}
- Look for IBM BPM/TeamWorks specific issues and anti-patterns
- Identify syntax errors, performance bottlenecks, security vulnerabilities
- Check for proper error handling and null checks
- Validate variable usage and scope issues
- Provide actionable, specific suggestions for improvement

RESPONSE FORMAT (JSON only, no markdown):
{
  "analysis_results": [
    {
      "script_id": "script_id_here",
      "issues": [
        {
          "severity": "critical|warning|info",
          "type": "syntax|performance|security|best_practice|teamworks_specific",
          "description": "Brief, specific issue description",
          "line_number": 42,
          "suggestion": "Concrete fix or improvement recommendation"
        }
      ],
      "overall_score": "A|B|C|D|F",
      "summary": "Brief overall assessment focusing on main concerns"
    }
  ]
}

Provide only the JSON response, no additional text.`;
    }

    /**
     * Handle rate limit errors with intelligent retry
     * @param {string} errorText - Error response text
     * @param {Object} provider - Provider configuration
     * @param {Object} requestData - Original request data
     * @param {number} retryCount - Current retry count
     * @returns {Promise<Object>} API response after retry
     */
    async handleRateLimit(errorText, provider, requestData, retryCount) {
        const maxRetries = 3;

        if (retryCount >= maxRetries) {
            throw new Error(`Rate limit exceeded after ${maxRetries} retries: ${errorText}`);
        }

        // Parse rate limit info from error message
        let waitTime = 15; // Default wait time in seconds

        try {
            const errorData = JSON.parse(errorText);
            const errorMessage = errorData.error?.message || '';

            // Extract wait time from Groq error message
            const waitMatch = errorMessage.match(/try again in ([\d.]+)s/);
            if (waitMatch) {
                waitTime = Math.ceil(parseFloat(waitMatch[1])) + 2; // Add 2 seconds buffer
            }

            // Extract token usage info for logging
            const limitMatch = errorMessage.match(/Limit (\d+), Used (\d+), Requested (\d+)/);
            if (limitMatch) {
                const [, limit, used, requested] = limitMatch;
                console.log(`⚠️ Rate limit hit: ${used}/${limit} tokens used, ${requested} requested`);
            }

        } catch (parseError) {
            console.warn('Could not parse rate limit error details:', parseError);
        }

        // Exponential backoff with jitter
        const backoffTime = Math.min(waitTime * Math.pow(2, retryCount), 120); // Max 2 minutes
        const jitter = Math.random() * 0.1 * backoffTime; // Add up to 10% jitter
        const finalWaitTime = Math.ceil(backoffTime + jitter);

        console.log(`🕐 Rate limit exceeded. Waiting ${finalWaitTime} seconds before retry ${retryCount + 1}/${maxRetries}...`);

        await this.delay(finalWaitTime * 1000);

        // Reduce batch size for retry to use fewer tokens
        if (requestData.scripts && requestData.scripts.length > 1) {
            const reducedScripts = requestData.scripts.slice(0, Math.max(1, Math.floor(requestData.scripts.length / 2)));
            console.log(`📉 Reducing batch size from ${requestData.scripts.length} to ${reducedScripts.length} scripts`);
            requestData = { ...requestData, scripts: reducedScripts };
        }

        return this.makeAPIRequest(provider, requestData, retryCount + 1);
    }

    /**
     * Parse API response based on provider
     * @param {Object} responseData - Raw API response
     * @returns {Object} Parsed analysis results
     */
    parseAPIResponse(responseData) {
        let content;
        
        try {
            switch (this.config.provider) {
                case 'claude':
                    content = responseData.content?.[0]?.text || '';
                    break;
                case 'deepseek':
                    content = responseData.choices?.[0]?.message?.content || '';
                    break;
                case 'gemini':
                    content = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    break;
                case 'groq':
                    content = responseData.choices?.[0]?.message?.content || '';
                    break;
                case 'custom':
                    content = responseData.content || responseData.response || responseData.text || responseData.choices?.[0]?.message?.content || '';
                    break;
                default:
                    content = responseData.content || '';
            }

            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return this.validateAnalysisResults(parsed);
            }
        } catch (error) {
            console.warn('Failed to parse AI response as JSON:', error);
        }

        // Fallback: create structured response from text
        return {
            analysis_results: [{
                script_id: 'parse_error',
                issues: [{
                    severity: 'warning',
                    type: 'analysis_error',
                    description: 'Could not parse AI response as structured JSON',
                    line_number: null,
                    suggestion: 'Review AI response manually or adjust prompt template'
                }],
                overall_score: 'N/A',
                summary: content.substring(0, 200) + (content.length > 200 ? '...' : '')
            }]
        };
    }

    /**
     * Validate and normalize analysis results
     * @param {Object} results - Raw analysis results
     * @returns {Object} Validated results
     */
    validateAnalysisResults(results) {
        if (!results || !results.analysis_results || !Array.isArray(results.analysis_results)) {
            throw new Error('Invalid analysis results structure');
        }

        // Validate each result
        results.analysis_results.forEach(result => {
            if (!result.script_id) {
                result.script_id = 'unknown';
            }
            
            if (!result.issues || !Array.isArray(result.issues)) {
                result.issues = [];
            }
            
            // Validate each issue
            result.issues.forEach(issue => {
                if (!['critical', 'warning', 'info'].includes(issue.severity)) {
                    issue.severity = 'info';
                }
                
                if (!issue.type) {
                    issue.type = 'general';
                }
                
                if (!issue.description) {
                    issue.description = 'No description provided';
                }
                
                if (issue.line_number && typeof issue.line_number !== 'number') {
                    issue.line_number = null;
                }
            });
            
            if (!['A', 'B', 'C', 'D', 'F', 'N/A'].includes(result.overall_score)) {
                result.overall_score = 'N/A';
            }
            
            if (!result.summary) {
                result.summary = 'No summary provided';
            }
        });

        return results;
    }

    /**
     * Test connection to AI provider
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        const provider = this.config.providers[this.config.provider];
        if (!provider || !provider.apiKey) {
            return { success: false, message: 'API key not configured' };
        }

        try {
            const testScript = {
                id: 'test_script',
                name: 'Connection Test',
                source_object: 'test',
                source_type: 'test',
                content: 'console.log("Hello World");',
                metadata: { lineCount: 1, characterCount: 28 }
            };

            const result = await this.analyzeBatch([testScript]);
            return { 
                success: true, 
                message: 'Connection successful', 
                provider: this.config.provider,
                model: provider.model,
                result: result 
            };
        } catch (error) {
            return { 
                success: false, 
                message: error.message,
                provider: this.config.provider 
            };
        }
    }

    /**
     * Enforce rate limiting
     */
    async enforceRateLimit() {
        const minInterval = 1000; // Minimum 1 second between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        
        if (timeSinceLastRequest < minInterval) {
            await this.delay(minInterval - timeSinceLastRequest);
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get provider statistics
     * @returns {Object} Provider usage statistics
     */
    getProviderStats() {
        return {
            provider: this.config.provider,
            requestCount: this.requestCount,
            lastRequestTime: this.lastRequestTime,
            configured: !!(this.config.providers[this.config.provider]?.apiKey)
        };
    }
}

module.exports = AIProviderService;
