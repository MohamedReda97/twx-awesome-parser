/**
 * Toolkit Dependency Mapper
 * Maps and analyzes dependencies between applications, toolkits, and their objects
 */
class ToolkitDependencyMapper {
    constructor() {
        this.dependencies = new Map(); // All dependency mappings
        this.applicationToToolkitDeps = new Map(); // App -> Toolkit dependencies
        this.toolkitToToolkitDeps = new Map(); // Toolkit -> Toolkit dependencies
        this.objectDependencies = new Map(); // Object-level dependencies
        this.unusedObjects = new Set(); // Objects with no dependencies
        this.dependencyGraph = null; // Cached dependency graph
    }

    /**
     * Map dependencies from application objects to toolkit objects
     * @param {Array} appObjects - Array of application objects
     * @param {Array} toolkitObjects - Array of toolkit objects
     * @returns {Array} Array of application-to-toolkit dependencies
     */
    mapApplicationToToolkitDependencies(appObjects, toolkitObjects) {
        console.log(`Mapping dependencies: ${appObjects.length} app objects -> ${toolkitObjects.length} toolkit objects`);
        
        const dependencies = [];
        const toolkitObjectMap = this.createObjectMap(toolkitObjects);

        appObjects.forEach(appObject => {
            const appDependencies = this.extractObjectDependencies(appObject, toolkitObjectMap, 'application_to_toolkit');
            dependencies.push(...appDependencies);

            // Store in application-to-toolkit mapping
            if (appDependencies.length > 0) {
                this.applicationToToolkitDeps.set(appObject.id, appDependencies);
            }
        });

        console.log(`Found ${dependencies.length} application-to-toolkit dependencies`);
        return dependencies;
    }

    /**
     * Map dependencies between toolkit objects
     * @param {Array} toolkits - Array of toolkit information with objects
     * @returns {Array} Array of toolkit-to-toolkit dependencies
     */
    mapToolkitToToolkitDependencies(toolkits) {
        console.log(`Mapping inter-toolkit dependencies across ${toolkits.length} toolkits`);
        
        const dependencies = [];
        const allToolkitObjects = toolkits.flatMap(toolkit => toolkit.objects || []);
        const toolkitObjectMap = this.createObjectMap(allToolkitObjects);

        // Group objects by toolkit for easier processing
        const objectsByToolkit = new Map();
        toolkits.forEach(toolkit => {
            objectsByToolkit.set(toolkit.metadata.project.id, toolkit.objects || []);
        });

        // Check dependencies between different toolkits
        for (const [sourceToolkitId, sourceObjects] of objectsByToolkit.entries()) {
            sourceObjects.forEach(sourceObject => {
                const objectDependencies = this.extractObjectDependencies(
                    sourceObject, 
                    toolkitObjectMap, 
                    'toolkit_to_toolkit'
                );

                // Filter to only cross-toolkit dependencies
                const crossToolkitDeps = objectDependencies.filter(dep => 
                    dep.targetObject.toolkitInfo?.id !== sourceToolkitId
                );

                dependencies.push(...crossToolkitDeps);

                // Store in toolkit-to-toolkit mapping
                if (crossToolkitDeps.length > 0) {
                    if (!this.toolkitToToolkitDeps.has(sourceToolkitId)) {
                        this.toolkitToToolkitDeps.set(sourceToolkitId, []);
                    }
                    this.toolkitToToolkitDeps.get(sourceToolkitId).push(...crossToolkitDeps);
                }
            });
        }

        console.log(`Found ${dependencies.length} toolkit-to-toolkit dependencies`);
        return dependencies;
    }

    /**
     * Generate comprehensive dependency graph
     * @returns {Object} Dependency graph structure
     */
    generateDependencyGraph() {
        const graph = {
            nodes: [],
            edges: [],
            statistics: {
                totalNodes: 0,
                totalEdges: 0,
                applicationNodes: 0,
                toolkitNodes: 0,
                crossToolkitEdges: 0,
                applicationToToolkitEdges: 0
            },
            generatedAt: new Date().toISOString()
        };

        // Collect all unique objects as nodes
        const nodeMap = new Map();
        
        // Add nodes from all dependencies
        for (const [key, deps] of this.dependencies.entries()) {
            deps.forEach(dep => {
                // Add source node
                if (!nodeMap.has(dep.sourceObject.id)) {
                    const sourceNode = {
                        id: dep.sourceObject.id,
                        name: dep.sourceObject.name,
                        type: dep.sourceObject.type,
                        source: dep.sourceObject.source,
                        toolkitInfo: dep.sourceObject.toolkitInfo,
                        nodeType: dep.sourceObject.source === 'application' ? 'application' : 'toolkit'
                    };
                    nodeMap.set(dep.sourceObject.id, sourceNode);
                    graph.nodes.push(sourceNode);
                }

                // Add target node
                if (!nodeMap.has(dep.targetObject.id)) {
                    const targetNode = {
                        id: dep.targetObject.id,
                        name: dep.targetObject.name,
                        type: dep.targetObject.type,
                        source: dep.targetObject.source,
                        toolkitInfo: dep.targetObject.toolkitInfo,
                        nodeType: dep.targetObject.source === 'application' ? 'application' : 'toolkit'
                    };
                    nodeMap.set(dep.targetObject.id, targetNode);
                    graph.nodes.push(targetNode);
                }

                // Add edge
                const edge = {
                    id: `${dep.sourceObject.id}->${dep.targetObject.id}`,
                    source: dep.sourceObject.id,
                    target: dep.targetObject.id,
                    dependencyType: dep.dependencyType,
                    strength: dep.strength,
                    validationStatus: dep.validationStatus,
                    edgeType: this.determineEdgeType(dep.sourceObject.source, dep.targetObject.source)
                };
                graph.edges.push(edge);
            });
        }

        // Calculate statistics
        graph.statistics.totalNodes = graph.nodes.length;
        graph.statistics.totalEdges = graph.edges.length;
        graph.statistics.applicationNodes = graph.nodes.filter(n => n.nodeType === 'application').length;
        graph.statistics.toolkitNodes = graph.nodes.filter(n => n.nodeType === 'toolkit').length;
        graph.statistics.crossToolkitEdges = graph.edges.filter(e => e.edgeType === 'toolkit_to_toolkit').length;
        graph.statistics.applicationToToolkitEdges = graph.edges.filter(e => e.edgeType === 'application_to_toolkit').length;

        this.dependencyGraph = graph;
        console.log(`Generated dependency graph: ${graph.statistics.totalNodes} nodes, ${graph.statistics.totalEdges} edges`);
        
        return graph;
    }

    /**
     * Identify unused toolkit objects
     * @param {Array} dependencies - Array of all dependencies
     * @returns {Array} Array of unused toolkit objects
     */
    identifyUnusedToolkitObjects(dependencies) {
        console.log('Identifying unused toolkit objects...');
        
        const usedObjectIds = new Set();
        
        // Collect all target object IDs (objects that are being used)
        dependencies.forEach(dep => {
            usedObjectIds.add(dep.targetObject.id);
        });

        // Find toolkit objects that are not in the used set
        const unusedObjects = [];
        
        // Check application-to-toolkit dependencies
        for (const [appId, deps] of this.applicationToToolkitDeps.entries()) {
            deps.forEach(dep => {
                if (!usedObjectIds.has(dep.targetObject.id)) {
                    unusedObjects.push({
                        ...dep.targetObject,
                        unusedType: 'not_referenced_by_application',
                        identifiedAt: new Date().toISOString()
                    });
                }
            });
        }

        // Check toolkit-to-toolkit dependencies
        for (const [toolkitId, deps] of this.toolkitToToolkitDeps.entries()) {
            deps.forEach(dep => {
                if (!usedObjectIds.has(dep.targetObject.id)) {
                    unusedObjects.push({
                        ...dep.targetObject,
                        unusedType: 'not_referenced_by_other_toolkits',
                        identifiedAt: new Date().toISOString()
                    });
                }
            });
        }

        // Remove duplicates
        const uniqueUnusedObjects = unusedObjects.filter((obj, index, arr) => 
            arr.findIndex(o => o.id === obj.id) === index
        );

        // Store in unused objects set
        uniqueUnusedObjects.forEach(obj => {
            this.unusedObjects.add(obj.id);
        });

        console.log(`Identified ${uniqueUnusedObjects.length} unused toolkit objects`);
        return uniqueUnusedObjects;
    }

    /**
     * Get dependency statistics
     * @returns {Object} Comprehensive dependency statistics
     */
    getDependencyStatistics() {
        const stats = {
            overview: {
                totalDependencies: 0,
                applicationToToolkitDependencies: 0,
                toolkitToToolkitDependencies: 0,
                unusedObjects: this.unusedObjects.size
            },
            byType: {},
            byStrength: {
                strong: 0,
                weak: 0
            },
            byValidation: {
                valid: 0,
                broken: 0,
                unknown: 0
            },
            toolkitUsage: new Map(),
            generatedAt: new Date().toISOString()
        };

        // Count all dependencies
        for (const [key, deps] of this.dependencies.entries()) {
            stats.overview.totalDependencies += deps.length;
            
            deps.forEach(dep => {
                // Count by type
                if (!stats.byType[dep.dependencyType]) {
                    stats.byType[dep.dependencyType] = 0;
                }
                stats.byType[dep.dependencyType]++;

                // Count by strength
                if (dep.strength === 'strong') {
                    stats.byStrength.strong++;
                } else {
                    stats.byStrength.weak++;
                }

                // Count by validation status
                if (dep.validationStatus === 'valid') {
                    stats.byValidation.valid++;
                } else if (dep.validationStatus === 'broken') {
                    stats.byValidation.broken++;
                } else {
                    stats.byValidation.unknown++;
                }

                // Count toolkit usage
                if (dep.targetObject.toolkitInfo) {
                    const toolkitName = dep.targetObject.toolkitInfo.name;
                    if (!stats.toolkitUsage.has(toolkitName)) {
                        stats.toolkitUsage.set(toolkitName, 0);
                    }
                    stats.toolkitUsage.set(toolkitName, stats.toolkitUsage.get(toolkitName) + 1);
                }
            });
        }

        stats.overview.applicationToToolkitDependencies = Array.from(this.applicationToToolkitDeps.values())
            .reduce((sum, deps) => sum + deps.length, 0);
        
        stats.overview.toolkitToToolkitDependencies = Array.from(this.toolkitToToolkitDeps.values())
            .reduce((sum, deps) => sum + deps.length, 0);

        return stats;
    }

    // Private helper methods

    /**
     * Create a map of objects for efficient lookup
     * @private
     */
    createObjectMap(objects) {
        const objectMap = new Map();
        objects.forEach(obj => {
            // Map by name (primary lookup)
            objectMap.set(obj.name, obj);
            // Map by ID (secondary lookup)
            objectMap.set(obj.id, obj);
            // Map by type name if different from name
            if (obj.typeName && obj.typeName !== obj.name) {
                objectMap.set(obj.typeName, obj);
            }
        });
        return objectMap;
    }

    /**
     * Extract dependencies from an object
     * @private
     */
    extractObjectDependencies(sourceObject, targetObjectMap, dependencyCategory) {
        const dependencies = [];

        try {
            // Extract business object type dependencies
            if (sourceObject.details?.schema?.properties) {
                sourceObject.details.schema.properties.forEach(property => {
                    if (!property.isSystemType && property.type && property.type !== 'Unknown') {
                        const targetObject = targetObjectMap.get(property.type);
                        if (targetObject) {
                            dependencies.push(this.createDependency(
                                sourceObject,
                                targetObject,
                                'type_reference',
                                'strong',
                                'valid',
                                { propertyName: property.name, propertyType: property.type }
                            ));
                        }
                    }
                });
            }

            // Extract service call dependencies from CSHS objects
            if (sourceObject.details?.crossReferences?.serviceReferences) {
                sourceObject.details.crossReferences.serviceReferences.forEach(serviceRef => {
                    const targetObject = targetObjectMap.get(serviceRef.referencedService);
                    if (targetObject) {
                        dependencies.push(this.createDependency(
                            sourceObject,
                            targetObject,
                            'service_call',
                            'strong',
                            'valid',
                            { elementName: serviceRef.elementName, elementType: serviceRef.elementType }
                        ));
                    }
                });
            }

            // Extract variable type dependencies
            if (sourceObject.details?.crossReferences?.variableReferences) {
                sourceObject.details.crossReferences.variableReferences.forEach(varRef => {
                    const targetObject = targetObjectMap.get(varRef.referencedType);
                    if (targetObject) {
                        dependencies.push(this.createDependency(
                            sourceObject,
                            targetObject,
                            'variable_reference',
                            'weak',
                            'valid',
                            { variableName: varRef.variableName, referencedType: varRef.referencedType }
                        ));
                    }
                });
            }

            // Extract service script dependencies
            if (sourceObject.details?.scripts) {
                sourceObject.details.scripts.forEach(script => {
                    // Service references in scripts
                    if (script.referencedServices) {
                        script.referencedServices.forEach(serviceName => {
                            const targetObject = targetObjectMap.get(serviceName);
                            if (targetObject) {
                                dependencies.push(this.createDependency(
                                    sourceObject,
                                    targetObject,
                                    'service_call',
                                    'strong',
                                    'valid',
                                    { scriptName: script.name, referencedService: serviceName }
                                ));
                            }
                        });
                    }

                    // Business object references in scripts
                    if (script.referencedBusinessObjects) {
                        script.referencedBusinessObjects.forEach(boName => {
                            const targetObject = targetObjectMap.get(boName);
                            if (targetObject) {
                                dependencies.push(this.createDependency(
                                    sourceObject,
                                    targetObject,
                                    'business_object_usage',
                                    'weak',
                                    'valid',
                                    { scriptName: script.name, referencedBusinessObject: boName }
                                ));
                            }
                        });
                    }
                });
            }

            // Store dependencies for this object
            if (dependencies.length > 0) {
                this.objectDependencies.set(sourceObject.id, dependencies);
                
                // Add to main dependencies map
                const key = `${dependencyCategory}:${sourceObject.id}`;
                this.dependencies.set(key, dependencies);
            }

        } catch (error) {
            console.warn(`Error extracting dependencies for object ${sourceObject.name}:`, error.message);
        }

        return dependencies;
    }

    /**
     * Create a dependency object
     * @private
     */
    createDependency(sourceObject, targetObject, dependencyType, strength, validationStatus, metadata = {}) {
        return {
            sourceObject: {
                id: sourceObject.id,
                name: sourceObject.name,
                type: sourceObject.type,
                source: sourceObject.source,
                toolkitInfo: sourceObject.toolkitInfo
            },
            targetObject: {
                id: targetObject.id,
                name: targetObject.name,
                type: targetObject.type,
                source: targetObject.source,
                toolkitInfo: targetObject.toolkitInfo
            },
            dependencyType,
            strength,
            validationStatus,
            metadata,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Determine edge type for dependency graph
     * @private
     */
    determineEdgeType(sourceType, targetType) {
        if (sourceType === 'application' && targetType === 'toolkit') {
            return 'application_to_toolkit';
        } else if (sourceType === 'toolkit' && targetType === 'toolkit') {
            return 'toolkit_to_toolkit';
        } else if (sourceType === 'toolkit' && targetType === 'application') {
            return 'toolkit_to_application';
        } else {
            return 'application_to_application';
        }
    }

    /**
     * Clear all dependency mappings
     */
    clearDependencies() {
        this.dependencies.clear();
        this.applicationToToolkitDeps.clear();
        this.toolkitToToolkitDeps.clear();
        this.objectDependencies.clear();
        this.unusedObjects.clear();
        this.dependencyGraph = null;
        console.log('All dependency mappings cleared');
    }

    /**
     * Get dependencies for a specific object
     * @param {string} objectId - ID of the object
     * @returns {Array} Array of dependencies for the object
     */
    getObjectDependencies(objectId) {
        return this.objectDependencies.get(objectId) || [];
    }

    /**
     * Check if an object is unused
     * @param {string} objectId - ID of the object
     * @returns {boolean} True if object is unused
     */
    isObjectUnused(objectId) {
        return this.unusedObjects.has(objectId);
    }
}

module.exports = ToolkitDependencyMapper;