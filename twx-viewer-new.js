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

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', function () {
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

    if (elements.scriptTasks && elements.scriptTasks.length > 0) {
        html += '<h4>Script Tasks</h4>';
        elements.scriptTasks.forEach((task, index) => {
            html += generateElementScriptDisplay(task, `script-task-${index}`, 'Script Task');
        });
    }

    if (elements.formTasks && elements.formTasks.length > 0) {
        html += '<h4>Form Tasks</h4>';
        elements.formTasks.forEach((task, index) => {
            html += generateElementScriptDisplay(task, `form-task-${index}`, 'Form Task');
        });
    }

    if (elements.callActivities && elements.callActivities.length > 0) {
        html += '<h4>Call Activities</h4>';
        elements.callActivities.forEach((activity, index) => {
            html += generateElementScriptDisplay(activity, `call-activity-${index}`, 'Call Activity');
        });
    }

    return html || '<p>No process elements found</p>';
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
















