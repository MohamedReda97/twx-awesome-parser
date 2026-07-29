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

    for (const toolkit of reportToolkits) {
      for (const object of toolkit.objects) {
        if (object.versionId) versionIds.set(object.versionId, object)
        if (!object.id) continue
        if (!stableIds.has(object.id)) stableIds.set(object.id, [])
        stableIds.get(object.id).push(object)
      }
    }

    return { versionIds, stableIds }
  }

  _scanXml (xml, appObject, indexes) {
    const tokenPattern = /\b(?:\d+\.)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g
    let match

    while ((match = tokenPattern.exec(xml))) {
      const lineStart = xml.lastIndexOf('\n', match.index - 1) + 1
      const lineEnd = xml.indexOf('\n', match.index)
      const line = xml.slice(0, match.index).split('\n').length
      const location = {
        appObjectId: appObject.id,
        appObjectVersionId: appObject.versionId,
        appObjectName: appObject.name,
        appObjectType: appObject.type,
        lineBasis: 'xml',
        line,
        column: match.index - lineStart + 1,
        snippet: xml
          .slice(lineStart, lineEnd === -1 ? xml.length : lineEnd)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 240)
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
      existing.lineBasis === location.lineBasis &&
      existing.line === location.line
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

    report.toolkits.sort((left, right) => compare(left.key, right.key))
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
          compare(left.elementName, right.elementName) ||
          left.line - right.line ||
          left.column - right.column)
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
