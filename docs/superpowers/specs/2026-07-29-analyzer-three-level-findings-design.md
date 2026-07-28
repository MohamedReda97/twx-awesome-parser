# Analyzer Three-Level Findings Hierarchy

## Goal

Use the same collapsible hierarchy for Confirmed critical, Confirmed warnings, and Needs review findings so large reports remain easy to scan.

## Hierarchy

Every non-empty status section renders as nested native `<details>` elements:

1. Status section: Confirmed critical, Confirmed warnings, or Needs review.
2. Finding type: the finding's `ruleName`, falling back to `ruleId` and then `Other finding`.
3. Element: application object and element identity.
4. Existing finding cards containing the issue details.

Example:

```text
Confirmed critical (2)
└─ JavaScript syntax error (2 findings · 2 elements)
   ├─ DB BPM Audit user tasks Service › Create scriptTask (1 finding)
   │  └─ Finding details
   └─ DB BPM Audit user tasks Service › Update new team scriptTask (1 finding)
      └─ Finding details
```

## Interaction

- All three status sections start collapsed.
- Expanding a status section reveals finding-type groups.
- Expanding a finding type reveals affected element groups.
- Expanding an element reveals its finding cards.
- Multiple groups may remain open simultaneously; no custom accordion state is added.
- Native `<details>` and `<summary>` provide keyboard interaction and disclosure semantics.

## Labels and Counts

- Status summaries show the total finding count and affected-element count.
- Finding-type summaries show the finding count and affected-element count for that type.
- Element summaries show the application object name/type, separator `›`, element name/type, and finding count.
- Element identity uses object ID/name plus element ID/name so elements with the same display name remain distinct.
- Existing critical, warning, and review colors continue at every level.

## Implementation

Change only the Analyzer rendering helpers and the minimal CSS needed to distinguish hierarchy depth. Reuse the existing `groupBy`, `renderFindingCard`, escaping, count logic, and native disclosure styles. The analysis JSON contract and analyzer engine remain unchanged.

## Verification

- Add a small renderer regression check covering all three statuses and the status → rule → element → finding nesting.
- Verify summaries and cards escape user-controlled names.
- Run the existing test suite and JavaScript syntax/lint checks.
- Inspect the Analyzer tab in the local browser using a report containing multiple rules and elements.
