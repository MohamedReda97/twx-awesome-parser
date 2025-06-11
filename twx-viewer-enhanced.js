// Enhanced TWX Viewer JavaScript
class EnhancedTWXViewer {
    constructor() {
        this.data = null;
        this.filteredData = null;
        this.searchTerm = '';
        this.selectedTypes = new Set();
        this.showDetails = true;
        this.showIds = false;
        this.collapsedGroups = new Set();
        this.coachViewModal = null;
        this.cshsModal = null;
        this.init();
    }

    async init() {
        try {
            // Initialize Coach View modal
            this.coachViewModal = new CoachViewDetails();

            // Initialize CSHS modal
            this.cshsModal = new CSHSDetails();

            await this.loadData();
            this.setupEventListeners();
            this.renderProjectInfo();
            this.renderStats();
            this.renderTypeFilters();
            this.renderArtifacts();
            this.hideLoading();
        } catch (error) {
            this.showError(error);
        }
    }

    async loadData() {
        try {
            console.log('Attempting to load TWX data...');

            // Try to load the new summary format first
            let response = await fetch('./output/twx-summary.json');
            if (!response.ok) {
                console.log('New format not found, trying fallback...');
                // Fallback to old format
                response = await fetch('./parsing-results.json');
                if (!response.ok) {
                    throw new Error(`Failed to load data files. Status: ${response.status}. Make sure you have parsed a TWX file first.`);
                }
                // Convert old format to new format
                const oldData = await response.json();
                this.data = this.convertOldFormat(oldData);
                console.log('Loaded and converted legacy data');
            } else {
                this.data = await response.json();
                console.log('Loaded new format data successfully');
            }

            // Validate data structure
            if (!this.data || !this.data.objectsByType) {
                throw new Error('Invalid data structure: missing objectsByType');
            }

            // Separate CSHS objects from Process objects
            await this.separateCSHSObjects();

            // Initialize all types as selected
            this.data.objectsByType.forEach(typeGroup => {
                this.selectedTypes.add(typeGroup.typeName);
            });

            console.log(`Loaded ${this.data.statistics.totalObjects} objects across ${this.data.statistics.objectTypes} types`);
        } catch (error) {
            console.error('Error loading data:', error);
            throw new Error(`Failed to load parsing results: ${error.message}`);
        }
    }

    /**
     * Separate CSHS objects from Process objects and create a new CSHS group
     * This is now handled at the parsing level, so this method is simplified
     */
    async separateCSHSObjects() {
        // CSHS separation is now handled at the parsing level in the JSON generation
        // This method is kept for backward compatibility but does nothing
        // The groupByType function in type-mappings.js now handles CSHS separation
        console.log('CSHS separation is handled at parsing level');
    }

    convertOldFormat(oldData) {
        // Convert old parsing-results.json format to new format
        const groupedObjects = {};
        
        if (oldData.objects) {
            oldData.objects.forEach(obj => {
                const typeName = this.getTypeNameFromCode(obj.type) || 'Unknown';
                if (!groupedObjects[typeName]) {
                    groupedObjects[typeName] = [];
                }
                groupedObjects[typeName].push({
                    id: obj.objectId || obj.id,
                    name: obj.name,
                    versionId: obj.objectVersionId || obj.versionId,
                    hasDetails: !!obj.subtype
                });
            });
        }

        return {
            metadata: {
                project: {
                    name: 'Legacy Project',
                    shortName: 'LEGACY'
                }
            },
            statistics: {
                totalObjects: oldData.objects ? oldData.objects.length : 0,
                objectTypes: Object.keys(groupedObjects).length,
                toolkits: 0,
                extractedAt: new Date().toISOString(),
                sourceFile: 'legacy-data'
            },
            objectsByType: Object.keys(groupedObjects).map(typeName => ({
                typeName,
                count: groupedObjects[typeName].length,
                objects: groupedObjects[typeName]
            })).sort((a, b) => b.count - a.count),
            toolkits: []
        };
    }

    getTypeNameFromCode(typeCode) {
        const typeMappings = {
            '1': 'Human Service',
            '12': 'Business Object',
            '25': 'Service',
            '64': 'Coach View',
            'process': 'Process',
            'bpd': 'Business Process Definition',
            'twClass': 'Business Object',
            'epv': 'Environment Property Variable',
            'coachView': 'Coach View'
        };
        return typeMappings[typeCode] || typeCode;
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // View options
        const showDetailsCheckbox = document.getElementById('show-details');
        const showIdsCheckbox = document.getElementById('show-ids');
        
        if (showDetailsCheckbox) {
            showDetailsCheckbox.addEventListener('change', (e) => {
                this.showDetails = e.target.checked;
                this.renderArtifacts();
            });
        }

        if (showIdsCheckbox) {
            showIdsCheckbox.addEventListener('change', (e) => {
                this.showIds = e.target.checked;
                this.renderArtifacts();
            });
        }

        // Filter buttons
        const selectAllBtn = document.getElementById('select-all-types');
        const clearAllBtn = document.getElementById('clear-all-types');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.data.objectsByType.forEach(typeGroup => {
                    this.selectedTypes.add(typeGroup.typeName);
                });
                this.updateTypeCheckboxes();
                this.applyFilters();
            });
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.selectedTypes.clear();
                this.updateTypeCheckboxes();
                this.applyFilters();
            });
        }
    }

    renderProjectInfo() {
        const projectInfoElement = document.getElementById('project-name');
        if (projectInfoElement && this.data.metadata) {
            const project = this.data.metadata.project;
            const info = `${project.name} (${project.shortName})`;
            projectInfoElement.textContent = info;
        }
    }

    renderStats() {
        const stats = this.data.statistics;
        
        document.getElementById('total-artifacts').textContent = stats.totalObjects;
        document.getElementById('total-types').textContent = stats.objectTypes;
        document.getElementById('total-toolkits').textContent = stats.toolkits;
        
        const parseDate = stats.extractedAt ? 
            new Date(stats.extractedAt).toLocaleDateString() : 'Unknown';
        document.getElementById('parse-date').textContent = parseDate;
    }

    renderTypeFilters() {
        const typeFiltersContainer = document.getElementById('type-filters');
        typeFiltersContainer.innerHTML = '';

        this.data.objectsByType.forEach(typeGroup => {
            const filterDiv = document.createElement('div');
            filterDiv.className = 'type-checkbox';
            
            const isChecked = this.selectedTypes.has(typeGroup.typeName);
            
            filterDiv.innerHTML = `
                <input type="checkbox" id="type-${typeGroup.typeName}" ${isChecked ? 'checked' : ''}>
                <label for="type-${typeGroup.typeName}">${typeGroup.typeName}</label>
                <span class="type-badge">${typeGroup.count}</span>
            `;

            const checkbox = filterDiv.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedTypes.add(typeGroup.typeName);
                } else {
                    this.selectedTypes.delete(typeGroup.typeName);
                }
                this.applyFilters();
            });

            typeFiltersContainer.appendChild(filterDiv);
        });
    }

    updateTypeCheckboxes() {
        this.data.objectsByType.forEach(typeGroup => {
            const checkbox = document.getElementById(`type-${typeGroup.typeName}`);
            if (checkbox) {
                checkbox.checked = this.selectedTypes.has(typeGroup.typeName);
            }
        });
    }

    applyFilters() {
        const filteredTypes = this.data.objectsByType.filter(typeGroup => {
            if (!this.selectedTypes.has(typeGroup.typeName)) return false;

            const filteredObjects = typeGroup.objects.filter(obj => {
                const name = (obj.name || '').toLowerCase();
                return name.includes(this.searchTerm);
            });

            typeGroup.filteredObjects = filteredObjects;
            return filteredObjects.length > 0;
        });

        this.filteredData = { ...this.data, objectsByType: filteredTypes };
        this.renderArtifacts();
    }

    renderArtifacts() {
        const container = document.getElementById('artifacts-container');
        const objectsByType = this.filteredData ? this.filteredData.objectsByType : this.data.objectsByType;
        
        container.innerHTML = '';

        if (objectsByType.length === 0) {
            this.showNoResults();
            return;
        }

        this.hideNoResults();

        objectsByType.forEach(typeGroup => {
            const objects = typeGroup.filteredObjects || typeGroup.objects;
            const groupDiv = this.createArtifactGroup(typeGroup.typeName, objects);
            container.appendChild(groupDiv);
        });
    }

    createArtifactGroup(typeName, objects) {
        const isCollapsed = this.collapsedGroups.has(typeName);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'artifact-group';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'group-header';
        headerDiv.innerHTML = `
            <div class="group-title">
                <span class="toggle-icon ${isCollapsed ? 'collapsed' : ''}">▼</span>
                ${typeName}
            </div>
            <div class="group-count">${objects.length}</div>
        `;

        const contentDiv = document.createElement('div');
        contentDiv.className = `group-content ${isCollapsed ? 'collapsed' : ''}`;

        const listUl = document.createElement('ul');
        listUl.className = 'artifact-list';

        objects.forEach(obj => {
            const listItem = this.createArtifactItem(obj, typeName);
            listUl.appendChild(listItem);
        });

        contentDiv.appendChild(listUl);

        // Add click handler for collapse/expand
        headerDiv.addEventListener('click', () => {
            const toggleIcon = headerDiv.querySelector('.toggle-icon');
            
            if (this.collapsedGroups.has(typeName)) {
                this.collapsedGroups.delete(typeName);
                contentDiv.classList.remove('collapsed');
                toggleIcon.classList.remove('collapsed');
            } else {
                this.collapsedGroups.add(typeName);
                contentDiv.classList.add('collapsed');
                toggleIcon.classList.add('collapsed');
            }
        });

        groupDiv.appendChild(headerDiv);
        groupDiv.appendChild(contentDiv);

        return groupDiv;
    }

    createArtifactItem(obj, typeName) {
        const listItem = document.createElement('li');
        listItem.className = 'artifact-item';

        const name = obj.name || 'Unnamed';
        const isCoachView = typeName === 'Coach View';
        const isCSHS = this.isCSHS(obj, typeName);

        let content = `<div class="artifact-name ${isCoachView ? 'clickable-coach-view' : ''} ${isCSHS ? 'clickable-cshs' : ''}"
                            ${isCoachView ? `data-coach-view-id="${obj.id}"` : ''}
                            ${isCSHS ? `data-cshs-id="${obj.id}"` : ''}
                            ${isCoachView ? 'title="Click to view details"' : ''}
                            ${isCSHS ? 'title="Click to view CSHS details"' : ''}>
                            ${this.escapeHtml(name)}
                            ${isCoachView ? ' <span class="view-details-icon">🔍</span>' : ''}
                            ${isCSHS ? ' <span class="view-details-icon">⚙️</span>' : ''}
                       </div>`;

        if (this.showIds && obj.id) {
            content += `<div class="object-id">ID: ${this.escapeHtml(obj.id)}</div>`;
        }

        if (this.showDetails && obj.hasDetails) {
            content += `<div class="object-details">Has additional details</div>`;
        }

        listItem.innerHTML = `<div>${content}</div>`;

        // Add click event for Coach Views
        if (isCoachView) {
            const nameElement = listItem.querySelector('.clickable-coach-view');
            nameElement.addEventListener('click', () => {
                this.showCoachViewDetails(obj);
            });
        }

        // Add click event for CSHS
        if (isCSHS) {
            const nameElement = listItem.querySelector('.clickable-cshs');
            nameElement.addEventListener('click', () => {
                this.showCSHSDetails(obj);
            });
        }

        return listItem;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Check if an object is a CSHS (Client-Side Human Service)
     * @param {Object} obj - Object to check
     * @param {string} typeName - Type name of the object
     * @returns {boolean} True if object is CSHS
     */
    isCSHS(obj, typeName) {
        // Check if it's a CSHS type (now properly separated at parsing level)
        return typeName === 'CSHS';
    }

    /**
     * Show Coach View details in modal
     * @param {Object} coachView - Coach View object
     */
    async showCoachViewDetails(coachView) {
        if (this.coachViewModal) {
            await this.coachViewModal.show(coachView);
        }
    }

    /**
     * Show CSHS details in modal
     * @param {Object} cshs - CSHS object
     */
    async showCSHSDetails(cshs) {
        if (this.cshsModal) {
            await this.cshsModal.show(cshs);
        }
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('artifacts-container').style.display = 'block';
    }

    showError(error) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        console.error('TWX Viewer Error:', error);
    }

    showNoResults() {
        document.getElementById('artifacts-container').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
    }

    hideNoResults() {
        document.getElementById('no-results').style.display = 'none';
        document.getElementById('artifacts-container').style.display = 'block';
    }
}

// Initialize the enhanced viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EnhancedTWXViewer();
});
