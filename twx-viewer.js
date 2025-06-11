// TWX Viewer JavaScript
class TWXViewer {
    constructor() {
        this.data = null;
        this.filteredData = null;
        this.selectedTypes = new Set();
        this.searchTerm = '';
        this.collapsedGroups = new Set();
        
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.renderStats();
            this.renderTypeFilters();
            this.renderArtifacts();
            this.hideLoading();
        } catch (error) {
            this.showError();
            console.error('Error initializing TWX Viewer:', error);
        }
    }

    async loadData() {
        try {
            const response = await fetch('parsing-results.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.filteredData = { ...this.data };
            
            // Initialize all types as selected
            Object.keys(this.data.objectsByType || {}).forEach(type => {
                this.selectedTypes.add(type);
            });
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Type filter checkboxes (will be set up after rendering)
    }

    renderStats() {
        const totalArtifacts = this.data.objects?.length || 0;
        const totalTypes = Object.keys(this.data.objectsByType || {}).length;
        const totalSnapshots = this.data.snapshots?.length || 0;
        const parseDate = this.data.metadata?.parseDate ? 
            new Date(this.data.metadata.parseDate).toLocaleDateString() : 'Unknown';

        document.getElementById('total-artifacts').textContent = totalArtifacts;
        document.getElementById('total-types').textContent = totalTypes;
        document.getElementById('total-snapshots').textContent = totalSnapshots;
        document.getElementById('parse-date').textContent = parseDate;
    }

    renderTypeFilters() {
        const typeFiltersContainer = document.getElementById('type-filters');
        const objectsByType = this.data.objectsByType || {};
        
        typeFiltersContainer.innerHTML = '';

        Object.entries(objectsByType).forEach(([type, objects]) => {
            const typeLabel = this.getTypeLabel(type);
            const count = objects.length;

            const filterDiv = document.createElement('div');
            filterDiv.className = 'type-checkbox';
            
            filterDiv.innerHTML = `
                <input type="checkbox" id="type-${type}" checked>
                <label for="type-${type}">${typeLabel}</label>
                <span class="type-badge">${count}</span>
            `;

            const checkbox = filterDiv.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedTypes.add(type);
                } else {
                    this.selectedTypes.delete(type);
                }
                this.applyFilters();
            });

            typeFiltersContainer.appendChild(filterDiv);
        });
    }

    getTypeLabel(type) {
        const typeLabels = {
            '1': 'Human Services & BPDs',
            '12': 'Business Objects',
            '21': 'Participants/Roles',
            '25': 'Services',
            '50': 'Reports',
            '61': 'File Resources',
            '62': 'Environment Variables',
            '63': 'Tracking Groups',
            '64': 'Coach Views',
            '72': 'Themes'
        };

        return typeLabels[type] || `Type ${type}`;
    }

    applyFilters() {
        const objectsByType = this.data.objectsByType || {};
        const filtered = {};

        Object.entries(objectsByType).forEach(([type, objects]) => {
            if (!this.selectedTypes.has(type)) return;

            const filteredObjects = objects.filter(obj => {
                const name = (obj.name || '').toLowerCase();
                const subtype = (obj.subtype || '').toLowerCase();
                
                return name.includes(this.searchTerm) || subtype.includes(this.searchTerm);
            });

            if (filteredObjects.length > 0) {
                filtered[type] = filteredObjects;
            }
        });

        this.filteredData = { ...this.data, objectsByType: filtered };
        this.renderArtifacts();
    }

    renderArtifacts() {
        const container = document.getElementById('artifacts-container');
        const objectsByType = this.filteredData.objectsByType || {};
        
        container.innerHTML = '';

        if (Object.keys(objectsByType).length === 0) {
            this.showNoResults();
            return;
        }

        this.hideNoResults();

        Object.entries(objectsByType).forEach(([type, objects]) => {
            const groupDiv = this.createArtifactGroup(type, objects);
            container.appendChild(groupDiv);
        });
    }

    createArtifactGroup(type, objects) {
        const typeLabel = this.getTypeLabel(type);
        const isCollapsed = this.collapsedGroups.has(type);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'artifact-group';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'group-header';
        headerDiv.innerHTML = `
            <div class="group-title">
                <span class="toggle-icon ${isCollapsed ? 'collapsed' : ''}">▼</span>
                ${typeLabel}
            </div>
            <div class="group-count">${objects.length}</div>
        `;

        const contentDiv = document.createElement('div');
        contentDiv.className = `group-content ${isCollapsed ? 'collapsed' : ''}`;

        const listUl = document.createElement('ul');
        listUl.className = 'artifact-list';

        objects.forEach(obj => {
            const listItem = document.createElement('li');
            listItem.className = 'artifact-item';
            
            const name = obj.name || 'Unnamed';
            const subtype = obj.subtype ? ` (${obj.subtype})` : '';
            
            listItem.innerHTML = `
                <div>
                    <div class="artifact-name">${this.escapeHtml(name)}</div>
                    ${subtype ? `<div class="artifact-subtype">${this.escapeHtml(subtype)}</div>` : ''}
                </div>
            `;

            listUl.appendChild(listItem);
        });

        contentDiv.appendChild(listUl);

        // Add click handler for collapse/expand
        headerDiv.addEventListener('click', () => {
            const toggleIcon = headerDiv.querySelector('.toggle-icon');
            
            if (this.collapsedGroups.has(type)) {
                this.collapsedGroups.delete(type);
                contentDiv.classList.remove('collapsed');
                toggleIcon.classList.remove('collapsed');
            } else {
                this.collapsedGroups.add(type);
                contentDiv.classList.add('collapsed');
                toggleIcon.classList.add('collapsed');
            }
        });

        groupDiv.appendChild(headerDiv);
        groupDiv.appendChild(contentDiv);

        return groupDiv;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('artifacts-container').style.display = 'block';
    }

    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
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

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TWXViewer();
});
