/**
 * Toolkit Validator
 * Comprehensive validation framework for toolkit objects
 */
class ToolkitValidator {
    constructor() {
        this.validationRules = new Map();
        this.validationResults = new Map();
        this.initializeValidationRules();
    }

    /**
     * Initialize default validation rules
     * @private
     */
    initializeValidationRules() {
        // Business Object validation rules
        this.validationRules.set('business_object', [
            this.validateBusinessObjectName,
            this.validateBusinessObjectSchema,
            this.validateBusinessObjectProperties,
            this.validateBusinessObjectNamespace
        ]);

        // CSHS validation rules
        this.validationRules.set('cshs', [
            this.validateCSHSVariables,
            this.validateCSHSElements,
            this.validateCSHSScripts,
            this.validateCSHSReferences
        ]);

        // Service validation rules
        this.validationRules.set('service', [
            this.validateServiceParameters,
            this.validateServiceScripts,
            this.validateServiceReferences,
            this.validateServiceConstraints
        ]);

        // Generic object validation rules
        this.validationRules.set('generic', [
            this.validateObjectBasics,
            this.validateToolkitMetadata,
            this.validateObjectReferences
        ]);
    }

    /**
     * Validate toolkit objects comprehensively
     * @param {Array} toolkitObjects - Array of toolkit objects to validate
     * @returns {Object} Comprehensive validation results
     */
    validateToolkitObjects(toolkitObjects) {
        console.log(`Starting validation of ${toolkitObjects.length} toolkit objects...`);

        const validationResults = {
            summary: {
                totalObjects: toolkitObjects.length,
                validObjects: 0,
                objectsWithWarnings: 0,
                objectsWithErrors: 0,
                validationStarted: new Date().toISOString(),
                validationCompleted: null
            },
            objectResults: [],
            ruleResults: new Map(),
            toolkitResults: new Map()
        };

        // Validate each object
        toolkitObjects.forEach(obj => {
            const objectValidation = this.validateSingleObject(obj);
            validationResults.objectResults.push(objectValidation);

            // Update summary counts
            if (objectValidation.isValid && objectValidation.warnings.length === 0) {
                validationResults.summary.validObjects++;
            } else if (objectValidation.isValid && objectValidation.warnings.length > 0) {
                validationResults.summary.objectsWithWarnings++;
            } else {
                validationResults.summary.objectsWithErrors++;
            }

            // Group results by toolkit
            const toolkitName = obj.toolkitInfo?.name || 'Unknown';
            if (!validationResults.toolkitResults.has(toolkitName)) {
                validationResults.toolkitResults.set(toolkitName, {
                    toolkitName,
                    totalObjects: 0,
                    validObjects: 0,
                    objectsWithWarnings: 0,
                    objectsWithErrors: 0,
                    objects: []
                });
            }

            const toolkitResult = validationResults.toolkitResults.get(toolkitName);
            toolkitResult.totalObjects++;
            toolkitResult.objects.push(objectValidation);

            if (objectValidation.isValid && objectValidation.warnings.length === 0) {
                toolkitResult.validObjects++;
            } else if (objectValidation.isValid && objectValidation.warnings.length > 0) {
                toolkitResult.objectsWithWarnings++;
            } else {
                toolkitResult.objectsWithErrors++;
            }
        });

        validationResults.summary.validationCompleted = new Date().toISOString();
        
        // Store results
        this.validationResults.set('latest', validationResults);

        console.log(`Validation completed: ${validationResults.summary.validObjects} valid, ${validationResults.summary.objectsWithWarnings} with warnings, ${validationResults.summary.objectsWithErrors} with errors`);
        
        return validationResults;
    }

    /**
     * Validate cross-references between objects
     * @param {Array} allObjects - Array of all objects (app + toolkit)
     * @param {Object} typeRegistry - Type registry for reference resolution
     * @returns {Object} Cross-reference validation results
     */
    validateCrossReferences(allObjects, typeRegistry) {
        console.log(`Validating cross-references across ${allObjects.length} objects...`);

        const crossRefValidation = {
            summary: {
                totalReferences: 0,
                validReferences: 0,
                brokenReferences: 0,
                unresolvedReferences: 0
            },
            brokenReferences: [],
            unresolvedReferences: [],
            validationDetails: []
        };

        // Create object lookup map
        const objectMap = new Map();
        allObjects.forEach(obj => {
            objectMap.set(obj.name, obj);
            objectMap.set(obj.id, obj);
            if (obj.typeName && obj.typeName !== obj.name) {
                objectMap.set(obj.typeName, obj);
            }
        });

        allObjects.forEach(obj => {
            const objValidation = {
                objectId: obj.id,
                objectName: obj.name,
                objectType: obj.type,
                toolkitInfo: obj.toolkitInfo,
                references: []
            };

            // Validate business object type references
            if (obj.details?.schema?.properties) {
                obj.details.schema.properties.forEach(property => {
                    if (!property.isSystemType && property.type && property.type !== 'Unknown') {
                        const refValidation = this.validateTypeReference(
                            property.type, 
                            objectMap, 
                            typeRegistry, 
                            obj,
                            `Property: ${property.name}`
                        );
                        objValidation.references.push(refValidation);
                        crossRefValidation.summary.totalReferences++;

                        if (refValidation.isValid) {
                            crossRefValidation.summary.validReferences++;
                        } else if (refValidation.isBroken) {
                            crossRefValidation.summary.brokenReferences++;
                            crossRefValidation.brokenReferences.push(refValidation);
                        } else {
                            crossRefValidation.summary.unresolvedReferences++;
                            crossRefValidation.unresolvedReferences.push(refValidation);
                        }
                    }
                });
            }

            // Validate service references
            if (obj.details?.crossReferences?.serviceReferences) {
                obj.details.crossReferences.serviceReferences.forEach(serviceRef => {
                    const refValidation = this.validateServiceReference(
                        serviceRef.referencedService,
                        objectMap,
                        obj,
                        `${serviceRef.elementType}: ${serviceRef.elementName}`
                    );
                    objValidation.references.push(refValidation);
                    crossRefValidation.summary.totalReferences++;

                    if (refValidation.isValid) {
                        crossRefValidation.summary.validReferences++;
                    } else if (refValidation.isBroken) {
                        crossRefValidation.summary.brokenReferences++;
                        crossRefValidation.brokenReferences.push(refValidation);
                    } else {
                        crossRefValidation.summary.unresolvedReferences++;
                        crossRefValidation.unresolvedReferences.push(refValidation);
                    }
                });
            }

            // Validate variable type references
            if (obj.details?.crossReferences?.variableReferences) {
                obj.details.crossReferences.variableReferences.forEach(varRef => {
                    const refValidation = this.validateTypeReference(
                        varRef.referencedType,
                        objectMap,
                        typeRegistry,
                        obj,
                        `Variable: ${varRef.variableName}`
                    );
                    objValidation.references.push(refValidation);
                    crossRefValidation.summary.totalReferences++;

                    if (refValidation.isValid) {
                        crossRefValidation.summary.validReferences++;
                    } else if (refValidation.isBroken) {
                        crossRefValidation.summary.brokenReferences++;
                        crossRefValidation.brokenReferences.push(refValidation);
                    } else {
                        crossRefValidation.summary.unresolvedReferences++;
                        crossRefValidation.unresolvedReferences.push(refValidation);
                    }
                });
            }

            if (objValidation.references.length > 0) {
                crossRefValidation.validationDetails.push(objValidation);
            }
        });

        console.log(`Cross-reference validation completed: ${crossRefValidation.summary.validReferences} valid, ${crossRefValidation.summary.brokenReferences} broken, ${crossRefValidation.summary.unresolvedReferences} unresolved`);
        
        return crossRefValidation;
    }

    /**
     * Validate business object schemas
     * @param {Array} businessObjects - Array of business objects
     * @returns {Object} Schema validation results
     */
    validateBusinessObjectSchemas(businessObjects) {
        console.log(`Validating schemas for ${businessObjects.length} business objects...`);

        const schemaValidation = {
            summary: {
                totalSchemas: businessObjects.length,
                validSchemas: 0,
                schemasWithWarnings: 0,
                schemasWithErrors: 0
            },
            schemaResults: []
        };

        businessObjects.forEach(obj => {
            if (obj.details?.schema) {
                const validation = this.validateSingleSchema(obj.details.schema, obj);
                schemaValidation.schemaResults.push(validation);

                if (validation.isValid && validation.warnings.length === 0) {
                    schemaValidation.summary.validSchemas++;
                } else if (validation.isValid && validation.warnings.length > 0) {
                    schemaValidation.summary.schemasWithWarnings++;
                } else {
                    schemaValidation.summary.schemasWithErrors++;
                }
            }
        });

        return schemaValidation;
    }

    /**
     * Generate comprehensive validation report
     * @param {Object} validationResults - Results from validation methods
     * @returns {Object} Human-readable validation report
     */
    generateValidationReport(validationResults) {
        const report = {
            executiveSummary: this.generateExecutiveSummary(validationResults),
            detailedFindings: this.generateDetailedFindings(validationResults),
            recommendations: this.generateRecommendations(validationResults),
            actionItems: this.generateActionItems(validationResults),
            generatedAt: new Date().toISOString()
        };

        return report;
    }

    // Private validation methods

    /**
     * Validate a single object
     * @private
     */
    validateSingleObject(obj) {
        const validation = {
            objectId: obj.id,
            objectName: obj.name,
            objectType: obj.type,
            toolkitInfo: obj.toolkitInfo,
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            ruleResults: []
        };

        try {
            // Apply generic validation rules
            const genericRules = this.validationRules.get('generic') || [];
            genericRules.forEach(rule => {
                const result = rule.call(this, obj);
                validation.ruleResults.push(result);
                this.mergeValidationResult(validation, result);
            });

            // Apply type-specific validation rules
            const typeRules = this.getTypeSpecificRules(obj.type);
            typeRules.forEach(rule => {
                const result = rule.call(this, obj);
                validation.ruleResults.push(result);
                this.mergeValidationResult(validation, result);
            });

        } catch (error) {
            validation.isValid = false;
            validation.errors.push(`Validation error: ${error.message}`);
        }

        return validation;
    }

    /**
     * Get type-specific validation rules
     * @private
     */
    getTypeSpecificRules(objectType) {
        if (objectType === 'twClass') {
            return this.validationRules.get('business_object') || [];
        } else if (objectType === 'process') {
            // Determine if it's CSHS or Service based on subType
            return this.validationRules.get('cshs') || [];
        }
        return [];
    }

    /**
     * Merge validation result into main validation object
     * @private
     */
    mergeValidationResult(mainValidation, ruleResult) {
        if (!ruleResult.isValid) {
            mainValidation.isValid = false;
        }
        mainValidation.errors.push(...ruleResult.errors);
        mainValidation.warnings.push(...ruleResult.warnings);
        mainValidation.suggestions.push(...ruleResult.suggestions);
    }

    // Validation rule implementations

    validateObjectBasics(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Object Basics' };

        if (!obj.name || obj.name.trim() === '') {
            result.isValid = false;
            result.errors.push('Object name is missing or empty');
        }

        if (!obj.id || obj.id.trim() === '') {
            result.isValid = false;
            result.errors.push('Object ID is missing or empty');
        }

        if (!obj.type || obj.type.trim() === '') {
            result.warnings.push('Object type is missing or empty');
        }

        return result;
    }

    validateToolkitMetadata(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Toolkit Metadata' };

        if (!obj.toolkitInfo) {
            result.warnings.push('Toolkit information is missing');
        } else {
            if (!obj.toolkitInfo.name) {
                result.warnings.push('Toolkit name is missing');
            }
            if (!obj.toolkitInfo.id) {
                result.warnings.push('Toolkit ID is missing');
            }
        }

        return result;
    }

    validateObjectReferences(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Object References' };

        // This is a placeholder - actual reference validation happens in validateCrossReferences
        if (obj.details?.crossReferences) {
            const totalRefs = Object.values(obj.details.crossReferences).reduce((sum, refs) => sum + (refs?.length || 0), 0);
            if (totalRefs > 10) {
                result.suggestions.push(`Object has ${totalRefs} cross-references - consider reviewing for complexity`);
            }
        }

        return result;
    }

    validateBusinessObjectName(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Business Object Name' };

        if (obj.name && !/^[A-Z][a-zA-Z0-9_]*$/.test(obj.name)) {
            result.warnings.push('Business object name should start with uppercase letter and contain only alphanumeric characters and underscores');
        }

        return result;
    }

    validateBusinessObjectSchema(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Business Object Schema' };

        if (!obj.details?.schema) {
            result.errors.push('Business object schema is missing');
            result.isValid = false;
        } else {
            const schema = obj.details.schema;
            if (!schema.properties || !Array.isArray(schema.properties)) {
                result.errors.push('Schema properties are missing or invalid');
                result.isValid = false;
            } else if (schema.properties.length === 0) {
                result.warnings.push('Business object has no properties defined');
            }
        }

        return result;
    }

    validateBusinessObjectProperties(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Business Object Properties' };

        if (obj.details?.schema?.properties) {
            obj.details.schema.properties.forEach((property, index) => {
                if (!property.name || property.name.trim() === '') {
                    result.errors.push(`Property at index ${index} has missing or empty name`);
                    result.isValid = false;
                }

                if (!property.type || property.type === 'Unknown') {
                    result.warnings.push(`Property '${property.name}' has unknown or missing type`);
                }

                if (property.name && !/^[a-z][a-zA-Z0-9_]*$/.test(property.name)) {
                    result.suggestions.push(`Property '${property.name}' should follow camelCase naming convention`);
                }
            });
        }

        return result;
    }

    validateBusinessObjectNamespace(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Business Object Namespace' };

        if (obj.details?.schema?.namespace === null || obj.details?.schema?.namespace === undefined) {
            result.suggestions.push('Consider defining a namespace for better organization');
        }

        return result;
    }

    validateCSHSVariables(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'CSHS Variables' };

        if (obj.details?.variables) {
            const totalVars = Object.values(obj.details.variables).reduce((sum, vars) => sum + (vars?.length || 0), 0);
            if (totalVars === 0) {
                result.warnings.push('CSHS has no variables defined');
            } else if (totalVars > 20) {
                result.suggestions.push(`CSHS has ${totalVars} variables - consider reviewing for complexity`);
            }
        }

        return result;
    }

    validateCSHSElements(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'CSHS Elements' };

        if (obj.details?.elements) {
            const totalElements = Object.values(obj.details.elements).reduce((sum, elements) => sum + (elements?.length || 0), 0);
            if (totalElements === 0) {
                result.warnings.push('CSHS has no process elements defined');
            }
        }

        return result;
    }

    validateCSHSScripts(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'CSHS Scripts' };

        if (obj.details?.elements?.scriptTasks) {
            obj.details.elements.scriptTasks.forEach(scriptTask => {
                if (!scriptTask.script || scriptTask.script.trim() === '') {
                    result.warnings.push(`Script task '${scriptTask.name}' has empty script`);
                }
            });
        }

        return result;
    }

    validateCSHSReferences(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'CSHS References' };
        // Placeholder for CSHS-specific reference validation
        return result;
    }

    validateServiceParameters(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Service Parameters' };

        if (obj.details?.variables) {
            const inputParams = obj.details.variables.input || [];
            const outputParams = obj.details.variables.output || [];

            if (inputParams.length === 0 && outputParams.length === 0) {
                result.warnings.push('Service has no input or output parameters defined');
            }

            // Validate parameter names
            [...inputParams, ...outputParams].forEach(param => {
                if (param.name && !/^[a-z][a-zA-Z0-9_]*$/.test(param.name)) {
                    result.suggestions.push(`Parameter '${param.name}' should follow camelCase naming convention`);
                }
            });
        }

        return result;
    }

    validateServiceScripts(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Service Scripts' };

        if (obj.details?.scripts) {
            if (obj.details.scripts.length === 0) {
                result.warnings.push('Service has no scripts defined');
            } else {
                obj.details.scripts.forEach(script => {
                    if (!script.script || script.script.trim() === '') {
                        result.warnings.push(`Script '${script.name}' is empty`);
                    }
                });
            }
        }

        return result;
    }

    validateServiceReferences(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Service References' };
        // Placeholder for service-specific reference validation
        return result;
    }

    validateServiceConstraints(obj) {
        const result = { isValid: true, errors: [], warnings: [], suggestions: [], ruleName: 'Service Constraints' };
        // Placeholder for service constraint validation
        return result;
    }

    // Reference validation helpers

    validateTypeReference(typeName, objectMap, typeRegistry, sourceObj, context) {
        const validation = {
            referencedType: typeName,
            context,
            sourceObject: {
                id: sourceObj.id,
                name: sourceObj.name,
                toolkitInfo: sourceObj.toolkitInfo
            },
            isValid: false,
            isBroken: false,
            isResolved: false,
            targetObject: null,
            validationMessage: ''
        };

        // Check if type exists in object map
        if (objectMap.has(typeName)) {
            validation.isValid = true;
            validation.isResolved = true;
            validation.targetObject = objectMap.get(typeName);
            validation.validationMessage = 'Reference resolved successfully';
        } else if (typeRegistry && typeRegistry.hasType && typeRegistry.hasType(typeName)) {
            // Check if type exists in type registry
            validation.isValid = true;
            validation.isResolved = true;
            validation.validationMessage = 'Reference resolved via type registry';
        } else {
            // Type not found
            validation.isBroken = true;
            validation.validationMessage = `Referenced type '${typeName}' not found`;
        }

        return validation;
    }

    validateServiceReference(serviceName, objectMap, sourceObj, context) {
        const validation = {
            referencedService: serviceName,
            context,
            sourceObject: {
                id: sourceObj.id,
                name: sourceObj.name,
                toolkitInfo: sourceObj.toolkitInfo
            },
            isValid: false,
            isBroken: false,
            isResolved: false,
            targetObject: null,
            validationMessage: ''
        };

        // Check if service exists in object map
        if (objectMap.has(serviceName)) {
            const targetObj = objectMap.get(serviceName);
            if (targetObj.type === 'process' && (targetObj.subType === '12' || targetObj.subType === '10')) {
                validation.isValid = true;
                validation.isResolved = true;
                validation.targetObject = targetObj;
                validation.validationMessage = 'Service reference resolved successfully';
            } else {
                validation.isBroken = true;
                validation.validationMessage = `Referenced object '${serviceName}' is not a service or CSHS`;
            }
        } else {
            validation.isBroken = true;
            validation.validationMessage = `Referenced service '${serviceName}' not found`;
        }

        return validation;
    }

    validateSingleSchema(schema, obj) {
        const validation = {
            objectId: obj.id,
            objectName: obj.name,
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        if (!schema.name || schema.name.trim() === '') {
            validation.errors.push('Schema name is missing or empty');
            validation.isValid = false;
        }

        if (!schema.properties || !Array.isArray(schema.properties)) {
            validation.errors.push('Schema properties are missing or invalid');
            validation.isValid = false;
        } else {
            schema.properties.forEach((property, index) => {
                if (!property.name || property.name.trim() === '') {
                    validation.errors.push(`Property at index ${index} has missing or empty name`);
                    validation.isValid = false;
                }

                if (!property.type || property.type === 'Unknown') {
                    validation.warnings.push(`Property '${property.name}' has unknown or missing type`);
                }
            });
        }

        return validation;
    }

    // Report generation methods

    generateExecutiveSummary(validationResults) {
        return {
            totalObjectsValidated: validationResults.summary?.totalObjects || 0,
            overallHealthScore: this.calculateHealthScore(validationResults),
            criticalIssues: this.extractCriticalIssues(validationResults),
            recommendedActions: this.getTopRecommendations(validationResults)
        };
    }

    generateDetailedFindings(validationResults) {
        return {
            objectValidation: validationResults.objectResults || [],
            crossReferenceValidation: validationResults.crossReferenceValidation || {},
            schemaValidation: validationResults.schemaValidation || {}
        };
    }

    generateRecommendations(validationResults) {
        const recommendations = [];
        
        if (validationResults.summary?.objectsWithErrors > 0) {
            recommendations.push({
                priority: 'high',
                category: 'errors',
                message: `Fix ${validationResults.summary.objectsWithErrors} objects with validation errors`,
                impact: 'Critical functionality may be affected'
            });
        }

        if (validationResults.summary?.objectsWithWarnings > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'warnings',
                message: `Review ${validationResults.summary.objectsWithWarnings} objects with warnings`,
                impact: 'Best practices and maintainability improvements'
            });
        }

        return recommendations;
    }

    generateActionItems(validationResults) {
        const actionItems = [];
        
        // Extract specific action items from validation results
        if (validationResults.objectResults) {
            validationResults.objectResults.forEach(objResult => {
                if (!objResult.isValid) {
                    actionItems.push({
                        objectId: objResult.objectId,
                        objectName: objResult.objectName,
                        action: 'Fix validation errors',
                        errors: objResult.errors,
                        priority: 'high'
                    });
                }
            });
        }

        return actionItems;
    }

    calculateHealthScore(validationResults) {
        const total = validationResults.summary?.totalObjects || 1;
        const valid = validationResults.summary?.validObjects || 0;
        return Math.round((valid / total) * 100);
    }

    extractCriticalIssues(validationResults) {
        const issues = [];
        
        if (validationResults.objectResults) {
            validationResults.objectResults.forEach(objResult => {
                if (!objResult.isValid) {
                    issues.push({
                        objectName: objResult.objectName,
                        errors: objResult.errors
                    });
                }
            });
        }

        return issues.slice(0, 5); // Top 5 critical issues
    }

    getTopRecommendations(validationResults) {
        return [
            'Fix all validation errors to ensure proper functionality',
            'Review and address validation warnings for best practices',
            'Validate cross-references to prevent runtime issues'
        ];
    }
}

module.exports = ToolkitValidator;