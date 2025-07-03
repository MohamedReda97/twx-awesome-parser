/**
 * TWX Viewer - New Collapsible UI
 * Handles object browsing, search, and detailed views
 */

// Global state
let currentObjects = {};
let selectedObjectType = null;
let selectedObject = null;
let searchResults = [];
let selectedTWXFile = null;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('TWX Viewer New UI loading...');
    loadObjectData();
    updateStatus('Ready - Select a TWX file to begin');
});

/**
 * Select TWX file for parsing
 */
function selectTWXFile() {
    const fileInput = document.getElementById('twx-file-input');
    fileInput.click();
    
    fileInput.onchange = function(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.name.toLowerCase().endsWith('.twx')) {
                selectedTWXFile = file;
                document.getElementById('selected-file-name').textContent = `Selected: ${file.name}`;
                document.getElementById('parse-button').disabled = false;
                document.getElementById('clear-file-button').style.display = 'inline-block';
                updateStatus(`Selected file: ${file.name}`);
            } else {
                alert('Please select a valid TWX file (.twx extension)');
                clearSelectedFile();
            }
        }
    };
}

/**
 * Clear selected file
 */
function clearSelectedFile() {
    selectedTWXFile = null;
    document.getElementById('selected-file-name').textContent = '';
    document.getElementById('parse-button').disabled = true;
    document.getElementById('clear-file-button').style.display = 'none';
    document.getElementById('twx-file-input').value = '';
    hideParsingStatus();
    updateStatus('Ready - Select a TWX file to begin');
}

/**
 * Parse the selected TWX file
 */
async function parseTWXFile() {
    if (!selectedTWXFile) {
        alert('Please select a TWX file first');
        return;
    }

    try {
        showParsingStatus('Uploading and parsing TWX file...', 'processing');
        updateProgressBar(10);
        
        // Create FormData to upload file
        const formData = new FormData();
        formData.append('twxFile', selectedTWXFile);
        
        updateProgressBar(30);
        
        // Send file to server for parsing
        const response = await fetch('/api/parse', {
            method: 'POST',
            body: formData
        });
        
        updateProgressBar(60);
        
        if (!response.ok) {
            throw new Error(`Parse failed: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        updateProgressBar(80);
        
        // Success - reload the object data
        showParsingStatus(`Parsing completed! Found ${result.objectCount || 0} objects.`, 'success');
        updateProgressBar(100);
        
        // Reload the UI with new data
        setTimeout(() => {
            loadObjectData();
            hideParsingStatus();
        }, 2000);
        
    } catch (error) {
        console.error('Parse error:', error);
        showParsingStatus(`Error: ${error.message}`, 'error');
        updateProgressBar(0);
    }
}

/**
 * Show parsing status with message and type
 */
function showParsingStatus(message, type = 'processing') {
    const statusDiv = document.getElementById('parsing-status');
    const messageDiv = document.getElementById('status-message');
    
    statusDiv.style.display = 'block';
    statusDiv.className = `parsing-status status-${type}`;
    messageDiv.textContent = message;
    
    if (type === 'processing') {
        document.getElementById('progress-bar').style.display = 'block';
    } else {
        document.getElementById('progress-bar').style.display = 'none';
    }
}

/**
 * Hide parsing status
 */
function hideParsingStatus() {
    document.getElementById('parsing-status').style.display = 'none';
    updateProgressBar(0);
}

/**
 * Update progress bar
 */
function updateProgressBar(percent) {
    const progressFill = document.getElementById('progress-fill');
    progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

/**
 * Toggle collapsible panels
 */
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const toggleIcon = document.getElementById(panelId.replace('-panel', '-toggle'));
    
    if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        toggleIcon.classList.remove('collapsed');
        toggleIcon.textContent = '▼';
    } else {
        panel.classList.add('collapsed');
        toggleIcon.classList.add('collapsed');
        toggleIcon.textContent = '▶';
    }
}

/**
 * Load object data from API
 */
async function loadObjectData() {
    try {
        updateStatus('Loading object data...');
        
        const response = await fetch('/api/objects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        currentObjects = await response.json();
        displayObjectTypes();
        updateObjectCount();
        updateStatus('Object data loaded');
        
    } catch (error) {
        console.error('Error loading object data:', error);
        updateStatus('Error loading data');
        
        // Show error in the loading area
        const loadingEl = document.getElementById('object-types-loading');
        if (loadingEl) {
            loadingEl.textContent = 'Error loading object data. Please ensure the parser has been run.';
            loadingEl.style.color = '#dc3545';
        }
    }
}

/**
 * Display object types in the UI
 */
function displayObjectTypes() {
    const container = document.getElementById('object-types-list');
    const loading = document.getElementById('object-types-loading');
    
    // Hide loading indicator
    if (loading) loading.style.display = 'none';
    
    // Clear existing content
    container.innerHTML = '';
    
    // Define the allowed object types to display
    const allowedTypes = [
        'coach-view',
        'cshs', 
        'managed-asset',
        'participant',
        'process',
        'business-process-definition'
    ];
    
    // Filter and create type cards only for allowed types
    Object.keys(currentObjects)
        .filter(type => allowedTypes.includes(type))
        .forEach(type => {
            const objectData = currentObjects[type];
            const count = objectData.objects ? objectData.objects.length : 0;
            
            const card = document.createElement('div');
            card.className = 'object-type-card';
            card.onclick = () => selectObjectType(type);
            
            // Smaller boxes without description
            card.innerHTML = `
                <div class="object-type-header">
                    <span class="object-type-name">${getDisplayName(type)}</span>
                    <span class="object-count-badge">${count}</span>
                </div>
            `;
            
            container.appendChild(card);
        });
}

/**
 * Select an object type and display its objects
 */
function selectObjectType(type) {
    selectedObjectType = type;
    
    // Update UI selection
    document.querySelectorAll('.object-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.object-type-card').classList.add('selected');
    
    // Show and populate objects list
    displayObjectsList(type);
    showPanel('objects-list-panel');
    
    // Update panel title
    const title = document.getElementById('objects-list-title');
    const count = currentObjects[type].objects ? currentObjects[type].objects.length : 0;
    title.textContent = `📋 ${getDisplayName(type)} (${count})`;
    
    updateStatus(`Selected ${getDisplayName(type)} - ${count} objects`);
}

/**
 * Display objects of selected type
 */
function displayObjectsList(type) {
    const container = document.getElementById('objects-list');
    
    // Check if container exists
    if (!container) {
        console.error('Objects list container not found');
        return;
    }
    
    const objectData = currentObjects[type];
    
    container.innerHTML = '';
    
    if (!objectData || !objectData.objects || objectData.objects.length === 0) {
        container.innerHTML = '<div class="loading">No objects found</div>';
        return;
    }
    
    objectData.objects.forEach(object => {
        const item = document.createElement('div');
        item.className = 'object-item';
        item.onclick = () => selectObject(object);
        
        item.innerHTML = `
            <div class="object-name">${object.name || 'Unnamed'}</div>
            <div class="object-meta">
                ID: ${object.id} | Type: ${object.typeName || type}
                ${object.subType ? ` | SubType: ${object.subType}` : ''}
            </div>
        `;
        
        container.appendChild(item);
    });
}

/**
 * Select an object and display its details
 */
function selectObject(object) {
    selectedObject = object;
    
    // Update UI selection
    document.querySelectorAll('.object-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.closest('.object-item').classList.add('selected');
    
    // Show and populate object details
    displayObjectDetails(object);
    showPanel('object-details-panel');
    
    // Update panel title
    const title = document.getElementById('object-details-title');
    title.textContent = `📄 ${object.name || 'Unnamed Object'}`;
    
    updateStatus(`Viewing ${object.name || 'object'} details`);
}

/**
 * Display detailed information for selected object
 */
function displayObjectDetails(object) {
    const container = document.getElementById('object-details');
    container.innerHTML = '';
    
    // Basic Information
    const basicInfo = createDetailSection('Basic Information', generateBasicInfo(object));
    container.appendChild(basicInfo);
    
    // Type-specific details
    if (object.details) {
        if (object.details.variables) {
            const variablesSection = createDetailSection('Variables', generateVariablesDisplay(object.details.variables, selectedObjectType));
            container.appendChild(variablesSection);
        }
        
        if (object.details.scripts && object.details.scripts.length > 0) {
            const scriptsSection = createDetailSection('Scripts', generateScriptsDisplay(object.details.scripts));
            container.appendChild(scriptsSection);
        }
        
        if (object.details.inlineScripts && object.details.inlineScripts.length > 0) {
            const inlineScriptsSection = createDetailSection('Inline Scripts', generateInlineScriptsDisplay(object.details.inlineScripts));
            container.appendChild(inlineScriptsSection);
        }
        
        if (object.details.loadJsFunction) {
            const jsSection = createDetailSection('Load JS Function', `<div class="code-block">${object.details.loadJsFunction}</div>`);
            container.appendChild(jsSection);
        }
        
        if (object.details.elements) {
            const elementsSection = createDetailSection('Process Elements', generateElementsDisplay(object.details.elements));
            container.appendChild(elementsSection);
        }
    }
}

/**
 * Create a collapsible detail section
 */
function createDetailSection(title, content) {
    const section = document.createElement('div');
    section.className = 'detail-section';
    
    const sectionId = 'detail-' + title.toLowerCase().replace(/\s+/g, '-');
    
    section.innerHTML = `
        <div class="detail-section-header" onclick="toggleDetailSection('${sectionId}')">
            <span class="detail-section-title">${title}</span>
        </div>
        <div class="detail-content" id="${sectionId}">
            ${content}
        </div>
    `;
    
    return section;
}

/**
 * Toggle detail sections
 */
function toggleDetailSection(sectionId) {
    const content = document.getElementById(sectionId);
    content.classList.toggle('collapsed');
}

/**
 * Generate basic information display
 */
function generateBasicInfo(object) {
    return `
        <table class="variables-table">
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Name</td><td>${object.name || 'N/A'}</td></tr>
            <tr><td>ID</td><td>${object.id}</td></tr>
            <tr><td>Version ID</td><td>${object.versionId || 'N/A'}</td></tr>
            <tr><td>Type</td><td>${object.typeName || object.type}</td></tr>
            ${object.subType ? `<tr><td>Sub Type</td><td>${object.subType}</td></tr>` : ''}
            ${object.details?.displayName ? `<tr><td>Display Name</td><td>${object.details.displayName}</td></tr>` : ''}
            ${object.details?.description ? `<tr><td>Description</td><td>${object.details.description}</td></tr>` : ''}
        </table>
    `;
}

/**
 * Generate variables display
 */
function generateVariablesDisplay(variables, objectType) {
    // Use box layout for CSHS and Services (process) types
    if (objectType === 'cshs' || objectType === 'process') {
        return generateVariablesBoxDisplay(variables);
    }
    
    // Use table layout for other types
    let html = '';
    
    if (variables.input && variables.input.length > 0) {
        html += '<h4>Input Variables</h4>';
        html += generateVariablesTable(variables.input);
    }
    
    if (variables.output && variables.output.length > 0) {
        html += '<h4>Output Variables</h4>';
        html += generateVariablesTable(variables.output);
    }
    
    if (variables.private && variables.private.length > 0) {
        html += '<h4>Private Variables</h4>';
        html += generateVariablesTable(variables.private);
    }
    
    return html || '<p>No variables found</p>';
}

/**
 * Generate variables box display for CSHS and Services
 */
function generateVariablesBoxDisplay(variables) {
    let html = '<div class="variables-boxes">';
    
    if (variables.input && variables.input.length > 0) {
        html += generateVariableTypeSection('Input Variables', variables.input, 'input');
    }
    
    if (variables.output && variables.output.length > 0) {
        html += generateVariableTypeSection('Output Variables', variables.output, 'output');
    }
    
    if (variables.private && variables.private.length > 0) {
        html += generateVariableTypeSection('Private Variables', variables.private, 'private');
    }
    
    html += '</div>';
    return html || '<p>No variables found</p>';
}

/**
 * Generate a variable type section with boxes
 */
function generateVariableTypeSection(title, variables, direction) {
    let html = `
        <div class="variable-type-section">
            <div class="variable-type-title">${title}</div>
            <div class="variable-boxes-container">
    `;
    
    variables.forEach(variable => {
        html += generateVariableBox(variable, direction);
    });
    
    html += '</div></div>';
    return html;
}

/**
 * Generate a single variable box
 */
function generateVariableBox(variable, direction) {
    const hasDefault = variable.hasDefault || false;
    const variableName = variable.name || 'unnamed';
    
    // Determine arrow based on direction
    let arrow = '';
    let arrowClass = '';
    switch (direction) {
        case 'input':
            arrow = '↑';
            arrowClass = 'input';
            break;
        case 'output':
            arrow = '↓';
            arrowClass = 'output';
            break;
        case 'private':
            arrow = '↕';
            arrowClass = 'both';
            break;
        default:
            arrow = '•';
            arrowClass = '';
    }
    
    return `
        <div class="variable-box" title="${variable.description || 'No description'}">
            <div class="default-indicator ${hasDefault ? 'has-default' : ''}"></div>
            <span class="variable-name">${variableName}</span>
            <span class="direction-arrow ${arrowClass}">${arrow}</span>
        </div>
    `;
}

/**
 * Generate scripts display
 */
function generateScriptsDisplay(scripts) {
    let html = '';
    
    scripts.forEach((script, index) => {
        html += `
            <div class="detail-section">
                <div class="detail-section-header" onclick="toggleDetailSection('script-${index}')">
                    <span class="detail-section-title">📜 ${script.name || `Script ${index + 1}`}</span>
                </div>
                <div class="detail-content" id="script-${index}">
                    <div class="code-block">${escapeHtml(script.script)}</div>
                </div>
            </div>
        `;
    });
    
    return html;
}

/**
 * Generate inline scripts display
 */
function generateInlineScriptsDisplay(scripts) {
    let html = '';
    
    scripts.forEach((script, index) => {
        html += `
            <div class="detail-section">
                <div class="detail-section-header" onclick="toggleDetailSection('inline-script-${index}')">
                    <span class="detail-section-title">📜 ${script.name || `Inline Script ${index + 1}`} (${script.scriptType || 'JS'})</span>
                </div>
                <div class="detail-content" id="inline-script-${index}">
                    <div class="code-block">${escapeHtml(script.scriptBlock)}</div>
                </div>
            </div>
        `;
    });
    
    return html;
}

/**
 * Generate process elements display
 */
function generateElementsDisplay(elements) {
    let html = '';
    
    if (elements.scriptTasks && elements.scriptTasks.length > 0) {
        html += '<h4>Script Tasks</h4>';
        elements.scriptTasks.forEach(task => {
            html += `<div class="object-item">
                <div class="object-name">${task.name}</div>
                <div class="object-meta">ID: ${task.id}</div>
            </div>`;
        });
    }
    
    if (elements.formTasks && elements.formTasks.length > 0) {
        html += '<h4>Form Tasks</h4>';
        elements.formTasks.forEach(task => {
            html += `<div class="object-item">
                <div class="object-name">${task.name}</div>
                <div class="object-meta">ID: ${task.id}</div>
            </div>`;
        });
    }
    
    return html || '<p>No process elements found</p>';
}

/**
 * Show a panel
 */
function showPanel(panelId) {
    const panel = document.getElementById(panelId);
    panel.style.display = 'block';
    
    // Expand the panel if it's collapsed
    const contentId = panelId.replace('-panel', '-content');
    const content = document.getElementById(contentId);
    if (content && content.classList.contains('collapsed')) {
        togglePanel(contentId);
    }
}

/**
 * Handle search input keyup
 */
function handleSearchKeyup(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

/**
 * Perform deep search
 */
async function performSearch() {
    const searchTerm = document.getElementById('search-input').value.trim();
    
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }
    
    updateStatus('Searching...');
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        searchResults = await response.json();
        displaySearchResults(searchTerm);
        updateStatus(`Found ${searchResults.length} results for "${searchTerm}"`);
        
    } catch (error) {
        console.error('Search error:', error);
        updateStatus('Search failed');
        alert('Search failed: ' + error.message);
    }
}

/**
 * Display search results
 */
function displaySearchResults(searchTerm) {
    const resultsContainer = document.getElementById('search-results');
    const infoContainer = document.getElementById('search-info');
    const listContainer = document.getElementById('search-results-list');
    
    // Show results section
    resultsContainer.style.display = 'block';
    
    // Update info
    infoContainer.innerHTML = `Found <strong>${searchResults.length}</strong> results for "<strong>${searchTerm}</strong>"`;
    
    // Clear and populate results list
    listContainer.innerHTML = '';
    
    if (searchResults.length === 0) {
        listContainer.innerHTML = '<div class="loading">No results found</div>';
        return;
    }
    
    searchResults.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.onclick = () => showSearchResultDetails(result);
        
        // Extract object info
        const objectName = result.objectName || 'Unknown Object';
        const objectType = result.objectType || 'Unknown Type';
        const preview = result.preview || (result.matches && result.matches.length > 0 ? result.matches[0].snippet : 'No preview available');
        const matchCount = result.matchCount || (result.matches ? result.matches.length : 0);
        
        // Create match count indicator
        const matchIndicator = matchCount > 1 ? ` (${matchCount} matches)` : '';
        
        item.innerHTML = `
            <div class="search-result-header">
                <span class="search-result-title">${escapeHtml(objectName)}${matchIndicator}</span>
                <span class="search-result-type">${escapeHtml(objectType)}</span>
            </div>
            <div class="search-result-preview">${preview}</div>
        `;
        
        listContainer.appendChild(item);
    });
}

/**
 * Highlight search term in text
 */
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
}

/**
 * Show detailed view of search result
 */
function showSearchResultDetails(result) {
    // Find and select the object in the main browser
    // This is a simplified implementation
    updateStatus(`Viewing search result: ${result.objectName}`);
}

/**
 * Clear search results
 */
function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').style.display = 'none';
    searchResults = [];
    updateStatus('Search cleared');
}

/**
 * Utility functions
 */
function updateStatus(message) {
    document.getElementById('status-text').textContent = message;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateObjectCount() {
    const total = Object.values(currentObjects).reduce((sum, data) => {
        return sum + (data.objects ? data.objects.length : 0);
    }, 0);
    
    document.getElementById('object-count').textContent = `${total} objects total`;
}

function getDisplayName(type) {
    const names = {
        'process': 'Services',  // Changed from 'Processes' to 'Services'
        'coach-view': 'Coach Views',
        'cshs': 'CSHS',
        'business-process-definition': 'Business Process Definitions',
        'participant': 'Participants',
        'managed-asset': 'Managed Assets'
    };
    
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function getTypeDescription(type) {
    const descriptions = {
        'process': 'Business processes, services, and workflows',
        'coachView': 'User interface components and custom controls',
        'cshs': 'Client-side human services and user interfaces',
        'business-process-definition': 'Process definitions and templates',
        'business-object': 'Data structures and business entities',
        'participant': 'Process participants and roles',
        'environment-variables': 'Configuration variables and settings',
        'managed-asset': 'Shared assets and resources',
        'resource-bundle': 'Localization and text resources'
    };
    
    return descriptions[type] || 'Application objects and components';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
