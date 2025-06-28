// CSHS (Client-Side Human Service) Inline Details Component
class CSHSDetailsInline {
    constructor() {
        this.expandedCSHS = new Set();
        this.expandedSections = new Map(); // Map of CSHS ID to Set of expanded sections
        this.expandedElements = new Map(); // Map of CSHS ID to Set of expanded elements
    }

    /**
     * Toggle CSHS details display inline
     * @param {Object} cshs - CSHS object
     * @param {HTMLElement} listItem - The list item element to expand under
     */
    async toggleCSHSDetails(cshs, listItem) {
        const cshsId = cshs.id;
        const existingDetails = listItem.querySelector('.cshs-inline-details');
        
        if (existingDetails) {
            // Hide existing details
            existingDetails.remove();
            this.expandedCSHS.delete(cshsId);
            return;
        }

        try {
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'cshs-inline-details';
            loadingDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">Loading CSHS details...</div>';
            listItem.appendChild(loadingDiv);

            // Load CSHS details
            let details = cshs.details;
            if (!details) {
                details = await this.loadCSHSDetails(cshsId);
            }

            // Remove loading indicator
            loadingDiv.remove();

            // Create and show details
            const detailsElement = this.createCSHSDetailsElement(cshs, details);
            listItem.appendChild(detailsElement);
            this.expandedCSHS.add(cshsId);

        } catch (error) {
            console.error('Error loading CSHS details:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'cshs-inline-details';
            errorDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #dc3545;">Error loading CSHS details. Please try again.</div>';
            listItem.appendChild(errorDiv);
        }
    }

    /**
     * Load CSHS details from objects-cshs.json
     * @param {string} cshsId - CSHS object ID
     * @returns {Object} CSHS details
     */
    async loadCSHSDetails(cshsId) {
        try {
            // First try to get from objects-cshs.json
            const response = await fetch('./output/objects-cshs.json');
            if (!response.ok) {
                throw new Error(`Failed to load CSHS objects: ${response.status}`);
            }
            const data = await response.json();
            
            // Find the CSHS object by ID
            const cshsObject = data.objects.find(obj => obj.id === cshsId);
            
            if (cshsObject && cshsObject.details) {
                return cshsObject.details;
            }
            
            // If not found, return empty structure
            return { 
                variables: { input: [], output: [], private: [] }, 
                elements: { formTasks: [], callActivities: [], exclusiveGateways: [], scriptTasks: [] } 
            };
        } catch (error) {
            console.error('Error loading CSHS details:', error);
            return { 
                variables: { input: [], output: [], private: [] }, 
                elements: { formTasks: [], callActivities: [], exclusiveGateways: [], scriptTasks: [] } 
            };
        }
    }

    /**
     * Create the CSHS details element
     * @param {Object} cshs - CSHS object
     * @param {Object} details - CSHS details
     * @returns {HTMLElement} Details element
     */
    createCSHSDetailsElement(cshs, details) {
        const container = document.createElement('div');
        container.className = 'cshs-inline-details';

        // Initialize expanded sections for this CSHS if not exists
        if (!this.expandedSections.has(cshs.id)) {
            this.expandedSections.set(cshs.id, new Set());
        }
        if (!this.expandedElements.has(cshs.id)) {
            this.expandedElements.set(cshs.id, new Set());
        }

        container.innerHTML = `
            ${this.createBasicInfoSection(cshs)}
            ${this.createVariablesSection(cshs.id, details.variables)}
            ${this.createElementsSection(cshs.id, details.elements)}
        `;

        // Setup event listeners for collapsible sections
        this.setupCollapsibleListeners(container, cshs.id);

        return container;
    }

    /**
     * Create basic information section
     */
    createBasicInfoSection(cshs) {
        return `
            <div class="collapsible-section expanded">
                <div class="collapsible-header">
                    <div class="collapsible-title">
                        ⚙️ Basic Information
                    </div>
                    <span class="collapsible-toggle">▶</span>
                </div>
                <div class="collapsible-content">
                    <div class="info-item"><strong>Name:</strong> ${this.escapeHtml(cshs.name)}</div>
                    <div class="info-item"><strong>ID:</strong> ${this.escapeHtml(cshs.id)}</div>
                    <div class="info-item"><strong>Type:</strong> Client-Side Human Service</div>
                </div>
            </div>
        `;
    }

    /**
     * Create variables section
     */
    createVariablesSection(cshsId, variables) {
        const inputVars = this.createVariableList(variables.input, 'Input');
        const outputVars = this.createVariableList(variables.output, 'Output');
        const privateVars = this.createVariableList(variables.private, 'Private');

        return `
            <div class="collapsible-section" data-section="variables">
                <div class="collapsible-header">
                    <div class="collapsible-title">
                        📊 Variables
                    </div>
                    <span class="collapsible-toggle">▶</span>
                </div>
                <div class="collapsible-content">
                    <div class="collapsible-section" data-section="input-vars">
                        <div class="collapsible-header">
                            <div class="collapsible-title">Input Variables (${variables.input.length})</div>
                            <span class="collapsible-toggle">▶</span>
                        </div>
                        <div class="collapsible-content">${inputVars}</div>
                    </div>
                    <div class="collapsible-section" data-section="output-vars">
                        <div class="collapsible-header">
                            <div class="collapsible-title">Output Variables (${variables.output.length})</div>
                            <span class="collapsible-toggle">▶</span>
                        </div>
                        <div class="collapsible-content">${outputVars}</div>
                    </div>
                    <div class="collapsible-section" data-section="private-vars">
                        <div class="collapsible-header">
                            <div class="collapsible-title">Private Variables (${variables.private.length})</div>
                            <span class="collapsible-toggle">▶</span>
                        </div>
                        <div class="collapsible-content">${privateVars}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create variable list HTML
     */
    createVariableList(variables, type) {
        if (!variables || variables.length === 0) {
            return `<div class="no-items">No ${type.toLowerCase()} variables found</div>`;
        }

        return variables.map(variable => `
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
    }

    /**
     * Create elements section
     */
    createElementsSection(cshsId, elements) {
        return `
            <div class="collapsible-section" data-section="elements">
                <div class="collapsible-header">
                    <div class="collapsible-title">
                        🔧 Elements
                    </div>
                    <span class="collapsible-toggle">▶</span>
                </div>
                <div class="collapsible-content">
                    ${this.createElementGroup(cshsId, 'Form Tasks', elements.formTasks, 'formTasks')}
                    ${this.createElementGroup(cshsId, 'Call Activities', elements.callActivities, 'callActivities')}
                    ${this.createElementGroup(cshsId, 'Exclusive Gateways', elements.exclusiveGateways, 'exclusiveGateways')}
                    ${this.createElementGroup(cshsId, 'Script Tasks', elements.scriptTasks, 'scriptTasks')}
                </div>
            </div>
        `;
    }

    /**
     * Create element group with expandable elements
     */
    createElementGroup(cshsId, title, elements, groupType) {
        if (!elements || elements.length === 0) {
            return `
                <div class="collapsible-section" data-section="${groupType}">
                    <div class="collapsible-header">
                        <div class="collapsible-title">${title} (0)</div>
                        <span class="collapsible-toggle">▶</span>
                    </div>
                    <div class="collapsible-content">
                        <div class="no-items">No ${title.toLowerCase()} found</div>
                    </div>
                </div>
            `;
        }

        const elementItems = elements.map((element, index) => {
            const elementId = `${groupType}-${index}`;
            const hasScripts = this.elementHasScripts(element, groupType);
            
            return `
                <div class="expandable-element" data-element="${elementId}">
                    <div class="element-header">
                        ${this.getScriptIndicators(element, groupType)}
                        <span class="element-name">${this.escapeHtml(element.name)}</span>
                        ${hasScripts ? '<span class="element-toggle">▶</span>' : ''}
                    </div>
                    ${hasScripts ? `
                        <div class="element-content">
                            ${this.getElementScripts(element, groupType)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="collapsible-section" data-section="${groupType}">
                <div class="collapsible-header">
                    <div class="collapsible-title">${title} (${elements.length})</div>
                    <span class="collapsible-toggle">▶</span>
                </div>
                <div class="collapsible-content">
                    ${elementItems}
                </div>
            </div>
        `;
    }

    /**
     * Check if element has scripts
     */
    elementHasScripts(element, groupType) {
        if (groupType === 'scriptTasks' && element.script) return true;
        if (element.hasPreScript && element.preScript) return true;
        if (element.hasPostScript && element.postScript) return true;
        return false;
    }

    /**
     * Get script indicators for an element
     */
    getScriptIndicators(element, groupType) {
        let indicators = '';
        
        if (groupType === 'scriptTasks' && element.script) {
            indicators += '<span class="script-indicator main-script" title="Script Task">●</span>';
        }
        if (element.hasPreScript) {
            indicators += '<span class="script-indicator pre-script" title="Has Pre-Assignment Script">●</span>';
        }
        if (element.hasPostScript) {
            indicators += '<span class="script-indicator post-script" title="Has Post-Assignment Script">●</span>';
        }
        
        return indicators;
    }

    /**
     * Get element scripts HTML
     */
    getElementScripts(element, groupType) {
        let scripts = '';
        
        if (groupType === 'scriptTasks' && element.script) {
            const codeBlock = ScriptHighlighter.createCodeBlock(element.script, 'Script');
            scripts += codeBlock.outerHTML;
        }
        
        if (element.hasPreScript && element.preScript) {
            const codeBlock = ScriptHighlighter.createCodeBlock(element.preScript, 'Pre-Assignment Script');
            scripts += codeBlock.outerHTML;
        }
        
        if (element.hasPostScript && element.postScript) {
            const codeBlock = ScriptHighlighter.createCodeBlock(element.postScript, 'Post-Assignment Script');
            scripts += codeBlock.outerHTML;
        }
        
        return scripts;
    }

    /**
     * Setup event listeners for collapsible sections and expandable elements
     */
    setupCollapsibleListeners(container, cshsId) {
        // Collapsible sections
        const collapsibleHeaders = container.querySelectorAll('.collapsible-section > .collapsible-header');
        collapsibleHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const section = header.parentElement;
                const sectionName = section.dataset.section;
                
                section.classList.toggle('expanded');
                
                // Track expanded state
                const expandedSections = this.expandedSections.get(cshsId);
                if (section.classList.contains('expanded')) {
                    expandedSections.add(sectionName);
                } else {
                    expandedSections.delete(sectionName);
                }
            });
        });

        // Expandable elements
        const elementHeaders = container.querySelectorAll('.expandable-element .element-header');
        elementHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const element = header.parentElement;
                const elementId = element.dataset.element;
                
                if (element.querySelector('.element-content')) {
                    element.classList.toggle('expanded');
                    
                    // Track expanded state
                    const expandedElements = this.expandedElements.get(cshsId);
                    if (element.classList.contains('expanded')) {
                        expandedElements.add(elementId);
                    } else {
                        expandedElements.delete(elementId);
                    }
                }
            });
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSHSDetailsInline;
}
