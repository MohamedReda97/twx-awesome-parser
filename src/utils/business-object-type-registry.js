/**
 * Business Object Type Registry
 * Stores and manages business object type definitions for cross-referencing
 */

class BusinessObjectTypeRegistry {
  constructor() {
    this.types = new Map(); // Map of type name -> type definition
    this.typesByNamespace = new Map(); // Map of namespace -> types
    this.circularReferences = new Set(); // Track circular dependencies
  }

  /**
   * Register a business object type definition
   * @param {string} typeName - Name of the type
   * @param {string} typeId - Unique ID of the business object
   * @param {Object} schema - Schema definition
   * @param {string} namespace - Type namespace
   */
  registerType(typeName, typeId, schema, namespace = null) {
    const typeInfo = {
      id: typeId,
      name: typeName,
      schema: schema,
      namespace: namespace,
      registeredAt: new Date().toISOString()
    };

    this.types.set(typeName, typeInfo);

    // Also store by namespace for easier lookup
    if (namespace) {
      if (!this.typesByNamespace.has(namespace)) {
        this.typesByNamespace.set(namespace, new Map());
      }
      this.typesByNamespace.get(namespace).set(typeName, typeInfo);
    }

    console.log(`Registered business object type: ${typeName} (ID: ${typeId})`);
  }

  /**
   * Lookup a type definition by name
   * @param {string} typeName - Name of the type to lookup
   * @returns {Object|null} Type definition or null if not found
   */
  resolveType(typeName) {
    return this.types.get(typeName) || null;
  }

  /**
   * Lookup types by namespace
   * @param {string} namespace - Namespace to search
   * @returns {Map} Map of types in the namespace
   */
  getTypesByNamespace(namespace) {
    return this.typesByNamespace.get(namespace) || new Map();
  }

  /**
   * Check if a type exists in the registry
   * @param {string} typeName - Name of the type
   * @returns {boolean} True if type exists
   */
  hasType(typeName) {
    return this.types.has(typeName);
  }

  /**
   * Get all registered types
   * @returns {Map} All registered types
   */
  getAllTypes() {
    return this.types;
  }

  /**
   * Mark a type as having circular references
   * @param {string} typeName - Name of the type
   */
  markCircularReference(typeName) {
    this.circularReferences.add(typeName);
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
   * Clear the registry (useful for testing)
   */
  clear() {
    this.types.clear();
    this.typesByNamespace.clear();
    this.circularReferences.clear();
  }

  /**
   * Get registry statistics
   * @returns {Object} Statistics about the registry
   */
  getStats() {
    return {
      totalTypes: this.types.size,
      namespaces: this.typesByNamespace.size,
      circularReferences: this.circularReferences.size,
      typesByNamespace: Array.from(this.typesByNamespace.keys()).map(ns => ({
        namespace: ns,
        typeCount: this.typesByNamespace.get(ns).size
      }))
    };
  }
}

// Export a singleton instance
module.exports = new BusinessObjectTypeRegistry();
