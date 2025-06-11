const fs = require('fs')
const EventEmitter = require('events')
const ADMZip = require('adm-zip')
const PackageParser = require('./package')
const ObjectParser = require('./object')

const addAppMetadata = async (packageParser, zip, fileName) => {
  // 1. parse current metadata file
  await packageParser.add(zip, fileName)

  // 2. drill down on toolkits and parse their metadata file
  const toolkitEntryNames = zip.getEntries().map(entry => entry.entryName).filter(name => name.indexOf('toolkits/') === 0)
  for (let i = 0; i < toolkitEntryNames.length; i++) {
    const entryName = toolkitEntryNames[i]
    const toolkitData = zip.getEntry(entryName).getData()
    const toolkitZip = new ADMZip(toolkitData)
    await packageParser.add(toolkitZip, entryName)
  }
}

const removeAppMetadata = async (packageParser, zip, fileName) => {
  await packageParser.remove(zip, fileName)
}

const addAppObjects = async (objectParser, zip, fileName) => {
  // 1. parse app objects
  await objectParser.add(zip, fileName)

  // 2. drill down on toolkits and parse their objects
  const toolkitEntryNames = zip.getEntries().map(entry => entry.entryName).filter(name => name.indexOf('toolkits/') === 0)
  for (let i = 0; i < toolkitEntryNames.length; i++) {
    const entryName = toolkitEntryNames[i]
    const toolkitData = zip.getEntry(entryName).getData()
    const toolkitZip = new ADMZip(toolkitData)
    await objectParser.add(toolkitZip, entryName)
  }
}

const addTwx = async function (packageParser, objectParser, path) {
  const data = fs.readFileSync(path)
  const zip = new ADMZip(data)
  await addAppMetadata(packageParser, zip, path)
  await addAppObjects(objectParser, zip, path)
}

const removeTwx = async function (packageParser, objectParser, path) {
  const data = fs.readFileSync(path)
  const zip = new ADMZip(data)
  await removeAppMetadata(packageParser, zip, path)
}

class Parser extends EventEmitter {
  constructor (name) {
    super()
    this.packageParser = new PackageParser(name)
    this.objectParser = new ObjectParser(name)

    this.packageParser.on('start', data => {
      this.emit('packageStart', data)
    })

    this.packageParser.on('progress', data => {
      this.emit('packageProgress', data)
    })

    this.packageParser.on('end', data => {
      this.emit('packageEnd', data)
    })

    this.objectParser.on('start', data => {
      this.emit('objectStart', data)
    })

    this.objectParser.on('progress', data => {
      this.emit('objectProgress', data)
    })

    this.objectParser.on('end', data => {
      this.emit('objectEnd', data)
    })
  }

  addFile (path) {
    return addTwx(this.packageParser, this.objectParser, path)
  }

  removeFile (path) {
    return removeTwx(this.packageParser, this.objectParser, path)
  }
}

module.exports = Parser
