# Static Analysis Quick Start Guide

## 🚀 Quick Start

### Run Tests
```bash
node test-static-analysis.js
```

This will validate that:
- ✅ Prettier runs silently
- ✅ Only critical issues are reported
- ✅ No style issues are reported
- ✅ No duplicate issues
- ✅ Security issues are detected
- ✅ Runtime errors are detected

---

## 📖 How It Works

### 1. Prettier First (Silent)
```javascript
// Prettier formats the code silently
const formattedCode = prettier.format(originalCode, config);
// No issues reported from Prettier
```

### 2. ESLint on Formatted Code
```javascript
// ESLint analyzes the formatted code
const results = await eslint.lintText(formattedCode);
// Only critical errors reported
```

### 3. Filter Critical Issues
```javascript
// Double filtering
1. Only severity 2 (errors)
2. Only critical rules whitelist
```

### 4. Deduplicate
```javascript
// Remove duplicates using line:column:ruleId
const uniqueIssues = deduplicator.processResults(messages);
```

---

## 🎯 What Gets Reported

### ✅ WILL Report (Critical Issues)

#### Runtime Errors
- `no-undef` - Undefined variables
- `no-dupe-keys` - Duplicate object keys
- `no-dupe-args` - Duplicate function arguments
- `no-unreachable` - Unreachable code
- `no-invalid-regexp` - Invalid regex
- And 13 more runtime error rules...

#### Security Issues
- `no-eval` - Direct eval() usage
- `no-implied-eval` - Indirect eval()
- `no-new-func` - Function constructor
- `security/detect-eval-with-expression` - Dynamic eval

#### Custom Analysis
- Nested loops (warning)
- If-in-loop without break/continue (warning)

### ❌ WILL NOT Report (Non-Critical)

#### Style Issues (Prettier handles these)
- Missing semicolons
- Wrong quotes (single vs double)
- Indentation issues
- Spacing issues
- Line length issues

#### Best Practices (Not critical)
- `no-var` - Using var instead of let/const
- `prefer-const` - Could use const
- `no-console` - Console.log statements
- `no-unused-vars` - Unused variables
- And many more...

---

## 📊 Example Output

### Clean Code (No Issues)
```javascript
// Input
function add(a, b) {
    return a + b;
}

// Output: ✅ No issues found
```

### Style Issues (Not Reported)
```javascript
// Input
var x=1  // no semicolon, spacing issues
var y = 2

// Output: ✅ No issues found (Prettier formats silently)
```

### Critical Error (Reported)
```javascript
// Input
function test() {
    return undefinedVariable; // undefined
}

// Output: ❌ Error - no-undef
// Line 2: 'undefinedVariable' is not defined
// Category: runtime_error
// Suggestion: Declare the variable or add it to globals configuration
```

### Security Issue (Reported)
```javascript
// Input
function dangerous(code) {
    eval(code); // security risk
}

// Output: ❌ Error - no-eval
// Line 2: eval can be harmful
// Category: security
// Suggestion: Use JSON.parse() or safer alternatives instead of eval()
```

---

## 🔧 Configuration Files

### `.eslintrc.cjs` - Critical Rules Only
```javascript
module.exports = {
  root: true,
  extends: [], // No inherited rules
  plugins: ['security'],
  rules: {
    // Only critical runtime errors and security issues
    'no-undef': 'error',
    'no-eval': 'error',
    // ... 20 more critical rules
    
    // All style rules OFF
    'semi': 'off',
    'quotes': 'off',
    // ... all style rules disabled
  }
};
```

### `.prettierrc.js` - Formatting Config
```javascript
module.exports = {
  parser: 'babel',
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  printWidth: 120
};
```

---

## 💻 Usage in Code

### Basic Usage
```javascript
const StaticAnalysisService = require('./src/static-analysis/StaticAnalysisService');

const service = new StaticAnalysisService();
await service.initializeTools();

const scripts = [
    {
        id: 'script-1',
        name: 'My Script',
        content: 'function test() { return x; }' // undefined x
    }
];

const results = await service.analyzeScripts(scripts);

console.log(`Total Issues: ${results.statistics.totalIssues}`);
console.log(`Scripts with Issues: ${results.statistics.scriptsWithIssues}`);
```

### Results Structure
```javascript
{
  results: [
    {
      scriptId: 'script-1',
      scriptName: 'My Script',
      issues: [
        {
          severity: 'error',
          category: 'runtime_error',
          rule: 'no-undef',
          description: "'x' is not defined",
          line: 1,
          column: 28,
          code: 'function test() { return x; }',
          suggestion: 'Declare the variable or add it to globals configuration'
        }
      ],
      metrics: {
        complexity: 1,
        lines: 1,
        maintainability: 98
      }
    }
  ],
  statistics: {
    totalScripts: 1,
    scriptsWithIssues: 1,
    totalIssues: 1,
    issuesBySeverity: { error: 1, warning: 0, info: 0 },
    issuesByCategory: { runtime_error: 1 }
  },
  timestamp: '2025-10-03T...'
}
```

---

## 🧪 Testing Checklist

Run the test script and verify:

- [ ] Test 1: Style issues NOT reported ✅
- [ ] Test 2: Undefined variable IS reported ✅
- [ ] Test 3: Security issue (eval) IS reported ✅
- [ ] Test 4: Duplicate keys IS reported ✅
- [ ] Test 5: Clean code has NO issues ✅
- [ ] Test 6: Nested loops warning IS reported ✅

All tests should PASS.

---

## 🐛 Troubleshooting

### Issue: ESLint reports style issues
**Solution**: Check that `.eslintrc.cjs` has `extends: []` and all style rules are `'off'`

### Issue: Prettier errors are reported
**Solution**: Check that Prettier formatting is wrapped in try-catch and only critical syntax errors are reported

### Issue: Duplicate issues
**Solution**: Verify IssueDeduplicator is initialized and reset() is called for each batch

### Issue: Too many issues reported
**Solution**: Check that critical rules whitelist is being used in `runESLintAnalysis()`

---

## 📚 Additional Resources

- **Full Documentation**: `STATIC_ANALYSIS_IMPLEMENTATION.md`
- **Changes Summary**: `STATIC_ANALYSIS_CHANGES.md`
- **Original Plan**: `static analysis plan.txt`
- **Test Script**: `test-static-analysis.js`

---

## 🎉 Success Criteria

Your implementation is working correctly if:

1. ✅ Style issues are NOT reported
2. ✅ Only errors (severity 2) are reported
3. ✅ Only critical rules are triggered
4. ✅ No duplicate issues
5. ✅ Clear categorization (security, runtime_error, critical_error)
6. ✅ Helpful suggestions for each issue
7. ✅ Clean code produces no issues
8. ✅ Critical errors are caught

---

**Ready to test?** Run: `node test-static-analysis.js`

