const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const ADMZip = require('adm-zip')
const { JSONParser } = require('./src/parser/json-parser')
const ToolkitExtractor = require('./src/parser/toolkit-extractor')
const TWXExtractor = require('./src/parser/twx-extractor')

const innerZip = new ADMZip()
innerZip.addFile('placeholder.txt', Buffer.from('valid zip'))
const innerZipData = innerZip.toBuffer()

function embeddedToolkit (fileName) {
  return {
    entryName: `toolkits/${fileName}`,
    getData: () => innerZipData,
    header: { size: innerZipData.length }
  }
}

async function toolkitDiagnosticCheck () {
  const extractor = new ToolkitExtractor()
  let parseCount = 0

  extractor.packageParser = {
    async extractPackageMetadata () {
      parseCount += 1
      if (parseCount === 1) throw new Error('the parser error message')
      return {
        metadata: { project: { name: 'Healthy Toolkit' } },
        objectList: []
      }
    }
  }
  extractor.objectExtractor = { extractObjects: async () => [] }

  const toolkits = await extractor.extractToolkits({
    getEntries: () => [embeddedToolkit('broken.twx'), embeddedToolkit('healthy.twx')]
  })

  assert.deepEqual(extractor.diagnostics, [{
    code: 'TOOLKIT_EXTRACTION_FAILED',
    fileName: 'broken.twx',
    message: 'the parser error message'
  }])
  assert.deepEqual(toolkits.map(toolkit => toolkit.fileName), ['healthy.twx'])

  extractor.packageParser = {
    extractPackageMetadata: async () => ({
      metadata: { project: { name: 'Healthy Toolkit' } },
      objectList: []
    })
  }
  await extractor.extractToolkits({
    getEntries: () => [embeddedToolkit('healthy.twx')]
  })
  assert.deepEqual(extractor.diagnostics, [], 'diagnostics must reset before each extraction')
}

async function twxMapperWiringCheck () {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'twx-toolkit-wiring-'))
  const twxPath = path.join(tempDir, 'tiny.twx')
  const archive = new ADMZip()
  archive.addFile('objects/app-version.xml', Buffer.from('<application />'))
  archive.writeZip(twxPath)

  const manifestObject = { id: 'app-id', versionId: 'app-version', name: 'Manifest App' }
  const parsedObject = { id: 'app-id', versionId: 'app-version', name: 'Parsed App', type: 'process' }
  const toolkits = [{ fileName: 'healthy.twx', objects: [] }]
  const toolkitDiagnostics = [{
    code: 'TOOLKIT_EXTRACTION_FAILED',
    fileName: 'broken.twx',
    message: 'the parser error message'
  }]
  const mappedReport = { schemaVersion: 1, status: 'complete', marker: 'mapped' }

  try {
    const extractor = new TWXExtractor()
    extractor.packageParser = {
      extractPackageMetadata: async () => ({
        metadata: { project: { name: 'Tiny App' } },
        dependencies: [],
        objectList: [manifestObject]
      })
    }
    extractor.objectExtractor = { extractObjects: async () => [parsedObject] }
    extractor.toolkitExtractor = {
      diagnostics: toolkitDiagnostics,
      extractToolkits: async () => toolkits
    }

    let mapperInput
    extractor.toolkitDependencyMapper = {
      mapApplicationUsage (input) {
        mapperInput = input
        return mappedReport
      }
    }

    const result = await extractor.extractTWX(twxPath)

    assert.equal(mapperInput.zip.getEntry('objects/app-version.xml').getData().toString(), '<application />')
    assert.deepEqual(mapperInput.appObjectList, [manifestObject])
    assert.deepEqual(mapperInput.appObjects, [{ ...parsedObject, source: 'application' }])
    assert.strictEqual(mapperInput.toolkits, toolkits)
    assert.strictEqual(mapperInput.toolkitDiagnostics, toolkitDiagnostics)
    assert.strictEqual(result.toolkitUsage, mappedReport)

    extractor.toolkitDependencyMapper = {
      mapApplicationUsage () {
        throw new Error('mapping failed')
      }
    }
    const recovered = await extractor.extractTWX(twxPath)
    assert.equal(recovered.toolkitUsage.status, 'partial')
    assert.deepEqual(recovered.toolkitUsage.diagnostics, [{
      code: 'toolkit-usage-failed',
      message: 'mapping failed'
    }])
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function twxDirectoryReportCheck () {
  const extractor = new TWXExtractor()
  extractor.packageParser = {
    extractPackageMetadataFromDir: async () => ({
      metadata: { project: { name: 'Directory App' } },
      objectList: []
    })
  }
  extractor.objectExtractor = { extractObjectsFromDir: async () => [] }
  extractor.toolkitDependencyMapper = {
    mapApplicationUsage () {
      throw new Error('directory extraction must not scan a missing outer archive')
    }
  }

  const result = await extractor.extractFromDirectory('directory-app')
  const { generatedAt, ...report } = result.toolkitUsage

  assert.ok(!Number.isNaN(Date.parse(generatedAt)))
  assert.deepEqual(report, {
    schemaVersion: 1,
    status: 'complete',
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
    diagnostics: [],
    toolkits: []
  })
}

async function jsonWriterCheck () {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'twx-toolkit-json-'))
  const outputDir = path.join(tempDir, 'output')
  const previousDir = process.cwd()
  const suppliedReport = {
    schemaVersion: 1,
    status: 'partial',
    generatedAt: '2026-07-29T00:00:00.000Z',
    summary: { toolkitCount: 1, confirmedLocationCount: 1 },
    diagnostics: [{ code: 'example', message: 'preserve me' }],
    toolkits: [{ key: 'toolkit', objects: [{ name: 'Target', locations: [{ line: 7 }] }] }]
  }
  const extractedData = {
    objects: [],
    toolkits: [],
    allObjects: [],
    dependencies: [],
    metadata: { project: { name: 'Tiny App' } },
    extractedAt: '2026-07-29T00:00:00.000Z',
    sourceFile: 'tiny.twx',
    toolkitUsage: suppliedReport
  }

  try {
    process.chdir(tempDir)
    const parser = new JSONParser(outputDir)
    await parser.generateOutputFiles(extractedData)
    const reportPath = path.join(outputDir, 'toolkit-usage.json')

    assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, 'utf8')), suppliedReport)

    delete extractedData.toolkitUsage
    await parser.generateOutputFiles(extractedData)
    const fallback = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    assert.equal(fallback.schemaVersion, 1)
    assert.equal(fallback.status, 'complete')
    assert.deepEqual(fallback.toolkits, [])
    assert.deepEqual(fallback.diagnostics, [])
  } finally {
    process.chdir(previousDir)
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function run () {
  const originalLog = console.log
  const originalWarn = console.warn
  const warnings = []
  console.log = () => {}
  console.warn = (...args) => warnings.push(args)

  try {
    await toolkitDiagnosticCheck()
    await twxMapperWiringCheck()
    await twxDirectoryReportCheck()
    await jsonWriterCheck()
    assert.ok(warnings.some(args =>
      args[0] === '❌ Error processing toolkit toolkits/broken.twx:' &&
      args[1] === 'the parser error message'
    ))
  } finally {
    console.log = originalLog
    console.warn = originalWarn
  }
}

run()
  .then(() => console.log('Toolkit usage wiring checks passed'))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
