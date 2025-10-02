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
let showToolkitObjects = false; // New state for toolkit toggle
let aiAnalysisResults = [];
let aiAnalysisInProgress = false;
let aiAnalysisController = null; // AbortController for cancelling requests

// ===== TAB MANAGEMENT =====

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    try {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from all tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Show selected tab content
        const selectedTabContent = document.getElementById(`${tabName}-tab-content`);
        if (selectedTabContent) {
            selectedTabContent.classList.add('active');
        }

        // Activate selected tab button
        const selectedTabButton = document.getElementById(`${tabName}-tab`);
        if (selectedTabButton) {
            selectedTabButton.classList.add('active');
        }

        // Update script count display when switching to analysis tabs
        if (tabName === 'ai-analysis') {
            setTimeout(() => {
                if (typeof updateScriptCountDisplay === 'function') {
                    updateScriptCountDisplay();
                }
            }, 100);
        } else if (tabName === 'static-review') {
            setTimeout(() => {
                if (typeof updateStaticScriptCountDisplay === 'function') {
                    updateStaticScriptCountDisplay();
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error switching tabs:', error);
    }
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('TWX Viewer New UI loading...');

    // Debug: Check if functions are defined
    console.log('Function checks:', {
        selectTWXFile: typeof selectTWXFile,
        showAIConfigModal: typeof showAIConfigModal,
        updateScriptCountDisplay: typeof updateScriptCountDisplay,
        startAIAnalysis: typeof startAIAnalysis,
        stopAIAnalysis: typeof stopAIAnalysis,
        getSelectedObjectTypes: typeof getSelectedObjectTypes,
        switchTab: typeof switchTab
    });

    // Make functions globally available for debugging
    window.debugFunctions = {
        selectTWXFile,
        showAIConfigModal,
        updateScriptCountDisplay,
        startAIAnalysis,
        stopAIAnalysis,
        getSelectedObjectTypes,
        switchTab,
        loadObjectData,
        currentObjects: () => currentObjects,
        // Static analysis functions
        startStaticAnalysis: typeof startStaticAnalysis !== 'undefined' ? startStaticAnalysis : null,
        stopStaticAnalysis: typeof stopStaticAnalysis !== 'undefined' ? stopStaticAnalysis : null,
        updateStaticScriptCountDisplay: typeof updateStaticScriptCountDisplay !== 'undefined' ? updateStaticScriptCountDisplay : null
    };

    loadObjectData();
    updateStatus('Ready - Select a TWX file to begin');

    // Initialize AI analysis UI
    setTimeout(() => {
        if (typeof updateScriptCountDisplay === 'function') {
            updateScriptCountDisplay();
        }
        if (typeof updateStaticScriptCountDisplay === 'function') {
            updateStaticScriptCountDisplay();
        }
    }, 100);

    // Add event listeners for static analysis filters (after DOM is loaded)
    setTimeout(() => {
        document.getElementById('static-filter-severity')?.addEventListener('change', filterStaticResults);
        document.getElementById('static-filter-category')?.addEventListener('change', filterStaticResults);
        document.getElementById('static-filter-object')?.addEventListener('input', filterStaticResults);

        // Add event listeners for static analysis configuration changes
        document.getElementById('static-filter-coachview')?.addEventListener('change', updateStaticScriptCountDisplay);
        document.getElementById('static-filter-cshs')?.addEventListener('change', updateStaticScriptCountDisplay);
        document.getElementById('static-filter-service')?.addEventListener('change', updateStaticScriptCountDisplay);
        document.getElementById('static-exclude-toolkit')?.addEventListener('change', updateStaticScriptCountDisplay);
    }, 200);
});

/**
 * Select TWX file for parsing
 */
function selectTWXFile() {
    const fileInput = document.getElementById('twx-file-input');
    fileInput.click();

    fileInput.onchange = function (event) {
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

        // For testing purposes, load from static files
        // Comment this section and uncomment the API section when server is available
        const files = [
            'combined-objects-coach-view.json',
            'combined-objects-cshs.json',
            'combined-objects-managed-asset.json',
            'combined-objects-participant.json',
            'combined-objects-process.json',
            'combined-objects-business-process-definition.json',
            'combined-objects-business-object.json'
        ];

        // 🆕 Try to load combined files first (app + toolkit objects)
        currentObjects = {};
        let hasCombinedFiles = false;

        for (const file of files) {
            try {
                const response = await fetch(`./output/${file}`);
                if (response.ok) {
                    const data = await response.json();
                    const key = file.replace('combined-objects-', '').replace('.json', '');
                    currentObjects[key] = data;
                    hasCombinedFiles = true;
                    console.log(`✅ Loaded combined file: ${file} (${data.applicationCount || 0} app + ${data.toolkitCount || 0} toolkit objects)`);
                }
            } catch (err) {
                console.log(`Could not load combined file ${file}:`, err.message);
            }
        }

        // 🆕 Fallback to original files if combined files not available
        if (!hasCombinedFiles) {
            console.log('📄 Combined files not available, loading original object files...');

            const originalFiles = [
                'objects-coach-view.json',
                'objects-cshs.json',
                'objects-managed-asset.json',
                'objects-participant.json',
                'objects-process.json',
                'objects-business-process-definition.json',
                'objects-business-object.json'
            ];

            for (const file of originalFiles) {
                try {
                    const response = await fetch(`./output/${file}`);
                    if (response.ok) {
                        const data = await response.json();
                        const key = file.replace('objects-', '').replace('.json', '');
                        currentObjects[key] = data;
                        console.log(`✅ Loaded original file: ${file} (${data.objects?.length || 0} objects)`);
                    }
                } catch (err) {
                    console.log(`Could not load ${file}:`, err.message);
                }
            }
        }

        /* 
        // API version (use when server is running)
        const response = await fetch('/api/objects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentObjects = await response.json();
        */

        displayObjectTypes();
        updateObjectCount();
        updateScriptCountDisplay(); // Update AI analysis button text

        // 🆕 Load and display enhanced statistics
        await loadAndDisplayStatistics();

        // Debug: Log toolkit objects found
        console.log('🔍 Debug: Checking for toolkit objects in loaded data...');
        Object.keys(currentObjects).forEach(objectType => {
            const objectData = currentObjects[objectType];
            if (objectData && objectData.objects) {
                const toolkitObjs = objectData.objects.filter(obj => obj.source === 'toolkit');
                const appObjs = objectData.objects.filter(obj => obj.source === 'application');
                console.log(`${objectType}: ${appObjs.length} app objects, ${toolkitObjs.length} toolkit objects`);

                if (toolkitObjs.length > 0) {
                    console.log(`  Sample toolkit objects:`, toolkitObjs.slice(0, 3).map(obj => ({
                        name: obj.name,
                        source: obj.source,
                        toolkitInfo: obj.toolkitInfo?.shortName
                    })));
                }
            }
        });

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
        'business-process-definition',
        'business-object'
    ];

    // Filter and create type cards only for allowed types
    Object.keys(currentObjects)
        .filter(type => allowedTypes.includes(type))
        .forEach(type => {
            const objectData = currentObjects[type];

            // Calculate counts based on toolkit toggle
            let appCount = 0;
            let toolkitCount = 0;
            let displayCount = 0;

            if (objectData.objects) {
                appCount = objectData.objects.filter(obj => obj.source === 'application').length;
                toolkitCount = objectData.objects.filter(obj => obj.source === 'toolkit').length;
            }

            // Use explicit counts from combined files if available
            if (objectData.applicationCount !== undefined) {
                appCount = objectData.applicationCount;
            }
            if (objectData.toolkitCount !== undefined) {
                toolkitCount = objectData.toolkitCount;
            }

            // Calculate display count based on toggle
            if (showToolkitObjects) {
                displayCount = appCount + toolkitCount;
            } else {
                displayCount = appCount;
            }

            const card = document.createElement('div');
            card.className = 'object-type-card';
            card.onclick = () => selectObjectType(type);

            // Enhanced card with app/toolkit breakdown
            card.innerHTML = `
                <div class="object-type-header">
                    <span class="object-type-name">${getDisplayName(type)}</span>
                    <div class="object-count-breakdown">
                        ${showToolkitObjects ?
                    `${appCount > 0 ? `<span class="app-count" title="Application Objects">${appCount}</span>` : ''}
                             ${toolkitCount > 0 ? `<span class="toolkit-count" title="Toolkit Objects">+${toolkitCount}</span>` : ''}` :
                    `<span class="app-count" title="Application Objects Only">${appCount}</span>`
                }
                        <span class="total-count">${displayCount}</span>
                    </div>
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
 * Toggle toolkit objects visibility
 */
function toggleToolkitObjects() {
    showToolkitObjects = document.getElementById('show-toolkit-objects').checked;
    console.log('Toolkit objects toggle:', showToolkitObjects);

    // Refresh the current view if an object type is selected
    if (selectedObjectType) {
        displayObjectsList(selectedObjectType);

        // Update the count in the panel title
        const filteredObjects = getFilteredObjects(currentObjects[selectedObjectType].objects);
        const title = document.getElementById('objects-list-title');
        title.textContent = `📋 ${getDisplayName(selectedObjectType)} (${filteredObjects.length})`;
    }

    // Update object type cards to show filtered counts
    displayObjectTypes();
}

/**
 * Get filtered objects based on toolkit toggle
 */
function getFilteredObjects(objects) {
    if (!objects) return [];

    if (showToolkitObjects) {
        // Show all objects (app + toolkit)
        return objects;
    } else {
        // Show only application objects
        return objects.filter(obj => obj.source !== 'toolkit');
    }
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

    // Filter objects based on toolkit toggle
    const filteredObjects = getFilteredObjects(objectData.objects);

    if (filteredObjects.length === 0) {
        container.innerHTML = '<div class="loading">No objects found (try toggling toolkit objects)</div>';
        return;
    }

    // Create grid container for object items
    const gridContainer = document.createElement('div');
    gridContainer.className = 'object-list-container';
    container.appendChild(gridContainer);

    filteredObjects.forEach(object => {
        const item = document.createElement('div');
        item.className = `object-item ${object.source || 'application'}`;
        item.onclick = () => selectObject(object);

        // Minimal design - focus on important details
        let importantDetails = '';

        // Show script count for objects with scripts
        if (object.details?.scripts?.length > 0) {
            importantDetails += `<span class="detail-badge scripts">📜 ${object.details.scripts.length} scripts</span>`;
        }

        // Show variable count for CSHS/Services
        if (object.details?.variables) {
            const totalVars = (object.details.variables.input?.length || 0) +
                (object.details.variables.output?.length || 0) +
                (object.details.variables.private?.length || 0);
            if (totalVars > 0) {
                importantDetails += `<span class="detail-badge variables">🔧 ${totalVars} vars</span>`;
            }
        }

        // Show element count for CSHS
        if (object.details?.elements) {
            const totalElements = Object.values(object.details.elements).reduce((sum, arr) => sum + (arr?.length || 0), 0);
            if (totalElements > 0) {
                importantDetails += `<span class="detail-badge elements">⚙️ ${totalElements} elements</span>`;
            }
        }

        // Show property count for business objects
        if (object.details?.schema?.properties?.length > 0) {
            importantDetails += `<span class="detail-badge properties">📋 ${object.details.schema.properties.length} props</span>`;
        }

        // Source indicator
        let sourceIndicator = '';
        if (object.source === 'toolkit' && object.toolkitInfo) {
            sourceIndicator = `<span class="source-badge toolkit">${object.toolkitInfo.shortName}</span>`;
        } else if (object.source === 'application') {
            sourceIndicator = '<span class="source-badge app">APP</span>';
        }

        item.innerHTML = `
            <div class="object-header-minimal">
                <div class="object-name-minimal">${object.name || 'Unnamed'}</div>
                ${sourceIndicator}
            </div>
            ${importantDetails ? `<div class="object-details-minimal">${importantDetails}</div>` : ''}
        `;

        gridContainer.appendChild(item);
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
            const scriptsContent = `
                <div class="scripts-header">
                    <button onclick="analyzeObjectScripts('${object.id}')" class="btn-secondary ai-analyze-btn">
                        🤖 Analyze Scripts with AI
                    </button>
                </div>
                ${generateScriptsDisplay(object.details.scripts)}
            `;
            const scriptsSection = createDetailSection('Scripts', scriptsContent);
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

        if (object.details.schema) {
            const schemaSection = createDetailSection('Business Object Schema', generateBusinessObjectSchemaDisplay(object.details.schema));
            container.appendChild(schemaSection);
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
 * Toggle script sections (for inline scripts and regular scripts)
 */
function toggleScriptSection(sectionId) {
    const content = document.getElementById(sectionId);
    const toggle = document.getElementById(sectionId + '-toggle');

    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        if (toggle) toggle.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        if (toggle) toggle.textContent = '▶';
    }
}

/**
 * Generate basic information display
 */
function generateBasicInfo(object) {
    let basicInfo = `
        <table class="variables-table">
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Name</td><td>${object.name || 'N/A'}</td></tr>
            <tr><td>ID</td><td>${object.id}</td></tr>
            <tr><td>Version ID</td><td>${object.versionId || 'N/A'}</td></tr>
            <tr><td>Type</td><td>${object.typeName || object.type}</td></tr>
            ${object.subType ? `<tr><td>Sub Type</td><td>${object.subType}</td></tr>` : ''}
            ${object.details?.displayName ? `<tr><td>Display Name</td><td>${object.details.displayName}</td></tr>` : ''}
            ${object.details?.description ? `<tr><td>Description</td><td>${object.details.description}</td></tr>` : ''}
    `;

    // 🆕 Add source information
    if (object.source) {
        basicInfo += `<tr><td>Source</td><td><span class="${object.source === 'toolkit' ? 'toolkit-indicator' : 'app-indicator'}">${object.source.toUpperCase()}</span></td></tr>`;
    }

    // 🆕 Add toolkit details if applicable
    if (object.source === 'toolkit' && object.toolkitInfo) {
        basicInfo += `
            <tr><td>Toolkit Name</td><td>${object.toolkitInfo.name}</td></tr>
            <tr><td>Toolkit Short Name</td><td>${object.toolkitInfo.shortName}</td></tr>
            <tr><td>Toolkit ID</td><td>${object.toolkitInfo.id}</td></tr>
            <tr><td>Toolkit File</td><td>${object.toolkitInfo.fileName}</td></tr>
            ${object.toolkitInfo.isSystem ? '<tr><td>System Toolkit</td><td>Yes</td></tr>' : ''}
        `;
    }

    basicInfo += '</table>';

    return basicInfo;
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

    return `
        <div class="variable-box" title="${variable.description || 'No description'}">
            <div class="default-indicator ${hasDefault ? 'has-default' : ''}"></div>
            <span class="variable-name">${variableName}</span>
        </div>
    `;
}

/**
 * Generate scripts display
 */
function generateScriptsDisplay(scripts) {
    let html = '';

    scripts.forEach((script, index) => {
        // Handle different script content property names and formats
        let scriptContent = script.content || script.script || script.scriptBlock || script.scriptContent || 'No script content';

        // Clean up script content formatting
        if (scriptContent && scriptContent !== 'No script content') {
            scriptContent = scriptContent
                .replace(/\r\r\n/g, '\n')  // Convert \r\r\n to \n
                .replace(/\r\n/g, '\n')    // Convert \r\n to \n
                .replace(/\r/g, '\n')      // Convert standalone \r to \n
                .trim();
        }

        html += `
            <div class="script-detail-section">
                <div class="script-detail-header" onclick="toggleScriptSection('script-${index}')">
                    <span class="script-detail-title">📜 ${escapeHtml(script.name || `Script ${index + 1}`)}</span>
                    <span class="script-toggle" id="script-${index}-toggle">▼</span>
                </div>
                <div class="script-detail-content" id="script-${index}">
                    <div class="code-block">${escapeHtml(scriptContent)}</div>
                    ${script.componentName ? `<div class="script-meta"><strong>Component:</strong> ${escapeHtml(script.componentName)}</div>` : ''}
                    ${script.elementType ? `<div class="script-meta"><strong>Element Type:</strong> ${escapeHtml(script.elementType)}</div>` : ''}
                    ${script.elementId ? `<div class="script-meta"><strong>Element ID:</strong> ${escapeHtml(script.elementId)}</div>` : ''}
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
        // Handle different script structures (CSHS vs other types)
        let scriptContent = script.script || script.scriptBlock || 'No script content';

        // Normalize line endings and handle formatting
        if (scriptContent && scriptContent !== 'No script content') {
            scriptContent = scriptContent
                .replace(/\r\r\n/g, '\n')  // Convert \r\r\n to \n
                .replace(/\r\n/g, '\n')    // Convert \r\n to \n
                .replace(/\r/g, '\n');     // Convert standalone \r to \n
        }

        const scriptName = script.name || `Inline Script ${index + 1}`;
        const scriptType = script.scriptType || 'JS';

        // Create expandable script sections like the regular scripts
        html += `
            <div class="script-detail-section">
                <div class="script-detail-header" onclick="toggleScriptSection('inline-script-${index}')">
                    <span class="script-detail-title">📜 ${escapeHtml(scriptName)} (${scriptType})</span>
                    <span class="script-toggle" id="inline-script-${index}-toggle">▼</span>
                </div>
                <div class="script-detail-content" id="inline-script-${index}">
                    <div class="code-block">${escapeHtml(scriptContent)}</div>
                    ${script.preScript && script.preScript.trim() ? `<div class="script-section"><h5>Pre Script:</h5><div class="code-block">${escapeHtml(script.preScript.replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n'))}</div></div>` : ''}
                    ${script.postScript && script.postScript.trim() ? `<div class="script-section"><h5>Post Script:</h5><div class="code-block">${escapeHtml(script.postScript.replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n'))}</div></div>` : ''}
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

    // Filter and display script tasks that have scripts
    if (elements.scriptTasks && elements.scriptTasks.length > 0) {
        const scriptTasksWithScripts = elements.scriptTasks.filter(task =>
            (task.script && task.script.trim()) ||
            (task.preScript && task.preScript.trim()) ||
            (task.postScript && task.postScript.trim())
        );

        if (scriptTasksWithScripts.length > 0) {
            html += '<h4>Script Tasks</h4>';
            scriptTasksWithScripts.forEach((task, index) => {
                html += generateElementScriptDisplay(task, `script-task-${index}`, 'Script Task');
            });
        }
    }

    // Filter and display form tasks that have scripts
    if (elements.formTasks && elements.formTasks.length > 0) {
        const formTasksWithScripts = elements.formTasks.filter(task =>
            (task.script && task.script.trim()) ||
            (task.preScript && task.preScript.trim()) ||
            (task.postScript && task.postScript.trim())
        );

        if (formTasksWithScripts.length > 0) {
            html += '<h4>Form Tasks</h4>';
            formTasksWithScripts.forEach((task, index) => {
                html += generateElementScriptDisplay(task, `form-task-${index}`, 'Form Task');
            });
        }
    }

    // Filter and display call activities that have scripts
    if (elements.callActivities && elements.callActivities.length > 0) {
        const callActivitiesWithScripts = elements.callActivities.filter(activity =>
            (activity.script && activity.script.trim()) ||
            (activity.preScript && activity.preScript.trim()) ||
            (activity.postScript && activity.postScript.trim())
        );

        if (callActivitiesWithScripts.length > 0) {
            html += '<h4>Call Activities</h4>';
            callActivitiesWithScripts.forEach((activity, index) => {
                html += generateElementScriptDisplay(activity, `call-activity-${index}`, 'Call Activity');
            });
        }
    }

    // Filter and display exclusive gateways that have scripts
    if (elements.exclusiveGateways && elements.exclusiveGateways.length > 0) {
        const gatewaysWithScripts = elements.exclusiveGateways.filter(gateway =>
            (gateway.script && gateway.script.trim()) ||
            (gateway.preScript && gateway.preScript.trim()) ||
            (gateway.postScript && gateway.postScript.trim())
        );

        if (gatewaysWithScripts.length > 0) {
            html += '<h4>Exclusive Gateways</h4>';
            gatewaysWithScripts.forEach((gateway, index) => {
                html += generateElementScriptDisplay(gateway, `exclusive-gateway-${index}`, 'Exclusive Gateway');
            });
        }
    }

    return html || '<p>No process elements with scripts found</p>';
}

/**
 * Generate expandable script display for process elements
 */
function generateElementScriptDisplay(element, elementId, elementType) {
    const hasScripts = (element.preScript && element.preScript.trim()) ||
        (element.postScript && element.postScript.trim()) ||
        (element.script && element.script.trim());

    if (!hasScripts) {
        // No scripts - show as simple item
        return `
            <div class="object-item">
                <div class="object-name">${element.name || 'Unnamed'}</div>
                <div class="object-meta">ID: ${element.id} | Type: ${elementType}</div>
            </div>
        `;
    }

    // Has scripts - show as expandable
    return `
        <div class="script-detail-section">
            <div class="script-detail-header" onclick="toggleScriptSection('${elementId}')">
                <span class="script-detail-title">⚙️ ${escapeHtml(element.name || 'Unnamed')} (${elementType})</span>
                <span class="script-toggle" id="${elementId}-toggle">▼</span>
            </div>
            <div class="script-detail-content" id="${elementId}">
                <div class="element-info">
                    <p><strong>ID:</strong> ${element.id}</p>
                    <p><strong>Type:</strong> ${elementType}</p>
                    ${element.calledElement ? `<p><strong>Called Element:</strong> ${element.calledElement}</p>` : ''}
                </div>
                ${element.script && element.script.trim() ? `
                    <div class="script-section">
                        <h5>Main Script:</h5>
                        <div class="code-block">${escapeHtml(element.script.replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n'))}</div>
                    </div>
                ` : ''}
                ${element.preScript && element.preScript.trim() ? `
                    <div class="script-section">
                        <h5>Pre Script:</h5>
                        <div class="code-block">${escapeHtml(element.preScript.replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n'))}</div>
                    </div>
                ` : ''}
                ${element.postScript && element.postScript.trim() ? `
                    <div class="script-section">
                        <h5>Post Script:</h5>
                        <div class="code-block">${escapeHtml(element.postScript.replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n'))}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
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
 * Test function to verify toolkit objects are loaded and searchable
 */
function testToolkitSearch() {
    console.log('🧪 Testing toolkit search functionality...');
    console.log(`🔧 Toolkit toggle enabled: ${showToolkitObjects}`);

    let totalToolkitObjects = 0;
    let sampleToolkitObjects = [];

    Object.keys(currentObjects).forEach(objectType => {
        const objectData = currentObjects[objectType];
        if (objectData && objectData.objects) {
            const toolkitObjs = objectData.objects.filter(obj => obj.source === 'toolkit');
            totalToolkitObjects += toolkitObjs.length;

            if (toolkitObjs.length > 0) {
                sampleToolkitObjects.push(...toolkitObjs.slice(0, 2).map(obj => ({
                    name: obj.name,
                    type: objectType,
                    toolkit: obj.toolkitInfo?.shortName || 'Unknown'
                })));
            }
        }
    });

    console.log(`📊 Total toolkit objects found: ${totalToolkitObjects}`);
    console.log(`📋 Sample toolkit objects:`, sampleToolkitObjects);

    if (totalToolkitObjects > 0 && sampleToolkitObjects.length > 0) {
        console.log(`✅ Toolkit objects are loaded and should be searchable when toggle is ON`);

        // Test search with a sample toolkit object name
        const sampleName = sampleToolkitObjects[0].name;
        console.log(`🔍 Testing search with toolkit object name: "${sampleName}"`);

        if (showToolkitObjects) {
            const testResults = performClientSideSearch(sampleName);
            console.log(`📋 Test search results: ${testResults.length} found`);
            return testResults;
        } else {
            console.log(`⚠️ Toolkit toggle is OFF - enable it to search toolkit objects`);
        }
    } else {
        console.log(`❌ No toolkit objects found - check if TWX file contains toolkits`);
    }

    return [];
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
 * Perform deep search
 */
async function performSearch() {
    const searchTerm = document.getElementById('search-input').value.trim();

    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }

    updateStatus('Searching...');

    // Always use client-side search to ensure toolkit objects are included
    try {
        searchResults = performClientSideSearch(searchTerm);
        displaySearchResults(searchTerm);
        updateStatus(`Found ${searchResults.length} results for "${searchTerm}"`);
    } catch (error) {
        console.error('Search error:', error);
        updateStatus('Search failed');
        alert('Search failed: ' + error.message);
    }
}

/**
 * Perform client-side search across all loaded objects
 */
function performClientSideSearch(searchTerm) {
    const results = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    console.log(`🔍 Starting search for: "${searchTerm}"`);
    console.log(`🔧 Toolkit objects enabled: ${showToolkitObjects}`);

    let totalObjects = 0;
    let toolkitObjects = 0;
    let appObjects = 0;
    let searchedObjects = 0;

    // Search through all object types
    Object.keys(currentObjects).forEach(objectType => {
        const objectData = currentObjects[objectType];
        if (!objectData || !objectData.objects) {
            console.log(`⚠️ No objects found for type: ${objectType}`);
            return;
        }

        console.log(`📂 Searching in ${objectType}: ${objectData.objects.length} objects`);

        objectData.objects.forEach(obj => {
            totalObjects++;

            if (obj.source === 'toolkit') {
                toolkitObjects++;
            } else {
                appObjects++;
            }

            // Skip toolkit objects if toolkit toggle is off
            if (!showToolkitObjects && obj.source === 'toolkit') {
                console.log(`⏭️ Skipping toolkit object: ${obj.name} (toggle off)`);
                return;
            }

            searchedObjects++;

            const matches = [];

            // Search in object name
            if (obj.name && obj.name.toLowerCase().includes(lowerSearchTerm)) {
                matches.push({
                    field: 'name',
                    value: obj.name,
                    snippet: obj.name
                });
            }

            // Search in scripts
            if (obj.details?.scripts) {
                obj.details.scripts.forEach(script => {
                    const scriptContent = script.content || script.script || script.scriptBlock || script.scriptContent;
                    if (scriptContent && scriptContent.toLowerCase().includes(lowerSearchTerm)) {
                        matches.push({
                            field: 'script',
                            value: script.name,
                            snippet: createSnippet(scriptContent, searchTerm)
                        });
                    }
                });
            }

            // Search in inline scripts
            if (obj.details?.inlineScripts) {
                obj.details.inlineScripts.forEach(script => {
                    if (script.scriptBlock && script.scriptBlock.toLowerCase().includes(lowerSearchTerm)) {
                        matches.push({
                            field: 'inlineScript',
                            value: script.name,
                            snippet: createSnippet(script.scriptBlock, searchTerm)
                        });
                    }
                });
            }

            // Search in variables
            if (obj.details?.variables) {
                ['input', 'output', 'private'].forEach(varType => {
                    if (obj.details.variables[varType]) {
                        obj.details.variables[varType].forEach(variable => {
                            if (variable.name && variable.name.toLowerCase().includes(lowerSearchTerm)) {
                                matches.push({
                                    field: 'variable',
                                    value: `${varType}: ${variable.name}`,
                                    snippet: variable.name
                                });
                            }
                        });
                    }
                });
            }

            // Search in business object properties
            if (obj.details?.schema?.properties) {
                obj.details.schema.properties.forEach(property => {
                    if (property.name && property.name.toLowerCase().includes(lowerSearchTerm)) {
                        matches.push({
                            field: 'property',
                            value: property.name,
                            snippet: `${property.name} (${property.type})`
                        });
                    }
                });
            }

            // Search in load JS function
            if (obj.details?.loadJsFunction && obj.details.loadJsFunction.toLowerCase().includes(lowerSearchTerm)) {
                matches.push({
                    field: 'loadJsFunction',
                    value: 'Load JS Function',
                    snippet: createSnippet(obj.details.loadJsFunction, searchTerm)
                });
            }

            // If we found matches, add this object to results
            if (matches.length > 0) {
                results.push({
                    objectId: obj.id,
                    objectName: obj.name,
                    objectType: obj.type,
                    typeName: obj.typeName || objectType,
                    source: obj.source || 'application',
                    toolkitInfo: obj.toolkitInfo,
                    matches: matches,
                    matchCount: matches.length,
                    preview: matches[0].snippet
                });
            }
        });
    });

    console.log(`📊 Search completed:`);
    console.log(`  - Total objects scanned: ${totalObjects}`);
    console.log(`  - Objects actually searched: ${searchedObjects}`);
    console.log(`  - Application objects: ${appObjects}`);
    console.log(`  - Toolkit objects: ${toolkitObjects}`);
    console.log(`  - Results found: ${results.length}`);

    // Debug: Show some sample toolkit objects if any exist
    if (toolkitObjects > 0) {
        console.log(`🔧 Sample toolkit objects found:`);
        Object.keys(currentObjects).forEach(objectType => {
            const objectData = currentObjects[objectType];
            if (objectData && objectData.objects) {
                const toolkitSamples = objectData.objects.filter(obj => obj.source === 'toolkit').slice(0, 3);
                if (toolkitSamples.length > 0) {
                    console.log(`  ${objectType}:`, toolkitSamples.map(obj => `${obj.name} (${obj.toolkitInfo?.shortName || 'Unknown'})`));
                }
            }
        });
    }

    // Debug: Show sample results if any found
    if (results.length > 0) {
        console.log(`📋 Sample search results:`);
        results.slice(0, 3).forEach(result => {
            console.log(`  - ${result.objectName} (${result.source}) - ${result.matchCount} matches`);
        });
    }

    return results;
}

/**
 * Create a snippet around the found text
 */
function createSnippet(text, searchTerm) {
    if (!text || !searchTerm) return '';

    const lowerText = text.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerSearchTerm);

    if (index === -1) return text.substring(0, 100) + '...';

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + searchTerm.length + 50);

    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
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
        const rawObjectType = result.objectType || 'Unknown Type';

        // Apply display name transformation for consistency
        let objectType = rawObjectType;

        // Check if this is a CSHS object (process with subType 10)
        if (rawObjectType === 'process' || rawObjectType === 'Process') {
            // Try to find the actual object to check its subType
            const foundObject = findObjectInCurrentData(result.objectId);
            if (foundObject && (foundObject.subType === '10' ||
                (foundObject.details && foundObject.details.processType === '10'))) {
                objectType = 'CSHS';
            } else {
                objectType = 'Services';
            }
        }

        const preview = result.preview || (result.matches && result.matches.length > 0 ? result.matches[0].snippet : 'No preview available');
        const matchCount = result.matchCount || (result.matches ? result.matches.length : 0);

        // Create match count indicator
        const matchIndicator = matchCount > 1 ? ` (${matchCount} matches)` : '';

        // Add source indicator for toolkit objects
        let sourceIndicator = '';
        if (result.source === 'toolkit' && result.toolkitInfo) {
            sourceIndicator = `<span class="search-source-badge toolkit">${result.toolkitInfo.shortName}</span>`;
        } else if (result.source === 'application') {
            sourceIndicator = '<span class="search-source-badge app">APP</span>';
        }

        item.innerHTML = `
            <div class="search-result-header">
                <span class="search-result-title">${escapeHtml(objectName)}${matchIndicator}</span>
                <div class="search-result-badges">
                    ${sourceIndicator}
                    <span class="search-result-type">${escapeHtml(objectType)}</span>
                </div>
            </div>
            <div class="search-result-preview">${highlightSearchTerm(preview, searchTerm)}</div>
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
    // Try to find the actual object in the parsed data
    const objectId = result.objectId;
    let foundObject = null;
    let foundType = null;

    // Search through all object types to find the matching object
    for (const [type, typeData] of Object.entries(currentObjects)) {
        if (typeData && typeData.objects) {
            const object = typeData.objects.find(obj => obj.id === objectId);
            if (object) {
                foundObject = object;
                foundType = type;
                break;
            }
        }
    }

    if (foundObject) {
        // Select the object type first if not already selected
        if (selectedObjectType !== foundType) {
            selectObjectType(foundType);
        }

        // Display the object details
        selectedObject = foundObject;
        displayObjectDetails(foundObject);
        showPanel('object-details-panel');

        // Update panel title
        const title = document.getElementById('object-details-title');
        title.textContent = `📄 ${foundObject.name || 'Unnamed Object'}`;

        updateStatus(`Viewing search result: ${foundObject.name || 'object'} details`);

        // Highlight the object in the list if it's currently displayed
        setTimeout(() => {
            document.querySelectorAll('.object-item').forEach(item => {
                item.classList.remove('selected');
            });
            // Find and highlight the matching object item
            const objectItems = document.querySelectorAll('.object-item');
            objectItems.forEach(item => {
                const itemText = item.textContent;
                if (itemText.includes(foundObject.id) || (foundObject.name && itemText.includes(foundObject.name))) {
                    item.classList.add('selected');
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }, 100);
    } else {
        updateStatus(`Could not find object details for: ${result.objectName}`);
    }
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

    // 🆕 Calculate app/toolkit breakdown
    let appTotal = 0;
    let toolkitTotal = 0;

    Object.values(currentObjects).forEach(data => {
        if (data.objects) {
            appTotal += data.objects.filter(obj => obj.source === 'application').length;
            toolkitTotal += data.objects.filter(obj => obj.source === 'toolkit').length;
        }

        // Use explicit counts from combined files if available
        if (data.applicationCount !== undefined) {
            appTotal += data.applicationCount;
        }
        if (data.toolkitCount !== undefined) {
            toolkitTotal += data.toolkitCount;
        }
    });

    // 🆕 Enhanced object count display
    const objectCountElement = document.getElementById('object-count');
    if (toolkitTotal > 0) {
        objectCountElement.innerHTML = `
            <span class="total-count">${total} objects total</span>
            <span style="margin-left: 10px; font-size: 0.9em;">
                (<span class="app-count" style="display: inline-block; margin-right: 5px;">${appTotal} app</span>
                <span class="toolkit-count" style="display: inline-block;">+${toolkitTotal} toolkit</span>)
            </span>
        `;
    } else {
        objectCountElement.textContent = `${total} objects total`;
    }
}

function getDisplayName(type) {
    const names = {
        'process': 'Services',  // Changed from 'Processes' to 'Services'
        'coach-view': 'Coach Views',
        'cshs': 'CSHS',
        'business-process-definition': 'Business Process Definitions',
        'participant': 'Participants',
        'managed-asset': 'Managed Assets',
        'business-object': 'Business Objects'
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

/**
 * Find an object in the current parsed data by ID
 */
function findObjectInCurrentData(objectId) {
    if (!objectId || !currentObjects) return null;

    for (const [type, typeData] of Object.entries(currentObjects)) {
        if (typeData && typeData.objects) {
            const object = typeData.objects.find(obj => obj.id === objectId);
            if (object) {
                return object;
            }
        }
    }
    return null;
}

/**
 * Generate business object schema summary for list display
 */
function generateBusinessObjectSummary(schema) {
    if (!schema || !schema.properties) {
        return '';
    }

    const totalProperties = schema.properties.length;
    const systemTypes = schema.properties.filter(p => p.isSystemType).length;
    const customTypes = totalProperties - systemTypes;
    const crossReferences = schema.properties.filter(p => p.resolvedType && !p.isSystemType).length;
    const circularRefs = schema.properties.filter(p => p.circularReference).length;

    let indicators = [];
    if (customTypes > 0) {
        indicators.push(`<span class="schema-indicator custom-types" title="Custom Types">${customTypes} custom</span>`);
    }
    if (crossReferences > 0) {
        indicators.push(`<span class="schema-indicator cross-refs" title="Cross References">${crossReferences} refs</span>`);
    }
    if (circularRefs > 0) {
        indicators.push(`<span class="schema-indicator circular-refs" title="Circular References">${circularRefs} circular</span>`);
    }

    return `
        <div class="business-object-summary">
            <div class="schema-stats">
                <span class="property-count">${totalProperties} properties</span>
                ${indicators.join('')}
            </div>
            <div class="schema-namespace" title="Namespace">${schema.namespace || 'No namespace'}</div>
        </div>
    `;
}

/**
 * Generate business object schema display
 */
function generateBusinessObjectSchemaDisplay(schema) {
    if (!schema || !schema.properties) {
        return '<p class="no-data">No schema information available</p>';
    }

    let html = '';

    // Schema summary
    html += `
        <div class="schema-summary">
            <div class="schema-info">
                <span class="schema-stat"><strong>Total Properties:</strong> ${schema.properties.length}</span>
                <span class="schema-stat"><strong>System Types:</strong> ${schema.systemTypesCount || 0}</span>
                <span class="schema-stat"><strong>Custom Types:</strong> ${schema.customTypesCount || 0}</span>
                ${schema.namespace ? `<span class="schema-stat"><strong>Namespace:</strong> ${escapeHtml(schema.namespace)}</span>` : ''}
            </div>
        </div>
    `;

    if (schema.error) {
        html += `<div class="error-message">⚠️ Schema Error: ${escapeHtml(schema.error)}</div>`;
    }

    // Properties list
    if (schema.properties.length > 0) {
        html += '<div class="properties-container">';
        html += '<h4>Properties</h4>';

        schema.properties.forEach((property, index) => {
            html += generatePropertyDisplay(property, 0);
        });

        html += '</div>';
    } else {
        html += '<p class="no-data">No properties defined</p>';
    }

    return html;
}

/**
 * Generate display for a single property with nested resolution
 */
function generatePropertyDisplay(property, depth = 0) {
    const indent = '  '.repeat(depth);
    const typeClass = property.isSystemType ? 'system-type' : 'custom-type';
    const requiredBadge = property.required ? '<span class="required-badge">Required</span>' : '';
    const arrayBadge = property.isArray ? '<span class="array-badge">Array</span>' : '';
    const defaultBadge = property.hasDefault ? '<span class="default-badge">Has Default</span>' : '';
    const circularBadge = property.circularReference ? '<span class="circular-badge">Circular</span>' : '';
    const unresolvedBadge = property.unresolvedReference ? '<span class="unresolved-badge">Unresolved</span>' : '';

    let html = `
        <div class="property-item" style="margin-left: ${depth * 20}px;">
            <div class="property-header">
                <span class="property-name">${escapeHtml(property.name)}</span>
                <span class="property-type ${typeClass}">${escapeHtml(property.type)}</span>
                ${requiredBadge}
                ${arrayBadge}
                ${defaultBadge}
                ${circularBadge}
                ${unresolvedBadge}
            </div>
    `;

    // Add resolved type information if available
    if (property.resolvedType && property.resolvedType.resolved) {
        html += `
            <div class="resolved-type-container">
                <div class="resolved-type-header">
                    <span class="resolved-type-toggle" onclick="toggleResolvedType('${property.name}_${depth}')">
                        ▶ ${escapeHtml(property.resolvedType.name)} (${property.resolvedType.properties.length} properties)
                    </span>
                </div>
                <div class="resolved-type-content" id="resolved_${property.name}_${depth}" style="display: none;">
        `;

        if (property.resolvedType.properties && property.resolvedType.properties.length > 0) {
            property.resolvedType.properties.forEach(nestedProperty => {
                html += generatePropertyDisplay(nestedProperty, depth + 1);
            });
        } else {
            html += '<p class="no-data">No properties in resolved type</p>';
        }

        html += `
                </div>
            </div>
        `;
    } else if (property.circularReference && property.resolvedType) {
        // Show circular reference but with basic type information
        html += `
            <div class="resolved-type-section">
                <div class="resolved-type-header" onclick="toggleResolvedType('${property.name}_${depth}')">
                    <span class="resolved-type-title">
                        ▶ ${escapeHtml(property.resolvedType.name)} <span class="circular-ref-label">(Circular Reference)</span>
                    </span>
                </div>
                <div class="resolved-type-content" id="resolved_${property.name}_${depth}" style="display: none;">
                    <div class="circular-reference-info">
                        <p><strong>Type:</strong> ${escapeHtml(property.resolvedType.name)}</p>
                        <p><strong>Namespace:</strong> ${escapeHtml(property.resolvedType.namespace || 'No namespace')}</p>
                        <p><strong>Object ID:</strong> ${escapeHtml(property.referencedObjectId || 'Unknown')}</p>
                        <p class="circular-note"><em>This type references back to itself or an ancestor type, creating a circular dependency. The full structure is not expanded to prevent infinite recursion.</em></p>
                    </div>
                </div>
            </div>
        `;
    } else if (property.unresolvedReference) {
        html += `
            <div class="unresolved-reference-note">
                <em>Type definition not found in current workspace</em>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

/**
 * Toggle resolved type visibility
 */
function toggleResolvedType(elementId) {
    const element = document.getElementById(`resolved_${elementId}`);
    const toggle = document.querySelector(`[onclick="toggleResolvedType('${elementId}')"]`);

    if (element.style.display === 'none') {
        element.style.display = 'block';
        toggle.textContent = toggle.textContent.replace('▶', '▼');
    } else {
        element.style.display = 'none';
        toggle.textContent = toggle.textContent.replace('▼', '▶');
    }
}

/**
 * Load and display enhanced statistics
 */
async function loadAndDisplayStatistics() {
    try {
        // Try to load the enhanced summary file
        const response = await fetch('./output/twx-summary.json');
        if (response.ok) {
            const summaryData = await response.json();
            displayEnhancedStatistics(summaryData.statistics);
        }
    } catch (error) {
        console.log('Could not load enhanced statistics:', error.message);
    }
}

/**
 * Display enhanced statistics with app/toolkit breakdown
 */
function displayEnhancedStatistics(stats) {
    // Create or update statistics section
    let statsSection = document.getElementById('enhanced-statistics');
    if (!statsSection) {
        statsSection = document.createElement('div');
        statsSection.id = 'enhanced-statistics';
        statsSection.className = 'statistics-section';

        // Insert before the object types section
        const objectTypesSection = document.querySelector('.object-browser');
        if (objectTypesSection) {
            objectTypesSection.parentNode.insertBefore(statsSection, objectTypesSection);
        }
    }

    statsSection.innerHTML = `
        <div class="collapsible-panel">
            <div class="panel-header" onclick="togglePanel('statistics-panel')">
                <span class="panel-title">📊 Object Statistics</span>
                <span class="panel-toggle" id="statistics-toggle">▼</span>
            </div>
            <div class="panel-content" id="statistics-panel">
                <div class="statistics-grid">
                    <div class="stat-card total-objects">
                        <div class="stat-value">${stats.totalObjects || 0}</div>
                        <div class="stat-label">Total Objects</div>
                    </div>
                    <div class="stat-card app-objects">
                        <div class="stat-value">${stats.applicationObjects || 0}</div>
                        <div class="stat-label">Application Objects</div>
                    </div>
                    <div class="stat-card toolkit-objects">
                        <div class="stat-value">${stats.toolkitObjects || 0}</div>
                        <div class="stat-label">Toolkit Objects</div>
                    </div>
                    <div class="stat-card toolkits">
                        <div class="stat-value">${stats.toolkits || 0}</div>
                        <div class="stat-label">Toolkits</div>
                    </div>
                </div>
                <div class="statistics-details">
                    <p><strong>Object Types:</strong> ${stats.objectTypes || 0}</p>
                    <p><strong>Extracted:</strong> ${stats.extractedAt ? new Date(stats.extractedAt).toLocaleString() : 'Unknown'}</p>
                    <p><strong>Source:</strong> ${stats.sourceFile || 'Unknown'}</p>
                </div>
            </div>
        </div>
    `;
}

// ===== AI SCRIPT REVIEW FUNCTIONALITY =====

/**
 * Start AI script analysis
 */
async function startAIAnalysis() {
    if (aiAnalysisInProgress) {
        showNotification('AI analysis is already in progress', 'warning');
        return;
    }

    if (!currentObjects || Object.keys(currentObjects).length === 0) {
        showNotification('No objects loaded for analysis', 'warning');
        return;
    }

    try {
        aiAnalysisInProgress = true;
        aiAnalysisController = new AbortController();
        updateAIAnalysisUI(true);

        // Get selected object type filters
        const selectedTypes = getSelectedObjectTypes();
        const excludeToolkit = document.getElementById('filter-exclude-toolkit')?.checked !== false;

        // Collect all scripts - flatten the nested structure and apply filters
        const allObjects = [];
        Object.values(currentObjects).forEach(objectData => {
            if (objectData && objectData.objects && Array.isArray(objectData.objects)) {
                objectData.objects.forEach(obj => {
                    // Filter by object type
                    if (!selectedTypes.includes(obj.type?.toLowerCase())) {
                        return;
                    }

                    // Filter out toolkit objects if option is selected
                    if (excludeToolkit && obj.source === 'toolkit') {
                        return;
                    }

                    allObjects.push(obj);
                });
            }
        });

        console.log(`Found ${allObjects.length} objects for script analysis (filtered by type and source)`);

        const response = await fetch('/api/ai-collect-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objects: allObjects }),
            signal: aiAnalysisController.signal
        });

        if (!response.ok) {
            throw new Error('Failed to collect scripts');
        }

        const { scripts, statistics } = await response.json();

        if (scripts.length === 0) {
            showNotification('No scripts found for analysis', 'info');
            return;
        }

        // Store scripts globally for reference in results display
        window.collectedScripts = scripts;

        showNotification(`Found ${scripts.length} scripts. Starting AI analysis...`, 'info');

        // Start analysis with progress tracking
        const progressDiv = document.getElementById('ai-analysis-progress');
        if (progressDiv) {
            progressDiv.innerHTML = `
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="ai-progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text" id="ai-progress-text">Initializing analysis...</div>
                </div>
            `;
        }

        // Start analysis with progressive results
        const analysisResponse = await fetch('/api/ai-analyze-scripts-progressive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scripts }),
            signal: aiAnalysisController.signal
        });

        if (!analysisResponse.ok) {
            throw new Error('AI analysis failed');
        }

        // Read the response as a stream for progressive updates
        const reader = analysisResponse.body.getReader();
        const decoder = new TextDecoder();
        aiAnalysisResults = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() && line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));

                            if (data.type === 'batch_complete') {
                                // Add new results to existing results
                                aiAnalysisResults.push(...data.batchResults);

                                // Update display progressively
                                displayAIAnalysisResults(aiAnalysisResults, statistics, {
                                    completed: data.completed,
                                    total: data.totalBatches,
                                    inProgress: true
                                });

                                let progressMessage = `Completed batch ${data.completed} of ${data.totalBatches}`;
                                if (data.error && data.error.includes('Rate limit')) {
                                    progressMessage += ' (rate limit handled)';
                                }

                                updateAnalysisProgress(data.completed, data.totalBatches, progressMessage);

                            } else if (data.type === 'complete') {
                                displayAIAnalysisResults(aiAnalysisResults, statistics, { inProgress: false });
                                showNotification(`AI analysis completed! Found ${getTotalIssues(aiAnalysisResults)} issues across ${scripts.length} scripts`, 'success');
                                break;
                            } else if (data.type === 'error') {
                                // Check if it's a rate limit error and provide helpful message
                                if (data.message.includes('Rate limit') || data.message.includes('429')) {
                                    throw new Error(`Rate limit exceeded. Try reducing batch size in AI settings or wait a few minutes before retrying. Details: ${data.message}`);
                                }
                                throw new Error(data.message);
                            }
                        } catch (parseError) {
                            console.warn('Failed to parse progress data:', parseError);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            showNotification('AI analysis was cancelled by user', 'info');
        } else {
            console.error('AI analysis error:', error);
            showNotification('AI analysis failed: ' + error.message, 'error');
        }
    } finally {
        aiAnalysisInProgress = false;
        aiAnalysisController = null;
        updateAIAnalysisUI(false);
    }
}

/**
 * Stop ongoing AI analysis
 */
function stopAIAnalysis() {
    if (aiAnalysisController) {
        aiAnalysisController.abort();
        showNotification('Stopping AI analysis...', 'info');
    }
}

/**
 * Get selected object types for analysis
 */
function getSelectedObjectTypes() {
    const types = [];

    try {
        const coachviewChecked = document.getElementById('filter-coachview')?.checked;
        const cshsChecked = document.getElementById('filter-cshs')?.checked;
        const serviceChecked = document.getElementById('filter-service')?.checked;

        console.log('Filter checkboxes:', {
            coachview: coachviewChecked,
            cshs: cshsChecked,
            service: serviceChecked
        });

        if (coachviewChecked) {
            types.push('coachview');
        }
        if (cshsChecked) {
            types.push('cshs');
        }
        if (serviceChecked) {
            types.push('service', 'webservice');
        }

        // If no types selected, default to all types
        if (types.length === 0) {
            console.log('No types selected, defaulting to all types');
            types.push('coachview', 'cshs', 'service', 'webservice');
        }

        console.log('Selected types:', types);
    } catch (error) {
        console.warn('Error getting selected object types:', error);
        // Default to all types if there's an error
        types.push('coachview', 'cshs', 'service', 'webservice');
    }

    return types;
}

/**
 * Update script count display based on filters
 */
function updateScriptCountDisplay() {
    try {
        const selectedTypes = getSelectedObjectTypes();
        const excludeToolkit = document.getElementById('filter-exclude-toolkit')?.checked !== false;

        let totalObjects = 0;
        let filteredObjects = 0;

        console.log('Updating script count display:', {
            selectedTypes,
            excludeToolkit,
            currentObjectsKeys: currentObjects ? Object.keys(currentObjects) : 'none'
        });

        if (currentObjects && typeof currentObjects === 'object') {
            Object.values(currentObjects).forEach(objectData => {
                if (objectData && objectData.objects && Array.isArray(objectData.objects)) {
                    totalObjects += objectData.objects.length;

                    objectData.objects.forEach(obj => {
                        const objType = obj.type?.toLowerCase();
                        const isSelectedType = selectedTypes.includes(objType);
                        const isNotToolkit = !excludeToolkit || obj.source !== 'toolkit';

                        console.log(`Object: ${obj.name} (${objType}) - Selected: ${isSelectedType}, NotToolkit: ${isNotToolkit}, Source: ${obj.source}`);

                        // Apply same filters as analysis
                        if (isSelectedType && isNotToolkit) {
                            filteredObjects++;
                        }
                    });
                }
            });
        }

        console.log(`Total objects: ${totalObjects}, Filtered objects: ${filteredObjects}`);

        // Update button text to show filtered count
        const button = document.getElementById('start-ai-analysis-btn');
        if (button && !aiAnalysisInProgress) {
            button.textContent = `🤖 Analyze ${filteredObjects} Objects`;
        }
    } catch (error) {
        console.warn('Error updating script count display:', error);
    }
}

/**
 * Update AI analysis UI state
 */
function updateAIAnalysisUI(inProgress) {
    const button = document.getElementById('start-ai-analysis-btn');
    const stopButton = document.getElementById('stop-ai-analysis-btn');
    const progressDiv = document.getElementById('ai-analysis-progress');

    if (button) {
        button.style.display = inProgress ? 'none' : 'inline-block';
    }

    if (stopButton) {
        stopButton.style.display = inProgress ? 'inline-block' : 'none';
    }

    // Update all AI analyze buttons
    const aiAnalyzeButtons = document.querySelectorAll('.ai-analyze-btn');
    aiAnalyzeButtons.forEach(btn => {
        btn.disabled = inProgress;
        if (inProgress) {
            btn.textContent = '🔄 Analyzing...';
        } else {
            btn.textContent = '🤖 Analyze Scripts with AI';
        }
    });

    if (progressDiv) {
        progressDiv.style.display = inProgress ? 'block' : 'none';
        if (!inProgress) {
            progressDiv.innerHTML = '';
        }
    }
}

/**
 * Update analysis progress
 */
function updateAnalysisProgress(current, total, message) {
    const progressFill = document.getElementById('ai-progress-fill');
    const progressText = document.getElementById('ai-progress-text');

    if (progressFill && progressText) {
        const percentage = Math.round((current / total) * 100);
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${message} (${current}/${total} - ${percentage}%)`;
    }
}

/**
 * Display AI analysis results
 */
function displayAIAnalysisResults(results, statistics, progressInfo = null) {
    const container = document.getElementById('ai-analysis-results');
    if (!container) return;

    const totalIssues = getTotalIssues(results);
    const criticalIssues = getIssuesBySeverity(results, 'critical');
    const warningIssues = getIssuesBySeverity(results, 'warning');
    const infoIssues = getIssuesBySeverity(results, 'info');

    // Show progress info if analysis is in progress
    const progressText = progressInfo && progressInfo.inProgress
        ? `<div class="progress-info">📊 Completed ${progressInfo.completed} of ${progressInfo.total} batches</div>`
        : '';

    const html = `
        <div class="ai-analysis-section">
            <div class="ai-analysis-header">
                <h3>🤖 AI Script Analysis Results</h3>
                ${progressText}
                <div class="ai-analysis-controls">
                    <div class="analysis-stats">
                        <div class="stat-item">
                            <span class="severity-critical">●</span>
                            <span>${criticalIssues} Critical</span>
                        </div>
                        <div class="stat-item">
                            <span class="severity-warning">●</span>
                            <span>${warningIssues} Warnings</span>
                        </div>
                        <div class="stat-item">
                            <span class="severity-info">●</span>
                            <span>${infoIssues} Info</span>
                        </div>
                        <div class="stat-item">
                            <span class="results-count">📋 ${results.length} Scripts Analyzed</span>
                        </div>
                    </div>
                    <div class="analysis-controls">
                        <button onclick="exportAIResults('json')" class="btn-secondary">Export JSON</button>
                        <button onclick="exportAIResults('csv')" class="btn-secondary">Export CSV</button>
                        <button onclick="showAIConfigModal()" class="btn-secondary">⚙️ Settings</button>
                    </div>
                </div>
            </div>

            <!-- Filter Controls -->
            <div class="results-filter-controls">
                <div class="filter-group">
                    <label>Filter by Severity:</label>
                    <select id="severity-filter" onchange="filterAIResults()">
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Filter by Type:</label>
                    <select id="type-filter" onchange="filterAIResults()">
                        <option value="">All Types</option>
                        <option value="syntax">Syntax</option>
                        <option value="performance">Performance</option>
                        <option value="security">Security</option>
                        <option value="best_practice">Best Practice</option>
                        <option value="analysis_error">Analysis Error</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Filter by Object:</label>
                    <input type="text" id="object-filter" placeholder="Object name..." onkeyup="filterAIResults()">
                </div>
                <div class="filter-group">
                    <label>Filter by Score:</label>
                    <select id="score-filter" onchange="filterAIResults()">
                        <option value="">All Scores</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="F">F</option>
                        <option value="N/A">N/A</option>
                    </select>
                </div>
                <div class="filter-group">
                    <button onclick="clearAIFilters()" class="btn-secondary">Clear Filters</button>
                </div>
            </div>

            <div class="analysis-table-container">
                ${generateAIAnalysisTable(results)}
            </div>
        </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';

    // Show the AI analysis panel
    const aiPanel = document.getElementById('ai-analysis-panel');
    if (aiPanel) {
        aiPanel.style.display = 'block';
    }
}

/**
 * Generate AI analysis results table
 */
function generateAIAnalysisTable(results) {
    if (!results || results.length === 0) {
        return '<p>No analysis results to display</p>';
    }

    let tableHTML = `
        <table class="analysis-table">
            <thead>
                <tr>
                    <th>Object</th>
                    <th>Script</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Severity</th>
                    <th>Issue</th>
                    <th>Line</th>
                    <th>Code</th>
                    <th>Suggestion</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach(result => {
        const scriptInfo = getScriptInfoById(result.script_id);

        if (result.issues && result.issues.length > 0) {
            result.issues.forEach((issue, index) => {
                tableHTML += `
                    <tr>
                        ${index === 0 ? `
                            <td rowspan="${result.issues.length}">${escapeHtml(scriptInfo?.source_object || 'Unknown')}</td>
                            <td rowspan="${result.issues.length}">${escapeHtml(scriptInfo?.name || result.script_id)}</td>
                            <td rowspan="${result.issues.length}">${escapeHtml(scriptInfo?.source_type || 'Unknown')}</td>
                            <td rowspan="${result.issues.length}">
                                <span class="overall-score score-${result.overall_score}">${result.overall_score}</span>
                            </td>
                        ` : ''}
                        <td><span class="issue-severity ${issue.severity}">${issue.severity}</span></td>
                        <td class="issue-description">${escapeHtml(issue.description)}</td>
                        <td>${issue.line_number || '-'}</td>
                        <td class="code-line">${getCodeLineFromScript(scriptInfo, issue.line_number)}</td>
                        <td class="issue-suggestion">${escapeHtml(issue.suggestion || '-')}</td>
                    </tr>
                `;
            });
        } else {
            tableHTML += `
                <tr>
                    <td>${escapeHtml(scriptInfo?.source_object || 'Unknown')}</td>
                    <td>${escapeHtml(scriptInfo?.name || result.script_id)}</td>
                    <td>${escapeHtml(scriptInfo?.source_type || 'Unknown')}</td>
                    <td><span class="overall-score score-${result.overall_score}">${result.overall_score}</span></td>
                    <td><span class="issue-severity info">No Issues</span></td>
                    <td class="issue-description">No issues found</td>
                    <td>-</td>
                    <td class="code-line">-</td>
                    <td class="issue-suggestion">-</td>
                </tr>
            `;
        }
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    return tableHTML;
}

/**
 * Get script info by ID (from last collection)
 */
function getScriptInfoById(scriptId) {
    // This would be populated during script collection
    // For now, extract info from the script ID pattern
    return {
        source_object: 'Unknown',
        name: scriptId,
        source_type: 'Unknown'
    };
}

/**
 * Get total issues count
 */
function getTotalIssues(results) {
    return results.reduce((total, result) => {
        return total + (result.issues ? result.issues.length : 0);
    }, 0);
}

/**
 * Get issues count by severity
 */
function getIssuesBySeverity(results, severity) {
    return results.reduce((count, result) => {
        if (result.issues) {
            return count + result.issues.filter(issue => issue.severity === severity).length;
        }
        return count;
    }, 0);
}

/**
 * Export AI analysis results
 */
async function exportAIResults(format) {
    if (!aiAnalysisResults || aiAnalysisResults.length === 0) {
        showNotification('No analysis results to export', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/ai-export-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: aiAnalysisResults, format })
        });

        if (response.ok) {
            const result = await response.json();
            showNotification(`Results exported to ${result.filename}`, 'success');
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        showNotification('Export failed: ' + error.message, 'error');
    }
}

// ===== AI RESULTS FILTERING =====

/**
 * Filter AI analysis results based on current filter settings
 */
function filterAIResults() {
    const severityFilter = document.getElementById('severity-filter')?.value || '';
    const typeFilter = document.getElementById('type-filter')?.value || '';
    const objectFilter = document.getElementById('object-filter')?.value.toLowerCase() || '';
    const scoreFilter = document.getElementById('score-filter')?.value || '';

    const table = document.querySelector('.analysis-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        let shouldShow = true;

        // Get row data
        const severityCell = row.querySelector('.issue-severity');
        const typeCell = row.cells[5]; // Issue column
        const objectCell = row.cells[0]; // Object column
        const scoreCell = row.querySelector('.overall-score');

        // Apply severity filter
        if (severityFilter && severityCell) {
            const severity = severityCell.textContent.trim().toLowerCase();
            if (severity !== severityFilter) {
                shouldShow = false;
            }
        }

        // Apply type filter
        if (typeFilter && typeCell) {
            const issueText = typeCell.textContent.toLowerCase();
            if (!issueText.includes(typeFilter)) {
                shouldShow = false;
            }
        }

        // Apply object filter
        if (objectFilter && objectCell) {
            const objectText = objectCell.textContent.toLowerCase();
            if (!objectText.includes(objectFilter)) {
                shouldShow = false;
            }
        }

        // Apply score filter
        if (scoreFilter && scoreCell) {
            const score = scoreCell.textContent.trim();
            if (score !== scoreFilter) {
                shouldShow = false;
            }
        }

        // Show/hide row
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
    });

    // Update visible count
    updateFilteredResultsCount(visibleCount, rows.length);
}

/**
 * Clear all AI result filters
 */
function clearAIFilters() {
    document.getElementById('severity-filter').value = '';
    document.getElementById('type-filter').value = '';
    document.getElementById('object-filter').value = '';
    document.getElementById('score-filter').value = '';

    filterAIResults();
}

/**
 * Update the count of filtered results
 */
function updateFilteredResultsCount(visible, total) {
    const countElement = document.querySelector('.results-count');
    if (countElement) {
        if (visible === total) {
            countElement.innerHTML = `📋 ${total} Scripts Analyzed`;
        } else {
            countElement.innerHTML = `📋 ${visible} of ${total} Scripts (filtered)`;
        }
    }
}

/**
 * Get script information by ID from the collected scripts
 */
function getScriptInfoById(scriptId) {
    // Try to find in the global collected scripts array
    if (window.collectedScripts && Array.isArray(window.collectedScripts)) {
        return window.collectedScripts.find(script => script.id === scriptId);
    }

    // Fallback: try to extract from the script ID if it contains object info
    return {
        source_object: 'Unknown',
        name: scriptId,
        source_type: 'Unknown'
    };
}

/**
 * Get a specific line of code from a script
 */
function getCodeLineFromScript(scriptInfo, lineNumber) {
    if (!scriptInfo || !scriptInfo.content || !lineNumber) {
        return '-';
    }

    try {
        const lines = scriptInfo.content.split('\n');
        const lineIndex = parseInt(lineNumber) - 1; // Convert to 0-based index

        if (lineIndex >= 0 && lineIndex < lines.length) {
            const line = lines[lineIndex].trim();
            // Truncate long lines and escape HTML
            if (line.length > 80) {
                return escapeHtml(line.substring(0, 77) + '...');
            }
            return escapeHtml(line) || '(empty line)';
        }
    } catch (error) {
        console.warn('Error getting code line:', error);
    }

    return '-';
}

// ===== AI PROMPT EDITOR =====

/**
 * Show the AI prompt editor modal
 */
async function showPromptEditor() {
    const modal = document.getElementById('prompt-editor-modal');
    const textarea = document.getElementById('prompt-textarea');

    if (!modal || !textarea) {
        showNotification('Prompt editor not available', 'error');
        return;
    }

    try {
        // Load current prompt template
        const response = await fetch('/api/ai-get-prompt-template');
        if (response.ok) {
            const { template } = await response.json();
            textarea.value = template;
        } else {
            // Load default template if none exists
            textarea.value = getDefaultPromptTemplate();
        }

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading prompt template:', error);
        textarea.value = getDefaultPromptTemplate();
        modal.style.display = 'block';
    }
}

/**
 * Close the prompt editor modal
 */
function closePromptEditor() {
    const modal = document.getElementById('prompt-editor-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Save the prompt template
 */
async function savePromptTemplate() {
    const textarea = document.getElementById('prompt-textarea');
    if (!textarea) {
        showNotification('Prompt editor not available', 'error');
        return;
    }

    const template = textarea.value.trim();
    if (!template) {
        showNotification('Prompt template cannot be empty', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/ai-save-prompt-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template })
        });

        if (response.ok) {
            showNotification('Prompt template saved successfully', 'success');
            closePromptEditor();
        } else {
            throw new Error('Failed to save prompt template');
        }
    } catch (error) {
        console.error('Error saving prompt template:', error);
        showNotification('Failed to save prompt template: ' + error.message, 'error');
    }
}

/**
 * Reset prompt to default template
 */
function resetPromptToDefault() {
    const textarea = document.getElementById('prompt-textarea');
    if (textarea) {
        textarea.value = getDefaultPromptTemplate();
        showNotification('Prompt reset to default template', 'info');
    }
}

/**
 * Get the default prompt template
 */
function getDefaultPromptTemplate() {
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

// ===== STATIC ANALYSIS FUNCTIONALITY =====

let staticAnalysisInProgress = false;
let staticAnalysisController = null;
let staticAnalysisResults = [];

/**
 * Start static code analysis
 */
async function startStaticAnalysis() {
    if (staticAnalysisInProgress) {
        showNotification('Static analysis is already in progress', 'warning');
        return;
    }

    // Debug: Check current objects state
    console.log('🔍 Debug: Static Analysis - Current Objects State:', {
        currentObjects: currentObjects,
        objectKeys: currentObjects ? Object.keys(currentObjects) : 'null',
        objectCount: currentObjects ? Object.keys(currentObjects).length : 0
    });

    if (!currentObjects || Object.keys(currentObjects).length === 0) {
        console.error('❌ No objects loaded for static analysis');
        showNotification('No objects loaded for analysis. Please load a TWX file first.', 'warning');
        return;
    }

    try {
        staticAnalysisInProgress = true;
        staticAnalysisController = new AbortController();
        updateStaticAnalysisUI(true);

        // Get selected object type filters
        const selectedTypes = getStaticSelectedObjectTypes();
        const excludeToolkit = document.getElementById('static-exclude-toolkit')?.checked !== false;

        // Collect all scripts - flatten the nested structure and apply filters
        const allObjects = [];
        console.log('🔍 Debug: Starting object collection with filters:', {
            selectedTypes,
            excludeToolkit,
            currentObjectsKeys: Object.keys(currentObjects)
        });

        Object.values(currentObjects).forEach((objectData, index) => {
            console.log(`🔍 Debug: Processing object data ${index}:`, {
                hasObjects: !!(objectData && objectData.objects),
                objectCount: objectData && objectData.objects ? objectData.objects.length : 0,
                isArray: Array.isArray(objectData.objects)
            });

            if (objectData && objectData.objects && Array.isArray(objectData.objects)) {
                objectData.objects.forEach((obj, objIndex) => {
                    // Filter by object type with special handling for CSHS
                    let isSelectedType = false;

                    if (selectedTypes.includes('cshs') && obj.type === 'process' &&
                        (obj.details && obj.details.processType === '10')) {
                        // This is a CSHS object (process with processType 10)
                        isSelectedType = true;
                        console.log(`🔍 Debug: Found CSHS object: ${obj.name} (type: ${obj.type}, processType: ${obj.details.processType})`);
                    } else if (selectedTypes.includes('process') && obj.type === 'process' &&
                               (!obj.details || obj.details.processType !== '10')) {
                        // This is a regular service (process but not CSHS)
                        isSelectedType = true;
                        console.log(`🔍 Debug: Found service object: ${obj.name} (type: ${obj.type}, processType: ${obj.details?.processType || 'undefined'})`);
                    } else if (selectedTypes.includes(obj.type)) {
                        // Regular type matching (coachView, etc.)
                        isSelectedType = true;
                        console.log(`🔍 Debug: Found matching object: ${obj.name} (type: ${obj.type})`);
                    }

                    if (!isSelectedType) {
                        if (objIndex < 3) { // Only log first few for debugging
                            console.log(`🔍 Debug: Skipping object ${obj.name} - type ${obj.type} not in selected types:`, selectedTypes);
                        }
                        return;
                    }

                    // Filter out toolkit objects if option is selected
                    if (excludeToolkit && obj.source === 'toolkit') {
                        console.log(`🔍 Debug: Skipping toolkit object: ${obj.name}`);
                        return;
                    }

                    console.log(`✅ Debug: Adding object to collection: ${obj.name} (type: ${obj.type}, source: ${obj.source})`);
                    allObjects.push(obj);
                });
            }
        });

        console.log(`🔍 Debug: Collected ${allObjects.length} objects for static analysis`);

        console.log(`Found ${allObjects.length} objects for static analysis (filtered by type and source)`);

        const response = await fetch('/api/static-collect-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objects: allObjects }),
            signal: staticAnalysisController.signal
        });

        if (!response.ok) {
            throw new Error('Failed to collect scripts');
        }

        const responseData = await response.json();
        const { scripts, statistics } = responseData;

        if (!scripts || !Array.isArray(scripts)) {
            throw new Error('Invalid response: scripts data is missing or invalid');
        }

        if (scripts.length === 0) {
            showNotification('No scripts found for analysis', 'info');
            return;
        }

        // Store scripts globally for reference in results display
        window.staticCollectedScripts = scripts;

        showNotification(`Found ${scripts.length} scripts. Starting static analysis...`, 'info');

        // Start analysis with progress tracking
        const progressDiv = document.getElementById('static-analysis-progress');
        if (progressDiv) {
            progressDiv.style.display = 'block';
            progressDiv.innerHTML = `
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="static-progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text" id="static-progress-text">Initializing static analysis...</div>
                </div>
            `;
        }

        // Start static analysis
        const analysisResponse = await fetch('/api/static-analyze-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scripts }),
            signal: staticAnalysisController.signal
        });

        if (!analysisResponse.ok) {
            throw new Error(`Static analysis failed: ${analysisResponse.status} ${analysisResponse.statusText}`);
        }

        const analysisResult = await analysisResponse.json();

        if (!analysisResult || typeof analysisResult !== 'object') {
            throw new Error('Invalid analysis response: expected object');
        }

        staticAnalysisResults = analysisResult.results || [];

        // Display results
        displayStaticAnalysisResults(analysisResult);

        // Show completion notification with statistics if available
        if (analysisResult.statistics && typeof analysisResult.statistics === 'object') {
            const totalIssues = analysisResult.statistics.totalIssues || 0;
            const scriptsWithIssues = analysisResult.statistics.scriptsWithIssues || 0;
            showNotification(`Static analysis completed! Found ${totalIssues} issues in ${scriptsWithIssues} scripts.`, 'success');
        } else {
            showNotification('Static analysis completed!', 'success');
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            showNotification('Static analysis was cancelled', 'info');
        } else {
            console.error('Static analysis error:', error);
            showNotification(`Static analysis failed: ${error.message}`, 'error');
        }
    } finally {
        staticAnalysisInProgress = false;
        staticAnalysisController = null;
        updateStaticAnalysisUI(false);
    }
}

/**
 * Stop static analysis
 */
function stopStaticAnalysis() {
    if (staticAnalysisController) {
        staticAnalysisController.abort();
        showNotification('Stopping static analysis...', 'info');
    }
}

/**
 * Clear static analysis results
 */
function clearStaticResults() {
    staticAnalysisResults = [];
    const resultsSection = document.getElementById('static-analysis-results');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }

    const progressSection = document.getElementById('static-analysis-progress');
    if (progressSection) {
        progressSection.style.display = 'none';
    }

    showNotification('Static analysis results cleared', 'info');
}

/**
 * Update static analysis UI state
 */
function updateStaticAnalysisUI(inProgress) {
    const startBtn = document.getElementById('start-static-analysis-btn');
    const stopBtn = document.getElementById('stop-static-analysis-btn');

    if (startBtn) {
        startBtn.style.display = inProgress ? 'none' : 'inline-block';
    }

    if (stopBtn) {
        stopBtn.style.display = inProgress ? 'inline-block' : 'none';
    }

    // Update object count
    if (!inProgress) {
        updateStaticScriptCountDisplay();
    }
}

/**
 * Get selected object types for static analysis
 */
function getStaticSelectedObjectTypes() {
    const types = [];

    try {
        if (document.getElementById('static-filter-coachview')?.checked) {
            types.push('coachView'); // Coach View type name
        }
        if (document.getElementById('static-filter-cshs')?.checked) {
            types.push('cshs'); // Special handling for CSHS (process with processType 10)
        }
        if (document.getElementById('static-filter-service')?.checked) {
            types.push('process'); // Process type name (includes both services and CSHS)
        }

        // If no types selected, default to all types
        if (types.length === 0) {
            types.push('coachView', 'cshs', 'process');
        }
    } catch (error) {
        console.warn('Error getting selected object types:', error);
        types.push('coachView', 'cshs', 'process');
    }

    return types;
}

/**
 * Update static script count display based on filters
 */
function updateStaticScriptCountDisplay() {
    try {
        const selectedTypes = getStaticSelectedObjectTypes();
        const excludeToolkit = document.getElementById('static-exclude-toolkit')?.checked !== false;

        let filteredObjects = 0;

        if (currentObjects && typeof currentObjects === 'object') {
            Object.values(currentObjects).forEach(objectData => {
                if (objectData && objectData.objects && Array.isArray(objectData.objects)) {
                    objectData.objects.forEach(obj => {
                        // Check if object matches selected types with special handling for CSHS
                        let isSelectedType = false;

                        if (selectedTypes.includes('cshs') && obj.type === 'process' &&
                            (obj.details && obj.details.processType === '10')) {
                            // This is a CSHS object (process with processType 10)
                            isSelectedType = true;
                        } else if (selectedTypes.includes('process') && obj.type === 'process' &&
                                   (!obj.details || obj.details.processType !== '10')) {
                            // This is a regular service (process but not CSHS)
                            isSelectedType = true;
                        } else if (selectedTypes.includes(obj.type)) {
                            // Regular type matching (coachView, etc.)
                            isSelectedType = true;
                        }

                        const isNotToolkit = !excludeToolkit || obj.source !== 'toolkit';

                        if (isSelectedType && isNotToolkit) {
                            filteredObjects++;
                        }
                    });
                }
            });
        }

        // Update button text to show filtered count
        const button = document.getElementById('start-static-analysis-btn');
        if (button && !staticAnalysisInProgress) {
            button.textContent = `🔍 Start Static Analysis - ${filteredObjects} Objects`;
        }

        // Update object count display in configuration section
        const countText = document.getElementById('static-object-count-text');
        if (countText) {
            countText.textContent = `Selected: ${filteredObjects} objects`;
        }
    } catch (error) {
        console.warn('Error updating static script count display:', error);
    }
}

/**
 * Display static analysis results
 */
function displayStaticAnalysisResults(analysisResult) {
    const resultsSection = document.getElementById('static-analysis-results');
    const progressSection = document.getElementById('static-analysis-progress');

    if (progressSection) {
        progressSection.style.display = 'none';
    }

    if (!resultsSection) {
        console.error('Static results section not found');
        return;
    }

    // Show results section
    resultsSection.style.display = 'block';

    // Update summary
    const summaryDiv = document.getElementById('static-results-summary');
    if (summaryDiv && analysisResult.statistics) {
        const stats = analysisResult.statistics;
        summaryDiv.innerHTML = `
            <strong>${stats.totalScripts}</strong> scripts analyzed,
            <strong>${stats.scriptsWithIssues}</strong> with issues,
            <strong>${stats.totalIssues}</strong> total issues found
            <br>
            <span class="severity-error">Errors: ${stats.issuesBySeverity.error}</span>
            <span class="severity-warning">Warnings: ${stats.issuesBySeverity.warning}</span>
            <span class="severity-info">Info: ${stats.issuesBySeverity.info}</span>
        `;
    }

    // Generate and display results table
    generateStaticAnalysisTable(analysisResult.results || []);
}

/**
 * Generate static analysis results table
 */
function generateStaticAnalysisTable(results) {
    const tbody = document.getElementById('static-results-tbody');
    if (!tbody) {
        console.error('Static results table body not found');
        return;
    }

    tbody.innerHTML = '';

    let totalIssues = 0;
    const categories = new Set();
    const seenIssues = new Set(); // Track unique issues to prevent duplicates

    results.forEach(scriptResult => {
        if (!scriptResult.issues || scriptResult.issues.length === 0) {
            return; // Skip scripts with no issues
        }

        scriptResult.issues.forEach(issue => {
            // Create a unique key for deduplication using description as well for better uniqueness
            const issueKey = `${scriptResult.scriptId || scriptResult.scriptName}-${issue.line}-${issue.column || 0}-${issue.rule}-${issue.description}`;

            // Skip if we've already seen this exact issue
            if (seenIssues.has(issueKey)) {
                console.log('Skipping duplicate issue:', issueKey);
                return;
            }
            seenIssues.add(issueKey);

            totalIssues++;
            categories.add(issue.category || 'general');

            const row = document.createElement('tr');

            // Use formatted HTML code context if available, otherwise fallback to plain text
            let codeDisplay = issue.code || '-';
            let codeHtml = '';

            if (issue.codeContextHtml) {
                // Use the formatted HTML from the backend
                codeHtml = issue.codeContextHtml;
                codeDisplay = issue.code || '-'; // Keep simple text for title
            } else if (issue.codeContext && Array.isArray(issue.codeContext)) {
                // Fallback to plain text context
                codeDisplay = issue.codeContext.join('\n');
                codeHtml = `<div class="code-context-simple">${escapeHtml(codeDisplay)}</div>`;
            } else if (issue.code && issue.code.length > 50) {
                // If code is long, format it better
                codeDisplay = issue.code;
                codeHtml = `<div class="code-context-simple">${escapeHtml(codeDisplay)}</div>`;
            } else {
                codeHtml = `<div class="code-context-simple">${escapeHtml(codeDisplay)}</div>`;
            }

            // Create hierarchical classification display
            const categoryDisplay = (issue.category || 'general').replace('_', ' ').toUpperCase();
            const hierarchicalHtml = `
                <div class="hierarchical-classification">
                    <div class="classification-level-1">
                        <span class="severity-${issue.severity}">${issue.severity.toUpperCase()}</span>
                    </div>
                    <div class="classification-level-2">
                        <span class="category-badge category-${issue.category || 'general'}">${categoryDisplay}</span>
                    </div>
                    <div class="classification-level-3">
                        <code class="rule-code">${escapeHtml(issue.rule)}</code>
                    </div>
                </div>
            `;

            const rowId = `static-row-${totalIssues}`;
            row.id = rowId;
            row.innerHTML = `
                <td title="${escapeHtml(scriptResult.scriptName)}">${escapeHtml(truncateText(scriptResult.scriptName, 25))}</td>
                <td title="${escapeHtml(scriptResult.objectName)}">${escapeHtml(truncateText(scriptResult.objectName, 20))}</td>
                <td class="hierarchical-cell">${hierarchicalHtml}</td>
                <td title="${escapeHtml(issue.description)}">${escapeHtml(truncateText(issue.description, 60))}</td>
                <td>${issue.line || '-'}</td>
                <td><div class="static-code-context">${codeHtml}</div></td>
                <td class="actions-column">
                    <button class="action-btn done" onclick="removeStaticResultRow('${rowId}', 'done')" title="Mark as resolved">DONE</button>
                </td>
            `;

            tbody.appendChild(row);
        });
    });

    // Update category filter options
    updateCategoryFilterOptions(Array.from(categories));

    // Update results count
    updateStaticFilteredResultsCount(totalIssues, totalIssues);

    // Add click handlers for code expansion
    addCodeExpansionHandlers();

    // Initialize resizable columns
    setTimeout(() => initializeResizableColumns(), 100);
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Update category filter options
 */
function updateCategoryFilterOptions(categories) {
    const categoryFilter = document.getElementById('static-filter-category');
    if (!categoryFilter) return;

    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="">All Categories</option>';

    // Add category options
    categories.sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.replace('_', ' ').toUpperCase();
        categoryFilter.appendChild(option);
    });
}

/**
 * Add code expansion handlers
 */
function addCodeExpansionHandlers() {
    // Handle both old and new class names for compatibility
    document.querySelectorAll('.static-code-context, .static-code-line').forEach(codeDiv => {
        // Remove any existing click handlers
        const newCodeDiv = codeDiv.cloneNode(true);
        codeDiv.parentNode.replaceChild(newCodeDiv, codeDiv);

        newCodeDiv.addEventListener('click', function(e) {
            e.stopPropagation();

            // Toggle expanded state
            if (this.classList.contains('expanded')) {
                this.classList.remove('expanded');
                this.title = 'Click to expand';
            } else {
                this.classList.add('expanded');
                this.title = 'Click to collapse';
            }
        });

        // Set initial title
        newCodeDiv.title = 'Click to expand';
    });
}

/**
 * Clear all static analysis filters
 */
function clearStaticFilters() {
    document.getElementById('static-filter-severity').value = '';
    document.getElementById('static-filter-category').value = '';
    document.getElementById('static-filter-object').value = '';
    filterStaticResults();
}

/**
 * Initialize resizable columns for static analysis table
 */
function initializeResizableColumns() {
    const table = document.getElementById('static-results-table');
    if (!table) return;

    const headers = table.querySelectorAll('th');
    let isResizing = false;
    let currentColumn = null;
    let startX = 0;
    let startWidth = 0;

    headers.forEach((header, index) => {
        // Skip the last column (actions) from being resizable
        if (index === headers.length - 1) return;

        header.addEventListener('mousedown', (e) => {
            const rect = header.getBoundingClientRect();
            const isRightEdge = e.clientX > rect.right - 8;

            if (isRightEdge) {
                isResizing = true;
                currentColumn = header;
                startX = e.clientX;
                startWidth = header.offsetWidth;

                document.body.style.cursor = 'col-resize';
                e.preventDefault();
            }
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing || !currentColumn) return;

        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px

        currentColumn.style.width = newWidth + 'px';
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentColumn = null;
            document.body.style.cursor = 'default';
        }
    });

    // Change cursor on hover over resize area
    headers.forEach(header => {
        header.addEventListener('mousemove', (e) => {
            if (isResizing) return;

            const rect = header.getBoundingClientRect();
            const isRightEdge = e.clientX > rect.right - 8;

            header.style.cursor = isRightEdge ? 'col-resize' : 'default';
        });

        header.addEventListener('mouseleave', () => {
            if (!isResizing) {
                header.style.cursor = 'default';
            }
        });
    });
}

/**
 * Remove a static analysis result row
 */
function removeStaticResultRow(rowId, action) {
    const row = document.getElementById(rowId);
    if (!row) {
        console.warn(`Row with ID ${rowId} not found`);
        return;
    }

    // Add fade-out animation
    row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    row.style.opacity = '0';
    row.style.transform = 'translateX(-20px)';

    // Remove the row after animation
    setTimeout(() => {
        row.remove();

        // Update the results count
        const tbody = document.getElementById('static-results-tbody');
        if (tbody) {
            const remainingRows = tbody.querySelectorAll('tr').length;
            updateStaticFilteredResultsCount(remainingRows, remainingRows);
        }

        // Show notification
        const actionText = 'marked as resolved';
        showNotification(`Issue ${actionText}`, 'success');

        // Log the action for potential undo functionality
        console.log(`Static analysis issue ${actionText}:`, {
            rowId,
            action,
            timestamp: new Date().toISOString()
        });
    }, 300);
}

/**
 * Sort static analysis table
 */
function sortStaticTable(columnIndex) {
    const table = document.getElementById('static-results-table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const header = table.querySelectorAll('th')[columnIndex];
    const indicator = header.querySelector('.sort-indicator');

    // Clear other sort indicators
    table.querySelectorAll('.sort-indicator').forEach(ind => {
        if (ind !== indicator) {
            ind.classList.remove('asc', 'desc');
        }
    });

    // Determine sort direction
    let ascending = true;
    if (indicator.classList.contains('asc')) {
        ascending = false;
        indicator.classList.remove('asc');
        indicator.classList.add('desc');
    } else {
        indicator.classList.remove('desc');
        indicator.classList.add('asc');
    }

    // Sort rows
    rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();

        // Handle numeric columns (line numbers) - now at index 4
        if (columnIndex === 4) { // Line column
            const aNum = parseInt(aText) || 0;
            const bNum = parseInt(bText) || 0;
            return ascending ? aNum - bNum : bNum - aNum;
        }

        // Handle text columns
        const result = aText.localeCompare(bText);
        return ascending ? result : -result;
    });

    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
}

/**
 * Filter static analysis results
 */
function filterStaticResults() {
    const severityFilter = document.getElementById('static-filter-severity')?.value || '';
    const categoryFilter = document.getElementById('static-filter-category')?.value || '';
    const objectFilter = document.getElementById('static-filter-object')?.value.toLowerCase() || '';

    const tbody = document.getElementById('static-results-tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    let visibleCount = 0;
    const totalCount = rows.length;

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return; // Updated for new column count

        const scriptName = cells[0].textContent.toLowerCase();
        const objectName = cells[1].textContent.toLowerCase();
        const hierarchicalCell = cells[2].textContent.toLowerCase(); // Contains severity, category, and rule

        let visible = true;

        // Apply filters
        if (severityFilter && !hierarchicalCell.includes(severityFilter)) {
            visible = false;
        }

        if (categoryFilter && !hierarchicalCell.includes(categoryFilter.replace('_', ' '))) {
            visible = false;
        }

        if (objectFilter && !objectName.includes(objectFilter) && !scriptName.includes(objectFilter)) {
            visible = false;
        }

        row.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
    });

    updateStaticFilteredResultsCount(visibleCount, totalCount);
}

/**
 * Clear static analysis filters
 */
function clearStaticFilters() {
    document.getElementById('static-filter-severity').value = '';
    document.getElementById('static-filter-category').value = '';
    document.getElementById('static-filter-object').value = '';

    filterStaticResults();
    showNotification('Static analysis filters cleared', 'info');
}

/**
 * Update the count of filtered static results
 */
function updateStaticFilteredResultsCount(visible, total) {
    const countElement = document.getElementById('static-results-count');
    if (countElement) {
        if (visible === total) {
            countElement.innerHTML = `📋 ${total} Issues Found`;
        } else {
            countElement.innerHTML = `📋 ${visible} of ${total} Issues (filtered)`;
        }
    }
}

/**
 * Export static analysis results
 */
function exportStaticResults() {
    if (!staticAnalysisResults || staticAnalysisResults.length === 0) {
        showNotification('No static analysis results to export', 'warning');
        return;
    }

    try {
        // Prepare export data
        const exportData = {
            timestamp: new Date().toISOString(),
            analysisType: 'Static Code Analysis',
            totalScripts: staticAnalysisResults.length,
            results: staticAnalysisResults.map(result => ({
                scriptName: result.scriptName,
                objectName: result.objectName,
                objectType: result.objectType,
                issues: result.issues,
                metrics: result.metrics
            }))
        };

        // Create and download JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `static-analysis-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification('Static analysis results exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export results: ' + error.message, 'error');
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ===== AI CONFIGURATION FUNCTIONS =====

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
                            <option value="gemini">Google Gemini</option>
                            <option value="groq">Groq</option>
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
                            <input type="number" id="batch-size" min="1" max="10" value="3">
                            <small>Number of scripts per API request. Use 1-2 for Groq to avoid rate limits, 3-5 for other providers.</small>
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

        case 'gemini':
            settingsHTML = `
                <div class="setting-group">
                    <label>API Key:</label>
                    <input type="password" id="gemini-api-key" placeholder="AIza...">
                    <small>Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></small>
                </div>
                <div class="setting-group">
                    <label>Model:</label>
                    <select id="gemini-model">
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-pro">Gemini Pro</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Max Tokens:</label>
                    <input type="number" id="gemini-max-tokens" value="4000" min="100" max="8000">
                </div>
                <div class="setting-group">
                    <label>Temperature:</label>
                    <input type="number" id="gemini-temperature" value="0.1" min="0" max="1" step="0.1">
                </div>
            `;
            break;

        case 'groq':
            settingsHTML = `
                <div class="rate-limit-warning">
                    <strong>⚠️ Rate Limit Notice:</strong> Groq has strict rate limits (6000 tokens/minute for free tier).
                    Use smaller batch sizes and lower max tokens to avoid rate limit errors.
                </div>
                <div class="setting-group">
                    <label>API Key:</label>
                    <input type="password" id="groq-api-key" placeholder="gsk_...">
                    <small>Get your API key from <a href="https://console.groq.com/keys" target="_blank">Groq Console</a></small>
                </div>
                <div class="setting-group">
                    <label>Model:</label>
                    <select id="groq-model">
                        <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Recommended)</option>
                        <option value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile</option>
                        <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Faster, more rate limits)</option>
                        <option value="llama3-70b-8192">Llama 3 70B</option>
                        <option value="llama3-8b-8192">Llama 3 8B</option>
                        <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                        <option value="gemma-7b-it">Gemma 7B</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Max Tokens:</label>
                    <input type="number" id="groq-max-tokens" value="2000" min="100" max="8000">
                    <small>Lower values reduce rate limit issues (recommended: 2000 or less)</small>
                </div>
                <div class="setting-group">
                    <label>Temperature:</label>
                    <input type="number" id="groq-temperature" value="0.1" min="0" max="2" step="0.1">
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
            case 'gemini':
                if (document.getElementById('gemini-api-key')) {
                    document.getElementById('gemini-api-key').value = providerConfig.apiKey || '';
                    document.getElementById('gemini-model').value = providerConfig.model || 'gemini-1.5-pro';
                    document.getElementById('gemini-max-tokens').value = providerConfig.maxTokens || 4000;
                    document.getElementById('gemini-temperature').value = providerConfig.temperature || 0.1;
                }
                break;
            case 'groq':
                if (document.getElementById('groq-api-key')) {
                    document.getElementById('groq-api-key').value = providerConfig.apiKey || '';
                    document.getElementById('groq-model').value = providerConfig.model || 'llama-3.3-70b-versatile';
                    document.getElementById('groq-max-tokens').value = providerConfig.maxTokens || 2000;
                    document.getElementById('groq-temperature').value = providerConfig.temperature || 0.1;
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
        case 'gemini':
            config.providers.gemini = {
                name: 'Google Gemini',
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                apiKey: document.getElementById('gemini-api-key').value,
                model: document.getElementById('gemini-model').value,
                maxTokens: parseInt(document.getElementById('gemini-max-tokens').value),
                temperature: parseFloat(document.getElementById('gemini-temperature').value)
            };
            break;
        case 'groq':
            config.providers.groq = {
                name: 'Groq',
                endpoint: 'https://api.groq.com/openai/v1/chat/completions',
                apiKey: document.getElementById('groq-api-key').value,
                model: document.getElementById('groq-model').value,
                maxTokens: parseInt(document.getElementById('groq-max-tokens').value),
                temperature: parseFloat(document.getElementById('groq-temperature').value)
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
 * Analyze scripts for a specific object
 */
async function analyzeObjectScripts(objectId) {
    if (aiAnalysisInProgress) {
        showNotification('AI analysis is already in progress', 'warning');
        return;
    }

    // Find the object - flatten the nested structure
    let targetObject = null;
    Object.values(currentObjects).forEach(objectData => {
        if (objectData && objectData.objects && Array.isArray(objectData.objects)) {
            const found = objectData.objects.find(obj => obj.id === objectId);
            if (found) {
                targetObject = found;
            }
        }
    });

    if (!targetObject) {
        showNotification('Object not found', 'error');
        return;
    }

    if (!targetObject.details?.scripts || targetObject.details.scripts.length === 0) {
        showNotification('No scripts found in this object', 'info');
        return;
    }

    try {
        aiAnalysisInProgress = true;
        aiAnalysisController = new AbortController();
        updateAIAnalysisUI(true);

        // Check if this object should be analyzed based on current filters
        const selectedTypes = getSelectedObjectTypes();
        const excludeToolkit = document.getElementById('filter-exclude-toolkit')?.checked !== false;

        if (!selectedTypes.includes(targetObject.type?.toLowerCase())) {
            showNotification(`${targetObject.type} objects are currently filtered out. Enable in AI settings.`, 'warning');
            return;
        }

        if (excludeToolkit && targetObject.source === 'toolkit') {
            showNotification('Toolkit objects are currently excluded from analysis. Disable "Exclude Toolkit Scripts" to analyze.', 'warning');
            return;
        }

        // Collect scripts from this object only
        const response = await fetch('/api/ai-collect-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objects: [targetObject] }),
            signal: aiAnalysisController.signal
        });

        if (!response.ok) {
            throw new Error('Failed to collect scripts');
        }

        const { scripts, statistics } = await response.json();

        if (scripts.length === 0) {
            showNotification('No scripts found for analysis', 'info');
            return;
        }

        showNotification(`Analyzing ${scripts.length} scripts from ${targetObject.name}...`, 'info');

        // Start analysis
        const analysisResponse = await fetch('/api/ai-analyze-scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scripts }),
            signal: aiAnalysisController.signal
        });

        if (!analysisResponse.ok) {
            throw new Error('AI analysis failed');
        }

        const analysisResults = await analysisResponse.json();
        const results = analysisResults.analysis_results || [];

        // Show results in the AI analysis panel
        displayAIAnalysisResults(results, statistics);

        // Show the AI analysis panel
        const aiPanel = document.getElementById('ai-analysis-panel');
        if (aiPanel) {
            aiPanel.style.display = 'block';
            // Scroll to the panel
            aiPanel.scrollIntoView({ behavior: 'smooth' });
        }

        showNotification(`AI analysis completed for ${targetObject.name}! Found ${getTotalIssues(results)} issues`, 'success');

    } catch (error) {
        if (error.name === 'AbortError') {
            showNotification('AI analysis was cancelled by user', 'info');
        } else {
            console.error('Object AI analysis error:', error);
            showNotification('AI analysis failed: ' + error.message, 'error');
        }
    } finally {
        aiAnalysisInProgress = false;
        aiAnalysisController = null;
        updateAIAnalysisUI(false);
    }
}
















