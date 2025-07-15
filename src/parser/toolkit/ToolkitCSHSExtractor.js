/**
 * Enhanced CSHS extractor for toolkit objects
 * Provides comprehensive variable extraction and process flow parsing
 */
class ToolkitCSHSExtractor {
    constructor() {
        this.variableReferences = new Map();
    }

    /**
     * Extract enhanced CSHS details for toolkit objects
     * @param {Object} processElement - Process XML element
     * @param {Object} baseObject - Base object to add details to
     * @param {Object} toolkitInfo - Toolkit metadata information
     */
    extractToolkitCSHSDetails(processElement, baseObject, toolkitInfo) {
        // Preserve existing details and add enhanced CSHS-specific details
        const details = {
            ...baseObject.details, // Preserve existing details like processType
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
            toolkitMetadata: {
                sourceToolkit: toolkitInfo.name,
                toolkitShortName: toolkitInfo.shortName,
                toolkitId: toolkitInfo.id,
                isSystemToolkit: toolkitInfo.isSystem,
                fileName: toolkitInfo.fileName,
                extractedAt: new Date().toISOString()
            },
            crossReferences: {
                variableReferences: [],
                serviceReferences: [],
                businessObjectReferences: []
            }
        };

        try {
            // Extract variables from the main XML structure with enhanced metadata
            this.extractEnhancedVariables(processElement, details, toolkitInfo);

            // Extract process elements from coachflow structure with toolkit context
            if (processElement.coachflow) {
                this.parseToolkitCoachflowElements(processElement.coachflow, details, toolkitInfo);
            }

            // Extract toolkit-specific variable references
            this.extractToolkitVariableReferences(details, toolkitInfo);

            // Add analysis metadata
            details.analysisMetadata = {
                totalVariables: details.variables.input.length + details.variables.output.length + details.variables.private.length,
                totalElements: Object.values(details.elements).reduce((sum, arr) => sum + arr.length, 0),
                hasScripts: details.elements.scriptTasks.length > 0,
                complexityScore: this.calculateCSHSComplexity(details),
                toolkitDependencies: this.identifyToolkitDependencies(details)
            };

            console.log(`Enhanced CSHS extraction for ${baseObject.name} from toolkit ${toolkitInfo.name}: ${details.analysisMetadata.totalVariables} variables, ${details.analysisMetadata.totalElements} elements`);

        } catch (error) {
            console.warn(`Error extracting enhanced CSHS details for ${baseObject.name} from toolkit ${toolkitInfo.name}:`, error.message);
            details.error = error.message;
            details.toolkitError = {
                toolkit: toolkitInfo.name,
                errorType: 'cshs_extraction_error',
                message: error.message
            };
        }

        baseObject.details = details;
    }

    /**
     * Extract enhanced variables with toolkit-specific metadata
     * @param {Object} processElement - Process XML element
     * @param {Object} details - Details object to populate
     * @param {Object} toolkitInfo - Toolkit information
     */
    extractEnhancedVariables(processElement, details, toolkitInfo) {
        // Parse processParameter elements (input/output variables)
        if (processElement.processParameter) {
            const parameters = Array.isArray(processElement.processParameter) 
                ? processElement.processParameter 
                : [processElement.processParameter];
                
            for (const param of parameters) {
                if (param && param.name) {
                    const variable = {
                        name: param.name,
                        hasDefault: param.hasDefault === "true" || param.hasDefault === true,
                        type: param.parameterType,
                        description: param.description || '',
                        toolkitSource: toolkitInfo.name,
                        toolkitId: toolkitInfo.id,
                        isSystemToolkit: toolkitInfo.isSystem,
                        // Enhanced metadata
                        dataType: param.dataType || 'Unknown',
                        isRequired: param.required === "true" || param.required === true,
                        defaultValue: param.defaultValue || null,
                        constraints: this.extractVariableConstraints(param)
                    };

                    // Identify potential cross-toolkit references
                    if (variable.dataType && !this.isSystemType(variable.dataType)) {
                        variable.potentialCrossReference = {
                            referencedType: variable.dataType,
                            referenceType: 'variable_type',
                            needsResolution: true
                        };
                        details.crossReferences.variableReferences.push({
                            variableName: variable.name,
                            referencedType: variable.dataType,
                            sourceToolkit: toolkitInfo.name
                        });
                    }

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
            const variables = Array.isArray(processElement.processVariable) 
                ? processElement.processVariable 
                : [processElement.processVariable];
                
            for (const variable of variables) {
                if (variable && variable.name) {
                    const enhancedVariable = {
                        name: variable.name,
                        hasDefault: variable.hasDefault === "true" || variable.hasDefault === true,
                        toolkitSource: toolkitInfo.name,
                        toolkitId: toolkitInfo.id,
                        isSystemToolkit: toolkitInfo.isSystem,
                        // Enhanced metadata
                        dataType: variable.dataType || variable.type || 'Unknown',
                        description: variable.description || '',
                        defaultValue: variable.defaultValue || null,
                        scope: 'private',
                        constraints: this.extractVariableConstraints(variable)
                    };

                    // Check for cross-toolkit references
                    if (enhancedVariable.dataType && !this.isSystemType(enhancedVariable.dataType)) {
                        enhancedVariable.potentialCrossReference = {
                            referencedType: enhancedVariable.dataType,
                            referenceType: 'variable_type',
                            needsResolution: true
                        };
                        details.crossReferences.variableReferences.push({
                            variableName: enhancedVariable.name,
                            referencedType: enhancedVariable.dataType,
                            sourceToolkit: toolkitInfo.name
                        });
                    }

                    details.variables.private.push(enhancedVariable);
                }
            }
        }
    }

    /**
     * Parse coachflow structure with enhanced toolkit context
     * @param {Object} coachflow - Coachflow structure
     * @param {Object} details - Details object to populate
     * @param {Object} toolkitInfo - Toolkit information
     */
    parseToolkitCoachflowElements(coachflow, details, toolkitInfo) {
        try {
            // Navigate to the userTaskImplementation
            const userTaskImpl = coachflow["ns16:definitions"]?.["ns16:globalUserTask"]?.["ns16:extensionElements"]?.["ns3:userTaskImplementation"];

            if (!userTaskImpl) {
                console.warn(`No userTaskImplementation found in coachflow for toolkit ${toolkitInfo.name}`);
                return;
            }

            // Extract scriptTask elements with enhanced metadata
            if (userTaskImpl["ns16:scriptTask"]) {
                const scriptTasks = Array.isArray(userTaskImpl["ns16:scriptTask"]) 
                    ? userTaskImpl["ns16:scriptTask"] 
                    : [userTaskImpl["ns16:scriptTask"]];

                for (const scriptTask of scriptTasks) {
                    const enhancedScriptTask = {
                        name: scriptTask.name || "Unnamed",
                        id: scriptTask.id,
                        script: scriptTask["ns16:script"] ? this.cleanJavaScript(scriptTask["ns16:script"]) : "",
                        hasPreScript: false,
                        hasPostScript: false,
                        preScript: "",
                        postScript: "",
                        // Enhanced toolkit metadata
                        toolkitSource: toolkitInfo.name,
                        toolkitId: toolkitInfo.id,
                        isSystemToolkit: toolkitInfo.isSystem,
                        scriptLength: scriptTask["ns16:script"] ? scriptTask["ns16:script"].length : 0,
                        hasComplexLogic: this.analyzeScriptComplexity(scriptTask["ns16:script"]),
                        referencedVariables: this.extractScriptVariableReferences(scriptTask["ns16:script"]),
                        referencedServices: this.extractScriptServiceReferences(scriptTask["ns16:script"])
                    };

                    // Track cross-references found in scripts
                    enhancedScriptTask.referencedServices.forEach(service => {
                        details.crossReferences.serviceReferences.push({
                            elementName: enhancedScriptTask.name,
                            elementType: 'scriptTask',
                            referencedService: service,
                            sourceToolkit: toolkitInfo.name
                        });
                    });

                    details.elements.scriptTasks.push(enhancedScriptTask);
                }
            }

            // Extract exclusiveGateway elements with enhanced metadata
            if (userTaskImpl["ns16:exclusiveGateway"]) {
                const gateways = Array.isArray(userTaskImpl["ns16:exclusiveGateway"]) 
                    ? userTaskImpl["ns16:exclusiveGateway"] 
                    : [userTaskImpl["ns16:exclusiveGateway"]];

                for (const gateway of gateways) {
                    details.elements.exclusiveGateways.push({
                        name: gateway.name || "Unnamed",
                        id: gateway.id,
                        hasPreScript: false,
                        hasPostScript: false,
                        preScript: "",
                        postScript: "",
                        // Enhanced toolkit metadata
                        toolkitSource: toolkitInfo.name,
                        toolkitId: toolkitInfo.id,
                        isSystemToolkit: toolkitInfo.isSystem,
                        conditionCount: this.extractGatewayConditionCount(gateway),
                        hasComplexConditions: this.analyzeGatewayComplexity(gateway)
                    });
                }
            }

            // Extract formTask elements with enhanced metadata
            if (userTaskImpl["ns3:formTask"]) {
                const formTasks = Array.isArray(userTaskImpl["ns3:formTask"]) 
                    ? userTaskImpl["ns3:formTask"] 
                    : [userTaskImpl["ns3:formTask"]];

                for (const formTask of formTasks) {
                    details.elements.formTasks.push({
                        name: formTask.name || "Unnamed",
                        id: formTask.id,
                        hasPreScript: false,
                        hasPostScript: false,
                        preScript: "",
                        postScript: "",
                        // Enhanced toolkit metadata
                        toolkitSource: toolkitInfo.name,
                        toolkitId: toolkitInfo.id,
                        isSystemToolkit: toolkitInfo.isSystem,
                        formType: formTask.formType || 'Unknown',
                        hasValidation: this.checkFormValidation(formTask),
                        fieldCount: this.extractFormFieldCount(formTask)
                    });
                }
            }

            // Extract callActivity elements with enhanced metadata
            if (userTaskImpl["ns16:callActivity"]) {
                const callActivities = Array.isArray(userTaskImpl["ns16:callActivity"]) 
                    ? userTaskImpl["ns16:callActivity"] 
                    : [userTaskImpl["ns16:callActivity"]];

                for (const callActivity of callActivities) {
                    const enhancedCallActivity = {
                        name: callActivity.name || "Unnamed",
                        id: callActivity.id,
                        hasPreScript: false,
                        hasPostScript: false,
                        preScript: "",
                        postScript: "",
                        // Enhanced toolkit metadata
                        toolkitSource: toolkitInfo.name,
                        toolkitId: toolkitInfo.id,
                        isSystemToolkit: toolkitInfo.isSystem,
                        calledProcess: callActivity.calledElement || 'Unknown',
                        isExternalCall: this.isExternalProcessCall(callActivity.calledElement),
                        parameterMappings: this.extractParameterMappings(callActivity)
                    };

                    // Track service references from call activities
                    if (enhancedCallActivity.calledProcess && enhancedCallActivity.calledProcess !== 'Unknown') {
                        details.crossReferences.serviceReferences.push({
                            elementName: enhancedCallActivity.name,
                            elementType: 'callActivity',
                            referencedService: enhancedCallActivity.calledProcess,
                            sourceToolkit: toolkitInfo.name,
                            isExternal: enhancedCallActivity.isExternalCall
                        });
                    }

                    details.elements.callActivities.push(enhancedCallActivity);
                }
            }
        } catch (error) {
            console.warn(`Error parsing coachflow elements for toolkit ${toolkitInfo.name}:`, error);
        }
    }

    /**
     * Extract toolkit-specific variable references
     * @param {Object} details - Details object containing variables and elements
     * @param {Object} toolkitInfo - Toolkit information
     */
    extractToolkitVariableReferences(details, toolkitInfo) {
        const allVariables = [
            ...details.variables.input,
            ...details.variables.output,
            ...details.variables.private
        ];

        // Analyze variable usage patterns
        const variableUsage = new Map();
        
        // Check script tasks for variable references
        details.elements.scriptTasks.forEach(scriptTask => {
            scriptTask.referencedVariables.forEach(varName => {
                if (!variableUsage.has(varName)) {
                    variableUsage.set(varName, []);
                }
                variableUsage.get(varName).push({
                    elementType: 'scriptTask',
                    elementName: scriptTask.name,
                    elementId: scriptTask.id
                });
            });
        });

        // Add usage information to variables
        allVariables.forEach(variable => {
            variable.usageInfo = {
                isUsed: variableUsage.has(variable.name),
                usageCount: variableUsage.has(variable.name) ? variableUsage.get(variable.name).length : 0,
                usedBy: variableUsage.get(variable.name) || []
            };
        });

        // Identify unused variables
        const unusedVariables = allVariables.filter(v => !v.usageInfo.isUsed);
        if (unusedVariables.length > 0) {
            details.analysisWarnings = details.analysisWarnings || [];
            details.analysisWarnings.push({
                type: 'unused_variables',
                message: `Found ${unusedVariables.length} unused variables`,
                variables: unusedVariables.map(v => v.name),
                toolkit: toolkitInfo.name
            });
        }
    }

    // Helper methods for enhanced analysis

    /**
     * Extract variable constraints from parameter definition
     * @param {Object} param - Parameter object
     * @returns {Object} Constraints object
     */
    extractVariableConstraints(param) {
        return {
            minLength: param.minLength || null,
            maxLength: param.maxLength || null,
            pattern: param.pattern || null,
            allowedValues: param.allowedValues || null,
            isNullable: param.nullable !== "false"
        };
    }

    /**
     * Check if a type is a system type
     * @param {String} type - Type name
     * @returns {Boolean} True if system type
     */
    isSystemType(type) {
        const systemTypes = ['String', 'Integer', 'Boolean', 'Date', 'Decimal', 'Time', 'XMLElement'];
        return systemTypes.includes(type);
    }

    /**
     * Clean JavaScript code
     * @param {String} jsCode - Raw JavaScript code
     * @returns {String} Cleaned code
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
     * Analyze script complexity
     * @param {String} script - Script content
     * @returns {Boolean} True if complex
     */
    analyzeScriptComplexity(script) {
        if (!script) return false;
        const complexPatterns = [
            /for\s*\(/g,
            /while\s*\(/g,
            /if\s*\(/g,
            /function\s+\w+/g,
            /try\s*{/g,
            /catch\s*\(/g
        ];
        return complexPatterns.some(pattern => pattern.test(script));
    }

    /**
     * Extract variable references from script
     * @param {String} script - Script content
     * @returns {Array} Array of variable names
     */
    extractScriptVariableReferences(script) {
        if (!script) return [];
        const variablePattern = /tw\.local\.(\w+)/g;
        const matches = [];
        let match;
        while ((match = variablePattern.exec(script)) !== null) {
            if (!matches.includes(match[1])) {
                matches.push(match[1]);
            }
        }
        return matches;
    }

    /**
     * Extract service references from script
     * @param {String} script - Script content
     * @returns {Array} Array of service names
     */
    extractScriptServiceReferences(script) {
        if (!script) return [];
        const servicePattern = /tw\.system\.invokeService\(['"]([^'"]+)['"]/g;
        const matches = [];
        let match;
        while ((match = servicePattern.exec(script)) !== null) {
            if (!matches.includes(match[1])) {
                matches.push(match[1]);
            }
        }
        return matches;
    }

    /**
     * Calculate CSHS complexity score
     * @param {Object} details - CSHS details
     * @returns {Number} Complexity score
     */
    calculateCSHSComplexity(details) {
        let score = 0;
        score += details.variables.input.length * 1;
        score += details.variables.output.length * 1;
        score += details.variables.private.length * 0.5;
        score += details.elements.scriptTasks.length * 3;
        score += details.elements.formTasks.length * 2;
        score += details.elements.callActivities.length * 2;
        score += details.elements.exclusiveGateways.length * 1;
        return Math.round(score);
    }

    /**
     * Identify toolkit dependencies
     * @param {Object} details - CSHS details
     * @returns {Array} Array of dependencies
     */
    identifyToolkitDependencies(details) {
        const dependencies = [];
        
        // Add variable type dependencies
        details.crossReferences.variableReferences.forEach(ref => {
            dependencies.push({
                type: 'variable_type',
                name: ref.referencedType,
                source: 'variable',
                variableName: ref.variableName
            });
        });

        // Add service dependencies
        details.crossReferences.serviceReferences.forEach(ref => {
            dependencies.push({
                type: 'service_call',
                name: ref.referencedService,
                source: ref.elementType,
                elementName: ref.elementName
            });
        });

        return dependencies;
    }

    // Additional helper methods for gateway and form analysis
    extractGatewayConditionCount(gateway) { return 0; } // Placeholder
    analyzeGatewayComplexity(gateway) { return false; } // Placeholder
    checkFormValidation(formTask) { return false; } // Placeholder
    extractFormFieldCount(formTask) { return 0; } // Placeholder
    isExternalProcessCall(calledElement) { return false; } // Placeholder
    extractParameterMappings(callActivity) { return []; } // Placeholder
}

module.exports = ToolkitCSHSExtractor;