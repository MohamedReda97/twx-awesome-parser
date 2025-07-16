/**
 * Business Object Schema Parser
 * Extracts and processes business object schemas from XML jsonData
 */

const { getCleanTypeName, isSystemType, getTypeNamespace } = require('../utils/business-object-constants');
const typeRegistry = require('../utils/business-object-type-registry');

class BusinessObjectSchemaParser {
  constructor() {
    this.maxDepth = 5; // Prevent infinite recursion
  }

  /**
   * Parse business object schema from jsonData
   * @param {string|Object} jsonData - JSON string or object from business object XML
   * @param {string} objectId - ID of the business object
   * @param {string} objectName - Name of the business object
   * @returns {Object} Parsed schema information
   */
  parseSchema(jsonData, objectId, objectName) {
    try {
      if (!jsonData) {
        return this.createEmptySchema(objectId, objectName);
      }

      let schema;
      
      // Check if jsonData is already an object (parsed by xml2js) or a string
      if (typeof jsonData === 'string') {
        schema = JSON.parse(jsonData);
      } else if (typeof jsonData === 'object') {
        schema = jsonData;
      } else {
        console.warn(`Unexpected jsonData type for ${objectName}:`, typeof jsonData);
        return this.createEmptySchema(objectId, objectName, 'Invalid jsonData type');
      }

      return this.extractSchemaStructure(schema, objectId, objectName);
    } catch (error) {
      console.warn(`Error parsing schema for ${objectName}:`, error.message);
      return this.createEmptySchema(objectId, objectName, error.message);
    }
  }

  /**
   * Extract structure from parsed JSON schema
   * @param {Object} schema - Parsed JSON schema
   * @param {string} objectId - ID of the business object
   * @param {string} objectName - Name of the business object
   * @returns {Object} Structured schema information
   */
  extractSchemaStructure(schema, objectId, objectName) {
    const result = {
      id: objectId,
      name: objectName,
      type: 'BusinessObject',
      namespace: this.extractNamespace(schema),
      properties: [],
      hasComplexTypes: false,
      systemTypesCount: 0,
      customTypesCount: 0,
      error: null
    };

    try {
      // Navigate to complexType/sequence/element structure
      const complexTypes = schema.complexType || [];
      
      for (const complexType of complexTypes) {
        if (complexType.sequence && complexType.sequence.element) {
          const elements = Array.isArray(complexType.sequence.element) 
            ? complexType.sequence.element 
            : [complexType.sequence.element];

          for (const element of elements) {
            const property = this.parseProperty(element, objectId);
            if (property) {
              result.properties.push(property);
              
              if (property.isSystemType) {
                result.systemTypesCount++;
              } else {
                result.customTypesCount++;
                result.hasComplexTypes = true;
              }
            }
          }
        }
      }

      // Register this type in the registry
      typeRegistry.registerType(objectName, objectId, result, result.namespace);

    } catch (error) {
      result.error = error.message;
      console.warn(`Error extracting schema structure for ${objectName}:`, error.message);
    }

    return result;
  }

  /**
   * Parse a single property from element definition
   * @param {Object} element - Element definition from schema
   * @param {string} parentObjectId - ID of the parent object
   * @returns {Object|null} Property definition
   */
  parseProperty(element, parentObjectId) {
    try {
      if (!element || !element.name || !element.type) {
        return null;
      }

      const typeName = element.type;
      const cleanTypeName = getCleanTypeName(typeName);
      const isSystem = isSystemType(typeName);
      const namespace = getTypeNamespace(typeName);

      const property = {
        name: element.name,
        type: cleanTypeName,
        fullType: typeName,
        isSystemType: isSystem,
        namespace: namespace,
        required: this.extractRequired(element),
        isArray: this.extractArrayInfo(element),
        hasDefault: this.extractDefaultInfo(element),
        description: this.extractDescription(element)
      };

      // Add reference information for custom types
      if (!isSystem) {
        property.referencedObjectId = this.extractReferencedObjectId(element);
        property.customTypeInfo = {
          namespace: namespace,
          originalType: typeName
        };
      }

      return property;
    } catch (error) {
      console.warn(`Error parsing property:`, error.message);
      return null;
    }
  }

  /**
   * Extract namespace from schema
   * @param {Object} schema - Schema object
   * @returns {string|null} Namespace or null
   */
  extractNamespace(schema) {
    if (schema.targetNamespace) {
      return schema.targetNamespace;
    }
    
    // Try to extract from first complexType if available
    if (schema.complexType && schema.complexType[0]) {
      const firstType = schema.complexType[0];
      if (firstType.sequence && firstType.sequence.element && firstType.sequence.element[0]) {
        const firstElement = firstType.sequence.element[0];
        if (firstElement.type) {
          return getTypeNamespace(firstElement.type);
        }
      }
    }
    
    return null;
  }

  /**
   * Extract required status from element
   * @param {Object} element - Element definition
   * @returns {boolean} True if required
   */
  extractRequired(element) {
    // Check annotation/appinfo for propertyRequired
    if (element.annotation && element.annotation.appinfo) {
      const appinfo = Array.isArray(element.annotation.appinfo) 
        ? element.annotation.appinfo[0] 
        : element.annotation.appinfo;
      
      if (appinfo.propertyRequired) {
        const required = Array.isArray(appinfo.propertyRequired)
          ? appinfo.propertyRequired[0]
          : appinfo.propertyRequired;
        return required === true || required === 'true';
      }
    }
    
    // Check minOccurs (default is 1, meaning required)
    return element.minOccurs !== '0';
  }

  /**
   * Extract array information from element
   * @param {Object} element - Element definition
   * @returns {boolean} True if array
   */
  extractArrayInfo(element) {
    return element.maxOccurs === 'unbounded' || 
           (element.maxOccurs && element.maxOccurs !== '1');
  }

  /**
   * Extract default value information
   * @param {Object} element - Element definition
   * @returns {boolean} True if has default
   */
  extractDefaultInfo(element) {
    return !!(element.default || element.defaultValue);
  }

  /**
   * Extract description from element
   * @param {Object} element - Element definition
   * @returns {string} Description or empty string
   */
  extractDescription(element) {
    if (element.annotation && element.annotation.documentation) {
      const docs = Array.isArray(element.annotation.documentation)
        ? element.annotation.documentation[0]
        : element.annotation.documentation;
      return docs || '';
    }
    return '';
  }

  /**
   * Extract referenced object ID from element
   * @param {Object} element - Element definition
   * @returns {string|null} Referenced object ID
   */
  extractReferencedObjectId(element) {
    // Look for refid in otherAttributes
    if (element.otherAttributes) {
      for (const [key, value] of Object.entries(element.otherAttributes)) {
        if (key.includes('refid')) {
          return value;
        }
      }
    }
    return null;
  }

  /**
   * Create empty schema for objects without valid jsonData
   * @param {string} objectId - Object ID
   * @param {string} objectName - Object name
   * @param {string} error - Error message
   * @returns {Object} Empty schema structure
   */
  createEmptySchema(objectId, objectName, error = null) {
    return {
      id: objectId,
      name: objectName,
      type: 'BusinessObject',
      namespace: null,
      properties: [],
      hasComplexTypes: false,
      systemTypesCount: 0,
      customTypesCount: 0,
      error: error || 'No schema data available'
    };
  }

  /**
   * Resolve custom type references using the type registry
   * @param {Object} schema - Schema with potential custom type references
   * @param {number} depth - Current recursion depth
   * @returns {Object} Schema with resolved references
   */
  resolveCustomTypes(schema, depth = 0) {
    if (depth > this.maxDepth) {
      console.warn(`Max resolution depth reached for ${schema.name}`);
      return schema;
    }

    const resolvedSchema = { ...schema };
    
    resolvedSchema.properties = schema.properties.map(property => {
      if (!property.isSystemType && property.type) {
        const referencedType = typeRegistry.resolveType(property.type);
        if (referencedType) {
          // Check for circular references
          if (typeRegistry.hasCircularReference(property.type)) {
            return {
              ...property,
              circularReference: true,
              resolvedType: {
                id: referencedType.id,
                name: referencedType.name,
                namespace: referencedType.namespace,
                properties: [] // Don't include properties to avoid infinite recursion
              }
            };
          }

          // Mark as visited to detect circular references
          typeRegistry.markCircularReference(property.type);

          // Recursively resolve nested types
          const nestedSchema = this.resolveCustomTypes(referencedType.schema, depth + 1);

          return {
            ...property,
            resolvedType: {
              id: referencedType.id,
              name: referencedType.name,
              namespace: referencedType.namespace,
              properties: nestedSchema.properties || [],
              systemTypesCount: nestedSchema.systemTypesCount || 0,
              customTypesCount: nestedSchema.customTypesCount || 0,
              hasComplexTypes: nestedSchema.hasComplexTypes || false,
              resolved: true
            }
          };
        } else {
          // Mark as unresolved reference
          return {
            ...property,
            unresolvedReference: true,
            resolvedType: null
          };
        }
      }
      return property;
    });

    return resolvedSchema;
  }
}

module.exports = BusinessObjectSchemaParser;
