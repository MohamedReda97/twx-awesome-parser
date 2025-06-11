const TYPES = {
  Process: '1',
  UCA: '4',
  WebService: '7',
  Report: '11',
  TWClass: '12',
  Scoreboard: '13',
  TrackingGroup: '14',
  TimingInterval: '15',
  Layout: '20',
  EPV: '21',
  Participant: '24',
  BPD: '25',
  SLA: '47',
  KPI: '49',
  Resource: '50',
  UserAttribute: '51',
  HistoricalScenario: '53',
  ExternalActivity: '60',
  File: '61',
  EnvironmentVariable: '62',
  ProjectDefaults: '63',
  CoachView: '64',
  EventSubscription: '71',
  Theme: '72'
}

const TYPES_DESCRIPTION = {
  Process: 'process',
  UCA: 'underCoverAgent',
  WebService: 'webService',
  Report: 'report',
  TWClass: 'twClass',
  Scoreboard: 'scoreboard',
  TrackingGroup: 'trackingGroup',
  TimingInterval: 'timingInterval',
  Layout: 'layout',
  EPV: 'epv',
  Participant: 'participant',
  BPD: 'bpd',
  SLA: 'sla',
  KPI: 'metric',
  Resource: 'resourceBundleGroup',
  UserAttribute: 'userAttributeDefinition',
  ExternalActivity: 'externalActivity',
  File: 'managedAsset',
  EnvironmentVariable: 'environmentVariableSet',
  ProjectDefaults: 'projectDefaults',
  CoachView: 'coachView',
  EventSubscription: 'eventSubscription'
}

const PROCESS_TYPES = {
  DecisionService: '1',
  AjaxService: '2',
  HumanService: '3',
  IntegrationService: '4',
  ImplementationService: '5',
  GeneralSystemService: '6',
  ClientSideHumanService: '10',
  ExternalService: '11',
  ServiceFlow: '12'
}

const PROCESS_TYPES_DESCRIPTION = {
  DecisionService: 'decisionService',
  AjaxService: 'ajaxService',
  HumanService: 'humanService',
  IntegrationService: 'integrationService',
  GeneralSystemService: 'generalService',
  ImplementationService: 'implementationService',
  ClientSideHumanService: 'clientSideHumanService',
  ExternalService: 'externalService',
  ServiceFlow: 'serviceFlow'
}

const BPD_TYPES = {
  BPD: '0',
  Process: '1'
}

const BPD_TYPES_DESCRIPTION = {
  BPD: 'BPD',
  Process: 'Process'
}

const OBJECT_DEPENDENCY_TYPES = {
  BPD: {
    AttachedActivity: 'attachedActivity',
    AttachedProcess: 'attachedProcess',
    AttachedService: 'attachedService',
    Binding: 'binding',
    DataExposedTo: 'dataExposedTo',
    EPV: 'epv',
    ExposedTo: 'exposedTo',
    Metric: 'metric',
    Owner: 'owner',
    Participant: 'participant',
    PerformanceExposedTo: 'performanceExposedTo',
    UCA: 'uca',
    Variable: 'variable'
  },
  CoachView: {
    Asset: 'asset',
    Binding: 'binding',
    Config: 'config',
    CoachView: 'coachView',
    PaletteIcon: 'paletteIcon',
    PreviewImage: 'previewImage',
    Resource: 'resource'
  },
  EPV: {
    ExposedTo: 'exposedTo'
  },
  EventSubscription: {
    AttachedService: 'attachedService',
    ExposedTo: 'exposedTo'
  },
  KPI: {
    RollupMetric: 'rollupMetric'
  },
  Participant: {
    Manager: 'manager'
  },
  Process: {
    AttachedService: 'attachedService',
    Binding: 'binding',
    CoachView: 'coachView',
    EPV: 'epv',
    ExposedTo: 'exposedTo',
    Resource: 'resource',
    UCA: 'uca',
    Variable: 'variable'
  },
  ProjectDefaults: {
    CSS: 'css',
    Theme: 'theme',
    XSL: 'xsl'
  },
  Report: {
    EPV: 'epv',
    ExposedTo: 'exposedTo',
    Resource: 'resource',
    TrackingGroup: 'trackingGroup'
  },
  Scoreboard: {
    ExposedTo: 'exposedTo',
    Layout: 'layout',
    Report: 'report'
  },
  SLA: {
    ExposedTo: 'exposedTo',
    Metric: 'metric'
  },
  TWClass: {
    DataType: 'dataType'
  },
  UCA: {
    AttachedService: 'attachedService',
    DataType: 'dataType'
  },
  UserAttribute: {
    DataType: 'dataType'
  },
  WebService: {
    AttachedService: 'attachedService'
  }
}

module.exports = {
  TYPES,
  TYPES_DESCRIPTION,
  SUBTYPES: {
    Process: PROCESS_TYPES,
    BPD: BPD_TYPES
  },
  SUBTYPES_DESCRIPTION: {
    Process: PROCESS_TYPES_DESCRIPTION,
    BPD: BPD_TYPES_DESCRIPTION
  },
  OBJECT_DEPENDENCY_TYPES
}
