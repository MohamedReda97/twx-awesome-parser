/**
 * Shared JavaScript syntax highlighting utility
 * Used by both Coach View and CSHS components
 */
class ScriptHighlighter {
    /**
     * Apply JavaScript syntax highlighting to a code block
     * @param {HTMLElement} codeBlock - Code block element to highlight
     */
    static highlightJavaScript(codeBlock) {
        // Get the plain text content
        let code = codeBlock.textContent || codeBlock.innerText || ''

        // First, escape all HTML characters to prevent XSS
        code = code.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#39;')

        // Now apply syntax highlighting - the HTML tags won't be escaped because we're adding them after escaping

        // 1. Comments first (so keywords in comments don't get highlighted)
        code = code.replace(/\/\/.*$/gm, '<span class="js-comment">$&</span>')
        code = code.replace(/\/\*[\s\S]*?\*\//g, '<span class="js-comment">$&</span>')

        // 2. Strings (handle escaped quotes in the already-escaped content)
        code = code.replace(/(&#39;|&quot;)((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="js-string">$1$2$1</span>')

        // 3. Numbers
        code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="js-number">$1</span>')

        // 4. Keywords (avoid replacing if already inside a span)
        const keywords = ['function', 'var', 'let', 'const', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'undefined', 'this', 'new', 'typeof', 'instanceof', 'try', 'catch', 'finally', 'throw', 'switch', 'case', 'break', 'continue', 'do', 'class', 'extends', 'super', 'static', 'async', 'await']
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b(?![^<]*<\/span>)`, 'g')
            code = code.replace(regex, '<span class="js-keyword">$1</span>')
        })

        // 5. Function calls (method calls)
        code = code.replace(/\.(\w+)(\s*\()/g, '.<span class="js-function">$1</span>$2')

        // 6. Object properties
        code = code.replace(/\.(\w+)(?!\s*\()/g, '.<span class="js-property">$1</span>')

        // Set the highlighted HTML
        codeBlock.innerHTML = code
    }

    /**
     * Apply syntax highlighting to all code blocks in a container
     * @param {HTMLElement} container - Container element
     * @param {string} selector - CSS selector for code blocks (default: 'code.language-javascript')
     */
    static highlightContainer(container, selector = 'code.language-javascript') {
        const codeBlocks = container.querySelectorAll(selector)
        codeBlocks.forEach(block => {
            this.highlightJavaScript(block)
        })
    }

    /**
     * Clean and prepare JavaScript code for display
     * @param {string} code - Raw JavaScript code
     * @returns {string} Cleaned code
     */
    static cleanCode(code) {
        if (!code || typeof code !== 'string') return ''
        
        return code
            .replace(/&#xD;/g, '\n')
            .replace(/&#xA;/g, '\n')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim()
    }

    /**
     * Create a highlighted code block element
     * @param {string} code - JavaScript code to highlight
     * @param {string} title - Optional title for the code block
     * @returns {HTMLElement} Code block element
     */
    static createCodeBlock(code, title = '') {
        const container = document.createElement('div')
        container.className = 'script-content'
        
        const cleanedCode = this.cleanCode(code)
        
        container.innerHTML = `
            ${title ? `<strong>${title}:</strong>` : ''}
            <pre><code class="language-javascript">${cleanedCode}</code></pre>
        `
        
        // Apply highlighting
        this.highlightContainer(container)
        
        return container
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScriptHighlighter
}
