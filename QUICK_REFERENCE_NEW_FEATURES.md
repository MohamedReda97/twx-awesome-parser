# Quick Reference - New Static Analysis Features

## 🎯 What Changed?

### 1. Nested Loop Depth Threshold
- **Before**: All nested loops (2+ levels) triggered warnings
- **After**: Only 3+ level nested loops trigger warnings
- **Why**: Reduce noise - 2-level loops are common and acceptable

### 2. New Warning Rules
- **Added**: 5 new code quality warning rules
- **Category**: `code_quality`
- **Severity**: `warning` (not error)

---

## 📋 New Warning Rules

| Rule | What It Catches | Example |
|------|----------------|---------|
| `no-unused-vars` | Variables declared but never used | `var x = 10;` (x never used) |
| `no-unmodified-loop-condition` | Loop conditions never modified (infinite loops) | `while(flag) { ... }` (flag never changes) |
| `no-unreachable-loop` | Loops that only run once | `for(...) { return; }` |
| `sonarjs/no-identical-expressions` | Duplicate expressions in operators | `if (x > 10 \|\| x > 10)` |
| `sonarjs/no-identical-functions` | Duplicate function implementations | Two functions with same code |

---

## 🔍 Examples

### Nested Loops

```javascript
// ✅ NO WARNING (2 levels)
for (var i = 0; i < rows; i++) {
    for (var j = 0; j < cols; j++) {
        process(i, j);
    }
}

// ⚠️ WARNING (3 levels)
for (var i = 0; i < x; i++) {
    for (var j = 0; j < y; j++) {
        for (var k = 0; k < z; k++) {
            process(i, j, k);
        }
    }
}
```

### Unused Variables

```javascript
// ⚠️ WARNING
function calculate() {
    var unused = 10;  // Never used
    var used = 20;
    return used;
}
```

### Unmodified Loop Condition

```javascript
// ⚠️ WARNING
var flag = true;
while (flag) {
    console.log('Running');
    // flag is never modified - infinite loop!
}
```

### Unreachable Loop

```javascript
// ⚠️ WARNING
for (var i = 0; i < items.length; i++) {
    console.log(items[i]);
    return;  // Loop exits immediately
}
```

### Identical Expressions

```javascript
// ⚠️ WARNING
if (x > 10 || x > 10) {  // Duplicate condition
    return true;
}
```

### Identical Functions

```javascript
// ⚠️ WARNING
function processA(data) {
    var result = data * 2;
    return result + 10;
}

function processB(data) {
    var result = data * 2;  // Same implementation
    return result + 10;
}
```

---

## 📊 Issue Categories

| Category | Severity | Description |
|----------|----------|-------------|
| `security` | error | Security vulnerabilities (eval, etc.) |
| `runtime_error` | error | Critical runtime errors (undefined vars, etc.) |
| `critical_error` | error | Other critical errors |
| `code_quality` | warning | Code quality issues (NEW) |
| `performance` | warning | Performance issues (nested loops, etc.) |

---

## 🧪 Testing

Run the test suite:
```bash
node test-new-warnings.js
```

Expected output:
```
✓ Check 1 (2-Level Nested Loops - No Warning): ✅ PASS
✓ Check 2 (3-Level Nested Loops - Warning): ✅ PASS
✓ Check 3 (no-unused-vars): ✅ PASS
✓ Check 4 (no-unmodified-loop-condition): ✅ PASS
✓ Check 5 (no-unreachable-loop): ✅ PASS
✓ Check 6 (sonarjs/no-identical-expressions): ✅ PASS
✓ Check 7 (sonarjs/no-identical-functions): ✅ PASS
✓ Check 8 (code_quality category exists): ✅ PASS

🎉 ALL TESTS PASSED!
```

---

## 📁 Files Modified

1. `.eslintrc.cjs` - Added sonarjs plugin and 5 warning rules
2. `src/static-analysis/StaticAnalysisService.js` - Updated logic for warnings and nested loops
3. `test-new-warnings.js` - New comprehensive test suite

---

## 🎯 Quick Stats

- **Total Rules**: 27 (22 errors + 5 warnings)
- **New Category**: `code_quality`
- **Nested Loop Threshold**: 3+ levels
- **Backward Compatible**: ✅ Yes

---

## 💡 Tips

1. **Warnings vs Errors**:
   - Errors = Must fix (runtime/security issues)
   - Warnings = Should fix (code quality issues)

2. **Nested Loops**:
   - 2 levels = OK (common pattern)
   - 3+ levels = Consider refactoring

3. **Code Quality**:
   - Remove unused variables
   - Fix infinite loops
   - Eliminate duplicate code
   - Simplify complex expressions

---

## 🚀 Ready to Use!

All features are:
- ✅ Implemented
- ✅ Tested
- ✅ Documented
- ✅ Backward compatible

Start analyzing your scripts with the enhanced static analysis system!

