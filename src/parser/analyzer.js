const acorn = require('acorn')
const { parse: parseLoose } = require('acorn-loose')
const walk = require('acorn-walk')
const { analyze: analyzeScope } = require('eslint-scope')
const crypto = require('crypto')

const SUPPORTED_BAW_VERSIONS = ['19', '20', '21', '23', '24']
const KNOWN_GLOBALS = new Set([
  'tw', 'log', 'Object', 'Array', 'Function', 'String', 'Number', 'Boolean', 'Date', 'Math',
  'RegExp', 'Error', 'TypeError', 'RangeError', 'EvalError', 'ReferenceError', 'SyntaxError',
  'URIError', 'NaN', 'Infinity', 'undefined', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'eval', 'JSON', 'Packages',
  'java', 'javax', 'com', 'org', 'importPackage', 'importClass', 'JavaImporter', 'TWDate', 'TWSearch',
  'TWProcessInstance', 'TWProcess', 'TWProcessApp', 'TWTask', 'TWUser', 'TWRole', 'TWTeam',
  'TWDocument', 'TWManagedFile', 'TWObject', 'TWMap', 'XMLDocument', 'XMLElement', 'Serializer',
  'Map', 'Record', 'IndexedMap', 'console', 'Set', 'Promise'
])

const RULES = {
  'javascript-syntax-error': ['confirmed', 'critical', 'JavaScript syntax error', 'Fix the invalid JavaScript before deploying this script.'],
  'undefined-identifier': ['confirmed', 'critical', 'Undefined identifier', 'Define the identifier, import it, or correct its name.'],
  'division-by-zero': ['confirmed', 'critical', 'Definite division by zero', 'Guard the divisor or assign a non-zero value before division.'],
  'null-or-undefined-access': ['confirmed', 'critical', 'Definite null or undefined access', 'Initialize or guard the value before accessing a property.'],
  'unsafe-dynamic-execution': ['confirmed', 'critical', 'Unsafe dynamic execution', 'Do not pass process input directly to eval; use a fixed implementation instead.'],
  'undeclared-process-variable': ['confirmed', 'warning', 'Undeclared process variable', 'Declare the process variable or correct the tw.local member name.'],
  'loop-with-no-demonstrable-exit': ['confirmed', 'warning', 'Loop with no demonstrable exit', 'Add a reachable break, return, throw, or a terminating condition.'],
  'empty-catch': ['needs-review', null, 'Empty catch block', 'Handle, log, or explicitly document the ignored error.'],
  'dynamic-sql': ['needs-review', null, 'Dynamic SQL construction', 'Use parameterized queries and verify that every dynamic value is safe.'],
  'embedded-secret': ['needs-review', null, 'Possible embedded secret', 'Move the credential-like value to a secure configuration source.']
}

function appType (object) {
  if (object.type === 'process' && (object.subType === '10' || object.details?.processType === '10')) return 'CSHS'
  if (object.type === 'process') return 'Service'
  if (object.type === 'bpd') return 'BPD'
  return null
}

function asArray (value) {
  return Array.isArray(value) ? value : value ? [value] : []
}

function lineAt (source, position) {
  const before = source.slice(0, position)
  const line = before.split(/\r?\n/).length
  const start = before.lastIndexOf('\n') + 1
  const end = source.indexOf('\n', position)
  return { line, column: position - start + 1, snippet: source.slice(start, end === -1 ? source.length : end).trim() }
}

function targetVersion (options) {
  const override = String(options.targetBawVersion || '').match(/(?:^|\D)(19|20|21|23|24)(?:\D|$)/)
  if (override) return { value: override[1], source: 'override' }
  const build = String(options.metadata?.buildInfo?.buildVersion || '')
  const inferred = build.match(/(?:^|\D)(19|20|21|23|24)(?:\D|$)/)
  return inferred ? { value: inferred[1], source: 'metadata' } : { value: null, source: 'unknown' }
}

function propertyName (node) {
  if (!node) return null
  if (node.type === 'Identifier') return node.name
  if (node.type === 'Literal') return String(node.value)
  return null
}

function expressionKey (node) {
  if (!node) return null
  if (node.type === 'Identifier') return node.name
  if (node.type !== 'MemberExpression') return null
  const base = expressionKey(node.object)
  const property = node.computed ? propertyName(node.property) : node.property?.name
  return base && property ? `${base}.${property}` : null
}

function isLiteral (node, value) {
  return node?.type === 'Literal' && node.value === value
}

function isLoop (node) {
  return ['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement'].includes(node.type)
}

function hasLoopExit (loop) {
  let exit = false
  walk.fullAncestor(loop.body, (node, ancestors) => {
    if (exit) return
    if ((node.type === 'ReturnStatement' || node.type === 'ThrowStatement') && !ancestors.some(ancestor => /Function/.test(ancestor.type))) exit = true
    if (node.type === 'BreakStatement') {
      const nestedLoop = ancestors.slice(1, -1).some(ancestor => ancestor !== loop && isLoop(ancestor))
      if (!nestedLoop) exit = true
    }
  })
  return exit
}

class TWXAnalyzer {
  constructor (objects = [], options = {}) {
    this.objects = asArray(objects).filter(object => object && object.source !== 'toolkit')
    this.options = options || {}
    this.version = targetVersion(this.options)
  }

  analyze () {
    const context = this._buildContext()
    const inventory = this._inventory(context)
    const findings = []
    const skipped = []

    for (const unit of inventory) this._analyzeUnit(unit, context, findings, skipped)

    const summary = this._summary(findings)
    return {
      schemaVersion: 2,
      status: skipped.length ? 'partial' : 'complete',
      meta: {
        sourceFile: this.options.sourceFile || null,
        generatedAt: new Date().toISOString(),
        targetBawVersion: this.version.value,
        targetVersionSource: this.version.source,
        scope: 'app-server-side',
        toolkitsUsedAsContext: asArray(this.options.toolkits).length,
        toolkitContractsUsed: context.toolkitNames.size
      },
      coverage: {
        eligibleAppElements: inventory.length,
        analyzedAppElements: inventory.length - skipped.length,
        skippedAppElements: skipped.length,
        skipped
      },
      summary,
      byAppType: this._byAppType(findings, inventory),
      diagnostics: this.version.value ? [] : [{ code: 'BAW_VERSION_UNKNOWN', message: 'No supported BAW version was found; version-specific checks were skipped.' }],
      findings
    }
  }

  _buildContext () {
    const appNames = new Set()
    const toolkitNames = new Set()
    const declaredVariables = new Map()
    for (const object of this.objects) {
      if (object.name) appNames.add(object.name)
      const names = new Set()
      for (const group of Object.values(object.details?.variables || {})) {
        for (const variable of asArray(group)) if (variable?.name) names.add(variable.name)
      }
      declaredVariables.set(object.id, names)
    }
    for (const toolkit of asArray(this.options.toolkits)) {
      for (const object of asArray(toolkit?.objects)) if (object?.name) toolkitNames.add(object.name)
    }
    return { appNames, toolkitNames, declaredVariables }
  }

  _inventory (context) {
    const units = []
    const seen = new Set()
    const add = (object, elementType, elementName, elementId, scriptRole, source) => {
      if (!source || !String(source).trim()) return
      const key = `${object.id || object.name}\u0000${source}`
      if (seen.has(key)) return
      seen.add(key)
      units.push({ object, objectType: appType(object), elementType, elementName: elementName || 'Unnamed', elementId: elementId || elementName || 'script', scriptRole, source: String(source), declaredVariables: context.declaredVariables.get(object.id) || new Set() })
    }
    for (const object of this.objects) {
      if (!appType(object)) continue
      const elements = object.details?.elements || {}
      for (const item of asArray(elements.scriptTasks)) {
        add(object, 'scriptTask', item.name, item.id, 'script-task', item.script)
        add(object, 'scriptTask', item.name, `${item.id || item.name}-pre`, 'pre-assignment', item.preAssignment)
        add(object, 'scriptTask', item.name, `${item.id || item.name}-post`, 'post-assignment', item.postAssignment)
      }
      for (const type of ['formTasks', 'callActivities']) {
        for (const item of asArray(elements[type])) {
          add(object, type.slice(0, -1), item.name, `${item.id || item.name}-pre`, 'pre-assignment', item.preAssignment)
          add(object, type.slice(0, -1), item.name, `${item.id || item.name}-post`, 'post-assignment', item.postAssignment)
        }
      }
      for (const item of asArray(object.details?.scripts)) add(object, 'serviceScript', item.name, `service-${item.name || 'script'}`, 'implementation', item.script)
    }
    return units
  }

  _analyzeUnit (unit, context, findings, skipped) {
    let ast
    try {
      ast = acorn.parse(unit.source, { ecmaVersion: 2020, sourceType: 'script', locations: true })
    } catch (error) {
      this._add(findings, 'javascript-syntax-error', unit, error.pos || 0, `JavaScript cannot be parsed: ${error.message}`, ['Strict Acorn parsing failed.'])
      skipped.push({ objectId: unit.object.id, elementId: unit.elementId, reason: 'javascript-syntax-error' })
      try { parseLoose(unit.source, { ecmaVersion: 2020, locations: true }) } catch (_) {}
      return
    }

    this._undefinedIdentifiers(ast, unit, context, findings)
    this._undeclaredProcessVariables(ast, unit, findings)
    const values = this._constantValues(ast)
    this._divisionByZero(ast, values, unit, findings)
    this._nullAccess(ast, values, unit, findings)
    this._unsafeEval(ast, values, unit, findings)
    this._loops(ast, unit, findings)
    this._needsReview(ast, unit, findings)
  }

  _undefinedIdentifiers (ast, unit, context, findings) {
    let scope
    try { scope = analyzeScope(ast, { ecmaVersion: 2020, sourceType: 'script', optimistic: true, ignoreEval: true }).globalScope } catch (_) { return }
    for (const reference of scope.through || []) {
      const name = reference.identifier?.name
      if (!name || KNOWN_GLOBALS.has(name) || unit.declaredVariables.has(name) || context.appNames.has(name) || context.toolkitNames.has(name)) continue
      this._add(findings, 'undefined-identifier', unit, reference.identifier.start, `${name} is referenced but is not declared.`, [`No local declaration or application/toolkit context matches ${name}.`])
    }
  }

  _undeclaredProcessVariables (ast, unit, findings) {
    walk.simple(ast, {
      MemberExpression: node => {
        if (expressionKey(node.object) !== 'tw.local') return
        const name = node.computed ? propertyName(node.property) : node.property?.name
        if (name && !unit.declaredVariables.has(name)) this._add(findings, 'undeclared-process-variable', unit, node.property.start, `tw.local.${name} is used but is not declared for this application element.`, [`The application variable model has no ${name} declaration.`])
      }
    })
  }

  _constantValues (ast) {
    const values = new Map()
    const remember = (left, right) => {
      const key = expressionKey(left)
      if (!key) return
      if (isLiteral(right, 0)) values.set(key, 0)
      else if (isLiteral(right, null) || (right.type === 'Identifier' && right.name === 'undefined')) values.set(key, null)
    }
    walk.simple(ast, {
      VariableDeclarator: node => remember(node.id, node.init),
      AssignmentExpression: node => { if (node.operator === '=') remember(node.left, node.right) }
    })
    return values
  }

  _divisionByZero (ast, values, unit, findings) {
    walk.simple(ast, {
      BinaryExpression: node => {
        if (node.operator !== '/') return
        const key = expressionKey(node.right)
        if (isLiteral(node.right, 0) || values.get(key) === 0) this._add(findings, 'division-by-zero', unit, node.right.start, 'This division uses a value proven to be zero.', ['The divisor is a zero literal or a direct local zero assignment.'])
      }
    })
  }

  _nullAccess (ast, values, unit, findings) {
    walk.simple(ast, {
      MemberExpression: node => {
        const key = expressionKey(node.object)
        if (isLiteral(node.object, null) || values.get(key) === null) this._add(findings, 'null-or-undefined-access', unit, node.object.start, 'This property access uses a value proven to be null or undefined.', ['The receiver is a null/undefined literal or a direct local null assignment.'])
      }
    })
  }

  _unsafeEval (ast, values, unit, findings) {
    walk.simple(ast, {
      CallExpression: node => {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'eval') return
        const key = expressionKey(node.arguments[0])
        if (key?.startsWith('tw.local.') || (key && typeof values.get(key) === 'string' && values.get(key).startsWith('tw.local.'))) this._add(findings, 'unsafe-dynamic-execution', unit, node.start, 'eval receives a direct application process value.', ['Direct tw.local input reaches eval without validation.'])
      }
    })
  }

  _loops (ast, unit, findings) {
    walk.simple(ast, {
      WhileStatement: node => { if (isLiteral(node.test, true) && !hasLoopExit(node)) this._add(findings, 'loop-with-no-demonstrable-exit', unit, node.start, 'This unconditional loop has no local break, return, or throw.', ['The loop condition is true and its body has no supported exit.']) },
      ForStatement: node => { if (!node.test && !hasLoopExit(node)) this._add(findings, 'loop-with-no-demonstrable-exit', unit, node.start, 'This unconditional loop has no local break, return, or throw.', ['The loop has no test and its body has no supported exit.']) }
    })
  }

  _needsReview (ast, unit, findings) {
    const add = (rule, node, message, evidence) => this._add(findings, rule, unit, node.start, message, evidence)
    walk.simple(ast, {
      CatchClause: node => { if (node.body?.body?.length === 0) add('empty-catch', node, 'This catch block silently discards an error.', ['The catch block is empty.']) },
      VariableDeclarator: node => {
        if (node.init?.type === 'BinaryExpression' && /(sql|query)/i.test(node.id?.name || '')) add('dynamic-sql', node, 'A SQL-looking value is assembled through concatenation.', ['The variable name suggests SQL/query text and its value is composed dynamically.'])
        if (node.init?.type === 'Literal' && typeof node.init.value === 'string' && /password|passwd|secret|token|api[_-]?key/i.test(node.id?.name || '') && node.init.value.length >= 6) add('embedded-secret', node, 'A credential-like value is embedded in source.', ['A credential-like variable name has a string literal value.'])
      },
      CallExpression: node => {
        const method = node.callee.type === 'MemberExpression' ? propertyName(node.callee.property) : null
        if (/execute|query|select|update|insert|delete/i.test(method || '') && node.arguments[0]?.type === 'BinaryExpression') add('dynamic-sql', node, 'A query-looking method receives a concatenated value.', ['The query argument is constructed dynamically.'])
      }
    })
  }

  _add (findings, ruleId, unit, position, message, evidence) {
    const [status, severity, ruleName, remediation] = RULES[ruleId]
    const location = lineAt(unit.source, position || 0)
    const id = crypto.createHash('sha1').update([ruleId, unit.object.id, unit.elementId, unit.scriptRole, location.line, location.column].join('\u0000')).digest('hex').slice(0, 16)
    if (findings.some(finding => finding.id === id)) return
    findings.push({
      id,
      status,
      severity,
      confidence: status === 'confirmed' ? 'high' : 'medium',
      ruleId,
      ruleName,
      objectId: unit.object.id,
      objectName: unit.object.name,
      objectType: unit.objectType,
      elementId: unit.elementId,
      elementName: unit.elementName,
      elementType: unit.elementType,
      scriptRole: unit.scriptRole,
      message,
      location,
      evidence,
      affectedBawVersions: SUPPORTED_BAW_VERSIONS,
      remediation
    })
  }

  _summary (findings) {
    const confirmed = severity => findings.filter(finding => finding.status === 'confirmed' && finding.severity === severity)
    const countElements = list => new Set(list.map(finding => `${finding.objectId}\u0000${finding.elementId}`)).size
    const critical = confirmed('critical')
    const warnings = confirmed('warning')
    return { critical: critical.length, warnings: warnings.length, needsReview: findings.filter(finding => finding.status === 'needs-review').length, elementsWithCritical: countElements(critical), elementsWithWarnings: countElements(warnings) }
  }

  _byAppType (findings, inventory) {
    const result = { CSHS: { elements: 0, critical: 0, warnings: 0, needsReview: 0 }, Service: { elements: 0, critical: 0, warnings: 0, needsReview: 0 }, BPD: { elements: 0, critical: 0, warnings: 0, needsReview: 0 } }
    for (const unit of inventory) result[unit.objectType].elements++
    for (const finding of findings) {
      const type = result[finding.objectType]
      if (!type) continue
      if (finding.status === 'needs-review') type.needsReview++
      else type[finding.severity]++
    }
    return result
  }
}

module.exports = TWXAnalyzer
