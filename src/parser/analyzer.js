const acorn = require("acorn");
const { parse: acornLoose } = require("acorn-loose");
const walk = require("acorn-walk");
const { analyze: eslintAnalyze } = require("eslint-scope");
const { ScopeManager } = require("eslint-scope");

// === Root globals (register with eslint-scope) ===
const KNOWN_GLOBALS = new Set([
  // Root BPM
  "tw",

  // BPM logger
  "log",

  // Standard ECMAScript (Rhino/ES5)
  "Object",
  "Array",
  "Function",
  "String",
  "Number",
  "Boolean",
  "Date",
  "Math",
  "RegExp",
  "Error",
  "TypeError",
  "RangeError",
  "EvalError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "NaN",
  "Infinity",
  "undefined",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "eval",
  "JSON",

  // Rhino Java interop
  "Packages",
  "java",
  "javax",
  "com",
  "org",
  "importPackage",
  "importClass",
  "JavaImporter",

  // BPM constructor globals
  "TWDate",
  "TWSearch",
  "TWSearchColumn",
  "TWSearchCondition",
  "TWSearchOrdering",
  "TWProcessInstance",
  "TWProcess",
  "TWProcessApp",
  "TWProcessAppSnapshot",
  "TWTask",
  "TWUser",
  "TWRole",
  "TWParticipantGroup",
  "TWTeam",
  "TWDocument",
  "TWManagedFile",
  "TWLink",
  "TWEvent",
  "TWHolidaySchedule",
  "TWTimeSchedule",
  "TWTimePeriod",
  "TWWorkSchedule",
  "TWTimerInstance",
  "BPMRESTRequest",
  "BPMRESTResponse",
  "TWObject",
  "TWMap",
  "XMLDocument",
  "XMLElement",
  "XMLNodeList",
  "XMLNodelist",
  "Serializer",
  "Map",
  "Record",
  "IndexedMap",
  "JSONObject",
  "SLAViolationRecord",
  "TWUserLocalePreferences",
  "Step",
  "ConditionalActivity",
  "Integer",
  "Decimal",
  "Time",
  "URL",
  "ANY",

  // Legacy (BPM 7/8 heritage)
  "TW",
  "TWLogger",
  "ic",
  "listOf",
  "Alert",
  "Event",
  "TWScoreboard",
  "TWChart",
  "TWReport",
  "TWReportFilter",
  "TWAdhocStartingPoint",
  "TWSavedSearch",

  // ECMAScript built-ins that eslint-scope might not pick up in script mode
  "console",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "require",
  "module",
  "exports",

  // ES6 builtins
  "Set",
  "Promise",
  "Symbol",
  "WeakMap",
  "WeakSet",

  // Heritage coach system object
  "page",

  // Browser globals (used in BPM coach/client-side scripts)
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "screen",
  "localStorage",
  "sessionStorage",
  "alert",
  "confirm",
  "prompt",
  "fetch",
  "XMLHttpRequest",
  "FormData",
  "Blob",
  "FileReader",
  "URL",
  "Headers",
  "Request",
  "Response",
  "AbortController",
  "EventSource",
  "WebSocket",
  "Worker",
  "SharedWorker",
  "ServiceWorker",
  "Cache",
  "crypto",
  "performance",
  "MutationObserver",
  "IntersectionObserver",
  "ResizeObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "getComputedStyle",
  "matchMedia",
  "btoa",
  "atob",
  "structuredClone",
  "queueMicrotask",
  "reportError",

  // jQuery (very common in BPM)
  "$",
  "jQuery",

  // Browser frame references
  "parent",
  "self",
  "top",
  "frames",
  "globalThis",

  // Dojo (older BPM UI)
  "dojo",
  "dijit",
  "dojox",
]);

// === Namespace prefix whitelist ===
const KNOWN_NAMESPACES = [
  "tw.object",
  "tw.local",
  "tw.env",
  "tw.epv",
  "tw.system",
  "tw.system.user",
  "tw.system.process",
  "tw.system.processApp",
  "tw.system.model",
  "tw.system.org",
  "tw.system.bpd",
  "tw.system.step",
  "tw.system.install",
  "tw.system.serializer",
  "tw.system.environment",
  "tw.perf",
];

const RULES = {
  "undefined-variable": {
    severity: "critical",
    name: "Undefined variable reference",
  },
  "infinite-loop": {
    severity: "critical",
    name: "Infinite loop without break",
  },
  "division-by-zero": {
    severity: "critical",
    name: "Division by zero",
  },
  "hardcoded-value": {
    severity: "warning",
    name: "Hardcoded business constant",
  },
};

class TWXAnalyzer {
  constructor(parsedObjects) {
    this.objects = parsedObjects;
  }

  analyze() {
    const findings = [];
    for (const obj of this.objects) {
      if (!obj.details || !obj.details.elements) continue;
      if (obj.name && /instance view/i.test(obj.name)) continue;
      this._analyzeObject(obj, findings);
    }
    return {
      summary: this._summarize(findings),
      byType: this._byType(findings),
      findings,
    };
  }

  _analyzeObject(obj, findings) {
    const elems = obj.details.elements;

    // Collect all declared variables for this object
    const declaredVars = new Set();
    if (obj.details.variables) {
      for (const v of obj.details.variables.input || []) declaredVars.add(v.name);
      for (const v of obj.details.variables.output || []) declaredVars.add(v.name);
      for (const v of obj.details.variables.private || []) declaredVars.add(v.name);
    }

    // Analyze scriptTasks
    if (elems.scriptTasks) {
      for (const st of elems.scriptTasks) {
        if (st.script) this._analyzeScript(st.script, obj, "scriptTask", st.name, st.id, declaredVars, findings);
      }
    }

    // Analyze formTasks (pre/post assignment scripts)
    if (elems.formTasks) {
      for (const ft of elems.formTasks) {
        if (ft.preAssignment) this._analyzeScript(ft.preAssignment, obj, "formTask", ft.name, ft.id + "-pre", declaredVars, findings);
        if (ft.postAssignment) this._analyzeScript(ft.postAssignment, obj, "formTask", ft.name, ft.id + "-post", declaredVars, findings);
      }
    }

    // Analyze callActivities (pre/post assignment scripts)
    if (elems.callActivities) {
      for (const ca of elems.callActivities) {
        if (ca.preAssignment) this._analyzeScript(ca.preAssignment, obj, "callActivity", ca.name, ca.id + "-pre", declaredVars, findings);
        if (ca.postAssignment) this._analyzeScript(ca.postAssignment, obj, "callActivity", ca.name, ca.id + "-post", declaredVars, findings);
      }
    }

    // Analyze service scripts (top-level scripts array)
    if (Array.isArray(obj.details.scripts)) {
      for (const s of obj.details.scripts) {
        if (s.script) this._analyzeScript(s.script, obj, "serviceScript", s.name, "svc-" + s.name, declaredVars, findings);
      }
    }
  }

  _analyzeScript(script, obj, elementType, elementName, elementId, declaredVars, findings) {
    // Skip non-JS content (SQL, template strings, etc.)
    if (!this._isLikelyJS(script)) return;

    // Parse the script — if acorn strict parse fails, skip scope-based rules
    const strictAst = this._parseScriptStrict(script);
    const ast = strictAst || this._parseScript(script);
    if (!ast) return;

    // Rule: undefined-variable (only with strict parse — acorn-loose AST is unreliable for scope)
    if (strictAst) {
      this._checkUndefinedVars(strictAst, script, obj, elementType, elementName, elementId, declaredVars, findings);
    }

    // Rule: infinite-loop
    this._checkInfiniteLoops(ast, script, obj, elementType, elementName, elementId, findings);

    // Rule: division-by-zero
    this._checkDivisionByZero(ast, script, obj, elementType, elementName, elementId, findings);

    // Rule: hardcoded-value
    this._checkHardcodedValues(ast, script, obj, elementType, elementName, elementId, findings);
  }

  // ponytail: quick heuristic to skip SQL, template strings, etc.
  _isLikelyJS(script) {
    if (!script || script.length < 3) return false;
    const trimmed = script.trimStart().toUpperCase();
    // SQL keywords at start
    const sqlPrefixes = ["SELECT ", "INSERT ", "UPDATE ", "DELETE ", "CREATE ", "ALTER ", "DROP ", "MERGE ", "WITH ", "TRUNCATE "];
    for (const p of sqlPrefixes) {
      if (trimmed.startsWith(p)) return false;
    }
    return true;
  }

  // Strict parse only — no acorn-loose fallback
  _parseScriptStrict(scriptBody) {
    if (!scriptBody || typeof scriptBody !== "string") return null;
    try {
      return acorn.parse(scriptBody, {
        ecmaVersion: "latest",
        sourceType: "script",
        allowReturnOutsideFunction: true,
      });
    } catch (e) {
      return null;
    }
  }

  _parseScript(scriptBody) {
    if (!scriptBody || typeof scriptBody !== "string") return null;
    try {
      return acorn.parse(scriptBody, {
        ecmaVersion: "latest",
        sourceType: "script",
        allowReturnOutsideFunction: true,
      });
    } catch (e) {
      try {
        return acornLoose(scriptBody, {
          ecmaVersion: "latest",
          sourceType: "script",
        });
      } catch (e2) {
        return null;
      }
    }
  }

  _getLine(script, index) {
    if (!index) return 1;
    let line = 1;
    for (let i = 0; i < index && i < script.length; i++) {
      if (script[i] === "\n") line++;
    }
    return line;
  }

  _getSnippet(script, index) {
    if (!index) return script.substring(0, 80);
    const start = Math.max(0, script.lastIndexOf("\n", index - 1));
    const end = script.indexOf("\n", index);
    return script.substring(start + 1, end === -1 ? Math.min(start + 81, script.length) : end).trim();
  }

  _makeFinding(ruleId, obj, elementType, elementName, elementId, message, script, index) {
    //5-key grouping: CSHS / Service / BPD / Coach View / Other
    let objectType;
    if (obj.type === "process" && (obj.subType === "10" || (obj.details && obj.details.processType === "10"))) {
      objectType = "CSHS";
    } else if (obj.type === "process") {
      objectType = "Service";
    } else if (obj.type === "bpd") {
      objectType = "BPD";
    } else if (obj.type === "coachView") {
      objectType = "Coach View";
    } else {
      objectType = "Other";
    }
    return {
      id: `${obj.id}-${elementId}-${ruleId}`,
      objectId: obj.id,
      objectName: obj.name,
      objectType,
      elementType,
      elementName,
      elementId,
      severity: RULES[ruleId].severity,
      ruleId,
      ruleName: RULES[ruleId].name,
      message,
      line: this._getLine(script, index),
      snippet: this._getSnippet(script, index),
    };
  }

  // === Rule: undefined-variable ===
  _checkUndefinedVars(ast, script, obj, elementType, elementName, elementId, declaredVars, findings) {
    try {
      const globalsList = [];
      for (const g of KNOWN_GLOBALS) {
        globalsList.push({ name: g, writable: true });
      }

      const scopeManager = eslintAnalyze(ast, {
        ecmaVersion: "latest",
        sourceType: "script",
        impliedStrict: false,
        ignoreEval: true,
        childVisitorKeys: null,
        fallback: "iteration",
        globals: globalsList,
      });

      const scopes = scopeManager.scopes;
      if (!scopes || scopes.length === 0) return;

      const globalScope = scopes[0];

      // Also collect variables declared in function scopes (parameters, local vars)
      const allDeclaredVars = new Set(declaredVars);
      for (const scope of scopes) {
        if (scope.variables) {
          for (const v of scope.variables) {
            allDeclaredVars.add(v.name);
          }
        }
      }

      // Collect through references (unresolved)
      const seen = new Set();
      for (const ref of globalScope.through || []) {
        const name = ref.identifier && ref.identifier.name;
        if (!name || seen.has(name)) continue;

        // Skip if it's a known global
        if (KNOWN_GLOBALS.has(name)) continue;

        // Skip if it matches a known namespace prefix
        // eslint-scope reports `tw` as through, then properties as separate identifiers
        // We check if the parent is a member expression to avoid false positives on property access
        const parent = ref.identifier.parent;
        if (parent && parent.type === "MemberExpression" && parent.object === ref.identifier) {
          // This is `tw.something` - check if `tw` is a known global (it is), skip
          // Actually eslint-scope might report `tw` as through, but we already skip it above
          continue;
        }

        // Skip if this identifier is a property of a member expression (not the object)
        if (parent && parent.type === "MemberExpression" && parent.property === ref.identifier && !parent.computed) {
          continue;
        }

        // Cross-reference tw.local.* against declared variables
        // We can't easily do this with eslint-scope's through because it reports the root identifier
        // Instead, we check if the name is a known BPM variable pattern

        seen.add(name);
        const finding = this._makeFinding(
          "undefined-variable",
          obj,
          elementType,
          elementName,
          elementId,
          `${name} is referenced but never declared`,
          script,
          ref.identifier.start
        );
        findings.push(finding);
      }
    } catch (e) {
      // ponytail: scope analysis failure is non-fatal, skip
    }
  }

  // === Rule: infinite-loop ===
  _checkInfiniteLoops(ast, script, obj, elementType, elementName, elementId, findings) {
    try {
      walk.simple(ast, {
        WhileStatement: (node) => {
          if (node.test && node.test.type === "Literal" && node.test.value === true) {
            if (!this._hasBreak(node.body)) {
              findings.push(
                this._makeFinding(
                  "infinite-loop",
                  obj,
                  elementType,
                  elementName,
                  elementId,
                  "while(true) without break statement",
                  script,
                  node.start
                )
              );
            }
          }
        },
        ForStatement: (node) => {
          if (!node.init && !node.test && !node.update) {
            if (!this._hasBreak(node.body)) {
              findings.push(
                this._makeFinding(
                  "infinite-loop",
                  obj,
                  elementType,
                  elementName,
                  elementId,
                  "for(;;) without break statement",
                  script,
                  node.start
                )
              );
            }
          }
        },
      });
    } catch (e) {
      // ponytail: walk failure is non-fatal
    }
  }

  _hasBreak(node) {
    let found = false;
    try {
      walk.simple(node, {
        BreakStatement: () => {
          found = true;
        },
      });
    } catch (e) {
      // ignore
    }
    return found;
  }

  // === Rule: division-by-zero ===
  _checkDivisionByZero(ast, script, obj, elementType, elementName, elementId, findings) {
    try {
      walk.simple(ast, {
        BinaryExpression: (node) => {
          if ((node.operator === "/" || node.operator === "/=") && node.right) {
            if (node.right.type === "Literal" && node.right.value === 0) {
              findings.push(
                this._makeFinding(
                  "division-by-zero",
                  obj,
                  elementType,
                  elementName,
                  elementId,
                  "Division by literal 0",
                  script,
                  node.start
                )
              );
            }
          }
        },
      });
    } catch (e) {
      // ignore
    }
  }

  // === Rule: hardcoded-value ===
  _checkHardcodedValues(ast, script, obj, elementType, elementName, elementId, findings) {
    try {
      walk.simple(ast, {
        Literal: (node) => {
          if (typeof node.value === "string" && node.value.length >= 1 && node.value.length <= 3) {
            // Heuristic: all uppercase letters (status codes like "S", "R", "C", "Y", "N")
            if (/^[A-Z]{1,3}$/.test(node.value)) {
              findings.push(
                this._makeFinding(
                  "hardcoded-value",
                  obj,
                  elementType,
                  elementName,
                  elementId,
                  `Hardcoded business constant "${node.value}" — consider using an enum or config`,
                  script,
                  node.start
                )
              );
            }
          }
        },
      });
    } catch (e) {
      // ignore
    }
  }

  // === Summary helpers ===
  _summarize(findings) {
    const critical = findings.filter((f) => f.severity === "critical");
    const warnings = findings.filter((f) => f.severity === "warning");
    const elementKeys = new Set();
    const criticalElementKeys = new Set();
    const warningElementKeys = new Set();

    for (const f of findings) {
      const key = `${f.objectId}-${f.elementId}`;
      elementKeys.add(key);
      if (f.severity === "critical") criticalElementKeys.add(key);
      if (f.severity === "warning") warningElementKeys.add(key);
    }

    return {
      totalElements: this._countElements(),
      totalCritical: critical.length,
      totalWarnings: warnings.length,
      elementsWithCritical: criticalElementKeys.size,
      elementsWithWarnings: warningElementKeys.size,
      generatedAt: new Date().toISOString(),
    };
  }

  _byType(findings) {
    const typeMap = {
      "CSHS":       { elements: 0, critical: 0, warnings: 0 },
      "Service":    { elements: 0, critical: 0, warnings: 0 },
      "BPD":        { elements: 0, critical: 0, warnings: 0 },
      "Coach View": { elements: 0, critical: 0, warnings: 0 },
      "Other":      { elements: 0, critical: 0, warnings: 0 },
    };

    // Count elements per type
    for (const obj of this.objects) {
      if (obj.name && /instance view/i.test(obj.name)) continue;

      let typeName;
      if (obj.type === "process" && (obj.subType === "10" || (obj.details && obj.details.processType === "10"))) {
        typeName = "CSHS";
      } else if (obj.type === "process") {
        typeName = "Service";
      } else if (obj.type === "bpd") {
        typeName = "BPD";
      } else if (obj.type === "coachView") {
        typeName = "Coach View";
      } else {
        typeName = "Other";
      }
      typeMap[typeName].elements++;
    }

    // Count findings per type (objectType already set by _makeFinding)
    for (const f of findings) {
      const typeName = typeMap[f.objectType] ? f.objectType : "Other";
      if (f.severity === "critical") typeMap[typeName].critical++;
      if (f.severity === "warning") typeMap[typeName].warnings++;
    }

    return typeMap;
  }

  _countElements() {
    let count = 0;
    for (const obj of this.objects) {
      if (obj.details && obj.details.elements) {
        const elems = obj.details.elements;
        count += (elems.scriptTasks || []).length;
        count += (elems.formTasks || []).length;
        count += (elems.callActivities || []).length;
      }
      if (obj.details && Array.isArray(obj.details.scripts)) {
        count += obj.details.scripts.length;
      }
    }
    return count;
  }
}

module.exports = TWXAnalyzer;
