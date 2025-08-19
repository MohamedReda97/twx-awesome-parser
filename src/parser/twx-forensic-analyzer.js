/**
 * TWX Forensic Analyzer - Deep investigation tool for IBM BPM TWX files
 * Performs byte-level analysis to identify structural differences
 */

const fs = require('fs')
const path = require('path')
const ADMZip = require('adm-zip')
const crypto = require('crypto')

class TWXForensicAnalyzer {
  constructor() {
    this.analysisResults = {
      comparison: null,
      structure: null,
      validation: null,
      recommendations: []
    }
  }

  /**
   * Perform comprehensive analysis comparing working vs generated TWX files
   */
  async analyzeFiles(workingTWXPath, generatedTWXPath) {
    console.log('🔍 Starting TWX Forensic Analysis...')
    console.log(`📁 Working TWX: ${path.basename(workingTWXPath)}`)
    console.log(`📁 Generated TWX: ${path.basename(generatedTWXPath)}`)
    console.log()

    try {
      // 1. Basic file comparison
      const basicComparison = await this.compareBasicFileInfo(workingTWXPath, generatedTWXPath)
      
      // 2. ZIP structure analysis
      const structureComparison = await this.compareZipStructure(workingTWXPath, generatedTWXPath)
      
      // 3. File content comparison
      const contentComparison = await this.compareFileContents(workingTWXPath, generatedTWXPath)
      
      // 4. Binary-level analysis
      const binaryComparison = await this.compareBinaryStructure(workingTWXPath, generatedTWXPath)
      
      // 5. Generate comprehensive report
      const report = this.generateForensicReport({
        basic: basicComparison,
        structure: structureComparison,
        content: contentComparison,
        binary: binaryComparison
      })

      this.analysisResults = report
      return report

    } catch (error) {
      console.error('❌ Forensic analysis failed:', error.message)
      throw error
    }
  }

  /**
   * Compare basic file information
   */
  async compareBasicFileInfo(workingPath, generatedPath) {
    console.log('📊 Comparing basic file information...')
    
    const workingStats = fs.statSync(workingPath)
    const generatedStats = fs.statSync(generatedPath)
    
    const comparison = {
      working: {
        size: workingStats.size,
        modified: workingStats.mtime,
        created: workingStats.birthtime
      },
      generated: {
        size: generatedStats.size,
        modified: generatedStats.mtime,
        created: generatedStats.birthtime
      },
      differences: {
        sizeDiff: Math.abs(workingStats.size - generatedStats.size),
        sizeRatio: generatedStats.size / workingStats.size
      }
    }

    console.log(`  Working file: ${comparison.working.size} bytes`)
    console.log(`  Generated file: ${comparison.generated.size} bytes`)
    console.log(`  Size difference: ${comparison.differences.sizeDiff} bytes`)
    console.log(`  Size ratio: ${comparison.differences.sizeRatio.toFixed(3)}`)
    console.log()

    return comparison
  }

  /**
   * Compare ZIP structure and metadata
   */
  async compareZipStructure(workingPath, generatedPath) {
    console.log('🗂️  Comparing ZIP structure...')
    
    const workingZip = new ADMZip(fs.readFileSync(workingPath))
    const generatedZip = new ADMZip(fs.readFileSync(generatedPath))
    
    const workingEntries = workingZip.getEntries()
    const generatedEntries = generatedZip.getEntries()
    
    const comparison = {
      working: this.analyzeZipEntries(workingEntries),
      generated: this.analyzeZipEntries(generatedEntries),
      differences: {
        missingInGenerated: [],
        extraInGenerated: [],
        differentSizes: [],
        differentCompression: []
      }
    }

    // Find missing and extra files
    const workingNames = new Set(workingEntries.map(e => e.entryName))
    const generatedNames = new Set(generatedEntries.map(e => e.entryName))
    
    comparison.differences.missingInGenerated = [...workingNames].filter(name => !generatedNames.has(name))
    comparison.differences.extraInGenerated = [...generatedNames].filter(name => !workingNames.has(name))
    
    // Compare common files
    const commonFiles = [...workingNames].filter(name => generatedNames.has(name))
    
    for (const fileName of commonFiles) {
      const workingEntry = workingEntries.find(e => e.entryName === fileName)
      const generatedEntry = generatedEntries.find(e => e.entryName === fileName)
      
      if (workingEntry.header.size !== generatedEntry.header.size) {
        comparison.differences.differentSizes.push({
          file: fileName,
          working: workingEntry.header.size,
          generated: generatedEntry.header.size
        })
      }
      
      if (workingEntry.header.method !== generatedEntry.header.method) {
        comparison.differences.differentCompression.push({
          file: fileName,
          working: workingEntry.header.method,
          generated: generatedEntry.header.method
        })
      }
    }

    console.log(`  Working ZIP: ${comparison.working.totalEntries} entries`)
    console.log(`  Generated ZIP: ${comparison.generated.totalEntries} entries`)
    console.log(`  Missing in generated: ${comparison.differences.missingInGenerated.length}`)
    console.log(`  Extra in generated: ${comparison.differences.extraInGenerated.length}`)
    console.log(`  Size differences: ${comparison.differences.differentSizes.length}`)
    console.log()

    return comparison
  }

  /**
   * Analyze ZIP entries for detailed information
   */
  analyzeZipEntries(entries) {
    const analysis = {
      totalEntries: entries.length,
      directories: 0,
      files: 0,
      totalUncompressedSize: 0,
      totalCompressedSize: 0,
      compressionMethods: {},
      fileTypes: {},
      entryDetails: []
    }

    entries.forEach(entry => {
      if (entry.isDirectory) {
        analysis.directories++
      } else {
        analysis.files++
        analysis.totalUncompressedSize += entry.header.size
        analysis.totalCompressedSize += entry.header.compressedSize
        
        // Track compression methods
        const method = entry.header.method
        analysis.compressionMethods[method] = (analysis.compressionMethods[method] || 0) + 1
        
        // Track file types
        const ext = path.extname(entry.entryName).toLowerCase()
        analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1
        
        // Store detailed entry information
        analysis.entryDetails.push({
          name: entry.entryName,
          size: entry.header.size,
          compressedSize: entry.header.compressedSize,
          method: entry.header.method,
          crc: entry.header.crc,
          time: entry.header.time
        })
      }
    })

    return analysis
  }

  /**
   * Compare file contents in detail
   */
  async compareFileContents(workingPath, generatedPath) {
    console.log('📄 Comparing file contents...')
    
    const workingZip = new ADMZip(fs.readFileSync(workingPath))
    const generatedZip = new ADMZip(fs.readFileSync(generatedPath))
    
    const workingEntries = workingZip.getEntries()
    const generatedEntries = generatedZip.getEntries()
    
    const comparison = {
      identicalFiles: [],
      differentFiles: [],
      contentAnalysis: {}
    }

    // Compare common files
    const workingNames = new Set(workingEntries.map(e => e.entryName))
    const generatedNames = new Set(generatedEntries.map(e => e.entryName))
    const commonFiles = [...workingNames].filter(name => generatedNames.has(name))
    
    for (const fileName of commonFiles) {
      const workingEntry = workingZip.getEntry(fileName)
      const generatedEntry = generatedZip.getEntry(fileName)
      
      if (workingEntry && generatedEntry && !workingEntry.isDirectory) {
        const workingContent = workingEntry.getData()
        const generatedContent = generatedEntry.getData()
        
        const workingHash = crypto.createHash('md5').update(workingContent).digest('hex')
        const generatedHash = crypto.createHash('md5').update(generatedContent).digest('hex')
        
        if (workingHash === generatedHash) {
          comparison.identicalFiles.push(fileName)
        } else {
          const diff = {
            file: fileName,
            workingHash: workingHash,
            generatedHash: generatedHash,
            workingSize: workingContent.length,
            generatedSize: generatedContent.length
          }
          
          // For XML files, perform detailed analysis
          if (fileName.endsWith('.xml')) {
            diff.xmlAnalysis = this.compareXMLContent(
              workingContent.toString('utf8'),
              generatedContent.toString('utf8')
            )
          }
          
          comparison.differentFiles.push(diff)
        }
      }
    }

    console.log(`  Identical files: ${comparison.identicalFiles.length}`)
    console.log(`  Different files: ${comparison.differentFiles.length}`)
    
    if (comparison.differentFiles.length > 0) {
      console.log('  Files with differences:')
      comparison.differentFiles.forEach(diff => {
        console.log(`    - ${diff.file} (${diff.workingSize} vs ${diff.generatedSize} bytes)`)
      })
    }
    console.log()

    return comparison
  }

  /**
   * Compare XML content in detail
   */
  compareXMLContent(workingXML, generatedXML) {
    const analysis = {
      lengthDiff: Math.abs(workingXML.length - generatedXML.length),
      lineCountDiff: 0,
      elementDifferences: [],
      attributeDifferences: [],
      contentDifferences: []
    }

    // Basic line comparison
    const workingLines = workingXML.split('\n')
    const generatedLines = generatedXML.split('\n')
    analysis.lineCountDiff = Math.abs(workingLines.length - generatedLines.length)

    // Find element differences
    const workingElements = this.extractXMLElements(workingXML)
    const generatedElements = this.extractXMLElements(generatedXML)
    
    const workingElementNames = new Set(workingElements.map(e => e.name))
    const generatedElementNames = new Set(generatedElements.map(e => e.name))
    
    analysis.elementDifferences = {
      missingInGenerated: [...workingElementNames].filter(name => !generatedElementNames.has(name)),
      extraInGenerated: [...generatedElementNames].filter(name => !workingElementNames.has(name))
    }

    return analysis
  }

  /**
   * Extract XML elements for comparison
   */
  extractXMLElements(xmlContent) {
    const elements = []
    const elementRegex = /<(\w+)([^>]*)>/g
    let match
    
    while ((match = elementRegex.exec(xmlContent)) !== null) {
      elements.push({
        name: match[1],
        attributes: match[2].trim(),
        fullMatch: match[0]
      })
    }
    
    return elements
  }

  /**
   * Compare binary structure
   */
  async compareBinaryStructure(workingPath, generatedPath) {
    console.log('🔢 Comparing binary structure...')
    
    const workingBuffer = fs.readFileSync(workingPath)
    const generatedBuffer = fs.readFileSync(generatedPath)
    
    const comparison = {
      working: {
        size: workingBuffer.length,
        hash: crypto.createHash('md5').update(workingBuffer).digest('hex')
      },
      generated: {
        size: generatedBuffer.length,
        hash: crypto.createHash('md5').update(generatedBuffer).digest('hex')
      },
      binaryDifferences: []
    }

    // Find binary differences (sample first 1000 bytes)
    const sampleSize = Math.min(1000, workingBuffer.length, generatedBuffer.length)
    
    for (let i = 0; i < sampleSize; i++) {
      if (workingBuffer[i] !== generatedBuffer[i]) {
        comparison.binaryDifferences.push({
          offset: i,
          working: workingBuffer[i],
          generated: generatedBuffer[i]
        })
      }
    }

    console.log(`  Binary differences in first ${sampleSize} bytes: ${comparison.binaryDifferences.length}`)
    console.log()

    return comparison
  }

  /**
   * Generate comprehensive forensic report
   */
  generateForensicReport(analysisData) {
    console.log('📋 Generating forensic report...')
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        recommendations: []
      },
      analysis: analysisData,
      findings: [],
      recommendations: []
    }

    // Analyze findings
    this.analyzeFindingsAndRecommendations(report, analysisData)
    
    console.log(`✅ Forensic analysis complete`)
    console.log(`📊 Total issues found: ${report.summary.totalIssues}`)
    console.log(`🚨 Critical issues: ${report.summary.criticalIssues}`)
    console.log()

    return report
  }

  /**
   * Analyze findings and generate recommendations
   */
  analyzeFindingsAndRecommendations(report, analysisData) {
    // Check for missing files
    if (analysisData.structure.differences.missingInGenerated.length > 0) {
      report.findings.push({
        type: 'MISSING_FILES',
        severity: 'CRITICAL',
        description: 'Generated TWX is missing files present in working example',
        details: analysisData.structure.differences.missingInGenerated
      })
      
      report.recommendations.push({
        type: 'ADD_MISSING_FILES',
        priority: 'HIGH',
        description: 'Add missing files to generated TWX',
        action: 'Copy missing files from working example to generated TWX'
      })
      
      report.summary.criticalIssues++
    }

    // Check for extra files
    if (analysisData.structure.differences.extraInGenerated.length > 0) {
      report.findings.push({
        type: 'EXTRA_FILES',
        severity: 'WARNING',
        description: 'Generated TWX contains extra files not in working example',
        details: analysisData.structure.differences.extraInGenerated
      })
    }

    // Check for content differences
    if (analysisData.content.differentFiles.length > 0) {
      report.findings.push({
        type: 'CONTENT_DIFFERENCES',
        severity: 'HIGH',
        description: 'Files have different content between working and generated TWX',
        details: analysisData.content.differentFiles.map(f => ({
          file: f.file,
          sizeDiff: Math.abs(f.workingSize - f.generatedSize),
          hasXMLAnalysis: !!f.xmlAnalysis
        }))
      })
      
      report.recommendations.push({
        type: 'FIX_CONTENT_DIFFERENCES',
        priority: 'HIGH',
        description: 'Investigate and fix content differences in XML files',
        action: 'Compare XML structures and fix missing elements/attributes'
      })
      
      report.summary.criticalIssues++
    }

    // Check for size differences
    const sizeDiff = analysisData.basic.differences.sizeDiff
    if (sizeDiff > 1000) { // More than 1KB difference
      report.findings.push({
        type: 'SIGNIFICANT_SIZE_DIFFERENCE',
        severity: 'HIGH',
        description: `Significant size difference: ${sizeDiff} bytes`,
        details: { sizeDiff, ratio: analysisData.basic.differences.sizeRatio }
      })
    }

    report.summary.totalIssues = report.findings.length
    report.summary.recommendations = report.recommendations
  }

  /**
   * Save forensic report to file
   */
  async saveReport(report, outputPath) {
    const reportContent = JSON.stringify(report, null, 2)
    fs.writeFileSync(outputPath, reportContent)
    console.log(`📄 Forensic report saved to: ${outputPath}`)
  }

  /**
   * Print summary report to console
   */
  printSummaryReport(report) {
    console.log('=' .repeat(60))
    console.log('TWX FORENSIC ANALYSIS SUMMARY')
    console.log('=' .repeat(60))
    console.log()
    
    console.log('🔍 FINDINGS:')
    if (report.findings.length === 0) {
      console.log('  ✅ No issues found')
    } else {
      report.findings.forEach((finding, i) => {
        const icon = finding.severity === 'CRITICAL' ? '🚨' : 
                    finding.severity === 'HIGH' ? '⚠️' : '💡'
        console.log(`  ${icon} ${i + 1}. ${finding.description}`)
        if (finding.details && Array.isArray(finding.details)) {
          finding.details.slice(0, 3).forEach(detail => {
            console.log(`     - ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
          })
          if (finding.details.length > 3) {
            console.log(`     ... and ${finding.details.length - 3} more`)
          }
        }
      })
    }
    console.log()
    
    console.log('💡 RECOMMENDATIONS:')
    if (report.recommendations.length === 0) {
      console.log('  ✅ No recommendations')
    } else {
      report.recommendations.forEach((rec, i) => {
        const icon = rec.priority === 'HIGH' ? '🔥' : '📋'
        console.log(`  ${icon} ${i + 1}. ${rec.description}`)
        console.log(`     Action: ${rec.action}`)
      })
    }
    console.log()
  }
}

module.exports = { TWXForensicAnalyzer }