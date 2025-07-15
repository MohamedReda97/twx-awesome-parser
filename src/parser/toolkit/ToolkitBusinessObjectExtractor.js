const BusinessObjectSchemaParser = require('../business-object-schema-parser');

/**
 * Enhanced Business Object extractor for toolkit objects
 * Provides comprehensive schema parsing and cross-toolkit type resolution
 */
class ToolkitBusinessObjectExtractor {
    constructor() {
        this.businessObjectParser = new BusinessObjectSchemaParser();
    }

    /**
     * Extract enhanced business object details for toolkit objects
     * @param {Object} twClassElement - Business Object XML element
     * @param {Object} baseObject - Base object to add details to
     * @param {Object} toolkitInfo - Toolkit metadata information
     */
    extractToolkitBusinessObjectDetails(twClassElement, baseObject, toolkitInfo) {
        try {
            // Extract jsonData which contains the schema structure
            const jsonData = twClassElement.jsonData;

            if (jsonData) {
                // Parse the schema using our business object parser
                const schema = this.businessObjectParser.parseSchema(jsonData, baseObject.id, baseObject.name);

                // Enhance schema with toolkit-specific information
                schema.toolkitInfo = {
                    toolkitName: toolkitInfo.name,
                    toolkitShortName: toolkitInfo.shortName,
                    toolkitId: toolkitInfo.id,
                    isSystemToolkit: toolkitInfo.isSystem,
                    fileName: toolkitInfo.fileName
                };

                // Add schema information to details
                baseObject.details.schema = schema;
                baseObject.hasDetails = true;

                // Add enhanced summary information for quick display
                baseObject.details.summary = {
                    totalProperties: schema.properties.length,
                    systemTypes: schema.systemTypesCount,
                    customTypes: schema.customTypesCount,
                    hasComplexTypes: schema.hasComplexTypes,
                    namespace: schema.namespace,
                    toolkitSource: toolkitInfo.name,
                    crossToolkitReferences: this.identifyCrossToolkitReferences(schema)
                };

                // Register this type in the toolkit type registry
                this.registerToolkitBusinessObjectType(baseObject.name, baseObject.id, schema, schema.namespace, toolkitInfo);

                console.log(`Extracted enhanced toolkit schema for ${baseObject.name} from ${toolkitInfo.name}: ${schema.properties.length} properties`);
            } else {
                // No jsonData available, try to extract from definition structure
                baseObject.details.schema = this.extractDefinitionBasedSchema(twClassElement, baseObject.id, baseObject.name, toolkitInfo);
                baseObject.hasDetails = !!baseObject.details.schema.properties.length;
            }

            // Add toolkit-specific metadata to the object
            baseObject.details.toolkitMetadata = {
                sourceToolkit: toolkitInfo.name,
                toolkitVersion: toolkitInfo.version || 'Unknown',
                isSystemToolkit: toolkitInfo.isSystem,
                extractedAt: new Date().toISOString()
            };

        } catch (error) {
            console.warn(`Error extracting toolkit business object details for ${baseObject.name} from ${toolkitInfo.name}:`, error.message);
            baseObject.details.error = error.message;
            baseObject.details.toolkitError = {
                toolkit: toolkitInfo.name,
                errorType: 'extraction_error',
                message: error.message
            };
        }
    }

    /**
     * Resolve toolkit type references for cross-toolkit dependencies
     * @param {Object} schema - Schema object with potential cross-toolkit references
     * @param {Object} toolkitRegistry - Registry containing all toolkit types
     * @returns {Object} Schema with resolved cross-toolkit references
     */
    resolveToolkitTypeReferences(schema, toolkitRegistry) {
        if (!schema || !schema.properties) {
            return schema;
        }

        const resolvedSchema = { ...schema };
        resolvedSchema.properties = schema.properties.map(property => {
            const resolvedProperty = { ...property };

            // Check if this property references a custom type that might be in another toolkit
            if (!property.isSystemType && property.type && property.type !== 'Unknown') {
                const typeReference = toolkitRegistry.resolveToolkitTypeReference(property.type, schema.toolkitInfo?.toolkitId);
                
                if (typeReference) {
                    resolvedProperty.resolvedType = {
                        typeName: typeReference.typeName,
                        sourceToolkit: typeReference.toolkitInfo?.toolkitName,
                        toolkitId: typeReference.toolkitInfo?.toolkitId,
                        isResolved: true
                    };
                    
                    // Mark as cross-toolkit reference if from different toolkit
                    if (typeReference.toolkitInfo?.toolkitId !== schema.toolkitInfo?.toolkitId) {
                        resolvedProperty.isCrossToolkitReference = true;
                        resolvedProperty.crossToolkitInfo = {
                            sourceToolkit: schema.toolkitInfo?.toolkitName,
                            targetToolkit: typeReference.toolkitInfo?.toolkitName,
                            referenceType: 'business_object_type'
                        };
                    }
                } else {
                    // Mark as unresolved reference
                    resolvedProperty.resolvedType = {
                        typeName: property.type,
                        isResolved: false,
                        error: 'Type not found in toolkit registry'
                    };
                }
            }

            return resolvedProperty;
        });

        // Update cross-toolkit reference count
        resolvedSchema.crossToolkitReferenceCount = resolvedSchema.properties.filter(p => p.isCrossToolkitReference).length;

        return resolvedSchema;
    }

    /**
     * Identify cross-toolkit references in a schema
     * @param {Object} schema - Schema to analyze
     * @returns {Array} Array of cross-toolkit reference information
     */
    identifyCrossToolkitReferences(schema) {
        if (!schema || !schema.properties) {
            return [];
        }

        const crossReferences = [];
        
        schema.properties.forEach(property => {
            if (!property.isSystemType && property.type && property.type !== 'Unknown') {
                // This is a potential cross-toolkit reference
                crossReferences.push({
                    propertyName: property.name,
                    referencedType: property.type,
                    namespace: property.namespace || schema.namespace,
                    isArray: property.isArray || false
                });
            }
        });

        return crossReferences;
    }

    /**
     * Register a toolkit business object type for cross-referencing
     * @param {string} typeName - Name of the business object type
     * @param {string} typeId - ID of the business object
     * @param {Object} schema - Schema structure
     * @param {string} namespace - Type namespace
     * @param {Object} toolkitInfo - Toolkit information
     */
    registerToolkitBusinessObjectType(typeName, typeId, schema, namespace, toolkitInfo) {
        const typeRegistry = require('../../utils/business-object-type-registry');
        
        // Enhanced registration with toolkit information
        const enhancedSchema = {
            ...schema,
            toolkitInfo: {
                toolkitName: toolkitInfo.name,
                toolkitShortName: toolkitInfo.shortName,
                toolkitId: toolkitInfo.id,
                isSystemToolkit: toolkitInfo.isSystem,
                fileName: toolkitInfo.fileName
            }
        };

        typeRegistry.registerType(typeName, typeId, enhancedSchema, namespace);
    }

    /**
     * Extract schema from definition structure for toolkit objects (fallback)
     * @param {Object} twClassElement - Business Object XML element
     * @param {string} objectId - Object ID
     * @param {string} objectName - Object name
     * @param {Object} toolkitInfo - Toolkit information
     * @returns {Object} Basic schema structure with toolkit info
     */
    extractDefinitionBasedSchema(twClassElement, objectId, objectName, toolkitInfo) {
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
            toolkitInfo: {
                toolkitName: toolkitInfo.name,
                toolkitShortName: toolkitInfo.shortName,
                toolkitId: toolkitInfo.id,
                isSystemToolkit: toolkitInfo.isSystem,
                fileName: toolkitInfo.fileName
            }
        };

        try {
            // Extract from definition/property structure
            if (twClassElement.definition && twClassElement.definition.property) {
                const properties = Array.isArray(twClassElement.definition.property) 
                    ? twClassElement.definition.property 
                    : [twClassElement.definition.property];

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
                            toolkitSource: toolkitInfo.name
                        });
                    }
                }
            }
        } catch (error) {
            console.warn(`Error extracting definition-based schema for ${objectName} from toolkit ${toolkitInfo.name}:`, error.message);
        }

        return schema;
    }

    /**
     * Validate business object schema for toolkit objects
     * @param {Object} schema - Schema to validate
     * @returns {Object} Validation results
     */
    validateBusinessObjectSchema(schema) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: [],
            suggestions: []
        };

        if (!schema) {
            validation.isValid = false;
            validation.errors.push('Schema is null or undefined');
            return validation;
        }

        // Validate basic schema structure
        if (!schema.name || schema.name.trim() === '') {
            validation.errors.push('Business object name is missing or empty');
            validation.isValid = false;
        }

        if (!schema.properties || !Array.isArray(schema.properties)) {
            validation.errors.push('Schema properties are missing or invalid');
            validation.isValid = false;
        }

        // Validate properties
        if (schema.properties) {
            schema.properties.forEach((property, index) => {
                if (!property.name || property.name.trim() === '') {
                    validation.errors.push(`Property at index ${index} has missing or empty name`);
                    validation.isValid = false;
                }

                if (!property.type || property.type === 'Unknown') {
                    validation.warnings.push(`Property '${property.name}' has unknown or missing type`);
                }

                // Check for potential cross-toolkit reference issues
                if (!property.isSystemType && property.type && !property.resolvedType) {
                    validation.suggestions.push(`Property '${property.name}' may need cross-toolkit type resolution`);
                }
            });
        }

        // Validate toolkit information
        if (!schema.toolkitInfo) {
            validation.warnings.push('Toolkit information is missing from schema');
        } else {
            if (!schema.toolkitInfo.toolkitName) {
                validation.warnings.push('Toolkit name is missing from schema');
            }
        }

        // Check for circular references (basic check)
        if (schema.properties) {
            const typeNames = schema.properties.map(p => p.type).filter(t => t && t !== 'Unknown');
            const duplicateTypes = typeNames.filter((type, index) => typeNames.indexOf(type) !== index);
            if (duplicateTypes.length > 0) {
                validation.warnings.push(`Potential circular references detected: ${duplicateTypes.join(', ')}`);
            }
        }

        return validation;
    }
}

module.exports = ToolkitBusinessObjectExtractor;