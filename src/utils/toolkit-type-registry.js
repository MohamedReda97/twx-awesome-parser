const BusinessObjectTypeRegistry = require('./business-object-type-registry');

/**
 * Enhanced Type Registry for Toolkit Objects
 * Extends the base BusinessObjectTypeRegistry with toolkit-specific functionality
 */
class ToolkitTypeRegistry {
    constructor() {
        this.baseRegistry = BusinessObjectTypeRegistry;
        this.toolkitTypes = new Map(); // toolkit-specific type storage
        this.toolkitDependencies = new Map(); // toolkit dependency mappings
        this.circularReferences = new Set(); // circular reference tracking
        this.crossToolkitReferences = new Map(); // cross-toolkit reference tracking
    }

    /**
     * Register a toolkit type with enhanced metadata
     * @param {string} typeName - Name of the business object type
     * @param {string} typeId - ID of the business object
     * @param {Object} schema - Schema structure
     * @param {string} namespace - Type namespace
     * @param {Object} toolkitInfo - Toolkit metadata
     */
    registerToolkitType(typeName, typeId, schema, namespace, toolkitInfo) {
        try {
            // Create enhanced schema with toolkit information
            const enhancedSchema = {
                ...schema,
                toolkitInfo: {
                    toolkitName: toolkitInfo.name,
                    toolkitShortName: toolkitInfo.shortName,
                    toolkitId: toolkitInfo.id,
                    isSystemToolkit: toolkitInfo.isSystem,
                    fileName: toolkitInfo.fileName,
                    registeredAt: new Date().toISOString()
                },
                registryMetadata: {
                    typeId,
                    namespace,
                    registrationSource: 'toolkit',
                    crossReferences: this.extractCrossReferences(schema)
                }
            };

            // Register with base registry
            this.baseRegistry.registerType(typeName, typeId, enhancedSchema, namespace);

            // Store in toolkit-specific registry
            const toolkitKey = `${toolkitInfo.id}:${typeName}`;
            this.toolkitTypes.set(toolkitKey, {
                typeName,
                typeId,
                schema: enhancedSchema,
                namespace,
                toolkitInfo
            });

            // Track toolkit dependencies
            this.updateToolkitDependencies(toolkitInfo.id, enhancedSchema.registryMetadata.crossReferences);

            // Track cross-toolkit references
            this.trackCrossToolkitReferences(typeName, toolkitInfo.id, enhancedSchema.registryMetadata.crossReferences);

            console.log(`Registered toolkit type: ${typeName} from toolkit ${toolkitInfo.name}`);

        } catch (error) {
            console.error(`Error registering toolkit type ${typeName} from ${toolkitInfo.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Resolve toolkit type reference with cross-toolkit support
     * @param {string} typeName - Name of the type to resolve
     * @param {string} sourceToolkitId - ID of the toolkit making the reference
     * @returns {Object|null} Resolved type information
     */
    resolveToolkitTypeReference(typeName, sourceToolkitId) {
        try {
            // First try to resolve within the same toolkit
            const sameToolkitKey = `${sourceToolkitId}:${typeName}`;
            if (this.toolkitTypes.has(sameToolkitKey)) {
                const resolved = this.toolkitTypes.get(sameToolkitKey);
                return {
                    ...resolved,
                    resolutionType: 'same_toolkit',
                    resolvedAt: new Date().toISOString()
                };
            }

            // Try to resolve from base registry (includes all registered types)
            const baseResolution = this.baseRegistry.resolveType(typeName);
            if (baseResolution) {
                // Check if this is a cross-toolkit reference
                const isCrossToolkit = baseResolution.toolkitInfo &&
                    baseResolution.toolkitInfo.toolkitId !== sourceToolkitId;

                return {
                    typeName,
                    typeId: baseResolution.id,
                    schema: baseResolution,
                    toolkitInfo: baseResolution.toolkitInfo,
                    resolutionType: isCrossToolkit ? 'cross_toolkit' : 'same_toolkit',
                    resolvedAt: new Date().toISOString(),
                    isCrossToolkitReference: isCrossToolkit
                };
            }

            // Try to find in any toolkit (fallback)
            for (const [key, typeInfo] of this.toolkitTypes.entries()) {
                if (typeInfo.typeName === typeName) {
                    const isCrossToolkit = typeInfo.toolkitInfo.toolkitId !== sourceToolkitId;
                    return {
                        ...typeInfo,
                        resolutionType: isCrossToolkit ? 'cross_toolkit' : 'same_toolkit',
                        resolvedAt: new Date().toISOString(),
                        isCrossToolkitReference: isCrossToolkit
                    };
                }
            }

            // Type not found
            console.warn(`Type '${typeName}' not found in toolkit registry for source toolkit ${sourceToolkitId}`);
            return null;

        } catch (error) {
            console.error(`Error resolving toolkit type reference ${typeName}:`, error.message);
            return null;
        }
    }

    /**
     * Get toolkit dependencies for a specific toolkit
     * @param {string} toolkitId - ID of the toolkit
     * @returns {Array} Array of dependency information
     */
    getToolkitDependencies(toolkitId) {
        const dependencies = this.toolkitDependencies.get(toolkitId) || [];
        return dependencies.map(dep => ({
            ...dep,
            retrievedAt: new Date().toISOString()
        }));
    }

    /**
     * Detect circular dependencies in toolkit type references
     * @returns {Array} Array of circular dependency chains
     */
    detectCircularDependencies() {
        const circularChains = [];
        const visited = new Set();
        const recursionStack = new Set();

        // Check each toolkit type for circular references
        for (const [key, typeInfo] of this.toolkitTypes.entries()) {
            if (!visited.has(key)) {
                const chain = this.detectCircularDependenciesRecursive(
                    key,
                    typeInfo,
                    visited,
                    recursionStack,
                    []
                );
                if (chain.length > 0) {
                    circularChains.push(chain);
                }
            }
        }

        // Mark detected circular references
        circularChains.forEach(chain => {
            chain.forEach(item => {
                this.circularReferences.add(item.typeName);
            });
        });

        return circularChains;
    }

    /**
     * Recursive helper for circular dependency detection
     * @private
     */
    detectCircularDependenciesRecursive(key, typeInfo, visited, recursionStack, currentChain) {
        visited.add(key);
        recursionStack.add(key);
        currentChain.push({
            typeName: typeInfo.typeName,
            toolkitId: typeInfo.toolkitInfo.toolkitId,
            toolkitName: typeInfo.toolkitInfo.toolkitName
        });

        // Check all cross-references from this type
        const crossRefs = typeInfo.schema.registryMetadata?.crossReferences || [];
        for (const crossRef of crossRefs) {
            // Try to find the referenced type
            const referencedKey = this.findTypeKey(crossRef.referencedType);
            if (referencedKey) {
                if (recursionStack.has(referencedKey)) {
                    // Circular dependency found
                    const circularChain = [...currentChain];
                    const referencedType = this.toolkitTypes.get(referencedKey);
                    circularChain.push({
                        typeName: referencedType.typeName,
                        toolkitId: referencedType.toolkitInfo.toolkitId,
                        toolkitName: referencedType.toolkitInfo.toolkitName
                    });
                    return circularChain;
                }

                if (!visited.has(referencedKey)) {
                    const referencedTypeInfo = this.toolkitTypes.get(referencedKey);
                    const result = this.detectCircularDependenciesRecursive(
                        referencedKey,
                        referencedTypeInfo,
                        visited,
                        recursionStack,
                        [...currentChain]
                    );
                    if (result.length > 0) {
                        return result;
                    }
                }
            }
        }

        recursionStack.delete(key);
        currentChain.pop();
        return [];
    }

    /**
     * Get all types from a specific toolkit
     * @param {string} toolkitId - ID of the toolkit
     * @returns {Array} Array of types from the toolkit
     */
    getToolkitTypes(toolkitId) {
        const types = [];
        for (const [key, typeInfo] of this.toolkitTypes.entries()) {
            if (typeInfo.toolkitInfo.toolkitId === toolkitId) {
                types.push({
                    ...typeInfo,
                    retrievedAt: new Date().toISOString()
                });
            }
        }
        return types;
    }

    /**
     * Get cross-toolkit references
     * @returns {Array} Array of cross-toolkit reference information
     */
    getCrossToolkitReferences() {
        const references = [];
        for (const [sourceType, refs] of this.crossToolkitReferences.entries()) {
            references.push({
                sourceType,
                references: refs,
                retrievedAt: new Date().toISOString()
            });
        }
        return references;
    }

    /**
     * Get registry statistics
     * @returns {Object} Statistics about the toolkit registry
     */
    getToolkitRegistryStats() {
        const baseStats = this.baseRegistry.getStats();
        const toolkitStats = {
            totalToolkitTypes: this.toolkitTypes.size,
            totalToolkits: new Set(Array.from(this.toolkitTypes.values()).map(t => t.toolkitInfo.toolkitId)).size,
            circularReferences: this.circularReferences.size,
            crossToolkitReferences: this.crossToolkitReferences.size,
            toolkitDependencies: this.toolkitDependencies.size
        };

        return {
            ...baseStats,
            toolkit: toolkitStats,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Clear toolkit-specific registry data
     */
    clearToolkitRegistry() {
        this.toolkitTypes.clear();
        this.toolkitDependencies.clear();
        this.circularReferences.clear();
        this.crossToolkitReferences.clear();
        console.log('Toolkit registry cleared');
    }

    // Private helper methods

    /**
     * Extract cross-references from schema
     * @private
     */
    extractCrossReferences(schema) {
        const crossRefs = [];
        if (schema.properties) {
            schema.properties.forEach(property => {
                if (!property.isSystemType && property.type && property.type !== 'Unknown') {
                    crossRefs.push({
                        propertyName: property.name,
                        referencedType: property.type,
                        isArray: property.isArray || false,
                        namespace: property.namespace
                    });
                }
            });
        }
        return crossRefs;
    }

    /**
     * Update toolkit dependencies
     * @private
     */
    updateToolkitDependencies(toolkitId, crossReferences) {
        if (!this.toolkitDependencies.has(toolkitId)) {
            this.toolkitDependencies.set(toolkitId, []);
        }

        const dependencies = this.toolkitDependencies.get(toolkitId);
        crossReferences.forEach(crossRef => {
            // Check if this dependency already exists
            const exists = dependencies.some(dep =>
                dep.referencedType === crossRef.referencedType &&
                dep.propertyName === crossRef.propertyName
            );

            if (!exists) {
                dependencies.push({
                    ...crossRef,
                    addedAt: new Date().toISOString()
                });
            }
        });
    }

    /**
     * Track cross-toolkit references
     * @private
     */
    trackCrossToolkitReferences(typeName, toolkitId, crossReferences) {
        crossReferences.forEach(crossRef => {
            // Check if the referenced type is from a different toolkit
            const referencedTypeInfo = this.findTypeInfo(crossRef.referencedType);
            if (referencedTypeInfo && referencedTypeInfo.toolkitInfo.toolkitId !== toolkitId) {
                const key = `${toolkitId}:${typeName}`;
                if (!this.crossToolkitReferences.has(key)) {
                    this.crossToolkitReferences.set(key, []);
                }

                this.crossToolkitReferences.get(key).push({
                    sourceToolkit: toolkitId,
                    targetToolkit: referencedTypeInfo.toolkitInfo.toolkitId,
                    referencedType: crossRef.referencedType,
                    propertyName: crossRef.propertyName,
                    trackedAt: new Date().toISOString()
                });
            }
        });
    }

    /**
     * Find type key by type name
     * @private
     */
    findTypeKey(typeName) {
        for (const [key, typeInfo] of this.toolkitTypes.entries()) {
            if (typeInfo.typeName === typeName) {
                return key;
            }
        }
        return null;
    }

    /**
     * Find type info by type name
     * @private
     */
    findTypeInfo(typeName) {
        for (const [key, typeInfo] of this.toolkitTypes.entries()) {
            if (typeInfo.typeName === typeName) {
                return typeInfo;
            }
        }
        return null;
    }

    /**
     * Check if a type has circular references
     * @param {string} typeName - Name of the type
     * @returns {boolean} True if type has circular references
     */
    hasCircularReference(typeName) {
        return this.circularReferences.has(typeName);
    }

    /**
     * Mark a type as having circular references
     * @param {string} typeName - Name of the type
     */
    markCircularReference(typeName) {
        this.circularReferences.add(typeName);
        console.log(`Marked type '${typeName}' as having circular references`);
    }

    /**
     * Get types by namespace across all toolkits
     * @param {string} namespace - Namespace to search
     * @returns {Array} Array of types in the namespace
     */
    getTypesByNamespace(namespace) {
        const types = [];
        for (const [key, typeInfo] of this.toolkitTypes.entries()) {
            if (typeInfo.namespace === namespace) {
                types.push({
                    ...typeInfo,
                    retrievedAt: new Date().toISOString()
                });
            }
        }
        return types;
    }

    /**
     * Check if a type exists in the registry
     * @param {string} typeName - Name of the type
     * @returns {boolean} True if type exists
     */
    hasType(typeName) {
        return this.baseRegistry.hasType(typeName) || this.findTypeKey(typeName) !== null;
    }
}

// Create singleton instance
const toolkitTypeRegistry = new ToolkitTypeRegistry();

module.exports = toolkitTypeRegistry;