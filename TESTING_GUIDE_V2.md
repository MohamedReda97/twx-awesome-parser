# Testing Guide for Static Analysis Fixes V2

## Quick Start

1. **Clear browser cache** (Ctrl+Shift+Delete or Cmd+Shift+Delete)
2. **Restart the application**
3. **Open browser console** (F12)
4. **Run static analysis** on a TWX file
5. **Check the results** against the test cases below

---

## Test Case 1: Duplicate Rows (CRITICAL)

### Objective
Verify that duplicate issues are no longer appearing in the results table.

### Steps
1. Open a TWX file with nested loops (or use the one from your screenshot)
2. Run Static Code Review
3. Look for issues with the same:
   - Script name
   - Line number
   - Rule name
   - Description

### Expected Results
✅ **Each unique issue appears exactly once**
✅ **Console shows:** `Duplicates filtered out: 0` (or a low number)
✅ **No duplicate rows in the table**

### Console Output to Check
```
=== Analyzing Script: [Script Name] (ID: [ID]) ===
ESLint found X issues
Custom analysis found Y issues
=== Generating Static Analysis Table ===
Total script results: N
=== Table Generation Complete ===
Total unique issues displayed: Z
Duplicates filtered out: 0  ← Should be 0 or very low
Categories found: M
```

### What to Look For
- If "Duplicates filtered out" is > 0, check console for messages like:
  ```
  Skipping duplicate issue #1: custom-nested-loops at line 14 in [Script Name]
  ```
- This indicates the frontend is catching duplicates (backend fix may need adjustment)

---

## Test Case 2: Commented Code Analysis

### Objective
Verify that commented-out code is not being analyzed.

### Steps

#### Test 2A: Commented Syntax Errors
1. Add a script with commented syntax errors:
   ```javascript
   // This is valid code
   var x = 10;
   
   // var y = {broken syntax here
   // var z = [unclosed array
   
   // More valid code
   var a = 20;
   ```

2. Run Static Code Review
3. Check results table

**Expected:** ✅ No syntax errors reported for commented lines

#### Test 2B: Commented Nested Loops
1. Add a script with commented nested loops:
   ```javascript
   // for (var i = 0; i < 10; i++) {
   //     for (var j = 0; j < 10; j++) {
   //         console.log(i, j);
   //     }
   // }
   
   var x = 10; // This is active code
   ```

2. Run Static Code Review
3. Check results table

**Expected:** ✅ No "nested loops" warning for commented code

#### Test 2C: Active Code with Inline Comments
1. Add a script with inline comments:
   ```javascript
   for (var i = 0; i < 10; i++) { // Loop comment
       for (var j = 0; j < 10; j++) { // Nested loop comment
           console.log(i, j);
       }
   }
   ```

2. Run Static Code Review
3. Check results table

**Expected:** ✅ "Nested loops" warning IS reported (code is active)

### Console Output to Check
```
Skipping ESLint issue in commented line 25: no-undef
Skipping ESLint issue in commented line 26: no-unused-vars
```

---

## Test Case 3: Prettier Formatting Error

### Objective
Verify that Prettier errors are handled gracefully and don't affect analysis.

### Steps
1. Run Static Code Review on any TWX file
2. Open browser console
3. Look for Prettier-related messages

### Expected Results
✅ **Message format:** `ℹ️ Prettier formatting skipped for [Script Name]: [Error]`
✅ **Message level:** Informational (blue ℹ️), not warning (yellow ⚠️)
✅ **Analysis continues:** ESLint results are still displayed
✅ **No functional impact:** All issues are detected correctly

### Console Output Examples

**Good (Expected):**
```
ℹ️ Prettier formatting skipped for Validation (Script Task): Unexpected token (14:5)
ESLint found 5 issues
Custom analysis found 2 issues
```

**Bad (Should NOT see):**
```
⚠️ Prettier formatting failed, using original content: [long error message]
```

### What This Means
- Prettier couldn't format the code (expected for some scripts)
- Analysis continues with original content
- ESLint still works correctly
- **This is NOT an error** - it's informational

---

## Test Case 4: Overall Functionality

### Objective
Verify that all existing functionality still works correctly.

### Steps
1. Run Static Code Review
2. Test all features:

#### Sorting
- [ ] Click each column header
- [ ] Verify sorting works (ascending/descending)
- [ ] Check "Issue Classification" column sorts by severity

#### Filtering
- [ ] Use severity filter (ERROR, WARNING, INFO)
- [ ] Use category filter
- [ ] Use object name filter
- [ ] Verify results update correctly

#### Code Context Display
- [ ] Verify code shows full lines (no `...` truncation)
- [ ] Check line numbers are visible
- [ ] Verify error line is highlighted
- [ ] Test horizontal scroll for long lines

#### Hierarchical Classification
- [ ] Verify 3-level hierarchy displays:
  - Level 1: Severity (ERROR/WARNING/INFO)
  - Level 2: Category (└─ Performance)
  - Level 3: Rule (└─ custom-nested-loops)

#### Actions
- [ ] Click "DONE" button
- [ ] Verify row is removed
- [ ] Check results count updates

---

## Test Case 5: Edge Cases

### Test 5A: Empty Scripts
1. Analyze a TWX with empty scripts
2. **Expected:** No errors, empty scripts skipped

### Test 5B: CSS Content
1. Analyze a TWX with CSS scripts
2. **Expected:** "CSS content detected. JavaScript analysis skipped."

### Test 5C: Multiple Scripts
1. Analyze a TWX with 10+ scripts
2. **Expected:** All scripts analyzed, no duplicates across scripts

### Test 5D: Large Scripts
1. Analyze a TWX with scripts > 1000 lines
2. **Expected:** Analysis completes, performance acceptable

---

## Console Monitoring

### What to Watch For

#### Good Signs ✅
```
=== Analyzing Script: [Name] (ID: [ID]) ===
ESLint found X issues
Custom analysis found Y issues
=== Generating Static Analysis Table ===
Total unique issues displayed: Z
Duplicates filtered out: 0
```

#### Warning Signs ⚠️
```
Duplicates filtered out: 10+  ← High number indicates backend duplicates
🔴 DUPLICATE DETECTED!  ← Should not appear with fixes
```

#### Informational ℹ️
```
ℹ️ Prettier formatting skipped for [Script]: [Reason]
Skipping ESLint issue in commented line X: [rule]
```

---

## Performance Benchmarks

### Expected Performance
- **Small TWX (1-5 scripts):** < 2 seconds
- **Medium TWX (5-20 scripts):** < 10 seconds
- **Large TWX (20+ scripts):** < 30 seconds

### If Performance is Slow
1. Check console for excessive logging
2. Verify no infinite loops in custom analysis
3. Check browser console for JavaScript errors

---

## Troubleshooting

### Issue: Still Seeing Duplicates

**Check:**
1. Browser cache cleared?
2. Application restarted?
3. Console shows "Duplicates filtered out: X"?
   - If X > 0: Frontend is catching them (good)
   - If X = 0 but still see duplicates: Check browser cache again

**Debug:**
```javascript
// In browser console:
console.log('Checking for duplicates...');
// Look for messages like:
// "Skipping duplicate issue #1: custom-nested-loops at line 14"
```

### Issue: Commented Code Still Analyzed

**Check:**
1. Is the code actually commented? (starts with `//` or `/*`)
2. Is it inline comment? (code before comment is still analyzed)
3. Console shows "Skipping ESLint issue in commented line X"?

**Debug:**
```javascript
// Check if comment detection is working:
// Look for console messages:
// "Skipping ESLint issue in commented line 25: no-undef"
```

### Issue: Prettier Errors Too Verbose

**Check:**
1. Message should be informational (ℹ️) not warning (⚠️)
2. Message should be truncated to 100 chars
3. Should include script name

**Expected Format:**
```
ℹ️ Prettier formatting skipped for [Script Name]: [First 100 chars of error]
```

---

## Regression Testing

### Features That Should Still Work

- [x] Table sorting (all columns)
- [x] Filtering (severity, category, object)
- [x] Code context display
- [x] Hierarchical classification
- [x] DONE button
- [x] Results count
- [x] Export functionality (if exists)
- [x] Column resizing

### Features That Should Be Improved

- [x] No duplicate rows
- [x] No analysis of commented code
- [x] Better Prettier error messages
- [x] Clearer console logging

---

## Success Criteria

### All Tests Pass When:

1. ✅ **No duplicate rows** in results table
2. ✅ **Commented code is skipped** (no errors for commented lines)
3. ✅ **Prettier errors are informational** (not warnings)
4. ✅ **Console shows clear logging** with summary
5. ✅ **All existing features work** correctly
6. ✅ **Performance is acceptable** (< 30s for large files)
7. ✅ **No JavaScript errors** in console

---

## Reporting Issues

If you find issues, please provide:

1. **Screenshot** of the problem
2. **Console output** (full log)
3. **TWX file** (if possible) or description of content
4. **Steps to reproduce**
5. **Expected vs actual behavior**

---

## Quick Reference

### Console Commands

```javascript
// Check if deduplication is working
// Look for: "Duplicates filtered out: X"

// Check if comment skipping is working
// Look for: "Skipping ESLint issue in commented line X"

// Check Prettier status
// Look for: "ℹ️ Prettier formatting skipped for..."

// View full analysis log
// Scroll to: "=== Analyzing Script: ..."
```

### Browser Cache Clear

- **Chrome/Edge:** Ctrl+Shift+Delete → Clear browsing data
- **Firefox:** Ctrl+Shift+Delete → Clear recent history
- **Safari:** Cmd+Option+E → Empty caches

### Hard Refresh

- **Windows:** Ctrl+F5 or Ctrl+Shift+R
- **Mac:** Cmd+Shift+R

---

**Ready to Test!** 🚀

Follow the test cases in order, check console output, and verify all success criteria are met.

