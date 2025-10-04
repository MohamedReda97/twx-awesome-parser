/**
 * Issue Deduplicator
 * Prevents duplicate issues from being reported in static analysis
 */
class IssueDeduplicator {
  constructor() {
    this.seenIssues = new Set();
  }

  /**
   * Add an issue and check if it's a duplicate
   * @param {Object} issue - Issue object with line, column, and ruleId
   * @returns {boolean} True if new issue, false if duplicate
   */
  addIssue(issue) {
    // Create unique key for each issue
    const key = `${issue.line}:${issue.column}:${issue.rule || issue.ruleId}`;

    if (!this.seenIssues.has(key)) {
      this.seenIssues.add(key);
      return true; // New issue
    }
    return false; // Duplicate
  }

  /**
   * Process ESLint results and deduplicate
   * @param {Array} eslintMessages - Array of ESLint messages
   * @returns {Array} Array of unique issues
   */
  processResults(eslintMessages) {
    const uniqueIssues = [];

    for (const msg of eslintMessages) {
      // Only process critical errors (severity 2)
      if (msg.severity === 2 && this.addIssue(msg)) {
        uniqueIssues.push({
          line: msg.line,
          column: msg.column,
          rule: msg.ruleId,
          message: msg.message,
          type: this.categorizeIssue(msg.ruleId),
          severity: 'error'
        });
      }
    }

    return uniqueIssues;
  }

  /**
   * Categorize issue by rule ID
   * @param {string} ruleId - ESLint rule ID
   * @returns {string} Issue category
   */
  categorizeIssue(ruleId) {
    if (!ruleId) return 'CRITICAL_ERROR';

    if (ruleId.includes('security') || ruleId.includes('eval')) {
      return 'SECURITY';
    }
    if (ruleId.includes('undef') || ruleId.includes('no-dupe')) {
      return 'RUNTIME_ERROR';
    }
    return 'CRITICAL_ERROR';
  }

  /**
   * Reset the deduplicator
   */
  reset() {
    this.seenIssues.clear();
  }

  /**
   * Get count of unique issues seen
   * @returns {number} Count of unique issues
   */
  getCount() {
    return this.seenIssues.size;
  }
}

module.exports = IssueDeduplicator;

