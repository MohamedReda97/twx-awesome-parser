/**
 * Enhanced Service extractor for toolkit objects
 * Provides comprehensive parameter extraction and script parsing
 */
class ToolkitServiceExtractor {
    constructor() {
        this.serviceReferences = new Map();
    }

    /**
     * Extract enhanced service details for toolkit objects
     * @param {Object} processElement - Process XML element
     * @param {Object} baseObject - Base object to add details to
     * @param {Object} toolkitInfo - Toolkit metadata information
     */
    extractToolkitServiceDetails(processElement, baseObject, toolkitInfo) {
        // Initialize enhanced details object with default structure
        const details = {
            ...baseObject.details, // Preserve existing details
            variables: {
                input: [],
                output: [],
                private: [],
            },
            scripts: [],
            toolkitMetadata: {
                sourceToolkit: toolkitInfo.name,
                toolkitShortName: toolkitInfo.shortName,
                toolkitId: toolkitInfo.id,
                isSystemToolkit: toolkitInfo.isSystem,
                fileName: toolkitInfo.fileName,
                extractedAt: new Date().toISOString()
            },
            crossReferences: {
                parameterTypeReferences: [],
                serviceCallReferences: [],
                businessObjectReferences: []
            },
            validation: {
                parameterValidation: [],
                scriptValidation: [],
                crossReferenceValidation: []
            }
        };

        try {
            // Helper functions for safe array access and XML attribute handling
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

            // Process Parameters (input/output variables) with enhanced metadata
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
                    // Enhanced toolkit metadata
                    toolkitSource: toolkitInfo.name,
                    toolkitId: toolkitInfo.id,
                    isSystemToolkit: toolkitInfo.isSystem,
                    dataType: getAttr(param, "dataType", "String"),
                    isRequired: getAttr(param, "required") === "true",
                    constraints: this.extractParameterConstraints(param),
                    validation: this.validateServiceParameter(param, toolkitInfo)
                };

                // Add defaultValue if hasDefault is true
                if (variable.hasDefault) {
                    variable.defaultValue = getAttr(param, "defaultValue", "");
                }

                // Check for cross-toolkit type references
                if (!this.isSystemType(variable.dataType)) {
                    variable.crossReference = {
                        referencedType: variable.dataType,
                        referenceType: 'parameter_type',
                        needsResolution: true,
                        sourceToolkit: toolkitInfo.name
                    };
                    details.crossReferences.parameterTypeReferences.push({
                        parameterName: variable.name,
                        referencedType: variable.dataType,
                        sourceToolkit: toolkitInfo.name,
                        parameterDirection: getAttr(param, "direction", "1")
                    });
                }

                // Categorize as input or output based on direction
                const direction = getAttr(param, "direction", "1");
                if (direction === "1" || direction === "3") {
                    details.variables.input.push(variable);
                }
                if (direction === "2" || direction === "3") {
                    details.variables.output.push(variable);
                }

                // Add to validation results
                details.validation.parameterValidation.push(variable.validation);
            }

            // Process Variables (private variables) with enhanced metadata
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
                    // Enhanced toolkit metadata
                    toolkitSource: toolkitInfo.name,
                    toolkitId: toolkitInfo.id,
                    isSystemToolkit: toolkitInfo.isSystem,
                    dataType: getAttr(variable, "dataType", getAttr(variable, "type", "String")),
                    scope: 'private',
                    constraints: this.extractParameterConstraints(variable),
                    validation: this.validateServiceParameter(variable, toolkitInfo)
                };

                // Add defaultValue if hasDefault is true
                if (varDetails.hasDefault) {
                    varDetails.defaultValue = getAttr(variable, "defaultValue", "");
                }

                // Check for cross-toolkit type references
                if (!this.isSystemType(varDetails.dataType)) {
                    varDetails.crossReference = {
                        referencedType: varDetails.dataType,
                        referenceType: 'variable_type',
                        needsResolution: true,
                        sourceToolkit: toolkitInfo.name
                    };
                    details.crossReferences.parameterTypeReferences.push({
                        parameterName: varDetails.name,
                        referencedType: varDetails.dataType,
                        sourceToolkit: toolkitInfo.name,
                        parameterDirection: 'private'
                    });
                }

                details.variables.private.push(varDetails);
                details.validation.parameterValidation.push(varDetails.validation);
            }

            // Extract and parse scripts with enhanced toolkit context
            this.parseToolkitServiceScripts(processElement, details, toolkitInfo);

            // Add comprehensive analysis metadata
            details.analysisMetadata = {
                totalParameters: details.variables.input.length + details.variables.output.length,
                totalPrivateVariables: details.variables.private.length,
                totalScripts: details.scripts.length,
                hasComplexScripts: details.scripts.some(s => this.analyzeScriptComplexity(s.script)),
                crossReferenceCount: details.crossReferences.parameterTypeReferences.length + 
                                   details.crossReferences.serviceCallReferences.length,
                complexityScore: this.calculateServiceComplexity(details),
                validationStatus: this.getOverallValidationStatus(details.validation),
                toolkitDependencies: this.identifyServiceDependencies(details)
            };

            console.log(`Enhanced service extraction for ${baseObject.name} from toolkit ${toolkitInfo.name}: ${details.analysisMetadata.totalParameters} parameters, ${details.analysisMetadata.totalScripts} scripts`);

        } catch (error) {
            console.warn(`Error extracting enhanced service details for ${baseObject.name} from toolkit ${toolkitInfo.name}:`, error.message);
            details.error = error.message;
            details.toolkitError = {
                toolkit: toolkitInfo.name,
                errorType: 'service_extraction_error',
                message: error.message
            };
        }

        // Save the extracted details back to the base object
        baseObject.details = details;
    }

    /**
     * Parse toolkit service scripts with enhanced analysis
     * @param {Object} processElement - Process XML element
     * @param {Object} details - Details object to populate
     * @param {Object} toolkitInfo - Toolkit information
     */
    parseToolkitServiceScripts(processElement, details, toolkitInfo) {
        const toArray = (value) => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (value === Object(value)) return [value];
            return [];
        };

        // Extract scripts from item → TWComponent → script
        const items = toArray(processElement.item);
        for (const item of items) {
            if (!item || !item.TWComponent) continue;

            // Get the item name to use as script name
            const itemName = item.name || "Unnamed Script";

            // Process each TWComponent
            const twComponents = toArray(item.TWComponent);
            for (const twComponent of twComponents) {
                if (!twComponent || !twComponent.script) continue;

                // Get script content
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

                // Create enhanced script object
                const enhancedScript = {
                    name: itemName,
                    script: scriptContent,
                    // Enhanced toolkit metadata
                    toolkitSource: toolkitInfo.name,
                    toolkitId: toolkitInfo.id,
                    isSystemToolkit: toolkitInfo.isSystem,
                    // Analysis metadata
                    scriptLength: scriptContent.length,
                    lineCount: scriptContent.split('\n').length,
                    hasComplexLogic: this.analyzeScriptComplexity(scriptContent),
                    referencedVariables: this.extractScriptVariableReferences(scriptContent),
                    referencedServices: this.extractScriptServiceReferences(scriptContent),
                    referencedBusinessObjects: this.extractScriptBusinessObjectReferences(scriptContent),
                    validation: this.validateScript(scriptContent, toolkitInfo)
                };

                // Track cross-references found in scripts
                enhancedScript.referencedServices.forEach(service => {
                    details.crossReferences.serviceCallReferences.push({
                        scriptName: enhancedScript.name,
                        referencedService: service,
                        sourceToolkit: toolkitInfo.name,
                        referenceType: 'service_call'
                    });
                });

                enhancedScript.referencedBusinessObjects.forEach(bo => {
                    details.crossReferences.businessObjectReferences.push({
                        scriptName: enhancedScript.name,
                        referencedBusinessObject: bo,
                        sourceToolkit: toolkitInfo.name,
                        referenceType: 'business_object_usage'
                    });
                });

                details.scripts.push(enhancedScript);
                details.validation.scriptValidation.push(enhancedScript.validation);
            }
        }
    }

    /**
     * Validate service parameters
     * @param {Object} param - Parameter object
     * @param {Object} toolkitInfo - Toolkit information
     * @returns {Object} Validation results
     */
    validateServiceParameters(param, toolkitInfo) {
        return this.validateServiceParameter(param, toolkitInfo);
    }

    /**
     * Validate a single service parameter
     * @param {Object} param - Parameter object
     * @param {Object} toolkitInfo - Toolkit information
     * @returns {Object} Validation results
     */
    validateServiceParameter(param, toolkitInfo) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: [],
            suggestions: []
        };

        const getAttr = (obj, attr, defaultValue = "") => {
            if (!obj) return defaultValue;
            if (obj[attr] !== undefined) return obj[attr];
            if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
            return defaultValue;
        };

        const name = getAttr(param, "name");
        const type = getAttr(param, "parameterType", "String");
        const dataType = getAttr(param, "dataType", type);

        // Validate parameter name
        if (!name || name.trim() === '') {
            validation.errors.push('Parameter name is missing or empty');
            validation.isValid = false;
        } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            validation.warnings.push(`Parameter name '${name}' should follow naming conventions`);
        }

        // Validate parameter type
        if (!type || type === 'Unknown') {
            validation.warnings.push(`Parameter '${name}' has unknown or missing type`);
        }

        // Check for cross-toolkit type references
        if (!this.isSystemType(dataType)) {
            validation.suggestions.push(`Parameter '${name}' references custom type '${dataType}' - verify type exists in toolkit dependencies`);
        }

        // Validate default values
        const hasDefault = getAttr(param, "hasDefault") === "true";
        const defaultValue = getAttr(param, "defaultValue");
        if (hasDefault && (!defaultValue || defaultValue.trim() === '')) {
            validation.warnings.push(`Parameter '${name}' marked as having default value but no default value provided`);
        }

        // Validate constraints
        const constraints = this.extractParameterConstraints(param);
        if (constraints.minLength && constraints.maxLength && constraints.minLength > constraints.maxLength) {
            validation.errors.push(`Parameter '${name}' has invalid length constraints: min (${constraints.minLength}) > max (${constraints.maxLength})`);
            validation.isValid = false;
        }

        return validation;
    }

    // Helper methods for enhanced analysis

    /**
     * Extract parameter constraints
     * @param {Object} param - Parameter object
     * @returns {Object} Constraints object
     */
    extractParameterConstraints(param) {
        const getAttr = (obj, attr, defaultValue = null) => {
            if (!obj) return defaultValue;
            if (obj[attr] !== undefined) return obj[attr];
            if (obj.$ && obj.$[attr] !== undefined) return obj.$[attr];
            return defaultValue;
        };

        return {
            minLength: getAttr(param, "minLength"),
            maxLength: getAttr(param, "maxLength"),
            pattern: getAttr(param, "pattern"),
            allowedValues: getAttr(param, "allowedValues"),
            isNullable: getAttr(param, "nullable") !== "false",
            minValue: getAttr(param, "minValue"),
            maxValue: getAttr(param, "maxValue")
        };
    }

    /**
     * Check if a type is a system type
     * @param {String} type - Type name
     * @returns {Boolean} True if system type
     */
    isSystemType(type) {
        const systemTypes = ['String', 'Integer', 'Boolean', 'Date', 'Decimal', 'Time', 'XMLElement', 'Object'];
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
            /if\s*\(.{20,}\)/g, // Complex if conditions
            /function\s+\w+/g,
            /try\s*{/g,
            /catch\s*\(/g,
            /switch\s*\(/g,
            /\.forEach\(/g,
            /\.map\(/g,
            /\.filter\(/g
        ];
        const complexityScore = complexPatterns.reduce((score, pattern) => {
            const matches = script.match(pattern);
            return score + (matches ? matches.length : 0);
        }, 0);
        return complexityScore > 3;
    }

    /**
     * Extract variable references from script
     * @param {String} script - Script content
     * @returns {Array} Array of variable names
     */
    extractScriptVariableReferences(script) {
        if (!script) return [];
        const patterns = [
            /tw\.local\.(\w+)/g,
            /input\.(\w+)/g,
            /output\.(\w+)/g
        ];
        const matches = new Set();
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(script)) !== null) {
                matches.add(match[1]);
            }
        });
        return Array.from(matches);
    }

    /**
     * Extract service references from script
     * @param {String} script - Script content
     * @returns {Array} Array of service names
     */
    extractScriptServiceReferences(script) {
        if (!script) return [];
        const patterns = [
            /tw\.system\.invokeService\(['"]([^'"]+)['"]/g,
            /tw\.system\.startProcess\(['"]([^'"]+)['"]/g
        ];
        const matches = new Set();
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(script)) !== null) {
                matches.add(match[1]);
            }
        });
        return Array.from(matches);
    }

    /**
     * Extract business object references from script
     * @param {String} script - Script content
     * @returns {Array} Array of business object names
     */
    extractScriptBusinessObjectReferences(script) {
        if (!script) return [];
        const patterns = [
            /new\s+(\w+)\s*\(/g,
            /tw\.object\.(\w+)/g
        ];
        const matches = new Set();
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(script)) !== null) {
                if (!this.isSystemType(match[1])) {
                    matches.add(match[1]);
                }
            }
        });
        return Array.from(matches);
    }

    /**
     * Validate script content
     * @param {String} script - Script content
     * @param {Object} toolkitInfo - Toolkit information
     * @returns {Object} Validation results
     */
    validateScript(script, toolkitInfo) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: [],
            suggestions: []
        };

        if (!script || script.trim() === '') {
            validation.warnings.push('Script is empty');
            return validation;
        }

        // Check for common syntax issues
        const openBraces = (script.match(/{/g) || []).length;
        const closeBraces = (script.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
            validation.errors.push('Mismatched braces in script');
            validation.isValid = false;
        }

        const openParens = (script.match(/\(/g) || []).length;
        const closeParens = (script.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            validation.errors.push('Mismatched parentheses in script');
            validation.isValid = false;
        }

        // Check for deprecated patterns
        if (script.includes('eval(')) {
            validation.warnings.push('Script uses eval() which is potentially unsafe');
        }

        // Check for hardcoded values
        if (script.match(/['"][^'"]{20,}['"]/)) {
            validation.suggestions.push('Consider moving long string literals to configuration');
        }

        return validation;
    }

    /**
     * Calculate service complexity score
     * @param {Object} details - Service details
     * @returns {Number} Complexity score
     */
    calculateServiceComplexity(details) {
        let score = 0;
        score += details.variables.input.length * 1;
        score += details.variables.output.length * 1;
        score += details.variables.private.length * 0.5;
        score += details.scripts.length * 2;
        score += details.scripts.filter(s => s.hasComplexLogic).length * 3;
        score += details.crossReferences.serviceCallReferences.length * 2;
        score += details.crossReferences.businessObjectReferences.length * 1;
        return Math.round(score);
    }

    /**
     * Get overall validation status
     * @param {Object} validation - Validation object
     * @returns {String} Overall status
     */
    getOverallValidationStatus(validation) {
        const allValidations = [
            ...validation.parameterValidation,
            ...validation.scriptValidation
        ];

        const hasErrors = allValidations.some(v => !v.isValid);
        const hasWarnings = allValidations.some(v => v.warnings.length > 0);

        if (hasErrors) return 'error';
        if (hasWarnings) return 'warning';
        return 'valid';
    }

    /**
     * Identify service dependencies
     * @param {Object} details - Service details
     * @returns {Array} Array of dependencies
     */
    identifyServiceDependencies(details) {
        const dependencies = [];

        // Add parameter type dependencies
        details.crossReferences.parameterTypeReferences.forEach(ref => {
            dependencies.push({
                type: 'parameter_type',
                name: ref.referencedType,
                source: 'parameter',
                parameterName: ref.parameterName,
                direction: ref.parameterDirection
            });
        });

        // Add service call dependencies
        details.crossReferences.serviceCallReferences.forEach(ref => {
            dependencies.push({
                type: 'service_call',
                name: ref.referencedService,
                source: 'script',
                scriptName: ref.scriptName
            });
        });

        // Add business object dependencies
        details.crossReferences.businessObjectReferences.forEach(ref => {
            dependencies.push({
                type: 'business_object',
                name: ref.referencedBusinessObject,
                source: 'script',
                scriptName: ref.scriptName
            });
        });

        return dependencies;
    }
}

module.exports = ToolkitServiceExtractor;