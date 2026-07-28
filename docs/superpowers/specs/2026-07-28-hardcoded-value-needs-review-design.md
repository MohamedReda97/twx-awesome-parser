# Hardcoded Business Constant — Needs Review

## Goal

Restore the former `hardcoded-value` analyzer rule so it can be evaluated without inflating confirmed warning counts.

## Behavior

- Inspect application-owned server-side JavaScript already accepted by the analyzer inventory.
- Report uppercase string literals containing one to three ASCII letters, such as `"Y"`, `"NO"`, or `"ERR"`.
- Emit rule ID `hardcoded-value` with the name `Hardcoded business constant` and status `needs-review`.
- Include the existing object, element, line, column, snippet, evidence, and recommendation fields.
- Do not include these findings in critical or warning totals.
- Ignore ordinary strings, lowercase strings, empty strings, strings longer than three characters, toolkit scripts, and scripts excluded from JavaScript analysis.

## Implementation

Reuse the analyzer's existing AST walk and finding builder. Add the rule to `RULES` and inspect `Literal` nodes inside `_needsReview`; no new parser, abstraction, or dependency is needed.

## Verification

Add one regression block proving that an uppercase one-to-three-character literal is reported as `needs-review`, while ordinary and longer strings are not. Run the existing analyzer test suite.
