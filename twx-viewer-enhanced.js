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
        this.cshsInline = null;
        this.searchResults = [];
        this.isSearching = false;
        this.searchOptions = {
            matchCase: false,
            wholeWord: false
        };
        this.init();
    }

    async init() {
        try {
            // Initialize Coach View modal
            this.coachViewModal = new CoachViewDetails();

            // Initialize CSHS modal (for backward compatibility)
            this.cshsModal = new CSHSDetails();

            // Initialize CSHS inline component
            this.cshsInline = new CSHSDetailsInline();

            // Setup event listeners before loading data
            this.setupEventListeners();
            
            // Show loading state for search
            this.updateSearchUI('idle');
            
            await this.loadData();
            this.renderProjectInfo();
            this.renderStats();
            this.renderTypeFilters();
            this.renderArtifacts();
            this.hideLoading();
        } catch (error) {
            this.showError(error);
        }
    }

    async performSearch() {
        const deepSearchInput = document.getElementById('searchInput');
        const searchTerm = deepSearchInput.value.trim();
        
        if (!searchTerm) {
            this.updateSearchUI('idle');
            return;
        }

        this.updateSearchUI('searching');
        this.searchResults = [];

        try {
            // Build query parameters
            const params = new URLSearchParams({
                q: searchTerm,
                matchCase: this.searchOptions.matchCase,
                wholeWord: this.searchOptions.wholeWord
            });

            const response = await fetch(`/api/search?${params}`);
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();
            this.searchResults = data.results || [];
            this.updateSearchUI('results');
        } catch (error) {
            console.error('Search error:', error);
            this.updateSearchUI('error', error.message);
        }
    }

    updateSearchUI(state, errorMessage = '') {
        const searchResultsEl = document.getElementById('searchResults');
        
        if (!searchResultsEl) return;

        switch (state) {
            case 'idle':
                searchResultsEl.innerHTML = `
                    <div class="search-placeholder">
                        <div class="search-icon">🔍</div>
                        <p>Enter a search term to find content in files</p>
                    </div>`;
                break;
                
            case 'searching':
                searchResultsEl.innerHTML = `
                    <div class="search-placeholder">
                        <div class="search-loading">⏳</div>
                        <p>Searching...</p>
                    </div>`;
                break;
                
            case 'results':
                if (this.searchResults.length === 0) {
                    searchResultsEl.innerHTML = `
                        <div class="search-placeholder">
                            <div class="search-icon">🔍</div>
                            <p>No results found. Try a different search term.</p>
                        </div>`;
                } else {
                    searchResultsEl.innerHTML = this.searchResults.map(result => `
                        <div class="search-result-item">
                            <div class="search-result-header">
                                <span class="search-result-filename">${result.filename}</span>
                                <span class="search-result-position">Line ${result.lineNumber}</span>
                            </div>
                            <div class="search-result-snippet">
                                ${this.highlightSearchTerm(result.snippet, deepSearchInput.value.trim())}
                            </div>
                            <div class="search-result-context">
                                ${result.context || ''}
                            </div>
                        </div>`
                    ).join('');
                }
                break;
                
            case 'error':
                searchResultsEl.innerHTML = `
                    <div class="search-placeholder">
                        <div class="search-error">❌</div>
                        <p>Error: ${errorMessage || 'Search failed'}</p>
                    </div>`;
                break;
        }
    }

    highlightSearchTerm(text, term) {
        if (!term) return text;
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
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
        // Search input for artifacts
        const artifactSearchInput = document.getElementById('search-input');
        artifactSearchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Deep search functionality
        const deepSearchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const matchCaseCheckbox = document.getElementById('matchCase');
        const wholeWordCheckbox = document.getElementById('wholeWord');

        if (searchButton) {
            searchButton.addEventListener('click', () => this.performSearch());
        }

        if (deepSearchInput) {
            deepSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        if (matchCaseCheckbox) {
            matchCaseCheckbox.addEventListener('change', (e) => {
                this.searchOptions.matchCase = e.target.checked;
            });
        }

        if (wholeWordCheckbox) {
            wholeWordCheckbox.addEventListener('change', (e) => {
                this.searchOptions.wholeWord = e.target.checked;
            });
        }

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

        // XML Search functionality
        // Note: Search input and button event listeners are already set up above
        // with proper null checks and error handling
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

        let headerContent = `
            <div class="artifact-name ${isCoachView ? 'clickable-coach-view' : ''} ${isCSHS ? 'clickable-cshs' : ''}"
                 ${isCoachView ? `data-coach-view-id="${obj.id}"` : ''}
                 ${isCSHS ? `data-cshs-id="${obj.id}"` : ''}
                 ${isCoachView ? 'title="Click to view details"' : ''}
                 ${isCSHS ? 'title="Click to view CSHS details"' : ''}>
                ${this.escapeHtml(name)}
                ${isCoachView ? ' <span class="view-details-icon">🔍</span>' : ''}
                ${isCSHS ? ' <span class="view-details-icon">⚙️</span>' : ''}
            </div>
        `;

        let additionalInfo = '';
        if (this.showIds && obj.id) {
            additionalInfo += `<div class="object-id">ID: ${this.escapeHtml(obj.id)}</div>`;
        }

        if (this.showDetails && obj.hasDetails) {
            additionalInfo += `<div class="object-details">Has additional details</div>`;
        }

        listItem.innerHTML = `
            <div class="artifact-item-header">
                <div>
                    ${headerContent}
                    ${additionalInfo}
                </div>
            </div>
        `;

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
            nameElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleCSHSDetailsInline(obj, listItem);
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
     * Show CSHS details in modal (for backward compatibility)
     * @param {Object} cshs - CSHS object
     */
    async showCSHSDetails(cshs) {
        if (this.cshsModal) {
            await this.cshsModal.show(cshs);
        }
    }

    /**
     * Toggle CSHS details inline under the object name
     * @param {Object} cshs - CSHS object
     * @param {HTMLElement} listItem - The list item element
     */
    async toggleCSHSDetailsInline(cshs, listItem) {
        if (this.cshsInline) {
            await this.cshsInline.toggleCSHSDetails(cshs, listItem);
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

    // Search functionality
    async performSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput.value.trim();
        const matchCase = document.getElementById('matchCase').checked;
        const wholeWord = document.getElementById('wholeWord').checked;

        if (!searchTerm) {
            this.updateSearchUI('idle');
            return;
        }

        try {
            this.updateSearchUI('searching');
            
            // Build query parameters
            const params = new URLSearchParams();
            params.append('q', searchTerm);
            if (matchCase) params.append('caseSensitive', 'true');
            if (wholeWord) params.append('wholeWord', 'true');
            
            // Make API request
            const response = await fetch(`/api/search?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.displaySearchResults(data);
            
        } catch (error) {
            console.error('Search error:', error);
            this.updateSearchUI('error', error.message);
        }
    }
    
    updateSearchUI(state, errorMessage = '') {
        const searchResults = document.getElementById('searchResults');
        
        switch (state) {
            case 'idle':
                searchResults.innerHTML = `
                    <div class="search-placeholder">
                        <div class="search-icon">🔍</div>
                        <p>Enter a search term to find content in XML files</p>
                    </div>`;
                break;
                
            case 'searching':
                searchResults.innerHTML = `
                    <div class="search-placeholder">
                        <div class="search-loading">⏳</div>
                        <p>Searching XML files...</p>
                    </div>`;
                break;
                
            case 'error':
                searchResults.innerHTML = `
                    <div class="search-error">
                        <div class="error-icon">❌</div>
                        <h4>Search Error</h4>
                        <p>${errorMessage || 'An error occurred while searching'}</p>
                        <button onclick="document.querySelector('.search-button').click()">Try Again</button>
                    </div>`;
                break;
        }
    }
    
    displaySearchResults(data) {
        const searchResults = document.getElementById('searchResults');
        
        if (!data.results || data.results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-placeholder">
                    <div class="search-icon">🔍</div>
                    <p>No results found for "${data.query}"</p>
                </div>`;
            return;
        }
        
        // Calculate total matches across all files
        const totalMatches = data.results.reduce((sum, result) => sum + result.matchCount, 0);
        
        let html = `
            <div class="search-results-header">
                <h3>Search Results for "${data.query}"</h3>
                <div class="search-results-count">${totalMatches} matches in ${data.results.length} file${data.results.length !== 1 ? 's' : ''}</div>
            </div>`;
            
        data.results.forEach(result => {
            const filename = result.file;
            const objectId = result.path;
            
            html += `
            <div class="search-result-item">
                <div class="search-result-header">
                    <div class="search-result-filename">${filename}</div>
                    <div class="search-result-position">${result.matchCount} match${result.matchCount !== 1 ? 'es' : ''}</div>
                </div>
                <div class="search-result-object-id">Path: ${objectId}</div>
                <div class="search-result-matches">`;
                
            // Show first 3 matches, with option to show more
            const maxVisibleMatches = 3;
            const matchesToShow = result.matches.slice(0, maxVisibleMatches);
            const hasMore = result.matches.length > maxVisibleMatches;
            
            matchesToShow.forEach(match => {
                // Truncate long values for display
                let value = match.value;
                if (value.length > 200) {
                    value = value.substring(0, 200) + '...';
                }
                
                // Highlight the search term in the result
                const searchTerm = data.query.toLowerCase();
                const highlightedValue = this.escapeHtml(value).replace(
                    new RegExp(`(${searchTerm})`, 'gi'),
                    '<span class="highlight">$1</span>'
                );
                
                html += `
                <div class="search-result-match">
                    <div class="search-result-path">${match.path}</div>
                    <div class="search-result-snippet">${highlightedValue}</div>
                </div>`;
            });
            
            if (hasMore) {
                const remaining = result.matches.length - maxVisibleMatches;
                html += `
                <div class="search-result-more">
                    + ${remaining} more match${remaining > 1 ? 'es' : ''} in this file
                </div>`;
            }
            
            html += `
                </div>
            </div>`;
        });
        
        searchResults.innerHTML = html;
    }
}

// Initialize the enhanced viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new EnhancedTWXViewer();
});
