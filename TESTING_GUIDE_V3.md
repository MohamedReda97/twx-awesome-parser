# Testing Guide for Static Analysis Fixes V3

## Quick Start

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Restart the application**
3. **Open browser console** (F12)
4. **Run Static Code Review** on your TWX file
5. **Check results** against expected output below

---

## Expected Results

### Console Output

You should see output similar to this:

```
=== Analyzing Script: Coachflow Script Pattern (ID: 12345) ===
Skipping UNKNOWN ESLint issue at line 1: Parsing error: Expecting Unicode escape sequence
Skipping UNKNOWN ESLint issue at line 1: Parsing error: Expecting Unicode escape sequence
Skipping UNKNOWN ESLint issue at line 1: Parsing error: Expecting Unicode escape sequence
Total UNKNOWN issues skipped in Coachflow Script Pattern: 3
ESLint found 5 valid issues (after filtering)
Custom analysis found 2 issues
Total issues for this script: 7

=== Generating Static Analysis Table ===
Total script results: 1
Total issues collected: 7
UNKNOWN issues filtered: 0

Unique issues after deduplication: 7
Duplicates removed: 0

=== Table Generation Complete ===
Total unique issues displayed: 7
Duplicates filtered out: 0
UNKNOWN issues filtered out: 0
Categories found: 3
```

### Results Table

✅ **No duplicate rows** - Each issue appears exactly once  
✅ **No UNKNOWN category** - All rows have valid categories  
✅ **No unknown rule** - All rows have valid rule names  
✅ **Line 14 appears** - If you have nested loops at line 14, it should show  

---

## Test Case 1: Line 14 Issue (Regression Check)

### Objective
Verify that the line 14 issue that disappeared in V2 now appears correctly.

### Steps
1. Run Static Code Review on your TWX file
2. Look for issues at line 14 in the results table
3. Check console output

### Expected Results
✅ **Line 14 issue appears in table**  
✅ **Appears exactly once** (not missing, not duplicated)  
✅ **Console shows:** `Duplicates removed: 0`  

### If Line 14 is Missing
- Check console for: `Filtering out UNKNOWN issue at line 14`
- If you see this, the issue at line 14 has no ruleId (parsing error)
- This is correct behavior - UNKNOWN issues should be filtered

---

## Test Case 2: No Duplicate Rows

### Objective
Verify that duplicate rows no longer appear in the results table.

### Steps
1. Run Static Code Review
2. Scan the results table for duplicate rows
3. Look for rows with:
   - Same script name
   - Same line number
   - Same rule
   - Same description

### Expected Results
✅ **No duplicate rows visible**  
✅ **Console shows:** `Duplicates removed: X` (where X >= 0)  
✅ **If X > 0:** Console shows details like `Duplicate #1 found at index 5: custom-nested-loops at line 14`  

### What Duplicates Look Like (Should NOT See)
```
| Script Name | Line | Rule | Description |
|-------------|------|------|-------------|
| Script A    | 14   | R1   | Issue X     |  ← First occurrence
| Script A    | 14   | R1   | Issue X     |  ← Duplicate (should be removed)
```

---

## Test Case 3: UNKNOWN Issues Filtered

### Objective
Verify that issues with UNKNOWN category or rule are filtered out.

### Steps
1. Run Static Code Review
2. Check results table for any rows with:
   - Category showing "UNKNOWN"
   - Rule showing "unknown"
3. Check console output

### Expected Results
✅ **No UNKNOWN category in table**  
✅ **No unknown rule in table**  
✅ **Console shows:** `Skipping UNKNOWN ESLint issue at line X`  
✅ **Console shows:** `Total UNKNOWN issues skipped in [Script]: X`  
✅ **Console shows:** `UNKNOWN issues filtered out: X`  

### What UNKNOWN Issues Look Like (Should NOT See)

Based on your screenshot, these should be filtered:

```
| Category | Rule    | Description                                    |
|----------|---------|------------------------------------------------|
| UNKNOWN  | unknown | Parsing error: Expecting Unicode escape...    |  ← Should be filtered
```

---

## Test Case 4: Commented Code Still Skipped

### Objective
Verify that the V2 fix for commented code still works.

### Steps
1. Add a script with commented code:
   ```javascript
   // var x = {broken syntax
   var y = 10; // Valid code
   ```
2. Run Static Code Review
3. Check results

### Expected Results
✅ **No errors for commented lines**  
✅ **Console shows:** `Skipping ESLint issue in commented line X`  

---

## Test Case 5: All Features Still Work

### Objective
Verify no regressions in existing functionality.

### Features to Test

#### Sorting
- [ ] Click each column header
- [ ] Verify ascending/descending sort works
- [ ] Check "Issue Classification" column sorts by severity

#### Filtering
- [ ] Use severity filter (ERROR, WARNING, INFO)
- [ ] Use category filter
- [ ] Use object name filter
- [ ] Verify results update correctly

#### Code Context
- [ ] Verify code shows full lines (no truncation)
- [ ] Check line numbers are visible
- [ ] Verify error line is highlighted
- [ ] Test horizontal scroll for long lines

#### Hierarchical Classification
- [ ] Verify 3-level hierarchy:
  - Level 1: Severity (ERROR/WARNING/INFO)
  - Level 2: Category (└─ Performance)
  - Level 3: Rule (└─ custom-nested-loops)

#### Actions
- [ ] Click "DONE" button
- [ ] Verify row is removed
- [ ] Check results count updates

---

## Comparing Your Screenshot

### Your Screenshot Showed (BEFORE V3)

```
| Script Name              | Object Name | Category | Rule    | Description                    | Line |
|--------------------------|-------------|----------|---------|--------------------------------|------|
| Coachflow Script Pattern | ACT04 - ODC | ERROR    | UNKNOWN | Parsing error: Expecting...    | 1    |
| Coachflow Script Pattern | ACT04 - ODC | ERROR    | UNKNOWN | Parsing error: Expecting...    | 1    |  ← Duplicate
| Coachflow Script Pattern | ACT04 - ODC | ERROR    | UNKNOWN | Parsing error: Expecting...    | 1    |  ← Duplicate
```

**Issues:**
1. ❌ Three duplicate rows
2. ❌ Category is "UNKNOWN"
3. ❌ Rule is "unknown"

### After V3 Fixes (EXPECTED)

```
| Script Name              | Object Name | Category    | Rule              | Description                    | Line |
|--------------------------|-------------|-------------|-------------------|--------------------------------|------|
| Coachflow Script Pattern | ACT04 - ODC | Performance | custom-nested-... | Nested loops detected...       | 14   |
| Coachflow Script Pattern | ACT04 - ODC | Syntax      | no-unused-vars    | 'x' is defined but never...    | 25   |
```

**Improvements:**
1. ✅ No duplicate rows
2. ✅ No UNKNOWN category
3. ✅ No unknown rule
4. ✅ Only valid, actionable issues shown

---

## Console Monitoring

### What to Look For

#### Backend Logs (Per Script)

```
=== Analyzing Script: [Name] (ID: [ID]) ===
Skipping UNKNOWN ESLint issue at line X: [message]  ← UNKNOWN filtered at source
Total UNKNOWN issues skipped in [Name]: X
ESLint found X valid issues (after filtering)
Custom analysis found X issues
Total issues for this script: X
```

#### Frontend Logs (Table Generation)

```
=== Generating Static Analysis Table ===
Total script results: X
Total issues collected: X
UNKNOWN issues filtered: X  ← Safety net (should be 0 if backend works)

Duplicate #1 found at index X: [rule] at line X in [script]  ← If duplicates exist
Duplicate #2 found at index X: [rule] at line X in [script]

Unique issues after deduplication: X
Duplicates removed: X

=== Table Generation Complete ===
Total unique issues displayed: X
Duplicates filtered out: X
UNKNOWN issues filtered out: X
Categories found: X
```

---

## Troubleshooting

### Issue: Still Seeing Duplicates

**Check:**
1. Browser cache cleared?
2. Application restarted?
3. Console shows "Duplicates removed: X"?

**If X = 0 but still see duplicates:**
- Take screenshot
- Copy console output
- Report with details

**If X > 0:**
- This is working correctly
- Duplicates are being filtered
- Check that table doesn't show them

### Issue: Still Seeing UNKNOWN

**Check:**
1. Console shows "Skipping UNKNOWN ESLint issue"?
2. Console shows "Total UNKNOWN issues skipped: X"?

**If yes but still see UNKNOWN in table:**
- Clear browser cache again
- Hard refresh (Ctrl+Shift+R)
- Check console for JavaScript errors

**If no:**
- Backend filtering may not be working
- Check that StaticAnalysisService.js changes were applied
- Restart Node.js server

### Issue: Line 14 Still Missing

**Check:**
1. Does line 14 have a nested loop?
2. Is line 14 commented out?
3. Console shows any message about line 14?

**If line 14 has parsing error:**
- It will be filtered as UNKNOWN
- This is correct behavior
- Fix the syntax error first

**If line 14 has valid nested loop:**
- Should appear in table
- Check console for "Custom analysis found X issues"
- Check if custom analysis is running

---

## Success Criteria

### All Tests Pass When:

1. ✅ **Line 14 issue appears** (if it exists and is valid)
2. ✅ **No duplicate rows** in results table
3. ✅ **No UNKNOWN category or rule** in table
4. ✅ **Console shows clear logging** with all counts
5. ✅ **Duplicates removed count** is accurate
6. ✅ **UNKNOWN filtered count** is accurate
7. ✅ **All existing features work** correctly
8. ✅ **No JavaScript errors** in console

---

## Quick Verification Checklist

Use this for rapid testing:

- [ ] Clear cache & restart
- [ ] Run analysis
- [ ] Open console (F12)
- [ ] Check: No duplicate rows in table
- [ ] Check: No UNKNOWN in table
- [ ] Check: Console shows summary with counts
- [ ] Check: Line 14 appears (if applicable)
- [ ] Test: Sorting works
- [ ] Test: Filtering works
- [ ] Test: DONE button works
- [ ] Check: No JavaScript errors

---

## Reporting Results

### If All Tests Pass ✅

Report:
- "All tests passed"
- Screenshot of results table
- Copy of console summary

### If Tests Fail ❌

Report:
1. **Which test failed**
2. **Screenshot** of the issue
3. **Full console output** (copy all text)
4. **Steps to reproduce**
5. **Expected vs actual behavior**

---

## Performance Check

### Expected Performance

- **Small TWX (1-5 scripts):** < 2 seconds
- **Medium TWX (5-20 scripts):** < 10 seconds
- **Large TWX (20+ scripts):** < 30 seconds

### If Slower

- Check console for excessive logging
- Check for JavaScript errors
- Check network tab for delays

---

## Next Steps After Testing

### If All Tests Pass
1. Mark as complete
2. Document any observations
3. Consider deploying to production

### If Tests Fail
1. Document failures
2. Provide requested information
3. Wait for additional fixes

---

**Ready to Test!** 🚀

Follow the test cases in order and report results.

