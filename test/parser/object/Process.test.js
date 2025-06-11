const fs = require('fs')
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const parseObject = require('../../../src/parser/object/Process')
const Registry = require('../../../src/classes/Registry')
const ParseUtils = require('../../../src/utils/XML')
const { TYPES, SUBTYPES: { Process: PROCESS_TYPES } } = require('../../../src/utils/Constants')
const { defer } = require('../../test-utilities')

chai.use(sinonChai)
chai.use(chaiAsPromised)
const { expect } = chai

describe('Parser - Object - Process', () => {
  let getByIdStub, jsonDataDecisionService, jsonDataAjaxService, jsonDataHumanService, jsonDataIntegrationService,
    jsoNDataGeneralService, jsonDataImplementationService, jsonDataClientSideHumanService,
    jsonDataExternalService, jsonDataServiceFlow
  before(async () => {
    const filePathDecisionService = path.resolve(__dirname, '..', '..', 'files', 'Process.DecisionService.xml')
    const filePathAjaxService = path.resolve(__dirname, '..', '..', 'files', 'Process.AjaxService.xml')
    const filePathHumanService = path.resolve(__dirname, '..', '..', 'files', 'Process.HumanService.xml')
    const filePathIntegrationService = path.resolve(__dirname, '..', '..', 'files', 'Process.IntegrationService.xml')
    const filePathGeneralService = path.resolve(__dirname, '..', '..', 'files', 'Process.GeneralService.xml')
    const filePathImplementationService = path.resolve(__dirname, '..', '..', 'files', 'Process.ImplementationService.xml')
    const filePathClientSideHumanService = path.resolve(__dirname, '..', '..', 'files', 'Process.ClientSideHumanService.xml')
    const filePathExternalService = path.resolve(__dirname, '..', '..', 'files', 'Process.ExternalService.xml')
    const filePathServiceFlow = path.resolve(__dirname, '..', '..', 'files', 'Process.ServiceFlow.xml')
    jsonDataDecisionService = await ParseUtils.parseXML(fs.readFileSync(filePathDecisionService, 'utf8'), 'filename')
    jsonDataAjaxService = await ParseUtils.parseXML(fs.readFileSync(filePathAjaxService, 'utf8'), 'filename')
    jsonDataHumanService = await ParseUtils.parseXML(fs.readFileSync(filePathHumanService, 'utf8'), 'filename')
    jsonDataIntegrationService = await ParseUtils.parseXML(fs.readFileSync(filePathIntegrationService, 'utf8'), 'filename')
    jsoNDataGeneralService = await ParseUtils.parseXML(fs.readFileSync(filePathGeneralService, 'utf8'), 'filename')
    jsonDataImplementationService = await ParseUtils.parseXML(fs.readFileSync(filePathImplementationService, 'utf8'), 'filename')
    jsonDataClientSideHumanService = await ParseUtils.parseXML(fs.readFileSync(filePathClientSideHumanService, 'utf8'), 'filename')
    jsonDataExternalService = await ParseUtils.parseXML(fs.readFileSync(filePathExternalService, 'utf8'), 'filename')
    jsonDataServiceFlow = await ParseUtils.parseXML(fs.readFileSync(filePathServiceFlow, 'utf8'), 'filename')
  })
  beforeEach(() => {
    getByIdStub = sinon.stub(Registry.ObjectVersion, 'getById')
  })
  afterEach(() => {
    getByIdStub.restore()
  })

  it('should be a function', () => {
    expect(parseObject).to.be.a('function')
  })

  it('should ignore object versions that already exist', () => {
    getByIdStub.returns(defer(true, {
      workspace: 'name1',
      objectVersionId: 'versionId1',
      objectId: 'objectId1',
      name: 'versionName1',
      description: 'description1',
      type: 'type1',
      subtype: 'subtype1',
      isExposed: true
    }))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataDecisionService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '64a4e2ac-e566-4ae6-9cf4-751b218e0ca2')
      expect(data).to.eql({
        register: false,
        versionId: '64a4e2ac-e566-4ae6-9cf4-751b218e0ca2'
      })
    })
  })

  it('should process decision service objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataDecisionService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '64a4e2ac-e566-4ae6-9cf4-751b218e0ca2')
      expect(data).to.eql({
        register: true,
        id: '1.bdd3fc6b-5583-46c6-9ddf-91408b409b0f',
        name: 'Decision1',
        type: TYPES.Process,
        subType: PROCESS_TYPES.DecisionService,
        dependencies: [],
        versionId: '64a4e2ac-e566-4ae6-9cf4-751b218e0ca2',
        description: null,
        isExposed: false
      })
    })
  })

  it('should process ajax service objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataAjaxService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '04e9ee0e-3851-43c1-86c9-9e128c3fc245')
      expect(data).to.eql({
        register: true,
        id: '1.b50518e0-7e3a-4e1a-a2d1-6dfba66e21d1',
        name: 'AJAX1',
        type: TYPES.Process,
        subType: PROCESS_TYPES.AjaxService,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'binding',
          dependencyName: 'Untitled1'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'binding',
          dependencyName: 'Untitled2'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'Untitled3'
        }, {
          childReference: '/21.ed99f470-25b4-4a03-b89d-888bc265e2aa',
          dependencyType: 'epv'
        }, {
          childReference: '/50.2641e279-160b-4d0d-bc96-528b36793ecf',
          dependencyType: 'resource'
        }, {
          childReference: '/4.f32f2065-49b8-4e77-8c58-90d96ffce088',
          dependencyType: 'uca'
        }, {
          childReference: '/1.143ff27f-5e08-478c-af65-06723fa26d26',
          dependencyType: 'attachedService'
        }, {
          childReference: '/1.0295217c-7383-4a27-b311-333ea889f2bb',
          dependencyType: 'attachedService'
        }],
        versionId: '04e9ee0e-3851-43c1-86c9-9e128c3fc245',
        description: null,
        isExposed: true
      })
    })
  })

  it('should process human service objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataHumanService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '1611ccb5-4efd-4ae8-9c94-27ef99afbbda')
      expect(data).to.eql({
        register: true,
        id: '1.22a9a945-649d-4bc1-9ac0-75f837f4d494',
        name: 'Sem título',
        type: TYPES.Process,
        subType: PROCESS_TYPES.HumanService,
        dependencies: [{
          childReference: '/24.2a87eb22-940b-4664-be65-5806a5d01ac8',
          dependencyType: 'exposedTo'
        }, {
          childReference: '/12.7425eece-319f-484b-a59f-8efeaaec2582',
          dependencyType: 'binding',
          dependencyName: 'Untitled1'
        }, {
          childReference: '/12.60da4770-d3a3-4937-840f-8fd74f8c33ce',
          dependencyType: 'binding',
          dependencyName: 'Untitled2'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.a88ad0a1-b385-42d6-b2a8-55c9234f231e',
          dependencyType: 'variable',
          dependencyName: 'Untitled3'
        }, {
          childReference: '/21.ed99f470-25b4-4a03-b89d-888bc265e2aa',
          dependencyType: 'epv'
        }, {
          childReference: '/50.2641e279-160b-4d0d-bc96-528b36793ecf',
          dependencyType: 'resource'
        }, {
          childReference: '64.af46ef40-d360-4e61-a58a-5dcd3b249894',
          dependencyType: 'coachView'
        }, {
          childReference: '64.393eb28a-759f-4d92-9bee-56f7dab3765f',
          dependencyType: 'coachView'
        }],
        versionId: '1611ccb5-4efd-4ae8-9c94-27ef99afbbda',
        description: null,
        isExposed: true
      })
    })
  })

  it('should process integration service objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataIntegrationService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', 'b65eb81f-6a68-4d7c-b0e1-e0c5c3ee8fe1')
      expect(data).to.eql({
        register: true,
        id: '1.0295217c-7383-4a27-b311-333ea889f2bb',
        name: 'Integration2',
        type: TYPES.Process,
        subType: PROCESS_TYPES.IntegrationService,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.4f114e73-2520-40d7-b2ea-db9dcc4aa1f0',
          dependencyType: 'binding',
          dependencyName: 'originalTeam'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.4f114e73-2520-40d7-b2ea-db9dcc4aa1f0',
          dependencyType: 'binding',
          dependencyName: 'filteredTeam'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'binding',
          dependencyName: 'Untitled2'
        }, {
          childReference: '/12.60da4770-d3a3-4937-840f-8fd74f8c33ce',
          dependencyType: 'variable',
          dependencyName: 'Untitled1'
        }, {
          childReference: '/21.ed99f470-25b4-4a03-b89d-888bc265e2aa',
          dependencyType: 'epv'
        }, {
          childReference: '/50.2641e279-160b-4d0d-bc96-528b36793ecf',
          dependencyType: 'resource'
        }, {
          childReference: '/1.61a0bf71-b88b-4fc3-b79b-f023825ed63e',
          dependencyType: 'attachedService'
        }, {
          childReference: '/1.143ff27f-5e08-478c-af65-06723fa26d26',
          dependencyType: 'attachedService'
        }],
        versionId: 'b65eb81f-6a68-4d7c-b0e1-e0c5c3ee8fe1',
        description: null,
        isExposed: false
      })
    })
  })

  it('should process general service objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsoNDataGeneralService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '1c04d272-5a1d-4c65-8c34-f974aebaa8c9')
      expect(data).to.eql({
        register: true,
        id: '1.350b261f-7e76-4fd5-abe4-25817b0090f3',
        name: 'UCA Service',
        type: TYPES.Process,
        subType: PROCESS_TYPES.GeneralSystemService,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'binding',
          dependencyName: 'Untitled1'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'binding',
          dependencyName: 'Untitled1'
        }],
        versionId: '1c04d272-5a1d-4c65-8c34-f974aebaa8c9',
        description: null,
        isExposed: false
      })
    })
  })

  it('should process implementation service objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataImplementationService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '9cca5474-f48f-4f51-b62d-12fcaafc82b0')
      expect(data).to.eql({
        register: true,
        id: '1.c987c4c1-9986-4e5a-b355-9651308f1f80',
        name: 'Serviço de implementação',
        type: TYPES.Process,
        subType: PROCESS_TYPES.ImplementationService,
        dependencies: [],
        versionId: '9cca5474-f48f-4f51-b62d-12fcaafc82b0',
        description: null,
        isExposed: false
      })
    })
  })

  it('should process client side human service objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataClientSideHumanService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', 'a9457050-5a86-413e-b5ea-76f6f198cb1c')
      expect(data).to.eql({
        register: true,
        id: '1.236d78a5-bcbd-4c3e-a421-cfb181f40791',
        name: 'Serviço manual de lado-cliente',
        type: TYPES.Process,
        subType: PROCESS_TYPES.ClientSideHumanService,
        dependencies: [{
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'binding',
          dependencyName: 'input1'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'binding',
          dependencyName: 'output1'
        }, {
          childReference: '/12.60da4770-d3a3-4937-840f-8fd74f8c33ce',
          dependencyType: 'binding',
          dependencyName: 'variable1'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'activitiesTextFilter'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.d2e5a15a-ea53-4793-9e93-29af5bd80b13',
          dependencyType: 'variable',
          dependencyName: 'breadcrumbs'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
          dependencyType: 'variable',
          dependencyName: 'buttonClicked_GanttView'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.68474ab0-d56f-47ee-b7e9-510b45a2a8be',
          dependencyType: 'variable',
          dependencyName: 'currentDate'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
          dependencyType: 'variable',
          dependencyName: 'follow'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'instanceName'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
          dependencyType: 'variable',
          dependencyName: 'hideDocumentSection'
        }, {
          childReference: 'af325104-4d5d-4315-88c6-6c1de40811b9/12.9a9d479f-686b-484b-80a6-30b52aa4e935',
          dependencyType: 'variable',
          dependencyName: 'instanceSummary'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'selectedActivitiesCategory'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.d2e5a15a-ea53-4793-9e93-29af5bd80b13',
          dependencyType: 'variable',
          dependencyName: 'activitiesCategoriesSelectionList'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'selectedTasksCategory'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.d2e5a15a-ea53-4793-9e93-29af5bd80b13',
          dependencyType: 'variable',
          dependencyName: 'tasksCategoriesSelectionList'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'selectedInstanceId'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
          dependencyType: 'variable',
          dependencyName: 'automaticRefreshTrigger'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
          dependencyType: 'variable',
          dependencyName: 'manualRefreshTrigger'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'failedSaveMessage'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.d8fa7561-8636-40a9-bd70-f45128bb7e54',
          dependencyType: 'variable',
          dependencyName: 'boSaveFailedError'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
          dependencyType: 'variable',
          dependencyName: 'canViewDiagram'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'navigationURL'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
          dependencyType: 'variable',
          dependencyName: 'unsavedLocalChanges'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.c09c9b6e-aabd-4897-bef2-ed61db106297',
          dependencyType: 'variable',
          dependencyName: 'originalInput'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.c09c9b6e-aabd-4897-bef2-ed61db106297',
          dependencyType: 'variable',
          dependencyName: 'incomingChanges'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.c09c9b6e-aabd-4897-bef2-ed61db106297',
          dependencyType: 'variable',
          dependencyName: 'localChanges'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'dataSectionBoundaryEventType'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.db884a3c-c533-44b7-bb2d-47bec8ad4022',
          dependencyType: 'variable',
          dependencyName: 'helperScriptURL'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/12.83ff975e-8dbc-42e5-b738-fa8bc08274a2',
          dependencyType: 'variable',
          dependencyName: 'incomingChangesMerged'
        }, {
          childReference: 'af325104-4d5d-4315-88c6-6c1de40811b9/50.4b698a84-427b-4801-9c1d-18ddcc561bc6',
          dependencyType: 'resource'
        }, {
          childReference: 'af325104-4d5d-4315-88c6-6c1de40811b9/1.554dd7d5-ceb8-4548-91e5-788940b70e0d',
          dependencyType: 'attachedService'
        }, {
          childReference: '64.5f0e6839-f7f9-41a3-b633-541ba91f9b31',
          dependencyType: 'coachView'
        }, {
          childReference: '64.0678c7bb-7028-4bca-8111-e0e9977f294d',
          dependencyType: 'coachView'
        }, {
          childReference: '64.d109fc11-3729-396e-bf94-d748d1967596',
          dependencyType: 'coachView'
        }, {
          childReference: '64.d109fc11-3729-396e-bf94-d748d1967596',
          dependencyType: 'coachView'
        }, {
          childReference: '64.e44c5617-c1ca-31f8-a810-ce1138fb1c99',
          dependencyType: 'coachView'
        }, {
          childReference: '64.d109fc11-3729-396e-bf94-d748d1967596',
          dependencyType: 'coachView'
        }, {
          childReference: '64.327b1224-e7d9-3d9c-ad44-392f5702827c',
          dependencyType: 'coachView'
        }, {
          childReference: '64.d109fc11-3729-396e-bf94-d748d1967596',
          dependencyType: 'coachView'
        }, {
          childReference: '64.fc2d6e5b-da91-4e0a-b874-3ec8ace34c82',
          dependencyType: 'coachView'
        }, {
          childReference: '64.36f46ec6-616b-4e38-86aa-fba20ec6f9b4',
          dependencyType: 'coachView'
        }],
        versionId: 'a9457050-5a86-413e-b5ea-76f6f198cb1c',
        description: '<p>When you create a new details UI, the generated human service uses a copy of this template. You can further customize the human service to create your details user interface.</p><p>The service template includes:</p><ul><li>A <b>View instance details</b> coach, which has these coach controls:</li><ul><li><b>Default Instance Details Template</b> - displays the instance details in Process Portal</li><li><b>Data section view</b> - displays the values of the variables that are passed into the human service</li></ul><li>A <b>Show error</b> coach - returns an error if the instance is not found.</li></ul>',
        isExposed: true
      })
    })
  })

  it('should process external service objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataExternalService)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '5df7e653-a455-4ded-9867-27b1b9b00eec')
      expect(data).to.eql({
        register: true,
        id: '1.07699666-a47b-496a-9826-e8dd33694f7b',
        name: 'Serviço externo',
        type: TYPES.Process,
        subType: PROCESS_TYPES.ExternalService,
        dependencies: [],
        versionId: '5df7e653-a455-4ded-9867-27b1b9b00eec',
        description: null,
        isExposed: false
      })
    })
  })

  it('should process service flow objects that don\'t exist yet', () => {
    getByIdStub.returns(defer(true, null))
    expect(getByIdStub).not.to.have.been.called
    const result = parseObject('name', jsonDataServiceFlow)
    expect(result).to.be.an.instanceOf(Promise)
    return expect(result).to.be.eventually.fulfilled.then(data => {
      expect(getByIdStub).to.have.been.calledOnce
      expect(getByIdStub).to.have.been.calledWith('name', '846cacfb-94b8-461e-a515-87d9ebacfb8d')
      expect(data).to.eql({
        register: true,
        id: '1.c236a1d8-a7f1-4ce1-af92-33d22fc6f33b',
        name: 'Fluxo de Serviço',
        type: TYPES.Process,
        subType: PROCESS_TYPES.ServiceFlow,
        dependencies: [{
          childReference: '/1.bdd3fc6b-5583-46c6-9ddf-91408b409b0f',
          dependencyType: 'attachedService'
        }, {
          childReference: '/1.61a0bf71-b88b-4fc3-b79b-f023825ed63e',
          dependencyType: 'attachedService'
        }, {
          childReference: '2c7ae840-cf8c-4998-839b-2cf42b6b7656/1.5a9202c7-6f7b-440a-8d6c-f9fd24ed3b92',
          dependencyType: 'attachedService'
        }, {
          childReference: '/1.350b261f-7e76-4fd5-abe4-25817b0090f3',
          dependencyType: 'attachedService'
        }],
        versionId: '846cacfb-94b8-461e-a515-87d9ebacfb8d',
        description: null,
        isExposed: true
      })
    })
  })
})
