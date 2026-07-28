const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const BusinessObjectSchemaParser = require("./business-object-schema-parser");

/**
 * Extract per-object XML files from a TWX archive or extracted directory.
 */
class ObjectExtractor {
	constructor() {
		this.parser = new xml2js.Parser({
			explicitArray: false,
			ignoreAttrs: false,
			mergeAttrs: true,
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
					const extractedObject = this.extractObjectDetails(objectData, objMeta);
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

					const extractedObject = this.extractObjectDetails(objectData, objMeta);
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

	extractObjectDetails(objectData, objMeta) {
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
			}
		}

		return baseObject;
	}

	extractCoachViewDetails(coachViewElement, baseObject) {
		const details = baseObject.details;

		if (coachViewElement.loadJsFunction && coachViewElement.loadJsFunction !== null && typeof coachViewElement.loadJsFunction === "string" && !coachViewElement.loadJsFunction.includes('isNull="true"')) {
			details.loadJsFunction = this.cleanJavaScript(coachViewElement.loadJsFunction);
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
			details.inlineScripts = inlineScripts
				.map((script) => ({
					name: script.$ ? script.$.name : script.name || "Unnamed Script",
					scriptType: script.scriptType || "JS",
					scriptBlock: script.scriptBlock ? this.cleanJavaScript(script.scriptBlock) : "",
				}))
				.filter((script) => script.scriptBlock);
		}

		if (coachViewElement.layout) {
			details.layout = Array.isArray(coachViewElement.layout) ? coachViewElement.layout[0] : coachViewElement.layout;
		}

		baseObject.hasDetails = !!(details.loadJsFunction || details.bindingType || details.configOptions || details.inlineScripts || details.layout);
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
		} else if (baseObject.subType === "12") {
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
			const userTaskImpl = coachflow["ns16:definitions"]?.["ns16:globalUserTask"]?.["ns16:extensionElements"]?.["ns2:userTaskImplementation"];

			if (!userTaskImpl) {
				console.warn("No userTaskImplementation found in coachflow");
				return;
			}

			if (userTaskImpl["ns16:scriptTask"]) {
				const scriptTasks = Array.isArray(userTaskImpl["ns16:scriptTask"]) ? userTaskImpl["ns16:scriptTask"] : [userTaskImpl["ns16:scriptTask"]];

				for (const scriptTask of scriptTasks) {
					details.elements.scriptTasks.push({
						name: scriptTask.name || "Unnamed",
						id: scriptTask.id,
						script: scriptTask["ns16:script"] ? this.cleanJavaScript(scriptTask["ns16:script"]) : "",
						hasPreScript: false,
						hasPostScript: false,
						preScript: "",
						postScript: "",
					});
				}
			}

			if (userTaskImpl["ns16:exclusiveGateway"]) {
				const gateways = Array.isArray(userTaskImpl["ns16:exclusiveGateway"]) ? userTaskImpl["ns16:exclusiveGateway"] : [userTaskImpl["ns16:exclusiveGateway"]];

				for (const gateway of gateways) {
					details.elements.exclusiveGateways.push({
						name: gateway.name || "Unnamed",
						id: gateway.id,
						hasPreScript: false,
						hasPostScript: false,
						preScript: "",
						postScript: "",
					});
				}
			}

			if (userTaskImpl["ns2:formTask"]) {
				const formTasks = Array.isArray(userTaskImpl["ns2:formTask"]) ? userTaskImpl["ns2:formTask"] : [userTaskImpl["ns2:formTask"]];

				for (const formTask of formTasks) {
					details.elements.formTasks.push({
						name: formTask.name || "Unnamed",
						id: formTask.id,
						hasPreScript: false,
						hasPostScript: false,
						preScript: "",
						postScript: "",
					});
				}
			}

			if (userTaskImpl["ns16:callActivity"]) {
				const callActivities = Array.isArray(userTaskImpl["ns16:callActivity"]) ? userTaskImpl["ns16:callActivity"] : [userTaskImpl["ns16:callActivity"]];

				for (const callActivity of callActivities) {
					details.elements.callActivities.push({
						name: callActivity.name || "Unnamed",
						id: callActivity.id,
						hasPreScript: false,
						hasPostScript: false,
						preScript: "",
						postScript: "",
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
				});
			}
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
