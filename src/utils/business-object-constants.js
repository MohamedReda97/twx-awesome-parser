/**
 * Constants for Business Object schema parsing
 */

// System types from IBM BPM lombardi namespace
const SYSTEM_TYPES = {
  '{http://lombardi.ibm.com/schema/}String': 'String',
  '{http://lombardi.ibm.com/schema/}Integer': 'Integer',
  '{http://lombardi.ibm.com/schema/}Decimal': 'Decimal',
  '{http://lombardi.ibm.com/schema/}Date': 'Date',
  '{http://lombardi.ibm.com/schema/}Boolean': 'Boolean',
  '{http://lombardi.ibm.com/schema/}NameValuePair': 'NameValuePair',
  '{http://lombardi.ibm.com/schema/}Time': 'Time',
  '{http://lombardi.ibm.com/schema/}DateTime': 'DateTime',
  '{http://lombardi.ibm.com/schema/}Long': 'Long',
  '{http://lombardi.ibm.com/schema/}Float': 'Float',
  '{http://lombardi.ibm.com/schema/}Double': 'Double'
};

// Extract clean type name from namespaced type
function getCleanTypeName(typeString) {
  if (!typeString) return 'Unknown';
  
  // Check if it's a system type
  if (SYSTEM_TYPES[typeString]) {
    return SYSTEM_TYPES[typeString];
  }
  
  // Extract type name from custom namespace (e.g., {http://example.com/schema}CustomerInfo -> CustomerInfo)
  const match = typeString.match(/\{[^}]+\}(.+)/);
  return match ? match[1] : typeString;
}

// Check if a type is a system type
function isSystemType(typeString) {
  return !!SYSTEM_TYPES[typeString];
}

// Extract namespace from type string
function getTypeNamespace(typeString) {
  if (!typeString) return null;
  
  const match = typeString.match(/\{([^}]+)\}/);
  return match ? match[1] : null;
}

module.exports = {
  SYSTEM_TYPES,
  getCleanTypeName,
  isSystemType,
  getTypeNamespace
};
