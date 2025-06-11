const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const chaiString = require('chai-string')
let SnapshotDependency = require('../../src/db/SnapshotDependency')
let commonDB = require('../../src/db/common')

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(chaiString)
const { expect } = chai

const DEPENDENCY1 = {
  parentSnapshotId: 'snapshot1',
  childSnapshotId: 'snapshot2',
  rank: 1,
  dependencyId: 'dependency1'
}

const DEPENDENCY2 = {
  parentSnapshotId: 'snapshot1',
  childSnapshotId: 'snapshot3',
  rank: 2,
  dependencyId: 'dependency2'
}

describe('DB - SnapshotDependency', () => {
  let dbStub

  beforeEach(() => {
    delete require.cache[require.resolve('../../src/db/common')]
    delete require.cache[require.resolve('../../src/db/SnapshotDependency')]
    commonDB = require('../../src/db/common')
    dbStub = sinon.stub(commonDB, 'getDB')
    SnapshotDependency = require('../../src/db/SnapshotDependency')
  })

  afterEach(() => {
    dbStub.restore()
    delete require.cache[require.resolve('../../src/db/SnapshotDependency')]
  })

  it('should have the correct methods', () => {
    expect(SnapshotDependency).to.be.an('object')
    expect(SnapshotDependency).to.respondTo('register')
    expect(SnapshotDependency).to.respondTo('registerMany')
    expect(SnapshotDependency).to.respondTo('getAll')
    expect(SnapshotDependency).to.respondTo('where')
    expect(SnapshotDependency).to.respondTo('find')
    expect(SnapshotDependency).to.respondTo('remove')
    expect(SnapshotDependency).to.respondTo('removeOrphaned')
  })

  it('should reject the "register" method when query execution returns an error', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.register('test.db', DEPENDENCY1)
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                                          values (?, ?, ?, ?)`)
      expect(args[1]).to.eql(['snapshot1', 'snapshot2', 1, 'dependency1'])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "register" method when query execution succeeds', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result1 = SnapshotDependency.register('test.db', DEPENDENCY1)
    const result2 = SnapshotDependency.register('test.db', DEPENDENCY2)
    return Promise.all([
      expect(result1).to.eventually.be.fulfilled,
      expect(result2).to.eventually.be.fulfilled
    ]).then(() => {
      expect(dbStub).to.have.been.calledTwice
      expect(dbStub).to.have.been.calledWith('test.db')
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                                          values (?, ?, ?, ?)`)
      expect(args1[1]).to.eql(['snapshot1', 'snapshot2', 1, 'dependency1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                                          values (?, ?, ?, ?)`)
      expect(args2[1]).to.eql(['snapshot1', 'snapshot3', 2, 'dependency2'])
      expect(closeStub).to.have.been.calledTwice
    })
  })

  it('should reject the "registerMany" method when query execution returns an error', () => {
    const runStub = sinon.stub()
    const execStub = sinon.stub().onSecondCall().callsArgWithAsync(1, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      exec: execStub,
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.registerMany('test.db', [DEPENDENCY1, DEPENDENCY2])
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(execStub).to.have.been.calledTwice
      expect(execStub).to.have.been.calledWith('begin')
      expect(execStub).to.have.been.calledWith('commit')
      expect(runStub).to.have.been.calledTwice
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                                          values (?, ?, ?, ?)`)
      expect(args1[1]).to.eql(['snapshot1', 'snapshot2', 1, 'dependency1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                                          values (?, ?, ?, ?)`)
      expect(args2[1]).to.eql(['snapshot1', 'snapshot3', 2, 'dependency2'])
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "registerMany" method when query execution succeeds', () => {
    const runStub = sinon.stub()
    const execStub = sinon.stub().onSecondCall().callsArgWithAsync(1, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      exec: execStub,
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.registerMany('test.db', [DEPENDENCY1, DEPENDENCY2])
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(execStub).to.have.been.calledTwice
      expect(execStub).to.have.been.calledWith('begin')
      expect(execStub).to.have.been.calledWith('commit')
      expect(runStub).to.have.been.calledTwice
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                                          values (?, ?, ?, ?)`)
      expect(args1[1]).to.eql(['snapshot1', 'snapshot2', 1, 'dependency1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into SnapshotDependency (parentSnapshotId, childSnapshotId, rank, dependencyId)
                                          values (?, ?, ?, ?)`)
      expect(args2[1]).to.eql(['snapshot1', 'snapshot3', 2, 'dependency2'])
      expect(closeStub).to.have.been.calledOnce
    })
  })

  it('should reject the "getAll" method when query execution returns an error', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.getAll('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotDependency')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "getAll" method when query execution succeeds', () => {
    const allStub = sinon.stub().callsArgWithAsync(1, null, [DEPENDENCY1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.getAll('test.db')
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotDependency')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql([DEPENDENCY1])
    })
  })

  it('should reject the "where" method when query execution returns an error', () => {
    const allStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.where('test.db', {
      dependencyId: 'dependency1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotDependency where 1 = 1 and dependencyId = \'dependency1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "where" method when query execution succeeds', () => {
    const allStub = sinon.stub().callsArgWithAsync(2, null, [DEPENDENCY1])
    const closeStub = sinon.stub()
    dbStub.returns({
      all: allStub,
      close: closeStub
    })
    expect(allStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.where('test.db', {
      dependencyId: 'dependency1'
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotDependency where 1 = 1 and dependencyId = \'dependency1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql([DEPENDENCY1])
    })
  })

  it('should reject the "find" method when query execution returns an error', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.find('test.db', {
      dependencyId: 'dependency1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotDependency where 1 = 1 and dependencyId = \'dependency1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "find" method when query execution succeeds', () => {
    const getStub = sinon.stub().callsArgWithAsync(2, null, DEPENDENCY1)
    const closeStub = sinon.stub()
    dbStub.returns({
      get: getStub,
      close: closeStub
    })
    expect(getStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.find('test.db', {
      dependencyId: ['dependency1', 'dependency2']
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from SnapshotDependency where 1 = 1 and dependencyId in (\'dependency1\', \'dependency2\')')
      expect(closeStub).to.have.been.calledOnce
      expect(results).to.eql(DEPENDENCY1)
    })
  })

  it('should reject the "remove" method when query execution returns an error', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.remove('test.db', {
      dependencyId: 'dependency1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from SnapshotDependency where 1 = 1 and dependencyId = \'dependency1\'')
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "remove" method when query execution succeeds', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.remove('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from SnapshotDependency where 1 = 1')
      expect(closeStub).to.have.been.calledOnce
    })
  })

  it('should reject the "removeOrphaned" method when query execution returns an error', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, new Error('error'))
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.removeOrphaned('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from SnapshotDependency
                                          where rowid in (
                                            select sd.rowid
                                            from SnapshotDependency sd
                                            left join AppSnapshot a on a.snapshotId = sd.parentSnapshotId
                                            where a.snapshotId is null
                                          )`)
      expect(closeStub).to.have.been.calledOnce
      expect(error.message).to.equal('error')
    })
  })

  it('should resolve the "removeOrphaned" method when query execution succeeds', () => {
    const runStub = sinon.stub().callsArgWithAsync(2, null)
    const closeStub = sinon.stub()
    dbStub.returns({
      run: runStub,
      close: closeStub
    })
    expect(runStub).not.to.have.been.called
    expect(closeStub).not.to.have.been.called
    const result = SnapshotDependency.removeOrphaned('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from SnapshotDependency
                                          where rowid in (
                                            select sd.rowid
                                            from SnapshotDependency sd
                                            left join AppSnapshot a on a.snapshotId = sd.parentSnapshotId
                                            where a.snapshotId is null
                                          )`)
      expect(closeStub).to.have.been.calledOnce
    })
  })
})
