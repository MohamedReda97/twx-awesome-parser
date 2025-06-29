const ParseUtils = require('../../utils/XML')
const Registry = require('../../classes/Registry')
const { TYPES, SUBTYPES: { Process: PROCESS_TYPES }, OBJECT_DEPENDENCY_TYPES } = require('../../utils/Constants')
const Performance = require('../../utils/Performance')

const parseProcess = Performance.makeMeasurable(async (databaseName, jsonData) => {
  const process = jsonData.teamworks.process[0];
  const versionId = process.versionId[0];

  const item = await Registry.ObjectVersion.getById(databaseName, versionId);

  let subType = PROCESS_TYPES.GeneralSystemService;
  if (process.processType && !ParseUtils.isNullXML(process.processType[0])) {
    subType = process.processType[0];
  }

  const result = {
    register: !item,
    id: process.$.id,
    versionId: versionId,
    name: process.$.name,
    description: ParseUtils.isNullXML(process.description[0]) ? null : process.description[0],
    type: TYPES.Process,
    subType: subType,
    isExposed: false,
    dependencies: [],
    details: {},
  };

  if (subType === PROCESS_TYPES.AjaxService || !ParseUtils.isNullXML(process.exposedType[0])) {
    result.isExposed = true;
  }

  // Exposed to Start
  if (process.participantRef && !ParseUtils.isNullXML(process.participantRef[0])) {
    result.dependencies.push({
      childReference: process.participantRef[0],
      dependencyType: OBJECT_DEPENDENCY_TYPES.Process.ExposedTo,
    });
    result.isExposed = true;
  }

  // Input and Output Parameters
  if (process.processParameter) {
    for (let i = 0; i < process.processParameter.length; i++) {
      if (!ParseUtils.isNullXML(process.processParameter[i]) && process.processParameter[i].classId && !ParseUtils.isNullXML(process.processParameter[i].classId[0])) {
        result.dependencies.push({
          childReference: process.processParameter[i].classId[0],
          dependencyType: OBJECT_DEPENDENCY_TYPES.Process.Binding,
          dependencyName: process.processParameter[i].$.name,
        });
      }
    }
  }

  // Private Variables
  if (process.processVariable) {
    for (let i = 0; i < process.processVariable.length; i++) {
      if (!ParseUtils.isNullXML(process.processVariable[i]) && process.processVariable[i].classId && !ParseUtils.isNullXML(process.processVariable[i].classId[0])) {
        result.dependencies.push({
          childReference: process.processVariable[i].classId[0],
          dependencyType: OBJECT_DEPENDENCY_TYPES.Process.Variable,
          dependencyName: process.processVariable[i].$.name,
        });
      }
    }
  }

  // EPVs
  if (process.EPV_PROCESS_LINK) {
    for (let i = 0; i < process.EPV_PROCESS_LINK.length; i++) {
      if (!ParseUtils.isNullXML(process.EPV_PROCESS_LINK[i]) && process.EPV_PROCESS_LINK[i].epvId && !ParseUtils.isNullXML(process.EPV_PROCESS_LINK[i].epvId[0])) {
        result.dependencies.push({
          childReference: process.EPV_PROCESS_LINK[i].epvId[0],
          dependencyType: OBJECT_DEPENDENCY_TYPES.Process.EPV,
        });
      }
    }
  }

  // Resources
  if (process.RESOURCE_PROCESS_LINK) {
    for (let i = 0; i < process.RESOURCE_PROCESS_LINK.length; i++) {
      const item = process.RESOURCE_PROCESS_LINK[i];
      if (!ParseUtils.isNullXML(item) && item.resourceBundleGroupId && !ParseUtils.isNullXML(item.resourceBundleGroupId[0])) {
        result.dependencies.push({
          childReference: item.resourceBundleGroupId[0],
          dependencyType: OBJECT_DEPENDENCY_TYPES.Process.Resource,
        });
      }
    }
  }

  // UCAs
  const ucas = ParseUtils.xpath(process, '//ucaRef');
  if (ucas) {
    ucas.map((ucaId) => {
      if (!ParseUtils.isNullXML(ucaId)) {
        result.dependencies.push({
          childReference: ucaId,
          dependencyType: OBJECT_DEPENDENCY_TYPES.Process.UCA,
        });
      }
    });
  }

  // Subprocesses
  const subProcesses = ParseUtils.xpath(process, '//attachedProcessRef');
  if (subProcesses) {
    subProcesses.map((subProcessId) => {
      if (!ParseUtils.isNullXML(subProcessId)) {
        result.dependencies.push({
          childReference: subProcessId,
          dependencyType: OBJECT_DEPENDENCY_TYPES.Process.AttachedService,
        });
      }
    });
  }

  // Coaches
  const coaches = ParseUtils.xpath(process, '//TWComponent/layoutData');
  if (coaches) {
    for (let i = 0; i < coaches.length; i++) {
      const layoutString = coaches[i];
      if (!ParseUtils.isNullXML(layoutString)) {
        const jsonLayout = await ParseUtils.parseXML(layoutString, 'layout');
        const viewIds = ParseUtils.xpath(jsonLayout, '//viewUUID');
        if (viewIds) {
          viewIds.map((viewId) => {
            result.dependencies.push({
              childReference: viewId,
              dependencyType: OBJECT_DEPENDENCY_TYPES.Process.CoachView,
            });
          });
        }
      }
    }
  }

  // Coach Flow
  if (process.coachflow) {
    for (let i = 0; i < process.coachflow.length; i++) {
      if (!ParseUtils.isNullXML(process.coachflow[i])) {
        const viewIds = ParseUtils.xpath(process.coachflow[i], '//viewUUID');
        if (viewIds) {
          viewIds.map((viewId) => {
            result.dependencies.push({
              childReference: viewId,
              dependencyType: OBJECT_DEPENDENCY_TYPES.Process.CoachView,
            });
          });
        }
      }
    }
  }

  // CSHS-specific parsing
  if (subType === PROCESS_TYPES.ClientSideHumanService) {
    const cshsDetails = await parseCSHSDetails(process);
    Object.assign(result.details, cshsDetails);
  }

  // Extract scripts from process
  const scripts = extractScriptsFromProcess(process);
  if (scripts.length > 0) {
    result.details.scripts = scripts;
  }

  return result;
}, 'parseProcess')

/**
 * Extract scripts from process items and jsonData
 * @param {Object} process - The process object from XML
 * @returns {Array} Array of script objects with name and content
 */
function extractScriptsFromProcess(process) {
  const scripts = [];

  // 1. Extract from <item> -> <TWComponent> -> <script>
  if (process.item && Array.isArray(process.item)) {
    process.item.forEach(item => {
      if (ParseUtils.isNullXML(item) || !item.TWComponent) return;

      const components = Array.isArray(item.TWComponent) ? item.TWComponent : [item.TWComponent];
      components.forEach(component => {
        if (ParseUtils.isNullXML(component) || !component.script || ParseUtils.isNullXML(component.script[0])) return;

        const scriptName = item.name?.[0] || 'unnamed_script_from_item';
        const scriptContent = component.script[0];

        if (scriptContent && typeof scriptContent === 'string') {
          scripts.push({
            name: scriptName,
            content: scriptContent.trim()
          });
        }
      });
    });
  }

  // 2. Extract from <jsonData>
  if (process.jsonData && !ParseUtils.isNullXML(process.jsonData[0])) {
    try {
      const jsonData = JSON.parse(process.jsonData[0]);
      const flowElements = jsonData?.rootElement?.[0]?.flowElement;

      if (flowElements && Array.isArray(flowElements)) {
        flowElements.forEach(element => {
          // Script tasks
          if (element.declaredType === 'scriptTask' && element.script?.content?.[0]) {
            scripts.push({
              name: element.name || 'unnamed_script_task',
              content: element.script.content[0].trim()
            });
          }
          // Pre-assignment scripts
          if (element.extensionElements?.preAssignmentScript?.[0]?.trim()) {
            scripts.push({
              name: `${element.name || 'Unnamed'} (pre-assignment)`,
              content: element.extensionElements.preAssignmentScript[0].trim()
            });
          }
        });
      }
    } catch (error) {
      console.warn(`[Script Extraction] Could not parse jsonData for process ${process.$.name}: ${error.message}`);
    }
  }

  return scripts;
}

/**
 * Parse CSHS-specific details including variables and elements
 * @param {Object} process - The process object from XML
 * @returns {Object} CSHS details
 */
async function parseCSHSDetails(process) {
  const details = {
    variables: {
      input: [],
      output: [],
      private: []
    },
    elements: {
      formTasks: [],
      callActivities: [],
      exclusiveGateways: [],
      scriptTasks: []
    }
  }

  // Parse variables
  if (process.processParameter) {
    for (const param of process.processParameter) {
      if (!ParseUtils.isNullXML(param)) {
        const variable = {
          name: param.$.name || 'Unnamed',
          hasDefault: param.hasDefault ? param.hasDefault[0] === 'true' : false,
          type: param.parameterType ? param.parameterType[0] : '0'
        }

        if (variable.type === '1') {
          details.variables.input.push(variable)
        } else if (variable.type === '2') {
          details.variables.output.push(variable)
        }
      }
    }
  }

  if (process.processVariable) {
    for (const variable of process.processVariable) {
      if (!ParseUtils.isNullXML(variable)) {
        details.variables.private.push({
          name: variable.$.name || 'Unnamed',
          hasDefault: variable.hasDefault ? variable.hasDefault[0] === 'true' : false
        })
      }
    }
  }

  // Parse process elements from jsonData
  if (process.jsonData && !ParseUtils.isNullXML(process.jsonData[0])) {
    try {
      const jsonData = JSON.parse(process.jsonData[0])
      if (jsonData.rootElement && jsonData.rootElement[0] &&
          jsonData.rootElement[0].extensionElements &&
          jsonData.rootElement[0].extensionElements.userTaskImplementation &&
          jsonData.rootElement[0].extensionElements.userTaskImplementation[0] &&
          jsonData.rootElement[0].extensionElements.userTaskImplementation[0].flowElement) {

        const flowElements = jsonData.rootElement[0].extensionElements.userTaskImplementation[0].flowElement

        for (const element of flowElements) {
          const elementData = {
            name: element.name || 'Unnamed',
            id: element.id,
            hasPreScript: false,
            hasPostScript: false,
            preScript: '',
            postScript: '',
            script: ''
          }

          // Check for pre/post assignment scripts
          if (element.extensionElements) {
            if (element.extensionElements.preAssignmentScript &&
                element.extensionElements.preAssignmentScript.length > 0 &&
                element.extensionElements.preAssignmentScript[0].trim()) {
              elementData.hasPreScript = true
              elementData.preScript = element.extensionElements.preAssignmentScript[0]
            }

            if (element.extensionElements.postAssignmentScript &&
                element.extensionElements.postAssignmentScript.length > 0 &&
                element.extensionElements.postAssignmentScript[0].trim()) {
              elementData.hasPostScript = true
              elementData.postScript = element.extensionElements.postAssignmentScript[0]
            }
          }

          // Categorize by element type
          switch (element.declaredType) {
            case 'com.ibm.bpmsdk.model.bpmn20.ibmext.TFormTask':
              details.elements.formTasks.push(elementData)
              break
            case 'callActivity':
              details.elements.callActivities.push(elementData)
              break
            case 'exclusiveGateway':
              details.elements.exclusiveGateways.push(elementData)
              break
            case 'scriptTask':
              // Extract script content for script tasks
              if (element.script && element.script.content && element.script.content.length > 0) {
                elementData.script = element.script.content[0]
              }
              details.elements.scriptTasks.push(elementData)
              break
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing CSHS jsonData:', error)
    }
  }

  return details
}

module.exports = parseProcess
