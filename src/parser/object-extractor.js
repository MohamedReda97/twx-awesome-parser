const fs = require("fs");
const path = require("path");
const { Parser: Xml2jsParser, processors: { stripPrefix } } = require("xml2js");
const { XMLParser } = require("fast-xml-parser");
const BusinessObjectSchemaParser = require("./business-object-schema-parser");

const embeddedBpmnParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "",
	removeNSPrefix: true,
});

/**
 * Extract per-object XML files from a TWX archive or extracted directory.
 */
class ObjectExtractor {
	constructor() {
		this.parser = new Xml2jsParser({
			explicitArray: false,
			ignoreAttrs: false,
			mergeAttrs: true,
			tagNameProcessors: [stripPrefix],
		});
		this.businessObjectParser = new BusinessObjectSchemaParser();
	}

	/**
	 * @param {ADMZip} zip
	 * @param {Array} objectList — entries from package.xml
	 * @returns {Promise<Array>}
	 */
	async extractObjects(zip, objectList) {
		const objects = [];

		for (const objMeta of objectList) {
			try {
				let objectFileName = `objects/${objMeta.versionId}.xml`;
				let objectEntry = zip.getEntry(objectFileName);

				if (!objectEntry) {
					objectFileName = `objects/${objMeta.id}.xml`;
					objectEntry = zip.getEntry(objectFileName);
				}

				if (objectEntry) {
					const objectXml = objectEntry.getData().toString("utf8");
					const objectData = await this.parser.parseStringPromise(objectXml);
					const extractedObject = this.extractObjectDetails(objectData, objMeta, objectList);
					objects.push(extractedObject);
				} else {
					objects.push({
						id: objMeta.id,
						versionId: objMeta.versionId,
						name: objMeta.name,
						type: objMeta.type,
						typeName: objMeta.typeName,
						details: null,
						error: "Object file not found",
					});
				}
			} catch (error) {
				console.warn(`Error processing object ${objMeta.name}:`, error.message);
				objects.push({
					id: objMeta.id,
					versionId: objMeta.versionId,
					name: objMeta.name,
					type: objMeta.type,
					typeName: objMeta.typeName,
					details: null,
					error: error.message,
				});
			}
		}

		return objects;
	}

	/**
	 * @param {string} twxDirPath
	 * @param {Array} objectList
	 * @returns {Promise<Array>}
	 */
	async extractObjectsFromDir(twxDirPath, objectList) {
		const objects = [];
		const objectsDir = path.join(twxDirPath, "objects");

		for (const objMeta of objectList) {
			try {
				let objectFilePath = path.join(objectsDir, `${objMeta.versionId}.xml`);

				if (!fs.existsSync(objectFilePath)) {
					objectFilePath = path.join(objectsDir, `${objMeta.id}.xml`);
				}

				if (fs.existsSync(objectFilePath)) {
					const objectXml = fs.readFileSync(objectFilePath, "utf8");
					const objectData = await this.parser.parseStringPromise(objectXml);

					const extractedObject = this.extractObjectDetails(objectData, objMeta, objectList);
					objects.push(extractedObject);
				} else {
					objects.push({
						id: objMeta.id,
						versionId: objMeta.versionId,
						name: objMeta.name,
						type: objMeta.type,
						typeName: objMeta.typeName,
						details: null,
						error: "Object file not found",
					});
				}
			} catch (error) {
				console.warn(`Error processing object ${objMeta.name}:`, error.message);
				objects.push({
					id: objMeta.id,
					versionId: objMeta.versionId,
					name: objMeta.name,
					type: objMeta.type,
					typeName: objMeta.typeName,
					details: null,
					error: error.message,
				});
			}
		}

		return objects;
	}

	// ---------------------------------------------------------------------------
	//  Object detail dispatch & type-specific extractors
	// ---------------------------------------------------------------------------

	extractObjectDetails(objectData, objMeta, objectList) {
		const baseObject = {
			id: objMeta.id,
			versionId: objMeta.versionId,
			name: objMeta.name,
			type: objMeta.type,
			typeName: objMeta.typeName,
			details: {},
		};

		const rootElement = Object.values(objectData)[0];
		if (rootElement) {
			if (rootElement.name) baseObject.details.displayName = rootElement.name;
			if (rootElement.description) baseObject.details.description = rootElement.description;
			if (rootElement.documentation) baseObject.details.documentation = rootElement.documentation;

			if (objMeta.type === "coachView") {
				const coachViewData = objectData.teamworks && objectData.teamworks.coachView ? objectData.teamworks.coachView : rootElement;
				this.extractCoachViewDetails(coachViewData, baseObject);
			} else if (objMeta.type === "process") {
				let processData = rootElement;
				if (objectData.teamworks && objectData.teamworks.process) {
					processData = Array.isArray(objectData.teamworks.process) ? objectData.teamworks.process[0] : objectData.teamworks.process;
				}
				this.extractProcessDetails(processData, baseObject);
			} else if (objMeta.type === "twClass") {
				const twClassData = objectData.teamworks && objectData.teamworks.twClass ? objectData.teamworks.twClass : rootElement;
				this.extractBusinessObjectDetails(twClassData, baseObject);
			} else if (objMeta.type === "bpd") {
				const bpdData = objectData.teamworks && objectData.teamworks.bpd ? objectData.teamworks.bpd : rootElement;
				this.extractBPDDetails(bpdData, baseObject, objectList);
				baseObject.hasDetails = true;
			}
		}

		return baseObject;
	}

	extractCoachViewDetails(coachViewElement, baseObject) {
		const details = baseObject.details;
		const scripts = {};

		// All 6 JS function types
		const jsFunctionFields = [
			"loadJsFunction",
			"unloadJsFunction",
			"viewJsFunction",
			"changeJsFunction",
			"collaborationJsFunction",
			"validateJsFunction",
		];
		for (const field of jsFunctionFields) {
			const val = coachViewElement[field];
			if (val && val !== null && typeof val === "string" && !val.includes('isNull="true"')) {
				scripts[field] = this.cleanJavaScript(val);
			} else {
				scripts[field] = null;
			}
		}

		if (coachViewElement.bindingType) {
			const bindingType = Array.isArray(coachViewElement.bindingType) ? coachViewElement.bindingType[0] : coachViewElement.bindingType;
			const bindingName = bindingType.$ ? bindingType.$.name : bindingType.name;
			if (bindingName) {
				details.bindingType = bindingName;
			}
		}

		if (coachViewElement.configOption) {
			const configOptions = Array.isArray(coachViewElement.configOption) ? coachViewElement.configOption : [coachViewElement.configOption];
			details.configOptions = configOptions
				.map((option) => {
					return option.$ ? option.$.name : option.name;
				})
				.filter((name) => name && name !== "Unnamed");
		}

		if (coachViewElement.inlineScript) {
			const inlineScripts = Array.isArray(coachViewElement.inlineScript) ? coachViewElement.inlineScript : [coachViewElement.inlineScript];
			scripts.inlineScripts = inlineScripts
				.map((script) => ({
					context: script.$ ? script.$.name : script.name || "Unnamed Script",
					script: script.scriptBlock ? this.cleanJavaScript(script.scriptBlock) : "",
				}))
				.filter((script) => script.script);
		} else {
			scripts.inlineScripts = [];
		}

		details.scripts = scripts;

		if (coachViewElement.layout) {
			details.layout = Array.isArray(coachViewElement.layout) ? coachViewElement.layout[0] : coachViewElement.layout;
		}

		baseObject.hasDetails = !!(scripts.loadJsFunction || scripts.unloadJsFunction || scripts.viewJsFunction || scripts.changeJsFunction || scripts.collaborationJsFunction || scripts.validateJsFunction || (scripts.inlineScripts && scripts.inlineScripts.length) || details.bindingType || details.configOptions || details.layout);
	}

	extractProcessDetails(processElement, baseObject) {
		const details = baseObject.details;

		if (processElement && processElement.processType) {
			const processType = Array.isArray(processElement.processType) ? processElement.processType[0] : processElement.processType;
			baseObject.subType = processType;
			details.processType = processType;
		} else {
			baseObject.subType = "0";
			details.processType = "0";
		}

		if (baseObject.subType === "10") {
			this.extractCSHSDetails(processElement, baseObject);
			baseObject.hasDetails = true;
		} else if (baseObject.subType === "12" || baseObject.subType === "13") {
			this.extractServiceDetails(processElement, baseObject);
			baseObject.hasDetails = true;
		}
	}

	extractCSHSDetails(processElement, baseObject) {
		const details = {
			...baseObject.details,
			variables: {
				input: [],
				output: [],
				private: [],
			},
			elements: {
				formTasks: [],
				callActivities: [],
				exclusiveGateways: [],
				scriptTasks: [],
			},
		};

		if (processElement.processParameter) {
			const parameters = Array.isArray(processElement.processParameter) ? processElement.processParameter : [processElement.processParameter];
			for (const param of parameters) {
				if (param && param.name) {
					const variable = {
						name: param.name,
						hasDefault: param.hasDefault === "true" || param.hasDefault === true,
						type: param.parameterType,
					};

					if (variable.type === "1") {
						details.variables.input.push(variable);
					} else if (variable.type === "2") {
						details.variables.output.push(variable);
					}
				}
			}
		}

		if (processElement.processVariable) {
			const variables = Array.isArray(processElement.processVariable) ? processElement.processVariable : [processElement.processVariable];
			for (const variable of variables) {
				if (variable && variable.name) {
					details.variables.private.push({
						name: variable.name,
						hasDefault: variable.hasDefault === "true" || variable.hasDefault === true,
					});
				}
			}
		}

		if (processElement.coachflow) {
			this.parseCoachflowElements(processElement.coachflow, details);
		}

		baseObject.details = details;
	}

	parseCoachflowElements(coachflow, details) {
		try {
			const userTaskImpl = coachflow.definitions?.globalUserTask?.extensionElements?.userTaskImplementation;

			if (!userTaskImpl) {
				console.warn("No userTaskImplementation found in coachflow");
				return;
			}

			// Global pre/post assignment scripts at userTaskImplementation level (fallback for elements without their own)
			const globalExt = userTaskImpl.extensionElements;
			const globalPre = globalExt?.preAssignmentScript ? this.cleanJavaScript(globalExt.preAssignmentScript) : null;
			const globalPost = globalExt?.postAssignmentScript ? this.cleanJavaScript(globalExt.postAssignmentScript) : null;

			if (userTaskImpl.scriptTask) {
				const scriptTasks = Array.isArray(userTaskImpl.scriptTask) ? userTaskImpl.scriptTask : [userTaskImpl.scriptTask];

				for (const scriptTask of scriptTasks) {
					const ext = scriptTask.extensionElements;
					const pre = ext?.preAssignmentScript ? this.cleanJavaScript(ext.preAssignmentScript) : globalPre;
					const post = ext?.postAssignmentScript ? this.cleanJavaScript(ext.postAssignmentScript) : globalPost;
					details.elements.scriptTasks.push({
						name: scriptTask.name || "Unnamed",
						id: scriptTask.id,
						script: scriptTask.script ? this.cleanJavaScript(scriptTask.script) : "",
						preAssignment: pre,
						postAssignment: post,
					});
				}
			}

			if (userTaskImpl.exclusiveGateway) {
				const gateways = Array.isArray(userTaskImpl.exclusiveGateway) ? userTaskImpl.exclusiveGateway : [userTaskImpl.exclusiveGateway];

				for (const gateway of gateways) {
					details.elements.exclusiveGateways.push({
						name: gateway.name || "Unnamed",
						id: gateway.id,
					});
				}
			}

			if (userTaskImpl.formTask) {
				const formTasks = Array.isArray(userTaskImpl.formTask) ? userTaskImpl.formTask : [userTaskImpl.formTask];

				for (const formTask of formTasks) {
					const ext = formTask.extensionElements;
					const pre = ext?.preAssignmentScript ? this.cleanJavaScript(ext.preAssignmentScript) : null;
					const post = ext?.postAssignmentScript ? this.cleanJavaScript(ext.postAssignmentScript) : null;
					details.elements.formTasks.push({
						name: formTask.name || "Unnamed",
						id: formTask.id,
						preAssignment: pre,
						postAssignment: post,
					});
				}
			}

			if (userTaskImpl.callActivity) {
				const callActivities = Array.isArray(userTaskImpl.callActivity) ? userTaskImpl.callActivity : [userTaskImpl.callActivity];

				for (const callActivity of callActivities) {
					const ext = callActivity.extensionElements;
					const pre = ext?.preAssignmentScript ? this.cleanJavaScript(ext.preAssignmentScript) : null;
					const post = ext?.postAssignmentScript ? this.cleanJavaScript(ext.postAssignmentScript) : null;
					details.elements.callActivities.push({
						name: callActivity.name || "Unnamed",
						id: callActivity.id,
						preAssignment: pre,
						postAssignment: post,
					});
				}
			}
		} catch (error) {
			console.warn("Error parsing coachflow elements:", error);
		}
	}

	extractServiceDetails(processElement, baseObject) {
		const details = {
			...baseObject.details,
			variables: {
				input: [],
				output: [],
				private: [],
			},
			scripts: [],
			elements: {
				scriptTasks: [],
			},
		};

		const toArray = (value) => {
			if (!value) return [];
			if (Array.isArray(value)) return value;
			if (value === Object(value)) return [value];
			return [];
		};

		const getAttr = (obj, attr, defaultValue = "") => {
			if (!obj) return defaultValue;
			if (obj[attr] !== undefined) return obj[attr];
			if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
			return defaultValue;
		};

		const processParameters = toArray(processElement.processParameter || processElement.parameter);
		for (const param of processParameters) {
			if (!param) continue;

			const name = getAttr(param, "name");
			if (!name) continue;

			const variable = {
				name,
				type: getAttr(param, "parameterType", "String"),
				hasDefault: getAttr(param, "hasDefault") === "true",
				description: getAttr(param, "description", ""),
			};

			if (variable.hasDefault) {
				variable.defaultValue = getAttr(param, "defaultValue", "");
			}

			const direction = getAttr(param, "direction", "1");
			if (direction === "1" || direction === "3") {
				details.variables.input.push(variable);
			}
			if (direction === "2" || direction === "3") {
				details.variables.output.push(variable);
			}
		}

		const processVariables = toArray(processElement.processVariable || processElement.variable);
		for (const variable of processVariables) {
			if (!variable) continue;

			const name = getAttr(variable, "name");
			if (!name) continue;

			const varDetails = {
				name,
				type: getAttr(variable, "type", "String"),
				hasDefault: getAttr(variable, "hasDefault") === "true",
				description: getAttr(variable, "description", ""),
			};

			if (varDetails.hasDefault) {
				varDetails.defaultValue = getAttr(variable, "defaultValue", "");
			}

			details.variables.private.push(varDetails);
		}

		const items = toArray(processElement.item);
		for (const item of items) {
			if (!item || !item.TWComponent) continue;

			const itemName = item.name || "Unnamed Script";

			const twComponents = toArray(item.TWComponent);
			for (const twComponent of twComponents) {
				if (!twComponent || !twComponent.script) continue;

				let scriptContent = twComponent.script;

				if (typeof scriptContent === "object" && scriptContent !== null) {
					if (scriptContent._) scriptContent = scriptContent._;
					else if (scriptContent._text) scriptContent = scriptContent._text;
					else if (scriptContent["#text"]) scriptContent = scriptContent["#text"];
					else scriptContent = "";
				}

				if (typeof scriptContent !== "string") continue;

				scriptContent = scriptContent.trim();
				if (!scriptContent) continue;

				scriptContent = this.cleanJavaScript(scriptContent);

				details.scripts.push({
					name: itemName,
					script: scriptContent,
					scriptFormat: twComponent.scriptFormat || "",
				});
			}
		}

		// Extract scriptTasks from bpmn2Model
		try {
			const bpmn = processElement.bpmn2Model || processElement.bpmn2Data;
			if (bpmn) {
				const process = bpmn.definitions?.process;
				if (process) {
					const scriptTasks = toArray(process.scriptTask);
					for (const st of scriptTasks) {
						const script = st.script || "";
						const ext = st.extensionElements;
						details.elements.scriptTasks.push({
							name: st.name || "Unnamed",
							id: st.id || "",
							script: script ? this.cleanJavaScript(script) : "",
							scriptFormat: st.scriptFormat || "",
							preAssignment: ext?.preAssignmentScript || null,
							postAssignment: ext?.postAssignmentScript || null,
						});
					}
				}
			}
		} catch (error) {
			console.warn("Error parsing service bpmn2Model elements:", error);
		}

		baseObject.details = details;
	}

	extractBusinessObjectDetails(twClassElement, baseObject) {
		try {
			const jsonData = twClassElement.jsonData;

			if (jsonData) {
				const schema = this.businessObjectParser.parseSchema(jsonData, baseObject.id, baseObject.name);

				baseObject.details.schema = schema;
				baseObject.hasDetails = true;

				baseObject.details.summary = {
					totalProperties: schema.properties.length,
					systemTypes: schema.systemTypesCount,
					customTypes: schema.customTypesCount,
					hasComplexTypes: schema.hasComplexTypes,
					namespace: schema.namespace,
				};

				this.registerBusinessObjectType(baseObject.name, baseObject.id, schema, schema.namespace);

				console.log(`Extracted schema for ${baseObject.name}: ${schema.properties.length} properties`);
			} else {
				baseObject.details.schema = this.extractDefinitionBasedSchema(twClassElement, baseObject.id, baseObject.name);
				baseObject.hasDetails = !!baseObject.details.schema.properties.length;
			}
		} catch (error) {
			console.warn(`Error extracting business object details for ${baseObject.name}:`, error.message);
			baseObject.details.error = error.message;
		}
	}

	extractBPDDetails(bpdElement, baseObject, objectList) {
		const toArray = (v) => (!v ? [] : Array.isArray(v) ? v : [v]);
		const scriptFormats = new Map();
		const details = {
			...baseObject.details,
			variables: {
				input: [...toArray(baseObject.details?.variables?.input)],
				output: [...toArray(baseObject.details?.variables?.output)],
				private: [...toArray(baseObject.details?.variables?.private)],
			},
			elements: {
				scriptTasks: [],
				callActivities: [],
				exclusiveGateways: [],
				events: [],
			},
		};

		try {
			const process = embeddedBpmnParser.parse(bpdElement.bpmn2Data || "")?.definitions?.process;
			const declared = new Set(details.variables.private.map(variable => variable.name));
			for (const item of toArray(process)) {
				for (const task of toArray(item?.scriptTask)) {
					if (task?.id && task.scriptFormat) scriptFormats.set(task.id, task.scriptFormat);
				}
				for (const variable of toArray(item?.dataObject)) {
					if (!variable?.name || declared.has(variable.name)) continue;
					declared.add(variable.name);
					details.variables.private.push({ name: variable.name, type: variable.itemSubjectRef || "", hasDefault: false });
				}
			}
		} catch (error) {
			console.warn(`Error extracting BPD variables for ${baseObject.name}:`, error.message);
		}

		// ponytail: simple linear scan, fine for small object lists
		const objectMap = {};
		if (objectList) {
			for (const obj of objectList) {
				if (obj.id) objectMap[obj.id] = obj.name;
				if (obj.versionId) objectMap[obj.versionId] = obj.name;
			}
		}

		try {
			const bpd = bpdElement.BusinessProcessDiagram || bpdElement;
			const pools = toArray(bpd.pool);

			for (const pool of pools) {
				const lanes = toArray(pool.lane);
				for (const lane of lanes) {
					const laneName = lane.name || "";
					const flowObjects = toArray(lane.flowObject);

					for (const fo of flowObjects) {
						const compType = fo.componentType;
						const component = fo.component;
						if (!component) continue;

						const name = fo.name || "Unnamed";
						const id = fo.id || "";
						const assignments = toArray(fo.assignment);
						let preAssignment = null;
						let postAssignment = null;
						for (const a of assignments) {
							if (String(a.assignTime) === "1") preAssignment = a.from || null;
							else if (String(a.assignTime) === "2") postAssignment = a.from || null;
						}

						if (compType === "Activity") {
							const implType = String(component.implementationType);
							const impl = component.implementation || {};

							if (implType === "1") {
								// Call activity
								const rawTargetId = impl.attachedActivityId || "";
								const cleanId = rawTargetId.replace(/^\//, "");
								details.elements.callActivities.push({
									name,
									id,
									callsTarget: objectMap[cleanId] || "",
									callsTargetId: cleanId,
									lane: laneName,
									preAssignment,
									postAssignment,
								});
							} else if (implType === "3" || implType === "4") {
								// Script task (3) or general task (4)
								let script = "";
								if (impl.script) {
									script = typeof impl.script === "string" ? impl.script : (impl.script._ || impl.script["#text"] || "");
								}
							details.elements.scriptTasks.push({
								name,
								id,
								script: script ? this.cleanJavaScript(script) : "",
								scriptFormat: scriptFormats.get(id) || "",
								lane: laneName,
									preAssignment,
									postAssignment,
								});
							}
						} else if (compType === "Gateway" && String(component.gatewayType) === "1") {
							details.elements.exclusiveGateways.push({ name, id });
						} else if (compType === "Event") {
							const evtType = String(component.eventType);
							let eventType = "intermediate";
							if (evtType === "1") eventType = "start";
							else if (evtType === "2") eventType = "end";
							details.elements.events.push({ name, id, eventType });
						}
					}
				}
			}
		} catch (error) {
			console.warn(`Error extracting BPD details for ${baseObject.name}:`, error.message);
		}

		baseObject.details = details;
	}

	registerBusinessObjectType(typeName, typeId, schema, namespace) {
		const typeRegistry = require("../utils/business-object-type-registry");
		typeRegistry.registerType(typeName, typeId, schema, namespace);
	}

	extractDefinitionBasedSchema(twClassElement, objectId, objectName) {
		const schema = {
			id: objectId,
			name: objectName,
			type: "BusinessObject",
			namespace: null,
			properties: [],
			hasComplexTypes: false,
			systemTypesCount: 0,
			customTypesCount: 0,
			source: "definition",
		};

		try {
			if (twClassElement.definition && twClassElement.definition.property) {
				const properties = Array.isArray(twClassElement.definition.property) ? twClassElement.definition.property : [twClassElement.definition.property];

				for (const property of properties) {
					if (property.name && property.classRef) {
						schema.properties.push({
							name: property.name,
							type: "Unknown",
							isSystemType: false,
							required: property.propertyRequired === true || property.propertyRequired === "true",
							isArray: property.arrayProperty === true || property.arrayProperty === "true",
							classRef: property.classRef,
							description: property.description || "",
						});
					}
				}
			}
		} catch (error) {
			console.warn(`Error extracting definition-based schema for ${objectName}:`, error.message);
		}

		return schema;
	}

	cleanJavaScript(jsCode) {
		if (!jsCode || typeof jsCode !== "string") return "";

		return jsCode
			.replace(/&#xD;/g, "\n")
			.replace(/&#xA;/g, "\n")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.trim();
	}
}

module.exports = ObjectExtractor;
