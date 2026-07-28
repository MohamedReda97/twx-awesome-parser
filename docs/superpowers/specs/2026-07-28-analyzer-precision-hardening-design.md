# Analyzer precision hardening

## Goal

Make the server-side analyzer report confirmed, actionable BAW script defects without treating platform globals, declared BAW variables, or non-JavaScript BAW templates as JavaScript errors.

## Evidence from the latest ODC run

- 38 critical findings reference six IBM BAW system-provided names.
- 8 of 12 syntax findings come from `text/plain` SQL or HTML template tasks.
- 46 of 144 undeclared-process-variable warnings refer to declarations present in the TWX but omitted from extracted BPD data.
- Service scripts are inventoried twice through `elements.scriptTasks` and `details.scripts`.
- BAW scripts using carriage-return line endings can receive incorrect line/snippet locations.
- ESLint's recommended set produced 676 findings, dominated by formatting and harmless boolean-cast findings. The useful findings were one active `debugger` statement and missing `parseInt` radix arguments.

## Approved behavior

### BAW globals

Treat these names as predefined in addition to the existing BAW globals:

- `alert`
- `resetDataSyncronizationVariables`
- `initializeDataSyncronizationVariables`
- `require`
- `window`
- `page`

They must not produce `undefined-identifier` findings.

### Script formats

Preserve each task's `scriptFormat` during extraction.

- Analyze `text/x-javascript` tasks as JavaScript.
- Treat assignment scripts without a format as JavaScript.
- Exclude `text/plain` tasks from JavaScript analysis entirely.

This covers BAW SQL and HTML templates such as `<#=tw.env.LKP_DB_Schema#>.<#=tw.local.data#>` and `<html dir="ltl" lang="en">` without regex-based syntax suppression. These tasks are not counted as eligible JavaScript elements.

### Declared process variables

Extract BPMN `dataObject` declarations and merge their names into the owning object's variable declarations. A `tw.local.<name>` reference is declared when the exact name exists in either the existing process-variable model or the extracted BPMN data objects.

Do not infer declarations from assignment alone. Variables absent from both declaration sources remain warnings.

### Finding identity

Do not analyze the same service task twice when `elements.scriptTasks` and `details.scripts` contain the same object, task name, and source. Distinct elements remain distinct.

### Warning locations

Calculate line, column, and snippet using all JavaScript line endings: CRLF, LF, CR, U+2028, and U+2029.

Every confirmed warning card displays:

`Object name › Element name · Line N, Column M`

The source snippet remains directly below the message.

### Additional correctness checks

Reuse the existing Acorn AST pass rather than adding ESLint as a runtime dependency. Add only the two checks demonstrated by the current application:

- Active `debugger` statement: confirmed warning.
- `parseInt` call without an explicit radix: confirmed warning.

Do not enable ESLint's full recommended preset, formatting rules, `no-extra-boolean-cast`, broad `no-empty`, or `no-use-before-define`; the current application demonstrates that these would be noisy or misleading.

## Verification

Automated tests cover:

- all six predefined names;
- `text/plain` SQL and HTML exclusion while malformed JavaScript remains critical;
- declared and undeclared BPMN data-object variables;
- duplicate service inventory removal;
- CRLF, LF, and CR warning locations;
- `debugger` and missing-radix warnings with locations;
- existing analyzer grouping and schema behavior.

The final check reparses `ODC.twx` and compares counts and examples against the latest report. Expected outcomes include removal of the 38 named-global criticals, exclusion of the 8 template syntax findings, suppression of declaration-backed variable warnings, retention of genuine JavaScript syntax failures, and new actionable debugger/radix warnings.
