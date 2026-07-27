function objectTypeFileName(typeName) {
  return `objects-${typeName.toLowerCase().replace(/\s+/g, '-')}.json`
}

function toolkitObjectTypeFileName(typeName) {
  return `toolkit-objects-${typeName.toLowerCase().replace(/\s+/g, '-')}.json`
}

function combinedObjectTypeFileName(typeName) {
  return `combined-objects-${typeName.toLowerCase().replace(/\s+/g, '-')}.json`
}

module.exports = { objectTypeFileName, toolkitObjectTypeFileName, combinedObjectTypeFileName }

if (require.main === module) {
  console.assert(objectTypeFileName('Business Object') === 'objects-business-object.json', 'objectTypeFileName failed')
  console.assert(toolkitObjectTypeFileName('CSHS') === 'toolkit-objects-cshs.json', 'toolkitObjectTypeFileName failed')
  console.assert(combinedObjectTypeFileName('BPD') === 'combined-objects-bpd.json', 'combinedObjectTypeFileName failed')
  console.log('file-names: OK')
}
