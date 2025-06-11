const chai = require('chai')
const path = require('path')
const twxParser = require('../src')
const fileName = path.resolve(__dirname, 'files', 'TestSnapshot.twx')

const { expect } = chai

describe('Fully integrated test', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('../src/db/common')]
    require('../src/db/common')
  })

  it('should have 6 applications', async () => {
    const workspace = await twxParser.getWorkspace('test', 'password')
    await workspace.addFile(fileName)
    const snapshots = await workspace.getSnapshots()
    const objects = await workspace.getObjects()
    expect(snapshots).to.have.length(7)
    expect(objects).to.have.length(1458)
  })

  it('should have the correct objects and dependencies for a specific snapshot', async () => {
    const workspace = await twxParser.getWorkspace('test', 'password')
    await workspace.addFile(fileName)
    const snapshots = await workspace.getSnapshots({
      snapshotId: '2064.e4c9852c-1a27-4ca1-ac33-01f4f5b5f9fa'
    })
    expect(snapshots).to.have.length(1)
    const snapshot = snapshots[0]
    const objects = await workspace.getSnapshotObjects(snapshot)
    expect(objects).to.have.length(48)
    const toolkits = await workspace.getSnapshotDependencies(snapshot)
    expect(toolkits).to.have.length(5)
    const whereUsed = await workspace.getSnapshotWhereUsed(snapshot)
    expect(whereUsed).to.have.length(0)
  })

  it('should have the correct dependencies for a specific object version', async () => {
    const workspace = await twxParser.getWorkspace('test', 'password')
    await workspace.addFile(fileName)
    const objects = await workspace.getObjects({
      objectVersionId: '1c04d272-5a1d-4c65-8c34-f974aebaa8c9'
    })
    expect(objects).to.have.length(1)
    const object = objects[0]
    const children = await workspace.getObjectDependencies(object)
    expect(children).to.have.length(1)
    const whereUsed = await workspace.getObjectWhereUsed(object)
    expect(whereUsed).to.have.length(2)
    const snapshots = await workspace.getObjectSnapshots(object)
    expect(snapshots).to.have.length(1)
  })

  it('should identify leaf nodes and top level nodes correctly', async () => {
    const workspace = await twxParser.getWorkspace('test', 'password')
    await workspace.addFile(fileName)
    const leafNodes = await workspace.getLeafNodes()
    expect(leafNodes.items).to.have.length(1)
    expect(leafNodes.level).to.equal(1)
    const leafNodes2 = await leafNodes.getNextLevel()
    expect(leafNodes2.items).to.have.length(3)
    expect(leafNodes2.level).to.equal(2)
    const leafNodes3 = await leafNodes2.getNextLevel()
    expect(leafNodes3.items).to.have.length(1)
    expect(leafNodes3.level).to.equal(3)
    const leafNodes4 = await leafNodes3.getNextLevel()
    expect(leafNodes4.items).to.have.length(1)
    expect(leafNodes4.level).to.equal(4)
    const leafNodes5 = await leafNodes4.getNextLevel()
    expect(leafNodes5.items).to.have.length(1)
    expect(leafNodes5.level).to.equal(5)
    const leafNodes6 = await leafNodes5.getNextLevel()
    expect(leafNodes6.items).to.have.length(0)
    expect(leafNodes6.level).to.equal(6)

    const topLevelNodes = await workspace.getTopLevelNodes()
    expect(topLevelNodes.items).to.have.length(1)
    expect(topLevelNodes.level).to.equal(1)
    const topLevelNodes2 = await topLevelNodes.getNextLevel()
    expect(topLevelNodes2.items).to.have.length(1)
    expect(topLevelNodes2.level).to.equal(2)
    const topLevelNodes3 = await topLevelNodes2.getNextLevel()
    expect(topLevelNodes3.items).to.have.length(2)
    expect(topLevelNodes3.level).to.equal(3)
    const topLevelNodes4 = await topLevelNodes3.getNextLevel()
    expect(topLevelNodes4.items).to.have.length(2)
    expect(topLevelNodes4.level).to.equal(4)
    const topLevelNodes5 = await topLevelNodes4.getNextLevel()
    expect(topLevelNodes5.items).to.have.length(1)
    expect(topLevelNodes5.level).to.equal(5)
    const topLevelNodes6 = await topLevelNodes5.getNextLevel()
    expect(topLevelNodes6.items).to.have.length(0)
    expect(topLevelNodes6.level).to.equal(6)
  })

  it('should empty the database after a file is added and then removed', async () => {
    const workspace = await twxParser.getWorkspace('test', 'password')
    await workspace.addFile(fileName)
    await workspace.removeFile(fileName)
    const snapshots = await workspace.getSnapshots()
    const objects = await workspace.getObjects()
    expect(snapshots).to.have.length(0)
    expect(objects).to.have.length(0)
  })
})
