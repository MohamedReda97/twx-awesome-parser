/**
 * Coach View Details Modal Component
 * Displays detailed information about a selected Coach View
 */

class CoachViewDetails {
    constructor() {
        this.currentCoachView = null
        this.modal = null
        this.createModal()
        this.setupEventListeners()
    }

    /**
     * Create the modal structure
     */
    createModal() {
        // Create modal overlay
        this.modal = document.createElement('div')
        this.modal.className = 'coach-view-modal'
        this.modal.style.display = 'none'
        
        this.modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modal-title">Coach View Details</h2>
                        <button class="modal-close" id="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="coach-view-info">
                            <div class="info-section">
                                <h3>Basic Information</h3>
                                <div class="info-grid">
                                    <div class="info-item">
                                        <label>Name:</label>
                                        <span id="cv-name">-</span>
                                    </div>
                                    <div class="info-item">
                                        <label>ID:</label>
                                        <span id="cv-id">-</span>
                                    </div>
                                    <div class="info-item">
                                        <label>Version ID:</label>
                                        <span id="cv-version-id">-</span>
                                    </div>
                                </div>
                            </div>

                            <div class="info-section" id="binding-section">
                                <h3>Binding Type</h3>
                                <div class="binding-info">
                                    <span id="cv-binding-type">-</span>
                                </div>
                            </div>

                            <div class="info-section" id="config-section">
                                <h3>Configuration Options</h3>
                                <div class="config-options" id="cv-config-options">
                                    <p>No configuration options found</p>
                                </div>
                            </div>

                            <div class="info-section" id="load-js-section">
                                <h3>Load JavaScript Function</h3>
                                <div class="code-container">
                                    <pre><code class="language-javascript" id="cv-load-js">No load function defined</code></pre>
                                </div>
                            </div>

                            <div class="info-section" id="inline-scripts-section">
                                <h3>Inline Scripts</h3>
                                <div id="cv-inline-scripts">
                                    <p>No inline scripts found</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
        
        document.body.appendChild(this.modal)
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close modal when clicking close button or overlay
        const closeBtn = this.modal.querySelector('#modal-close')
        const overlay = this.modal.querySelector('.modal-overlay')
        
        closeBtn.addEventListener('click', () => this.hide())
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hide()
            }
        })
        
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display !== 'none') {
                this.hide()
            }
        })
    }

    /**
     * Show the modal with Coach View details
     * @param {Object} coachView - Coach View object with details
     */
    async show(coachView) {
        this.currentCoachView = coachView
        
        // Update basic information
        document.getElementById('modal-title').textContent = `Coach View: ${coachView.name}`
        document.getElementById('cv-name').textContent = coachView.name
        document.getElementById('cv-id').textContent = coachView.id
        document.getElementById('cv-version-id').textContent = coachView.versionId || '-'
        
        // Load detailed information if not already loaded
        if (!coachView.details || Object.keys(coachView.details).length === 0) {
            await this.loadCoachViewDetails(coachView)
        }
        
        this.updateModalContent(coachView)
        this.modal.style.display = 'block'
    }

    /**
     * Hide the modal
     */
    hide() {
        this.modal.style.display = 'none'
        this.currentCoachView = null
    }

    /**
     * Load detailed Coach View information
     * @param {Object} coachView - Coach View object
     */
    async loadCoachViewDetails(coachView) {
        try {
            // Load from the real parsed data
            const response = await fetch(`./output/objects-coach-view.json`)

            if (response.ok) {
                const data = await response.json()
                const detailedCoachView = data.objects.find(obj => obj.id === coachView.id)
                if (detailedCoachView && detailedCoachView.details) {
                    coachView.details = detailedCoachView.details
                    console.log('Loaded Coach View details for:', coachView.name, coachView.details)
                } else {
                    console.log('No detailed data found for Coach View:', coachView.name, coachView.id)
                }
            } else {
                console.warn('Could not fetch Coach View data file')
            }
        } catch (error) {
            console.warn('Could not load detailed Coach View information:', error)
            coachView.details = {}
        }
    }

    /**
     * Update modal content with Coach View details
     * @param {Object} coachView - Coach View object with details
     */
    updateModalContent(coachView) {
        const details = coachView.details || {}
        console.log('Updating modal with details:', details)

        // Remove any existing "no details" message
        const existingMessage = this.modal.querySelector('.no-details-message')
        if (existingMessage) {
            existingMessage.remove()
        }

        // Show a message if no details are available
        if (!details || Object.keys(details).length === 0) {
            this.showNoDetailsMessage()
            return
        }

        // Update binding type
        const bindingSection = document.getElementById('binding-section')
        const bindingType = document.getElementById('cv-binding-type')
        if (details.bindingType) {
            bindingType.textContent = details.bindingType
            bindingSection.style.display = 'block'
        } else {
            bindingSection.style.display = 'none'
        }
        
        // Update configuration options
        const configSection = document.getElementById('config-section')
        const configOptions = document.getElementById('cv-config-options')
        if (details.configOptions && details.configOptions.length > 0) {
            configOptions.innerHTML = `
                <div class="config-list">
                    ${details.configOptions.map(option => `<span class="config-tag">${option}</span>`).join('')}
                </div>
            `
            configSection.style.display = 'block'
        } else {
            configSection.style.display = 'none'
        }
        
        // Update load JavaScript function
        const loadJsSection = document.getElementById('load-js-section')
        const loadJs = document.getElementById('cv-load-js')
        if (details.loadJsFunction) {
            loadJs.textContent = details.loadJsFunction
            loadJsSection.style.display = 'block'
        } else {
            loadJsSection.style.display = 'none'
        }
        
        // Update inline scripts
        const inlineScriptsSection = document.getElementById('inline-scripts-section')
        const inlineScripts = document.getElementById('cv-inline-scripts')
        if (details.inlineScripts && details.inlineScripts.length > 0) {
            inlineScripts.innerHTML = details.inlineScripts.map((script, index) => `
                <div class="script-block">
                    <h4>${this.escapeHtml(script.name)} (${script.scriptType})</h4>
                    <div class="code-container">
                        <pre><code class="language-javascript" id="inline-script-${index}"></code></pre>
                    </div>
                </div>
            `).join('')

            // Set the script content as text content to avoid HTML injection
            details.inlineScripts.forEach((script, index) => {
                const codeElement = document.getElementById(`inline-script-${index}`)
                if (codeElement) {
                    codeElement.textContent = script.scriptBlock
                }
            })

            inlineScriptsSection.style.display = 'block'
        } else {
            inlineScriptsSection.style.display = 'none'
        }

        // Apply syntax highlighting after all content is set
        this.applySyntaxHighlighting()
    }

    /**
     * Apply syntax highlighting to code blocks using shared highlighter
     */
    applySyntaxHighlighting() {
        ScriptHighlighter.highlightContainer(this.modal)
    }

    /**
     * Escape HTML characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return ''
        return text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#39;')
    }



    /**
     * Show message when no details are available
     */
    showNoDetailsMessage() {
        // Hide all detail sections
        document.getElementById('binding-section').style.display = 'none'
        document.getElementById('config-section').style.display = 'none'
        document.getElementById('load-js-section').style.display = 'none'
        document.getElementById('inline-scripts-section').style.display = 'none'

        // Show a helpful message
        const modalBody = this.modal.querySelector('.modal-body')
        const existingMessage = modalBody.querySelector('.no-details-message')

        if (!existingMessage) {
            const messageDiv = document.createElement('div')
            messageDiv.className = 'no-details-message'
            messageDiv.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h3>📋 No Detailed Information Available</h3>
                    <p>This Coach View doesn't have detailed parsing information available yet.</p>
                    <p><strong>Available Coach Views with details:</strong></p>
                    <ul style="list-style: none; padding: 0;">
                        <li>• Contract Creation</li>
                        <li>• Withdrawal Request Trade FO</li>
                        <li>• Error Message</li>
                        <li>• Basic Details</li>
                    </ul>
                    <p><em>Try clicking on one of these Coach Views to see detailed information.</em></p>
                </div>
            `
            modalBody.appendChild(messageDiv)
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoachViewDetails
}
