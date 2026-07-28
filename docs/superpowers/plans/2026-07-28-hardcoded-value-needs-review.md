# Hardcoded Value Needs-Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the `hardcoded-value` rule as a needs-review finding for one-to-three-character uppercase string literals.

**Architecture:** Reuse the existing Acorn AST walk in `TWXAnalyzer._needsReview` and the shared `_add` finding builder. Add no dependency or new abstraction.

**Tech Stack:** Node.js CommonJS, Acorn, acorn-walk, Node `assert`.

## Global Constraints

- Rule ID: `hardcoded-value`.
- Rule name: `Hardcoded business constant`.
- Status: `needs-review`; it must not affect critical or warning totals.
- Match only string literals satisfying `/^[A-Z]{1,3}$/`.
- Preserve the analyzer's existing inventory exclusions and location reporting.

---

### Task 1: Restore the hardcoded-value review rule

**Files:**
- Modify: `src/parser/analyzer.js`
- Test: `test-analyzer-v2.js`

**Interfaces:**
- Consumes: `TWXAnalyzer._needsReview(ast, unit, findings)` and `TWXAnalyzer._add(findings, ruleId, unit, position, message, evidence)`.
- Produces: analysis findings with `ruleId === 'hardcoded-value'` and `status === 'needs-review'`.

- [ ] **Step 1: Write the failing test**

Add a small analyzer invocation that checks `"Y"`, `"NO"`, and `"ERR"` are reported as `hardcoded-value`, that every matching finding is `needs-review`, and that `"Approved"`, `"lower"`, and `"LONG"` are ignored.

```js
const hardcodedFindings = source => new TWXAnalyzer([{
  id: 'hardcoded-service',
  name: 'Hardcoded service',
  type: 'process',
  subType: '12',
  details: { elements: { scriptTasks: [{ id: 'hardcoded-task', name: 'Hardcoded task', script: source }] } }
}]).analyze().findings.filter(finding => finding.ruleId === 'hardcoded-value')

const businessConstants = hardcodedFindings("var a = 'Y'; var b = 'NO'; var c = 'ERR';")
assert.equal(businessConstants.length, 3)
assert.ok(businessConstants.every(finding => finding.status === 'needs-review'))
assert.equal(hardcodedFindings("var a = 'Approved'; var b = 'lower'; var c = 'LONG';").length, 0)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-analyzer-v2.js`

Expected: FAIL because no `hardcoded-value` findings exist.

- [ ] **Step 3: Write the minimal implementation**

Add this rule entry:

```js
'hardcoded-value': ['needs-review', null, 'Hardcoded business constant', 'Consider replacing the literal with an enum or configuration value if it represents a shared business state.']
```

Add this visitor to `_needsReview`:

```js
Literal: node => {
  if (typeof node.value === 'string' && /^[A-Z]{1,3}$/.test(node.value)) add('hardcoded-value', node, `The string literal "${node.value}" may be a hardcoded business constant.`, ['The literal contains one to three uppercase letters.'])
}
```

- [ ] **Step 4: Run verification**

Run: `npm test`

Expected: PASS with `analyzer v2 checks passed`.

- [ ] **Step 5: Commit**

```powershell
git add -- src/parser/analyzer.js test-analyzer-v2.js docs/superpowers/plans/2026-07-28-hardcoded-value-needs-review.md
git commit -m "feat: restore hardcoded value review rule"
```
