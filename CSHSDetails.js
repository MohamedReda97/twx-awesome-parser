// CSHS (Client-Side Human Service) Details Modal Component
class CSHSDetails {
    constructor() {
        this.modal = null;
        this.createModal();
    }

    createModal() {
        // Create modal HTML structure
        const modalHTML = `
            <div id="cshs-modal" class="modal" style="display: none;">
                <div class="modal-content cshs-modal-content">
                    <div class="modal-header">
                        <h2 id="cshs-modal-title">CSHS Details</h2>
                        <span class="close" id="cshs-modal-close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="cshs-info">
                            <div class="cshs-basic-info">
                                <h3>Basic Information</h3>
                                <div id="cshs-basic-details"></div>
                            </div>
                            
                            <div class="cshs-variables">
                                <h3>Variables</h3>
                                <div class="variables-section">
                                    <div class="variable-group">
                                        <h4>Input Variables</h4>
                                        <div id="cshs-input-variables" class="variable-list"></div>
                                    </div>
                                    <div class="variable-group">
                                        <h4>Output Variables</h4>
                                        <div id="cshs-output-variables" class="variable-list"></div>
                                    </div>
                                    <div class="variable-group">
                                        <h4>Private Variables</h4>
                                        <div id="cshs-private-variables" class="variable-list"></div>
                                    </div>
                                </div>
                            </div>

                            <div class="cshs-elements">
                                <h3>Elements</h3>
                                <div class="elements-section">
                                    <div class="element-group">
                                        <h4>Form Tasks</h4>
                                        <div id="cshs-form-tasks" class="element-list"></div>
                                    </div>
                                    <div class="element-group">
                                        <h4>Call Activities</h4>
                                        <div id="cshs-call-activities" class="element-list"></div>
                                    </div>
                                    <div class="element-group">
                                        <h4>Exclusive Gateways</h4>
                                        <div id="cshs-exclusive-gateways" class="element-list"></div>
                                    </div>
                                    <div class="element-group">
                                        <h4>Script Tasks</h4>
                                        <div id="cshs-script-tasks" class="element-list"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('cshs-modal');

        // Add event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const closeBtn = document.getElementById('cshs-modal-close');
        const modal = this.modal;

        // Close modal when clicking X
        closeBtn.addEventListener('click', () => {
            this.hide();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.hide();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                this.hide();
            }
        });
    }

    /**
     * Show CSHS details modal
     * @param {Object} cshs - CSHS object with details
     */
    async show(cshs) {
        try {
            // Set modal title
            document.getElementById('cshs-modal-title').textContent = `CSHS: ${cshs.name}`;

            // Load CSHS details if not already loaded
            let details = cshs.details;
            if (!details) {
                details = await this.loadCSHSDetails(cshs.id);
            }

            // Populate basic information
            this.populateBasicInfo(cshs, details);

            // Populate variables
            this.populateVariables(details.variables);

            // Populate elements
            this.populateElements(details.elements);

            // Show modal
            this.modal.style.display = 'block';
        } catch (error) {
            console.error('Error showing CSHS details:', error);
            alert('Error loading CSHS details. Please try again.');
        }
    }

    /**
     * Hide the modal
     */
    hide() {
        this.modal.style.display = 'none';
    }

    /**
     * Load CSHS details from individual object file
     * @param {string} cshsId - CSHS object ID
     * @returns {Object} CSHS details
     */
    async loadCSHSDetails(cshsId) {
        try {
            const response = await fetch(`./output/objects/${cshsId}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load CSHS details: ${response.status}`);
            }
            const data = await response.json();
            return data.details || { variables: { input: [], output: [], private: [] }, elements: { formTasks: [], callActivities: [], exclusiveGateways: [], scriptTasks: [] } };
        } catch (error) {
            console.error('Error loading CSHS details:', error);
            return { variables: { input: [], output: [], private: [] }, elements: { formTasks: [], callActivities: [], exclusiveGateways: [], scriptTasks: [] } };
        }
    }

    /**
     * Populate basic information section
     */
    populateBasicInfo(cshs, details) {
        const basicDetails = document.getElementById('cshs-basic-details');
        basicDetails.innerHTML = `
            <div class="info-item">
                <strong>Name:</strong> ${this.escapeHtml(cshs.name)}
            </div>
            <div class="info-item">
                <strong>ID:</strong> ${this.escapeHtml(cshs.id)}
            </div>
            <div class="info-item">
                <strong>Type:</strong> Client-Side Human Service
            </div>
        `;
    }

    /**
     * Populate variables section
     */
    populateVariables(variables) {
        this.populateVariableGroup('cshs-input-variables', variables.input, 'Input');
        this.populateVariableGroup('cshs-output-variables', variables.output, 'Output');
        this.populateVariableGroup('cshs-private-variables', variables.private, 'Private');
    }

    /**
     * Populate a specific variable group
     */
    populateVariableGroup(containerId, variables, type) {
        const container = document.getElementById(containerId);
        
        if (!variables || variables.length === 0) {
            container.innerHTML = `<div class="no-items">No ${type.toLowerCase()} variables found</div>`;
            return;
        }

        const variableItems = variables.map(variable => `
            <div class="variable-item">
                <div class="variable-name">${this.escapeHtml(variable.name)}</div>
                <div class="variable-default">
                    <label>
                        <input type="checkbox" ${variable.hasDefault ? 'checked' : ''} disabled>
                        Has Default
                    </label>
                </div>
            </div>
        `).join('');

        container.innerHTML = variableItems;
    }

    /**
     * Populate elements section
     */
    populateElements(elements) {
        this.populateElementGroup('cshs-form-tasks', elements.formTasks, 'Form Task');
        this.populateElementGroup('cshs-call-activities', elements.callActivities, 'Call Activity');
        this.populateElementGroup('cshs-exclusive-gateways', elements.exclusiveGateways, 'Exclusive Gateway');
        this.populateElementGroup('cshs-script-tasks', elements.scriptTasks, 'Script Task', true);
    }

    /**
     * Populate a specific element group
     */
    populateElementGroup(containerId, elements, type, showScript = false) {
        const container = document.getElementById(containerId);
        
        if (!elements || elements.length === 0) {
            container.innerHTML = `<div class="no-items">No ${type.toLowerCase()}s found</div>`;
            return;
        }

        const elementItems = elements.map(element => {
            const indicators = this.getScriptIndicators(element);
            const scriptContent = showScript && element.script ? 
                `<div class="script-content">
                    <strong>Script:</strong>
                    <pre><code class="javascript">${this.escapeHtml(element.script.replace(/&#xD;/g, '\n'))}</code></pre>
                </div>` : '';

            return `
                <div class="element-item">
                    <div class="element-header">
                        ${indicators}
                        <span class="element-name">${this.escapeHtml(element.name)}</span>
                    </div>
                    ${scriptContent}
                    ${this.getScriptDetails(element)}
                </div>
            `;
        }).join('');

        container.innerHTML = elementItems;

        // Apply syntax highlighting to code blocks
        this.applySyntaxHighlighting(container);
    }

    /**
     * Get script indicators (circles) for an element
     */
    getScriptIndicators(element) {
        let indicators = '';
        if (element.hasPreScript) {
            indicators += '<span class="script-indicator pre-script" title="Has Pre-Assignment Script">●</span>';
        }
        if (element.hasPostScript) {
            indicators += '<span class="script-indicator post-script" title="Has Post-Assignment Script">●</span>';
        }
        return indicators;
    }

    /**
     * Get script details for an element
     */
    getScriptDetails(element) {
        let details = '';
        
        if (element.hasPreScript && element.preScript) {
            details += `
                <div class="script-detail">
                    <strong>Pre-Assignment Script:</strong>
                    <pre><code class="javascript">${this.escapeHtml(element.preScript.replace(/&#xD;/g, '\n'))}</code></pre>
                </div>
            `;
        }
        
        if (element.hasPostScript && element.postScript) {
            details += `
                <div class="script-detail">
                    <strong>Post-Assignment Script:</strong>
                    <pre><code class="javascript">${this.escapeHtml(element.postScript.replace(/&#xD;/g, '\n'))}</code></pre>
                </div>
            `;
        }
        
        return details;
    }

    /**
     * Apply basic JavaScript syntax highlighting
     */
    applySyntaxHighlighting(container) {
        const codeBlocks = container.querySelectorAll('code.javascript');
        codeBlocks.forEach(block => {
            let code = block.textContent;

            // Basic JavaScript syntax highlighting
            code = code
                // Keywords
                .replace(/\b(var|let|const|function|if|else|for|while|do|switch|case|break|continue|return|try|catch|finally|throw|new|this|typeof|instanceof|in|of|true|false|null|undefined)\b/g, '<span style="color: #569cd6;">$1</span>')
                // Strings
                .replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span style="color: #ce9178;">$1$2$1</span>')
                // Comments
                .replace(/\/\/.*$/gm, '<span style="color: #6a9955;">$&</span>')
                .replace(/\/\*[\s\S]*?\*\//g, '<span style="color: #6a9955;">$&</span>')
                // Numbers
                .replace(/\b\d+\.?\d*\b/g, '<span style="color: #b5cea8;">$&</span>')
                // Functions and methods
                .replace(/\b(\w+)(?=\s*\()/g, '<span style="color: #dcdcaa;">$1</span>')
                // Properties
                .replace(/\.(\w+)/g, '.<span style="color: #9cdcfe;">$1</span>');

            block.innerHTML = code;
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
