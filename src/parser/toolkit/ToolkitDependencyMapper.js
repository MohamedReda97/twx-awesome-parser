const acorn = require('acorn')
const walk = require('acorn-walk')

class ToolkitDependencyMapper {
  mapApplicationUsage ({ zip, appObjectList, appObjects, toolkits, toolkitDiagnostics = [] }) {
    const report = ToolkitDependencyMapper.emptyReport({
      status: toolkitDiagnostics.length ? 'partial' : 'complete',
      diagnostics: toolkitDiagnostics
    })
    report.toolkits = toolkits.map(toolkit => this._toolkitResult(toolkit))

    const indexes = this._buildIndexes(report.toolkits)
    const parsedObjects = new Map()
    for (const appObject of appObjects) {
      if (appObject.id) parsedObjects.set(appObject.id, appObject)
      if (appObject.versionId) parsedObjects.set(appObject.versionId, appObject)
    }

    for (const manifestObject of appObjectList) {
      const parsedObject = parsedObjects.get(manifestObject.versionId) || parsedObjects.get(manifestObject.id)
      const appObject = { ...manifestObject, ...parsedObject }
      const entry = (manifestObject.versionId && zip.getEntry(`objects/${manifestObject.versionId}.xml`)) ||
        (manifestObject.id && zip.getEntry(`objects/${manifestObject.id}.xml`))

      if (!entry) {
        report.status = 'partial'
        report.diagnostics.push({
          code: 'application-object-xml-missing',
          appObjectId: appObject.id,
          appObjectVersionId: appObject.versionId,
          message: `Application object XML not found for ${appObject.versionId || appObject.id}`
        })
        continue
      }

      const xml = entry.getData().toString('utf8')
      this._scanXml(xml, appObject, indexes)
    }

    for (const unit of this._collectScripts(appObjects)) this._scanScript(unit, indexes, report)

    return this._finalize(report)
  }

  static emptyReport ({ status = 'complete', diagnostics = [] } = {}) {
    return {
      schemaVersion: 1,
      status,
      generatedAt: new Date().toISOString(),
      summary: {
        toolkitCount: 0,
        usedToolkitCount: 0,
        possibleToolkitCount: 0,
        unusedToolkitCount: 0,
        usedObjectCount: 0,
        confirmedLocationCount: 0,
        inferredLocationCount: 0,
        ambiguousLocationCount: 0
      },
      diagnostics: [...diagnostics],
      toolkits: []
    }
  }

  static failedReport (error) {
    return ToolkitDependencyMapper.emptyReport({
      status: 'partial',
      diagnostics: [{ code: 'toolkit-usage-failed', message: error.message }]
    })
  }

  _toolkitResult (toolkit) {
    const project = toolkit.metadata?.project || {}
    const snapshot = toolkit.metadata?.snapshot || {}
    const projectId = toolkit.projectId || project.id
    const snapshotId = toolkit.snapshotId || snapshot.id

    return {
      key: toolkit.fileName || snapshotId || projectId,
      name: toolkit.name || project.name,
      shortName: toolkit.shortName || project.shortName,
      projectId,
      snapshotId,
      snapshotName: toolkit.snapshotName || snapshot.name,
      fileName: toolkit.fileName,
      totalObjectCount: toolkit.objectCount ?? (toolkit.objects || []).length,
      usageStatus: 'not-detected',
      counts: {
        usedObjects: 0,
        confirmedLocations: 0,
        inferredLocations: 0,
        ambiguousLocations: 0
      },
      objects: (toolkit.objects || []).map(object => ({
        id: object.id,
        versionId: object.versionId,
        name: object.name,
        type: object.type,
        typeName: object.typeName,
        locations: []
      }))
    }
  }

  _buildIndexes (reportToolkits) {
    const versionIds = new Map()
    const stableIds = new Map()
    const names = new Map()

    for (const toolkit of reportToolkits) {
      for (const object of toolkit.objects) {
        if (object.versionId) versionIds.set(object.versionId, object)
        if (object.id) {
          if (!stableIds.has(object.id)) stableIds.set(object.id, [])
          stableIds.get(object.id).push(object)
        }
        if (object.name) {
          if (!names.has(object.name)) names.set(object.name, [])
          names.get(object.name).push(object)
        }
      }
    }

    const nonstandardIds = [...new Set([...versionIds.keys(), ...stableIds.keys()])]
      .filter(id => !/^(?:\d+\.)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id))

    return { versionIds, stableIds, names, nonstandardIds }
  }

  _collectScripts (appObjects) {
    const units = []
    const seen = new Set()
    const asArray = value => Array.isArray(value) ? value : value ? [value] : []
    const add = (appObject, elementType, elementName, elementId, scriptRole, source, scriptFormat = '', dedupeId = elementId || elementName || 'script') => {
      if (!source || !String(source).trim()) return
      const format = String(scriptFormat).toLowerCase()
      if (format.startsWith('text/plain') || format.startsWith('text/html') || format.includes('template')) return
      const key = `${appObject.versionId || appObject.id || appObject.name}\u0000${dedupeId}\u0000${scriptRole}\u0000${source}`
      if (seen.has(key)) return
      seen.add(key)
      units.push({
        appObject,
        elementType,
        elementName: elementName || 'Unnamed',
        elementId: elementId || elementName || 'script',
        scriptRole,
        source: String(source)
      })
    }

    for (const appObject of appObjects) {
      if (appObject.source === 'toolkit') continue
      const elements = appObject.details?.elements || {}
      const scriptTasks = asArray(elements.scriptTasks)
      for (const item of scriptTasks) {
        add(appObject, 'scriptTask', item.name, item.id, 'script-task', item.script, item.scriptFormat)
        add(appObject, 'scriptTask', item.name, `${item.id || item.name}-pre`, 'pre-assignment', item.preAssignment)
        add(appObject, 'scriptTask', item.name, `${item.id || item.name}-post`, 'post-assignment', item.postAssignment)
      }
      for (const type of ['formTasks', 'callActivities']) {
        for (const item of asArray(elements[type])) {
          add(appObject, type.slice(0, -1), item.name, `${item.id || item.name}-pre`, 'pre-assignment', item.preAssignment)
          add(appObject, type.slice(0, -1), item.name, `${item.id || item.name}-post`, 'post-assignment', item.postAssignment)
        }
      }

      const scripts = appObject.details?.scripts
      if (Array.isArray(scripts)) {
        const represented = new Set(scriptTasks.map(item => `${item.name || 'Unnamed'}\u0000${String(item.script || '')}`))
        for (const [index, item] of scripts.entries()) {
          if (represented.has(`${item.name || 'Unnamed'}\u0000${String(item.script || '')}`)) continue
          const identity = item.id || `${item.name || 'script'}-${index + 1}`
          add(appObject, 'serviceScript', item.name, `service-${identity}`, 'implementation', item.script, item.scriptFormat, item.id || item.name || 'script')
        }
        continue
      }

      if (appObject.type !== 'coachView' || !scripts) continue
      for (const field of [
        'loadJsFunction',
        'unloadJsFunction',
        'viewJsFunction',
        'changeJsFunction',
        'collaborationJsFunction',
        'validateJsFunction'
      ]) {
        add(appObject, 'coachView', field, field, 'lifecycle', scripts[field])
      }
      for (const [index, item] of asArray(scripts.inlineScripts).entries()) {
        const identity = item.id || `${item.context || 'script'}-${index + 1}`
        add(appObject, 'coachView', item.context, `inline-${identity}`, 'inline', item.script, item.scriptFormat, item.id || item.context || 'script')
      }
    }

    return units
  }

  _scanScript (unit, indexes, report) {
    let ast
    try {
      ast = acorn.parse(unit.source, { ecmaVersion: 2020, sourceType: 'script', locations: true })
    } catch (error) {
      report.status = 'partial'
      report.diagnostics.push({
        code: 'javascript-syntax-error',
        appObjectId: unit.appObject.id,
        appObjectVersionId: unit.appObject.versionId,
        elementId: unit.elementId,
        elementName: unit.elementName,
        scriptRole: unit.scriptRole,
        message: `JavaScript cannot be parsed: ${error.message}`
      })
      return
    }

    const add = (node, name, evidence) => {
      const targets = indexes.names.get(name) || []
      if (!targets.length) return
      const sourceLine = unit.source.split(/\r?\n/)[node.loc.start.line - 1] || ''
      const snippetStart = Math.max(0, Math.min(
        node.loc.start.column - Math.floor((240 - (node.end - node.start)) / 2),
        Math.max(0, sourceLine.length - 240)
      ))
      const location = {
        appObjectId: unit.appObject.id,
        appObjectVersionId: unit.appObject.versionId,
        appObjectName: unit.appObject.name,
        appObjectType: unit.appObject.type,
        elementId: unit.elementId,
        elementName: unit.elementName,
        elementType: unit.elementType,
        scriptRole: unit.scriptRole,
        lineBasis: 'script',
        line: node.loc.start.line,
        column: node.loc.start.column + 1,
        snippet: sourceLine.slice(snippetStart, snippetStart + 240).replace(/\s+/g, ' ').trim(),
        confidence: targets.length === 1 ? 'inferred' : 'ambiguous',
        evidence: targets.length === 1 ? evidence : 'ambiguous-name'
      }
      for (const target of targets) this._appendLocation(target, location)
    }
    const addKey = node => {
      if (node.computed) return
      if (node.key.type === 'Identifier') add(node.key, node.key.name, 'script-identifier')
      if (node.key.type === 'Literal' && typeof node.key.value === 'string') add(node.key, node.key.value, 'script-string')
    }

    walk.ancestor(ast, {
      Identifier: (node, ancestors) => {
        const parent = ancestors[ancestors.length - 2]
        add(node, node.name, parent?.type === 'MemberExpression' && parent.property === node
          ? 'script-member'
          : 'script-identifier')
      },
      MemberExpression: node => {
        if (!node.computed && node.property.type === 'Identifier') add(node.property, node.property.name, 'script-member')
      },
      Property: addKey,
      MethodDefinition: addKey,
      Literal: node => {
        if (typeof node.value === 'string') add(node, node.value, 'script-string')
      }
    })
  }

  _scanXml (xml, appObject, indexes) {
    const structuralReferences = [
      ...(appObject.details?.elements?.callActivities || []).map(element => ({
        ids: [element.callsTargetId],
        elementId: element.id || element.name,
        elementName: element.name || 'Unnamed',
        elementType: 'callActivity'
      })),
      ...(appObject.details?.schema?.properties || []).map(element => ({
        ids: [element.classRef, element.referencedObjectId],
        elementId: element.id || element.name,
        elementName: element.name || 'Unnamed',
        elementType: 'property'
      }))
    ]
    const nonstandardPattern = indexes.nonstandardIds
      .map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((left, right) => right.length - left.length)
      .join('|')
    const tokenPattern = new RegExp(
      `\\b(?:\\d+\\.)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b${nonstandardPattern ? `|(?<![\\w.:+@#$%~-])(?:${nonstandardPattern})(?![\\w./:+@#$%~-])` : ''}`,
      'g'
    )
    let match

    while ((match = tokenPattern.exec(xml))) {
      const lineStart = xml.lastIndexOf('\n', match.index - 1) + 1
      const lineEnd = xml.indexOf('\n', match.index)
      const line = xml.slice(0, match.index).split('\n').length
      const sourceLine = xml.slice(lineStart, lineEnd === -1 ? xml.length : lineEnd)
      const matchingElements = structuralReferences.filter(element => element.ids.includes(match[0]))
      const snippetStart = Math.max(0, Math.min(
        match.index - lineStart - Math.floor((240 - match[0].length) / 2),
        Math.max(0, sourceLine.length - 240)
      ))
      const location = {
        appObjectId: appObject.id,
        appObjectVersionId: appObject.versionId,
        appObjectName: appObject.name,
        appObjectType: appObject.type,
        ...(matchingElements.length === 1
          ? {
              elementId: matchingElements[0].elementId,
              elementName: matchingElements[0].elementName,
              elementType: matchingElements[0].elementType
            }
          : {}),
        lineBasis: 'xml',
        line,
        column: match.index - lineStart + 1,
        snippet: sourceLine
          .slice(snippetStart, snippetStart + 240)
          .replace(/\s+/g, ' ')
          .trim()
      }
      const versionTarget = indexes.versionIds.get(match[0])

      if (versionTarget) {
        this._appendLocation(versionTarget, {
          ...location,
          confidence: 'confirmed',
          evidence: 'version-id'
        })
        continue
      }

      const stableTargets = indexes.stableIds.get(match[0]) || []
      for (const target of stableTargets) {
        this._appendLocation(target, {
          ...location,
          confidence: stableTargets.length === 1 ? 'confirmed' : 'ambiguous',
          evidence: stableTargets.length === 1 ? 'object-id' : 'ambiguous-id'
        })
      }
    }
  }

  _appendLocation (target, location) {
    const sameLocation = existing =>
      (existing.appObjectVersionId || existing.appObjectId) === (location.appObjectVersionId || location.appObjectId) &&
      (existing.elementId || existing.elementName || '') === (location.elementId || location.elementName || '') &&
      (existing.scriptRole || '') === (location.scriptRole || '') &&
      existing.lineBasis === location.lineBasis &&
      existing.line === location.line &&
      existing.column === location.column
    const index = target.locations.findIndex(sameLocation)

    if (index === -1) {
      target.locations.push(location)
      return
    }

    const rank = { ambiguous: 0, inferred: 1, confirmed: 2 }
    if (rank[location.confidence] > rank[target.locations[index].confidence] || location.evidence === 'version-id') {
      target.locations[index] = location
    }
  }

  _finalize (report) {
    const compare = (left, right) => String(left || '').localeCompare(String(right || ''))

    for (const toolkit of report.toolkits) {
      toolkit.objects = toolkit.objects
        .filter(object => object.locations.length)
        .sort((left, right) =>
          compare(left.typeName, right.typeName) ||
          compare(left.name, right.name) ||
          compare(left.versionId || left.id, right.versionId || right.id))

      for (const object of toolkit.objects) {
        object.locations.sort((left, right) =>
          compare(left.appObjectName, right.appObjectName) ||
          compare(left.appObjectVersionId, right.appObjectVersionId) ||
          compare(left.appObjectId, right.appObjectId) ||
          compare(left.appObjectType, right.appObjectType) ||
          compare(left.elementName, right.elementName) ||
          compare(left.elementId, right.elementId) ||
          compare(left.elementType, right.elementType) ||
          compare(left.scriptRole, right.scriptRole) ||
          compare(left.lineBasis, right.lineBasis) ||
          (left.line ?? 0) - (right.line ?? 0) ||
          (left.column ?? 0) - (right.column ?? 0) ||
          compare(left.confidence, right.confidence) ||
          compare(left.evidence, right.evidence) ||
          compare(left.snippet, right.snippet))
      }

      const locations = toolkit.objects.flatMap(object => object.locations)
      toolkit.counts = {
        usedObjects: toolkit.objects.length,
        confirmedLocations: locations.filter(location => location.confidence === 'confirmed').length,
        inferredLocations: locations.filter(location => location.confidence === 'inferred').length,
        ambiguousLocations: locations.filter(location => location.confidence === 'ambiguous').length
      }
      toolkit.usageStatus = toolkit.counts.confirmedLocations + toolkit.counts.inferredLocations
        ? 'used'
        : toolkit.counts.ambiguousLocations ? 'possible' : 'not-detected'
    }

    const allLocations = report.toolkits
      .flatMap(toolkit => toolkit.objects)
      .flatMap(object => object.locations)
    report.summary = {
      toolkitCount: report.toolkits.length,
      usedToolkitCount: report.toolkits.filter(toolkit => toolkit.usageStatus === 'used').length,
      possibleToolkitCount: report.toolkits.filter(toolkit => toolkit.usageStatus === 'possible').length,
      unusedToolkitCount: report.toolkits.filter(toolkit => toolkit.usageStatus === 'not-detected').length,
      usedObjectCount: report.toolkits.reduce((count, toolkit) => count + toolkit.objects.length, 0),
      confirmedLocationCount: allLocations.filter(location => location.confidence === 'confirmed').length,
      inferredLocationCount: allLocations.filter(location => location.confidence === 'inferred').length,
      ambiguousLocationCount: allLocations.filter(location => location.confidence === 'ambiguous').length
    }

    return report
  }
}

module.exports = ToolkitDependencyMapper
