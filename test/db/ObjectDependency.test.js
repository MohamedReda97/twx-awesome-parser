const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const chaiString = require('chai-string')
let ObjectDependency = require('../../src/db/ObjectDependency')
let commonDB = require('../../src/db/common')

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(chaiString)
const { expect } = chai

const DEPENDENCY1 = {
  parentObjectVersionId: 'version1',
  childObjectVersionId: 'version2',
  dependencyType: 'type1',
  dependencyName: 'name1'
}

const DEPENDENCY2 = {
  parentObjectVersionId: 'version1',
  childObjectVersionId: 'version3',
  dependencyType: 'type2',
  dependencyName: 'name2'
}

describe('DB - ObjectDependency', () => {
  let dbStub

  beforeEach(() => {
    delete require.cache[require.resolve('../../src/db/common')]
    delete require.cache[require.resolve('../../src/db/ObjectDependency')]
    commonDB = require('../../src/db/common')
    dbStub = sinon.stub(commonDB, 'getDB')
    ObjectDependency = require('../../src/db/ObjectDependency')
  })

  afterEach(() => {
    dbStub.restore()
    delete require.cache[require.resolve('../../src/db/ObjectDependency')]
  })

  it('should have the correct methods', () => {
    expect(ObjectDependency).to.be.an('object')
    expect(ObjectDependency).to.respondTo('register')
    expect(ObjectDependency).to.respondTo('registerMany')
    expect(ObjectDependency).to.respondTo('getAll')
    expect(ObjectDependency).to.respondTo('where')
    expect(ObjectDependency).to.respondTo('find')
    expect(ObjectDependency).to.respondTo('remove')
    expect(ObjectDependency).to.respondTo('removeOrphaned')
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
    const result = ObjectDependency.register('test.db', DEPENDENCY1)
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
                                          values (?, ?, ?, ?)`)
      expect(args[1]).to.eql(['version1', 'version2', 'type1', 'name1'])
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
    const result1 = ObjectDependency.register('test.db', DEPENDENCY1)
    const result2 = ObjectDependency.register('test.db', DEPENDENCY2)
    return Promise.all([
      expect(result1).to.eventually.be.fulfilled,
      expect(result2).to.eventually.be.fulfilled
    ]).then(() => {
      expect(dbStub).to.have.been.calledTwice
      expect(dbStub).to.have.been.calledWith('test.db')
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
                                          values (?, ?, ?, ?)`)
      expect(args1[1]).to.eql(['version1', 'version2', 'type1', 'name1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
                                          values (?, ?, ?, ?)`)
      expect(args2[1]).to.eql(['version1', 'version3', 'type2', 'name2'])
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
    const result = ObjectDependency.registerMany('test.db', [DEPENDENCY1, DEPENDENCY2])
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(execStub).to.have.been.calledTwice
      expect(execStub).to.have.been.calledWith('begin')
      expect(execStub).to.have.been.calledWith('commit')
      expect(runStub).to.have.been.calledTwice
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
                                          values (?, ?, ?, ?)`)
      expect(args1[1]).to.eql(['version1', 'version2', 'type1', 'name1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
                                          values (?, ?, ?, ?)`)
      expect(args2[1]).to.eql(['version1', 'version3', 'type2', 'name2'])
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
    const result = ObjectDependency.registerMany('test.db', [DEPENDENCY1, DEPENDENCY2])
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(execStub).to.have.been.calledTwice
      expect(execStub).to.have.been.calledWith('begin')
      expect(execStub).to.have.been.calledWith('commit')
      expect(runStub).to.have.been.calledTwice
      const args1 = runStub.getCall(0).args
      expect(args1[0]).to.equalIgnoreSpaces(`insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
                                          values (?, ?, ?, ?)`)
      expect(args1[1]).to.eql(['version1', 'version2', 'type1', 'name1'])
      const args2 = runStub.getCall(1).args
      expect(args2[0]).to.equalIgnoreSpaces(`insert into ObjectDependency (parentObjectVersionId, childObjectVersionId, dependencyType, dependencyName)
                                          values (?, ?, ?, ?)`)
      expect(args2[1]).to.eql(['version1', 'version3', 'type2', 'name2'])
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
    const result = ObjectDependency.getAll('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectDependency')
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
    const result = ObjectDependency.getAll('test.db')
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectDependency')
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
    const result = ObjectDependency.where('test.db', {
      parentObjectVersionId: 'version1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectDependency where 1 = 1 and parentObjectVersionId = \'version1\'')
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
    const result = ObjectDependency.where('test.db', {
      parentObjectVersionId: 'version1'
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(allStub).to.have.been.calledOnce
      const args = allStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectDependency where 1 = 1 and parentObjectVersionId = \'version1\'')
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
    const result = ObjectDependency.find('test.db', {
      parentObjectVersionId: 'version1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectDependency where 1 = 1 and parentObjectVersionId = \'version1\'')
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
    const result = ObjectDependency.find('test.db', {
      parentObjectVersionId: ['version1', 'version2']
    })
    return expect(result).to.eventually.be.fulfilled.then((results) => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(getStub).to.have.been.calledOnce
      const args = getStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('select * from ObjectDependency where 1 = 1 and parentObjectVersionId in (\'version1\', \'version2\')')
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
    const result = ObjectDependency.remove('test.db', {
      parentObjectVersionId: 'version1'
    })
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from ObjectDependency where 1 = 1 and parentObjectVersionId = \'version1\'')
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
    const result = ObjectDependency.remove('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces('delete from ObjectDependency where 1 = 1')
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
    const result = ObjectDependency.removeOrphaned('test.db')
    return expect(result).to.eventually.be.rejected.then(error => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from ObjectDependency
                                          where rowid in (
                                            select od.rowid
                                            from ObjectDependency od
                                            left join ObjectVersion ov on ov.objectVersionId = od.parentObjectVersionId
                                            where ov.objectVersionId is null
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
    const result = ObjectDependency.removeOrphaned('test.db')
    return expect(result).to.eventually.be.fulfilled.then(() => {
      expect(dbStub).to.have.been.calledOnce
      expect(dbStub).to.have.been.calledWith('test.db')
      expect(runStub).to.have.been.calledOnce
      const args = runStub.getCall(0).args
      expect(args[0]).to.equalIgnoreSpaces(`delete from ObjectDependency
                                          where rowid in (
                                            select od.rowid
                                            from ObjectDependency od
                                            left join ObjectVersion ov on ov.objectVersionId = od.parentObjectVersionId
                                            where ov.objectVersionId is null
                                          )`)
      expect(closeStub).to.have.been.calledOnce
    })
  })
})
