const fs = require("fs");
const path = require("path");
const ADMZip = require("adm-zip");
const xml2js = require("xml2js");
const { getTypeName } = require("../utils/type-mappings");
const BusinessObjectSchemaParser = require("./business-object-schema-parser");

/**
 * Extract and parse TWX file contents
*/
class TWXExtractor {
	constructor() {
		this.parser = new xml2js.Parser({
			explicitArray: false,
			ignoreAttrs: false,
			mergeAttrs: true,
		});
		this.businessObjectParser = new BusinessObjectSchemaParser();
	}

	/**
	 * Extract all data from a TWX file
	 * @param {string} twxFilePath - Path to the TWX file
	 * @returns {Promise<Object>} Extracted data
	 */
	async extractTWX(twxFilePath) {
		try {
			console.log(`Extracting TWX file: ${twxFilePath}`);

			const data = fs.readFileSync(twxFilePath);
			const zip = new ADMZip(data);

			// Extract package metadata
			const packageData = await this.extractPackageMetadata(zip);

			// Extract objects
			const objects = await this.extractObjects(zip, packageData.objectList); // Extract toolkits if any
			const toolkits = await this.extractToolkits(zip);

			// 🆕 Tag main application objects
			const taggedObjects = objects.map((obj) => ({
				...obj,
				source: "application",
			}));

			// 🆕 Collect all toolkit objects
			const allToolkitObjects = toolkits.flatMap((toolkit) => toolkit.objects || []);

			// 🆕 Combine all objects (app + toolkit)
			const allObjects = [...taggedObjects, ...allToolkitObjects];

			// 🆕 Resolve cross-references for business objects (including toolkit objects)
			const businessObjects = allObjects.filter((obj) => obj.type === "twClass");
			if (businessObjects.length > 0) {
				console.log(`🔗 Resolving cross-references for ${businessObjects.length} business objects (app + toolkit)...`);
				this.resolveBusinessObjectCrossReferences(businessObjects);
			}

			console.log(`📊 Extraction Summary:`);
			console.log(`  - Application objects: ${taggedObjects.length}`);
			console.log(`  - Toolkit objects: ${allToolkitObjects.length}`);
			console.log(`  - Total objects: ${allObjects.length}`);
			console.log(`  - Toolkits: ${toolkits.length}`);

			return {
				metadata: packageData.metadata,
				objects: taggedObjects, // Main application objects
				toolkits: toolkits, // Toolkits with metadata and objects
				allObjects: allObjects, // 🆕 All objects combined
				extractedAt: new Date().toISOString(),
				sourceFile: path.basename(twxFilePath),
				statistics: {
					applicationObjects: taggedObjects.length,
					toolkitObjects: allToolkitObjects.length,
					totalObjects: allObjects.length,
					toolkitCount: toolkits.length,
				},
			};
		} catch (error) {
			console.error("Error extracting TWX file:", error);
			throw error;
		}
	}

	/**
	 * Extract all data from an extracted TWX directory
	 * @param {string} twxDirPath - Path to the extracted TWX directory
	 * @returns {Promise<Object>} Extracted data
	 */
	async extractFromDirectory(twxDirPath) {
		try {
			console.log(`Extracting TWX directory: ${twxDirPath}`);

			// Extract package metadata from META-INF/package.xml
			const packageData = await this.extractPackageMetadataFromDir(twxDirPath);

			// Extract objects from objects folder
			const objects = await this.extractObjectsFromDir(twxDirPath, packageData.objectList); // Extract toolkits if any (empty for now)
			const toolkits = [];

			// 🆕 Tag main application objects
			const taggedObjects = objects.map((obj) => ({
				...obj,
				source: "application",
			}));

			// 🆕 Collect all toolkit objects (empty for directory extraction)
			const allToolkitObjects = toolkits.flatMap((toolkit) => toolkit.objects || []);

			// 🆕 Combine all objects
			const allObjects = [...taggedObjects, ...allToolkitObjects];

			return {
				metadata: packageData.metadata,
				objects: taggedObjects,
				toolkits: toolkits,
				allObjects: allObjects, // 🆕 All objects combined
				extractedAt: new Date().toISOString(),
				sourceFile: path.basename(twxDirPath),
				statistics: {
					applicationObjects: taggedObjects.length,
					toolkitObjects: allToolkitObjects.length,
					totalObjects: allObjects.length,
					toolkitCount: toolkits.length,
				},
			};
		} catch (error) {
			console.error("Error extracting TWX directory:", error);
			throw error;
		}
	}

	/**
	 * Extract package metadata from META-INF/package.xml
	 * @param {ADMZip} zip - ZIP archive
	 * @returns {Promise<Object>} Package metadata and object list
	 */
	async extractPackageMetadata(zip) {
		const packageEntry = zip.getEntry("META-INF/package.xml");
		if (!packageEntry) {
			throw new Error("META-INF/package.xml not found in TWX file");
		}

		const packageXml = packageEntry.getData().toString("utf8");
		const packageData = await this.parser.parseStringPromise(packageXml);

		const pkg = packageData["p:package"] || packageData.package;

		// Extract project information
		const target = pkg.target;
		const project = target.project;
		const branch = target.branch;
		const snapshot = target.snapshot;

		const metadata = {
			project: {
				id: project.id,
				name: project.name,
				shortName: project.shortName,
				description: project.description || "",
				isToolkit: project.isToolkit === "true",
				isSystem: project.isSystem === "true",
			},
			branch: {
				id: branch.id,
				name: branch.name,
				description: branch.description || "",
			},
			snapshot: {
				id: snapshot.id,
				name: snapshot.name,
				description: snapshot.description || "",
				creationDate: snapshot.originalCreationDate,
			},
			buildInfo: {
				buildId: pkg.buildId,
				buildVersion: pkg.buildVersion,
				buildDescription: pkg.buildDescription,
			},
		};

		// Extract object list
		const objectList = [];
		if (pkg.objects && pkg.objects.object) {
			const objects = Array.isArray(pkg.objects.object) ? pkg.objects.object : [pkg.objects.object];
			objects.forEach((obj) => {
				objectList.push({
					id: obj.id,
					versionId: obj.versionId,
					name: obj.name,
					type: obj.type,
					typeName: getTypeName(obj.type),
				});
			});
		}

		return { metadata, objectList };
	}

	/**
	 * Extract package metadata from META-INF/package.xml in a directory
	 * @param {string} twxDirPath - Path to the extracted TWX directory
	 * @returns {Promise<Object>} Package metadata and object list
	 */
	async extractPackageMetadataFromDir(twxDirPath) {
		const packagePath = path.join(twxDirPath, "META-INF", "package.xml");
		if (!fs.existsSync(packagePath)) {
			throw new Error(`META-INF/package.xml not found in directory: ${twxDirPath}`);
		}

		const packageXml = fs.readFileSync(packagePath, "utf8");
		const packageData = await this.parser.parseStringPromise(packageXml);

		const pkg = packageData["p:package"] || packageData.package;

		// Extract project information
		const target = pkg.target;
		const project = target.project;
		const branch = target.branch;
		const snapshot = target.snapshot;

		const metadata = {
			project: {
				id: project.id,
				name: project.name,
				shortName: project.shortName,
				description: project.description || "",
				isToolkit: project.isToolkit === "true",
				isSystem: project.isSystem === "true",
			},
			branch: {
				id: branch.id,
				name: branch.name,
				description: branch.description || "",
			},
			snapshot: {
				id: snapshot.id,
				name: snapshot.name,
				description: snapshot.description || "",
				creationDate: snapshot.originalCreationDate,
			},
			buildInfo: {
				buildId: pkg.buildId,
				buildVersion: pkg.buildVersion,
				buildDescription: pkg.buildDescription,
			},
		};

		// Extract object list
		const objectList = [];
		if (pkg.objects && pkg.objects.object) {
			const objects = Array.isArray(pkg.objects.object) ? pkg.objects.object : [pkg.objects.object];
			objects.forEach((obj) => {
				objectList.push({
					id: obj.id,
					versionId: obj.versionId,
					name: obj.name,
					type: obj.type,
					typeName: getTypeName(obj.type),
				});
			});
		}

		return { metadata, objectList };
	}

	/**
	 * Extract object details from objects folder
	 * @param {ADMZip} zip - ZIP archive
	 * @param {Array} objectList - List of objects from package.xml
	 * @returns {Promise<Array>} Array of object details
	 */
	async extractObjects(zip, objectList) {
		const objects = [];

		for (const objMeta of objectList) {
			try {
				// Find the object file - try both versionId and id
				let objectFileName = `objects/${objMeta.versionId}.xml`;
				let objectEntry = zip.getEntry(objectFileName);

				// If not found with versionId, try with id
				if (!objectEntry) {
					objectFileName = `objects/${objMeta.id}.xml`;
					objectEntry = zip.getEntry(objectFileName);
				}

				// Debug logging for Coach Views (disabled for production)
				// if (objMeta.type === 'coachView') {
				//   console.log(`\n=== Coach View Debug ===`)
				//   console.log(`Name: ${objMeta.name}`)
				//   console.log(`ID: ${objMeta.id}`)
				//   console.log(`VersionID: ${objMeta.versionId}`)
				//   console.log(`Trying file: ${objectFileName}`)
				//   console.log(`Found entry: ${!!objectEntry}`)
				// }

				if (objectEntry) {
					const objectXml = objectEntry.getData().toString("utf8");
					const objectData = await this.parser.parseStringPromise(objectXml);

					// Extract relevant information based on object type
					const extractedObject = this.extractObjectDetails(objectData, objMeta);
					objects.push(extractedObject);
				} else {
					// If object file not found, include basic metadata
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
	 * Extract object details from objects folder in a directory
	 * @param {string} twxDirPath - Path to the extracted TWX directory
	 * @param {Array} objectList - List of objects from package.xml
	 * @returns {Promise<Array>} Array of object details
	 */
	async extractObjectsFromDir(twxDirPath, objectList) {
		const objects = [];
		const objectsDir = path.join(twxDirPath, "objects");

		for (const objMeta of objectList) {
			try {
				// Find the object file - try both versionId and id
				let objectFilePath = path.join(objectsDir, `${objMeta.versionId}.xml`);

				if (!fs.existsSync(objectFilePath)) {
					objectFilePath = path.join(objectsDir, `${objMeta.id}.xml`);
				}

				if (fs.existsSync(objectFilePath)) {
					const objectXml = fs.readFileSync(objectFilePath, "utf8");
					const objectData = await this.parser.parseStringPromise(objectXml);

					// Extract relevant information based on object type
					const extractedObject = this.extractObjectDetails(objectData, objMeta);
					objects.push(extractedObject);
				} else {
					// If object file not found, include basic metadata
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
	 * Extract specific details based on object type
	 * @param {Object} objectData - Parsed XML data
	 * @param {Object} objMeta - Object metadata
	 * @returns {Object} Extracted object with details
	 */
	extractObjectDetails(objectData, objMeta) {
		const baseObject = {
			id: objMeta.id,
			versionId: objMeta.versionId,
			name: objMeta.name,
			type: objMeta.type,
			typeName: objMeta.typeName,
			details: {},
		};

		// Extract common properties
		const rootElement = Object.values(objectData)[0];
		if (rootElement) {
			if (rootElement.name) baseObject.details.displayName = rootElement.name;
			if (rootElement.description) baseObject.details.description = rootElement.description;
			if (rootElement.documentation) baseObject.details.documentation = rootElement.documentation;

			// Extract type-specific details
			if (objMeta.type === "coachView") {
				// For Coach Views, the data is nested under the coachView key
				const coachViewData = objectData.teamworks && objectData.teamworks.coachView ? objectData.teamworks.coachView : rootElement;
				this.extractCoachViewDetails(coachViewData, baseObject);
			} else if (objMeta.type === "process") {
				// For Process objects, extract subType and CSHS details
				// Handle both array and single object cases due to explicitArray: false
				let processData = rootElement;
				if (objectData.teamworks && objectData.teamworks.process) {
					processData = Array.isArray(objectData.teamworks.process) ? objectData.teamworks.process[0] : objectData.teamworks.process;
				}
				this.extractProcessDetails(processData, baseObject);
			} else if (objMeta.type === "twClass") {
				// For Business Objects, extract schema information
				const twClassData = objectData.teamworks && objectData.teamworks.twClass ? objectData.teamworks.twClass : rootElement;
				this.extractBusinessObjectDetails(twClassData, baseObject);
			}
		}

		return baseObject;
	}

	/**
	 * Extract Coach View specific details
	 * @param {Object} coachViewElement - Coach View XML element
	 * @param {Object} baseObject - Base object to add details to
	 */
	extractCoachViewDetails(coachViewElement, baseObject) {
		const details = baseObject.details;

		// Extract loadJsFunction
		if (coachViewElement.loadJsFunction && coachViewElement.loadJsFunction !== null && typeof coachViewElement.loadJsFunction === "string" && !coachViewElement.loadJsFunction.includes('isNull="true"')) {
			details.loadJsFunction = this.cleanJavaScript(coachViewElement.loadJsFunction);
		}

		// Extract bindingType
		if (coachViewElement.bindingType) {
			const bindingType = Array.isArray(coachViewElement.bindingType) ? coachViewElement.bindingType[0] : coachViewElement.bindingType;
			// Handle both attribute-based and property-based name
			const bindingName = bindingType.$ ? bindingType.$.name : bindingType.name;
			if (bindingName) {
				details.bindingType = bindingName;
			}
		}

		// Extract configOptions
		if (coachViewElement.configOption) {
			const configOptions = Array.isArray(coachViewElement.configOption) ? coachViewElement.configOption : [coachViewElement.configOption];
			details.configOptions = configOptions
				.map((option) => {
					// Handle both attribute-based and property-based name
					return option.$ ? option.$.name : option.name;
				})
				.filter((name) => name && name !== "Unnamed");
		}

		// Extract inlineScript
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

		// Extract layout if it exists
		if (coachViewElement.layout) {
			details.layout = Array.isArray(coachViewElement.layout) ? coachViewElement.layout[0] : coachViewElement.layout;
		}

		// Mark as having detailed information
		baseObject.hasDetails = !!(details.loadJsFunction || details.bindingType || details.configOptions || details.inlineScripts || details.layout);
	}

	/**
	 * Extract Process specific details including subType and CSHS information
	 * @param {Object} processElement - Process XML element
	 * @param {Object} baseObject - Base object to add details to
	 */
	extractProcessDetails(processElement, baseObject) {
		const details = baseObject.details;

		// Extract subType (processType) with proper null checks
		// Handle both array and single value cases due to explicitArray: false
		if (processElement && processElement.processType) {
			const processType = Array.isArray(processElement.processType) ? processElement.processType[0] : processElement.processType;
			baseObject.subType = processType;
			details.processType = processType;
		} else {
			// Default subType if not found
			baseObject.subType = "0";
			details.processType = "0";
		}

		// If this is a CSHS (processType = 10) or Service (processType = 12), extract detailed information
		if (baseObject.subType === "10") {
			// Pass the processElement to extract CSHS details
			this.extractCSHSDetails(processElement, baseObject);
			baseObject.hasDetails = true;
		} else if (baseObject.subType === "12") {
			// Pass the processElement to extract Service details
			this.extractServiceDetails(processElement, baseObject);
			baseObject.hasDetails = true;
		}
	}

	/**
	 * Extract CSHS-specific details including variables and elements from XML structure
	 * @param {Object} processElement - Process XML element
	 * @param {Object} baseObject - Base object to add details to
	 */
	extractCSHSDetails(processElement, baseObject) {
		// Preserve existing details and add CSHS-specific details
		const details = {
			...baseObject.details, // Preserve existing details like processType and scripts
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

		// Preserve any existing scripts that were already extracted
		if (baseObject.details && baseObject.details.scripts) {
			details.scripts = [...baseObject.details.scripts];
		}

		// Extract variables from the main XML structure

		// Parse processParameter elements (input/output variables)
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

		// Parse processVariable elements (private variables)
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

		// Extract process elements from coachflow structure
		if (processElement.coachflow) {
			// Parse the coachflow structure to extract elements
			this.parseCoachflowElements(processElement.coachflow, details);
		}

		// After extracting all elements, add all scripts to the main scripts array
		if (details.elements) {
			if (!details.scripts) {
				details.scripts = [];
			}

			// Add script tasks
			if (details.elements.scriptTasks && details.elements.scriptTasks.length > 0) {
				details.elements.scriptTasks.forEach(scriptTask => {
					if (scriptTask.script && scriptTask.script.trim()) {
						details.scripts.push({
							name: `${scriptTask.name || 'Unnamed Script Task'} (Script Task)`,
							content: scriptTask.script,
							elementType: 'scriptTask',
							elementId: scriptTask.id,
							source: 'coachflow'
						});
					}

					// Add pre-assignment script
					if (scriptTask.hasPreScript && scriptTask.preScript && scriptTask.preScript.trim()) {
						details.scripts.push({
							name: `${scriptTask.name || 'Unnamed Script Task'} (Pre-Assignment)`,
							content: scriptTask.preScript,
							elementType: 'scriptTask',
							elementId: scriptTask.id,
							scriptType: 'preAssignment',
							source: 'coachflow'
						});
					}

					// Add post-assignment script
					if (scriptTask.hasPostScript && scriptTask.postScript && scriptTask.postScript.trim()) {
						details.scripts.push({
							name: `${scriptTask.name || 'Unnamed Script Task'} (Post-Assignment)`,
							content: scriptTask.postScript,
							elementType: 'scriptTask',
							elementId: scriptTask.id,
							scriptType: 'postAssignment',
							source: 'coachflow'
						});
					}
				});
			}

			// Add scripts from other element types
			['callActivities', 'exclusiveGateways', 'formTasks'].forEach(elementType => {
				if (details.elements[elementType] && details.elements[elementType].length > 0) {
					details.elements[elementType].forEach(element => {
						// Add pre-assignment script
						if (element.hasPreScript && element.preScript && element.preScript.trim()) {
							details.scripts.push({
								name: `${element.name || 'Unnamed'} (Pre-Assignment)`,
								content: element.preScript,
								elementType: elementType.slice(0, -1), // Remove 's' from plural
								elementId: element.id,
								scriptType: 'preAssignment',
								source: 'coachflow'
							});
						}

						// Add post-assignment script
						if (element.hasPostScript && element.postScript && element.postScript.trim()) {
							details.scripts.push({
								name: `${element.name || 'Unnamed'} (Post-Assignment)`,
								content: element.postScript,
								elementType: elementType.slice(0, -1), // Remove 's' from plural
								elementId: element.id,
								scriptType: 'postAssignment',
								source: 'coachflow'
							});
						}
					});
				}
			});
		}

		// Also extract any additional scripts from coachflow XML structure
		if (processElement.coachflow) {
			this.extractAdditionalCoachflowScripts(processElement.coachflow, details);
		}

		// Debug logging for CSHS script extraction
		console.log(`[TWXExtractor CSHS Debug] ${baseObject.name}: Final scripts count: ${details.scripts?.length || 0}, script tasks: ${details.elements?.scriptTasks?.length || 0}`);

		baseObject.details = details;
	}

	/**
	 * Extract additional scripts from coachflow XML structure
	 * @param {Object} coachflow - Coachflow structure
	 * @param {Object} details - Details object to populate
	 */
	extractAdditionalCoachflowScripts(coachflow, details) {
		try {
			// Convert coachflow to string for pattern matching
			const coachflowStr = typeof coachflow === 'string' ? coachflow : JSON.stringify(coachflow);

			// Look for various script patterns in the XML
			const scriptPatterns = [
				// Script tags
				/<script[^>]*>([\s\S]*?)<\/script>/gi,
				// Inline script attributes
				/script\s*=\s*["']([^"']*(?:\\.[^"']*)*?)["']/gi,
				// JavaScript function definitions
				/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/gi
			];

			scriptPatterns.forEach((pattern, patternIndex) => {
				let match;
				while ((match = pattern.exec(coachflowStr)) !== null) {
					let scriptContent = match[1] || match[0];
					if (scriptContent && scriptContent.trim() && scriptContent.length > 20) {
						// Clean the script content
						scriptContent = this.cleanJavaScript(scriptContent);

						if (scriptContent.trim()) {
							if (!details.scripts) {
								details.scripts = [];
							}

							details.scripts.push({
								name: `Coachflow Script Pattern ${patternIndex + 1}`,
								content: scriptContent,
								source: 'coachflow-xml',
								extractionPattern: patternIndex
							});
						}
					}
				}
			});
		} catch (error) {
			console.warn('Error extracting additional coachflow scripts:', error);
		}
	}

	/**
	 * Extract additional scripts from coachflow XML structure
	 * @param {Object} coachflow - Coachflow structure
	 * @param {Object} details - Details object to populate
	 */
	extractAdditionalCoachflowScripts(coachflow, details) {
		try {
			// Convert coachflow to string for pattern matching
			const coachflowStr = typeof coachflow === 'string' ? coachflow : JSON.stringify(coachflow);

			// Look for various script patterns in the XML
			const scriptPatterns = [
				// Script tags
				/<script[^>]*>([\s\S]*?)<\/script>/gi,
				// Inline script attributes
				/script\s*=\s*["']([^"']*(?:\\.[^"']*)*?)["']/gi,
				// JavaScript function definitions
				/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/gi
			];

			scriptPatterns.forEach((pattern, patternIndex) => {
				let match;
				while ((match = pattern.exec(coachflowStr)) !== null) {
					let scriptContent = match[1] || match[0];
					if (scriptContent && scriptContent.trim() && scriptContent.length > 20) {
						// Clean the script content
						scriptContent = this.cleanJavaScript(scriptContent);

						if (scriptContent.trim()) {
							if (!details.scripts) {
								details.scripts = [];
							}

							details.scripts.push({
								name: `Coachflow Script Pattern ${patternIndex + 1}`,
								content: scriptContent,
								source: 'coachflow-xml',
								extractionPattern: patternIndex
							});
						}
					}
				}
			});
		} catch (error) {
			console.warn('Error extracting additional coachflow scripts:', error);
		}
	}

	/**
	 * Parse coachflow structure to extract process elements
	 * @param {Object} coachflow - Coachflow structure
	 * @param {Object} details - Details object to populate
	 */
	parseCoachflowElements(coachflow, details) {
		try {
			// Navigate to the userTaskImplementation
			const userTaskImpl = coachflow["ns16:definitions"]?.["ns16:globalUserTask"]?.["ns16:extensionElements"]?.["ns3:userTaskImplementation"];

			if (!userTaskImpl) {
				console.warn("No userTaskImplementation found in coachflow");
				return;
			}

			// Extract scriptTask elements
			if (userTaskImpl["ns16:scriptTask"]) {
				const scriptTasks = Array.isArray(userTaskImpl["ns16:scriptTask"]) ? userTaskImpl["ns16:scriptTask"] : [userTaskImpl["ns16:scriptTask"]];

				for (const scriptTask of scriptTasks) {
					const scriptTaskData = {
						name: scriptTask.name || "Unnamed",
						id: scriptTask.id,
						script: scriptTask["ns16:script"] ? this.cleanJavaScript(scriptTask["ns16:script"]) : "",
						hasPreScript: false,
						hasPostScript: false,
						preScript: "",
						postScript: "",
					};

					// Extract pre/post assignment scripts from extensionElements
					if (scriptTask["ns16:extensionElements"]) {
						const extElements = scriptTask["ns16:extensionElements"];

						if (extElements["ns3:preAssignmentScript"]) {
							const preScript = this.cleanJavaScript(extElements["ns3:preAssignmentScript"]);
							if (preScript && preScript.trim()) {
								scriptTaskData.hasPreScript = true;
								scriptTaskData.preScript = preScript;
							}
						}

						if (extElements["ns3:postAssignmentScript"]) {
							const postScript = this.cleanJavaScript(extElements["ns3:postAssignmentScript"]);
							if (postScript && postScript.trim()) {
								scriptTaskData.hasPostScript = true;
								scriptTaskData.postScript = postScript;
							}
						}
					}

					details.elements.scriptTasks.push(scriptTaskData);
				}
			}

			// Extract exclusiveGateway elements
			if (userTaskImpl["ns16:exclusiveGateway"]) {
				const gateways = Array.isArray(userTaskImpl["ns16:exclusiveGateway"]) ? userTaskImpl["ns16:exclusiveGateway"] : [userTaskImpl["ns16:exclusiveGateway"]];

				for (const gateway of gateways) {
					const gatewayData = {
						name: gateway.name || "Unnamed",
						id: gateway.id,
						hasPreScript: false,
						hasPostScript: false,
						preScript: "",
						postScript: "",
					};

					// Extract pre/post assignment scripts from extensionElements
					if (gateway["ns16:extensionElements"]) {
						const extElements = gateway["ns16:extensionElements"];

						if (extElements["ns3:preAssignmentScript"]) {
							const preScript = this.cleanJavaScript(extElements["ns3:preAssignmentScript"]);
							if (preScript && preScript.trim()) {
								gatewayData.hasPreScript = true;
								gatewayData.preScript = preScript;
							}
						}

						if (extElements["ns3:postAssignmentScript"]) {
							const postScript = this.cleanJavaScript(extElements["ns3:postAssignmentScript"]);
							if (postScript && postScript.trim()) {
								gatewayData.hasPostScript = true;
								gatewayData.postScript = postScript;
							}
						}
					}

					details.elements.exclusiveGateways.push(gatewayData);
				}
			}

			// Extract formTask elements
			if (userTaskImpl["ns3:formTask"]) {
				const formTasks = Array.isArray(userTaskImpl["ns3:formTask"]) ? userTaskImpl["ns3:formTask"] : [userTaskImpl["ns3:formTask"]];

				for (const formTask of formTasks) {
					const formTaskData = {
						name: formTask.name || "Unnamed",
						id: formTask.id,
						hasPreScript: false,
						hasPostScript: false,
						preScript: "",
						postScript: "",
					};

					// Extract pre/post assignment scripts from extensionElements
					if (formTask["ns16:extensionElements"]) {
						const extElements = formTask["ns16:extensionElements"];

						if (extElements["ns3:preAssignmentScript"]) {
							const preScript = this.cleanJavaScript(extElements["ns3:preAssignmentScript"]);
							if (preScript && preScript.trim()) {
								formTaskData.hasPreScript = true;
								formTaskData.preScript = preScript;
							}
						}

						if (extElements["ns3:postAssignmentScript"]) {
							const postScript = this.cleanJavaScript(extElements["ns3:postAssignmentScript"]);
							if (postScript && postScript.trim()) {
								formTaskData.hasPostScript = true;
								formTaskData.postScript = postScript;
							}
						}
					}

					details.elements.formTasks.push(formTaskData);
				}
			}

			// Extract callActivity elements
			if (userTaskImpl["ns16:callActivity"]) {
				const callActivities = Array.isArray(userTaskImpl["ns16:callActivity"]) ? userTaskImpl["ns16:callActivity"] : [userTaskImpl["ns16:callActivity"]];

				for (const callActivity of callActivities) {
					const callActivityData = {
						name: callActivity.name || "Unnamed",
						id: callActivity.id,
						hasPreScript: false,
						hasPostScript: false,
						preScript: "",
						postScript: "",
						calledElement: callActivity.calledElement || ""
					};

					// Extract pre/post assignment scripts from extensionElements
					if (callActivity["ns16:extensionElements"]) {
						const extElements = callActivity["ns16:extensionElements"];

						if (extElements["ns3:preAssignmentScript"]) {
							const preScript = this.cleanJavaScript(extElements["ns3:preAssignmentScript"]);
							if (preScript && preScript.trim()) {
								callActivityData.hasPreScript = true;
								callActivityData.preScript = preScript;
							}
						}

						if (extElements["ns3:postAssignmentScript"]) {
							const postScript = this.cleanJavaScript(extElements["ns3:postAssignmentScript"]);
							if (postScript && postScript.trim()) {
								callActivityData.hasPostScript = true;
								callActivityData.postScript = postScript;
							}
						}
					}

					details.elements.callActivities.push(callActivityData);
				}
			}
		} catch (error) {
			console.warn("Error parsing coachflow elements:", error);
		}
	}

	/**
	 * Extract Service-specific details including parameters, variables and scripts
	 * @param {Object} processElement - Process XML element
	 * @param {Object} baseObject - Base object to add details to
	 */
	extractServiceDetails(processElement, baseObject) {
		// Initialize details object with default structure
		const details = {
			...baseObject.details, // Preserve existing details
			variables: {
				input: [],
				output: [],
				private: [],
			},
			scripts: [],
		};

		// Helper function to safely access array properties and handle XML structure
		const toArray = (value) => {
			if (!value) return [];
			if (Array.isArray(value)) return value;
			if (value === Object(value)) return [value]; // Handle single object case
			return [];
		};

		// Helper to get XML attribute value with fallback
		const getAttr = (obj, attr, defaultValue = "") => {
			if (!obj) return defaultValue;
			if (obj[attr] !== undefined) return obj[attr];
			if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
			return defaultValue;
		};

		// Process Parameters (input/output variables)
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

			// Add defaultValue if hasDefault is true
			if (variable.hasDefault) {
				variable.defaultValue = getAttr(param, "defaultValue", "");
			}

			// Categorize as input or output based on direction
			// 1 = Input, 2 = Output, 3 = Both
			const direction = getAttr(param, "direction", "1");
			if (direction === "1" || direction === "3") {
				// Input or Both
				details.variables.input.push(variable);
			}
			if (direction === "2" || direction === "3") {
				// Output or Both
				details.variables.output.push(variable);
			}
		}

		// Process Variables (private variables)
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

			// Add defaultValue if hasDefault is true
			if (varDetails.hasDefault) {
				varDetails.defaultValue = getAttr(variable, "defaultValue", "");
			}

			details.variables.private.push(varDetails);
		}

		// Extract scripts from item → TWComponent → script
		const items = toArray(processElement.item);
		for (const item of items) {
			if (!item || !item.TWComponent) continue;

			// Get the item name to use as script name (from 'name' element)
			const itemName = item.name || "Unnamed Script";

			// Process each TWComponent
			const twComponents = toArray(item.TWComponent);
			for (const twComponent of twComponents) {
				if (!twComponent || !twComponent.script) continue;

				// Get script content directly (it's a text node, not an object)
				let scriptContent = twComponent.script;

				// Handle if script is wrapped in an object
				if (typeof scriptContent === "object" && scriptContent !== null) {
					if (scriptContent._) scriptContent = scriptContent._;
					else if (scriptContent._text) scriptContent = scriptContent._text;
					else if (scriptContent["#text"]) scriptContent = scriptContent["#text"];
					else scriptContent = "";
				}

				// Ensure it's a string
				if (typeof scriptContent !== "string") continue;

				scriptContent = scriptContent.trim();
				if (!scriptContent) continue;

				// Clean up the script content
				scriptContent = this.cleanJavaScript(scriptContent);

				// Add the script with the item name as the script name
				details.scripts.push({
					name: itemName,
					script: scriptContent,
				});
			}
		}

		// Save the extracted details back to the base object
		baseObject.details = details;
	}

	/**
	 * Extract Business Object specific details including schema structure
	 * @param {Object} twClassElement - Business Object XML element
	 * @param {Object} baseObject - Base object to add details to
	 */
	extractBusinessObjectDetails(twClassElement, baseObject) {
		try {
			// Extract jsonData which contains the schema structure
			const jsonData = twClassElement.jsonData;

			if (jsonData) {
				// Parse the schema using our business object parser
				const schema = this.businessObjectParser.parseSchema(jsonData, baseObject.id, baseObject.name);

				// Add schema information to details
				baseObject.details.schema = schema;
				baseObject.hasDetails = true;

				// Add summary information for quick display
				baseObject.details.summary = {
					totalProperties: schema.properties.length,
					systemTypes: schema.systemTypesCount,
					customTypes: schema.customTypesCount,
					hasComplexTypes: schema.hasComplexTypes,
					namespace: schema.namespace,
				};

				// Register this type in the type registry for cross-referencing
				this.registerBusinessObjectType(baseObject.name, baseObject.id, schema, schema.namespace);

				console.log(`Extracted schema for ${baseObject.name}: ${schema.properties.length} properties`);
			} else {
				// No jsonData available, try to extract from definition structure
				baseObject.details.schema = this.extractDefinitionBasedSchema(twClassElement, baseObject.id, baseObject.name);
				baseObject.hasDetails = !!baseObject.details.schema.properties.length;
			}
		} catch (error) {
			console.warn(`Error extracting business object details for ${baseObject.name}:`, error.message);
			baseObject.details.error = error.message;
		}
	}

	/**
	 * Register a business object type for cross-referencing
	 * @param {string} typeName - Name of the business object type
	 * @param {string} typeId - ID of the business object
	 * @param {Object} schema - Schema structure
	 * @param {string} namespace - Type namespace
	 */
	registerBusinessObjectType(typeName, typeId, schema, namespace) {
		const typeRegistry = require("../utils/business-object-type-registry");
		typeRegistry.registerType(typeName, typeId, schema, namespace);
	}

	/**
	 * Resolve cross-references for all business objects after processing
	 * @param {Array} businessObjects - Array of business object definitions
	 */
	resolveBusinessObjectCrossReferences(businessObjects) {
		if (!businessObjects || !Array.isArray(businessObjects)) {
			return;
		}

		console.log(`🔗 Resolving cross-references for ${businessObjects.length} business objects...`);

		businessObjects.forEach((businessObject) => {
			if (businessObject.details && businessObject.details.schema) {
				try {
					// Resolve cross-references for this business object
					const resolvedSchema = this.businessObjectParser.resolveCustomTypes(businessObject.details.schema);
					businessObject.details.schema = resolvedSchema;
					businessObject.details.crossReferencesResolved = true;
				} catch (error) {
					console.warn(`Error resolving cross-references for ${businessObject.name}:`, error.message);
					businessObject.details.crossReferenceError = error.message;
				}
			}
		});

		// Print resolution statistics
		const typeRegistry = require("../utils/business-object-type-registry");
		const stats = typeRegistry.getStats();
		console.log(`✅ Cross-reference resolution complete:`, stats);
	}

	/**
	 * Extract schema from definition structure (fallback when jsonData is not available)
	 * @param {Object} twClassElement - Business Object XML element
	 * @param {string} objectId - Object ID
	 * @param {string} objectName - Object name
	 * @returns {Object} Basic schema structure
	 */
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
			// Extract from definition/property structure
			if (twClassElement.definition && twClassElement.definition.property) {
				const properties = Array.isArray(twClassElement.definition.property) ? twClassElement.definition.property : [twClassElement.definition.property];

				for (const property of properties) {
					if (property.name && property.classRef) {
						schema.properties.push({
							name: property.name,
							type: "Unknown", // We don't have type info in definition
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

	/**
	 * Clean JavaScript code by replacing &#xD; with newlines and decoding HTML entities
	 * @param {string} jsCode - Raw JavaScript code
	 * @returns {string} Cleaned JavaScript code
	 */
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
	/**
	 * Extract toolkit information and objects
	 * @param {ADMZip} zip - ZIP archive
	 * @returns {Promise<Array>} Array of toolkit information with objects
	 */
	async extractToolkits(zip) {
		const toolkits = [];
		const entries = zip.getEntries();

		console.log("🔍 Scanning for toolkits...");
		console.log(`📁 Total entries in TWX: ${entries.length}`);

		// Look for toolkit ZIP files in the toolkits/ folder
		for (const entry of entries) {
			// Check if this is a toolkit ZIP file in the toolkits/ folder
			if (entry.entryName.startsWith("toolkits/") && entry.entryName.endsWith(".zip")) {
				try {
					console.log(`📦 Processing toolkit ZIP: ${entry.entryName}`);

					const toolkitData = entry.getData();
					const toolkitZip = new ADMZip(toolkitData);

					// Extract metadata from the toolkit ZIP
					const toolkitInfo = await this.extractPackageMetadata(toolkitZip);

					console.log(`✅ Found toolkit: ${toolkitInfo.metadata.project.name} (isToolkit: ${toolkitInfo.metadata.project.isToolkit})`);

					// Extract all objects from toolkit
					const toolkitObjects = await this.extractObjects(toolkitZip, toolkitInfo.objectList);

					// Tag each object with toolkit source information
					const taggedObjects = toolkitObjects.map((obj) => ({
						...obj,
						source: "toolkit",
						toolkitInfo: {
							fileName: path.basename(entry.entryName),
							name: toolkitInfo.metadata.project.name,
							shortName: toolkitInfo.metadata.project.shortName,
							id: toolkitInfo.metadata.project.id,
							isSystem: toolkitInfo.metadata.project.isSystem,
						},
					}));

					console.log(`✅ Extracted ${taggedObjects.length} objects from toolkit: ${toolkitInfo.metadata.project.name}`);

					toolkits.push({
						fileName: path.basename(entry.entryName),
						metadata: toolkitInfo.metadata,
						objectCount: toolkitInfo.objectList.length,
						objects: taggedObjects,
					});
				} catch (error) {
					console.warn(`❌ Error processing toolkit ${entry.entryName}:`, error.message);
					console.warn(`Error details:`, error);
					// Continue processing other entries
				}
			}
		}

		// Debug: If no toolkits found, show the structure to help diagnose
		if (toolkits.length === 0) {
			console.log("🔍 No toolkits found. TWX file structure:");
			entries.forEach(entry => {
				if (entry.entryName.includes("toolkit") || entry.entryName.endsWith(".zip")) {
					console.log(`  📁 ${entry.entryName} (${entry.header.size} bytes)`);
				}
			});

			// Also check for any ZIP files that might be toolkits
			console.log("🔍 Looking for any ZIP files that might be toolkits:");
			for (const entry of entries) {
				if (entry.entryName.endsWith(".zip")) {
					console.log(`  📦 Found ZIP file: ${entry.entryName}`);
					try {
						const zipData = entry.getData();
						const innerZip = new ADMZip(zipData);
						const innerEntries = innerZip.getEntries();
						
						// Check if this ZIP has the structure of a toolkit
						const hasMetaInf = innerEntries.some(e => e.entryName.startsWith("META-INF/"));
						const hasObjects = innerEntries.some(e => e.entryName.startsWith("objects/"));
						
						console.log(`    - Has META-INF: ${hasMetaInf}, Has objects: ${hasObjects}`);
						
						if (hasMetaInf) {
							try {
								const toolkitInfo = await this.extractPackageMetadata(innerZip);
								console.log(`    - Project name: ${toolkitInfo.metadata.project.name}`);
								console.log(`    - Is toolkit: ${toolkitInfo.metadata.project.isToolkit}`);
								console.log(`    - Object count: ${toolkitInfo.objectList.length}`);
							} catch (metaError) {
								console.log(`    - Error reading metadata: ${metaError.message}`);
							}
						}
					} catch (zipError) {
						console.log(`    - Error reading ZIP: ${zipError.message}`);
					}
				}
			}
		}

		console.log(`📊 Total toolkits processed: ${toolkits.length}`);
		return toolkits;
	}
}

module.exports = TWXExtractor;
