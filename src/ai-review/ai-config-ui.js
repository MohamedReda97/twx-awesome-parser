/**
 * AI Configuration UI Components
 * Provides UI for configuring AI providers and settings
 */

/**
 * Show AI configuration modal
 */
function showAIConfigModal() {
    const modal = document.getElementById('ai-config-modal');
    if (!modal) {
        createAIConfigModal();
    }
    
    loadAIConfiguration();
    document.getElementById('ai-config-modal').style.display = 'block';
}

/**
 * Hide AI configuration modal
 */
function hideAIConfigModal() {
    document.getElementById('ai-config-modal').style.display = 'none';
}

/**
 * Create AI configuration modal
 */
function createAIConfigModal() {
    const modalHTML = `
        <div id="ai-config-modal" class="modal">
            <div class="modal-content ai-config-modal">
                <div class="modal-header">
                    <h2>🤖 AI Script Review Configuration</h2>
                    <span class="close" onclick="hideAIConfigModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="config-section">
                        <h3>AI Provider</h3>
                        <select id="ai-provider-select" onchange="onProviderChange()">
                            <option value="claude">Claude (Anthropic)</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="custom">Custom Endpoint</option>
                        </select>
                    </div>
                    
                    <div class="config-section">
                        <h3>Provider Settings</h3>
                        <div id="provider-settings">
                            <!-- Dynamic provider settings will be inserted here -->
                        </div>
                    </div>
                    
                    <div class="config-section">
                        <h3>Analysis Settings</h3>
                        <div class="setting-group">
                            <label>Batch Size:</label>
                            <input type="number" id="batch-size" min="1" max="20" value="5">
                            <small>Number of scripts to analyze per API request</small>
                        </div>
                        
                        <div class="setting-group">
                            <label>Analysis Focus:</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" id="focus-syntax" checked> Syntax Errors</label>
                                <label><input type="checkbox" id="focus-performance" checked> Performance Issues</label>
                                <label><input type="checkbox" id="focus-security" checked> Security Vulnerabilities</label>
                                <label><input type="checkbox" id="focus-best-practices" checked> Best Practices</label>
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <label><input type="checkbox" id="cache-results" checked> Cache Results</label>
                            <small>Store analysis results locally for faster access</small>
                        </div>
                    </div>
                    
                    <div class="config-section">
                        <h3>Connection Test</h3>
                        <button id="test-connection-btn" onclick="testAIConnection()">Test Connection</button>
                        <div id="connection-status"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="saveAIConfiguration()" class="btn-primary">Save Configuration</button>
                    <button onclick="hideAIConfigModal()" class="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Handle provider selection change
 */
function onProviderChange() {
    const provider = document.getElementById('ai-provider-select').value;
    updateProviderSettings(provider);
}

/**
 * Update provider-specific settings UI
 */
function updateProviderSettings(provider) {
    const container = document.getElementById('provider-settings');
    
    let settingsHTML = '';
    
    switch (provider) {
        case 'claude':
            settingsHTML = `
                <div class="setting-group">
                    <label>API Key:</label>
                    <input type="password" id="claude-api-key" placeholder="sk-ant-...">
                    <small>Get your API key from <a href="https://console.anthropic.com/" target="_blank">Anthropic Console</a></small>
                </div>
                <div class="setting-group">
                    <label>Model:</label>
                    <select id="claude-model">
                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Max Tokens:</label>
                    <input type="number" id="claude-max-tokens" value="4000" min="100" max="8000">
                </div>
                <div class="setting-group">
                    <label>Temperature:</label>
                    <input type="number" id="claude-temperature" value="0.1" min="0" max="1" step="0.1">
                </div>
            `;
            break;
            
        case 'deepseek':
            settingsHTML = `
                <div class="setting-group">
                    <label>API Key:</label>
                    <input type="password" id="deepseek-api-key" placeholder="sk-...">
                    <small>Get your API key from <a href="https://platform.deepseek.com/" target="_blank">DeepSeek Platform</a></small>
                </div>
                <div class="setting-group">
                    <label>Model:</label>
                    <select id="deepseek-model">
                        <option value="deepseek-coder">DeepSeek Coder</option>
                        <option value="deepseek-chat">DeepSeek Chat</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Max Tokens:</label>
                    <input type="number" id="deepseek-max-tokens" value="4000" min="100" max="8000">
                </div>
                <div class="setting-group">
                    <label>Temperature:</label>
                    <input type="number" id="deepseek-temperature" value="0.1" min="0" max="1" step="0.1">
                </div>
            `;
            break;
            
        case 'custom':
            settingsHTML = `
                <div class="setting-group">
                    <label>Endpoint URL:</label>
                    <input type="url" id="custom-endpoint" placeholder="https://api.example.com/v1/chat/completions">
                </div>
                <div class="setting-group">
                    <label>API Key (optional):</label>
                    <input type="password" id="custom-api-key" placeholder="Your API key">
                </div>
                <div class="setting-group">
                    <label>Model:</label>
                    <input type="text" id="custom-model" placeholder="model-name">
                </div>
                <div class="setting-group">
                    <label>Max Tokens:</label>
                    <input type="number" id="custom-max-tokens" value="4000" min="100" max="8000">
                </div>
                <div class="setting-group">
                    <label>Temperature:</label>
                    <input type="number" id="custom-temperature" value="0.1" min="0" max="1" step="0.1">
                </div>
                <div class="setting-group">
                    <label>Custom Headers (JSON):</label>
                    <textarea id="custom-headers" placeholder='{"Authorization": "Bearer token", "Custom-Header": "value"}'></textarea>
                </div>
            `;
            break;
    }
    
    container.innerHTML = settingsHTML;
}

/**
 * Load AI configuration from server
 */
async function loadAIConfiguration() {
    try {
        const response = await fetch('/api/ai-config');
        if (response.ok) {
            const config = await response.json();
            populateConfigurationForm(config);
        }
    } catch (error) {
        console.error('Failed to load AI configuration:', error);
    }
}

/**
 * Populate configuration form with loaded data
 */
function populateConfigurationForm(config) {
    // Set provider
    document.getElementById('ai-provider-select').value = config.provider || 'claude';
    onProviderChange();
    
    // Set general settings
    document.getElementById('batch-size').value = config.batchSize || 5;
    document.getElementById('cache-results').checked = config.cacheResults !== false;
    
    // Set analysis focus checkboxes
    const focusItems = config.analysisFocus || ['syntax', 'performance', 'security', 'best_practices'];
    document.getElementById('focus-syntax').checked = focusItems.includes('syntax');
    document.getElementById('focus-performance').checked = focusItems.includes('performance');
    document.getElementById('focus-security').checked = focusItems.includes('security');
    document.getElementById('focus-best-practices').checked = focusItems.includes('best_practices');
    
    // Set provider-specific settings
    setTimeout(() => {
        const provider = config.provider || 'claude';
        const providerConfig = config.providers?.[provider] || {};
        
        switch (provider) {
            case 'claude':
                if (document.getElementById('claude-api-key')) {
                    document.getElementById('claude-api-key').value = providerConfig.apiKey || '';
                    document.getElementById('claude-model').value = providerConfig.model || 'claude-3-sonnet-20240229';
                    document.getElementById('claude-max-tokens').value = providerConfig.maxTokens || 4000;
                    document.getElementById('claude-temperature').value = providerConfig.temperature || 0.1;
                }
                break;
            case 'deepseek':
                if (document.getElementById('deepseek-api-key')) {
                    document.getElementById('deepseek-api-key').value = providerConfig.apiKey || '';
                    document.getElementById('deepseek-model').value = providerConfig.model || 'deepseek-coder';
                    document.getElementById('deepseek-max-tokens').value = providerConfig.maxTokens || 4000;
                    document.getElementById('deepseek-temperature').value = providerConfig.temperature || 0.1;
                }
                break;
            case 'custom':
                if (document.getElementById('custom-endpoint')) {
                    document.getElementById('custom-endpoint').value = providerConfig.endpoint || '';
                    document.getElementById('custom-api-key').value = providerConfig.apiKey || '';
                    document.getElementById('custom-model').value = providerConfig.model || '';
                    document.getElementById('custom-max-tokens').value = providerConfig.maxTokens || 4000;
                    document.getElementById('custom-temperature').value = providerConfig.temperature || 0.1;
                    document.getElementById('custom-headers').value = JSON.stringify(providerConfig.headers || {}, null, 2);
                }
                break;
        }
    }, 100);
}

/**
 * Save AI configuration
 */
async function saveAIConfiguration() {
    try {
        const config = collectConfigurationFromForm();
        
        const response = await fetch('/api/ai-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            showNotification('AI configuration saved successfully', 'success');
            hideAIConfigModal();
        } else {
            throw new Error('Failed to save configuration');
        }
    } catch (error) {
        showNotification('Failed to save AI configuration: ' + error.message, 'error');
    }
}

/**
 * Collect configuration data from form
 */
function collectConfigurationFromForm() {
    const provider = document.getElementById('ai-provider-select').value;
    
    const config = {
        provider: provider,
        batchSize: parseInt(document.getElementById('batch-size').value) || 5,
        cacheResults: document.getElementById('cache-results').checked,
        analysisFocus: []
    };
    
    // Collect analysis focus
    if (document.getElementById('focus-syntax').checked) config.analysisFocus.push('syntax');
    if (document.getElementById('focus-performance').checked) config.analysisFocus.push('performance');
    if (document.getElementById('focus-security').checked) config.analysisFocus.push('security');
    if (document.getElementById('focus-best-practices').checked) config.analysisFocus.push('best_practices');
    
    // Collect provider-specific settings
    config.providers = {};
    
    switch (provider) {
        case 'claude':
            config.providers.claude = {
                name: 'Claude (Anthropic)',
                endpoint: 'https://api.anthropic.com/v1/messages',
                apiKey: document.getElementById('claude-api-key').value,
                model: document.getElementById('claude-model').value,
                maxTokens: parseInt(document.getElementById('claude-max-tokens').value),
                temperature: parseFloat(document.getElementById('claude-temperature').value)
            };
            break;
        case 'deepseek':
            config.providers.deepseek = {
                name: 'DeepSeek',
                endpoint: 'https://api.deepseek.com/v1/chat/completions',
                apiKey: document.getElementById('deepseek-api-key').value,
                model: document.getElementById('deepseek-model').value,
                maxTokens: parseInt(document.getElementById('deepseek-max-tokens').value),
                temperature: parseFloat(document.getElementById('deepseek-temperature').value)
            };
            break;
        case 'custom':
            let customHeaders = {};
            try {
                customHeaders = JSON.parse(document.getElementById('custom-headers').value || '{}');
            } catch (e) {
                console.warn('Invalid custom headers JSON, using empty object');
            }
            
            config.providers.custom = {
                name: 'Custom Endpoint',
                endpoint: document.getElementById('custom-endpoint').value,
                apiKey: document.getElementById('custom-api-key').value,
                model: document.getElementById('custom-model').value,
                maxTokens: parseInt(document.getElementById('custom-max-tokens').value),
                temperature: parseFloat(document.getElementById('custom-temperature').value),
                headers: customHeaders
            };
            break;
    }
    
    return config;
}

/**
 * Test AI connection
 */
async function testAIConnection() {
    const button = document.getElementById('test-connection-btn');
    const status = document.getElementById('connection-status');
    
    button.disabled = true;
    button.textContent = 'Testing...';
    status.innerHTML = '<div class="loading">Testing connection...</div>';
    
    try {
        const config = collectConfigurationFromForm();
        
        const response = await fetch('/api/ai-test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        
        if (result.success) {
            status.innerHTML = '<div class="success">✅ Connection successful!</div>';
        } else {
            status.innerHTML = `<div class="error">❌ Connection failed: ${result.message}</div>`;
        }
    } catch (error) {
        status.innerHTML = `<div class="error">❌ Test failed: ${error.message}</div>`;
    } finally {
        button.disabled = false;
        button.textContent = 'Test Connection';
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Export functions for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showAIConfigModal,
        hideAIConfigModal,
        loadAIConfiguration,
        saveAIConfiguration,
        testAIConnection
    };
}
