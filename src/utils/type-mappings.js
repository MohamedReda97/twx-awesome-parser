/**
 * Mapping of TWX object type codes to human-readable names
 * Based on the package.xml analysis and IBM BPM documentation
 */

const TYPE_MAPPINGS = {
  // Process-related types
  'process': 'Process',
  'bpd': 'Business Process Definition',
  
  // Data types
  'twClass': 'Business Object',
  'epv': 'Environment Property Variable',
  
  // UI types
  'coachView': 'Coach View',
  'layout': 'Layout',
  'theme': 'Theme',
  
  // Service types
  'service': 'Service',
  'integrationService': 'Integration Service',
  'humanService': 'Human Service',
  'clientSideHumanService': 'Client-Side Human Service',
  
  // Resource types
  'resourceBundleGroup': 'Resource Bundle',
  'managedAsset': 'Managed Asset',
  
  // Configuration types
  'environmentVariableSet': 'Environment Variables',
  'projectDefaults': 'Project Settings',
  
  // Other types
  'webService': 'Web Service',
  'externalActivity': 'External Activity',
  'participant': 'Participant',
  'report': 'Report',
  'scoreboard': 'Scoreboard',
  'kpi': 'KPI',
  'sla': 'SLA',
  'trackingGroup': 'Tracking Group',
  'timingInterval': 'Timing Interval',
  'uca': 'Undercover Agent',
  'userAttribute': 'User Attribute',
  'eventSubscription': 'Event Subscription',
  'historicalScenario': 'Historical Scenario'
}

/**
 * Get human-readable type name from type code or string
 * @param {string} type - The type code or string
 * @returns {string} Human-readable type name
 */
function getTypeName(type) {
  if (!type) return 'Unknown'
  
  // If it's already a mapped type, return it
  if (TYPE_MAPPINGS[type]) {
    return TYPE_MAPPINGS[type]
  }
  
  // Try to find a partial match (case insensitive)
  const lowerType = type.toLowerCase()
  for (const [key, value] of Object.entries(TYPE_MAPPINGS)) {
    if (lowerType.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerType)) {
      return value
    }
  }
  
  // If no match found, return capitalized version of the input
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

/**
 * Get all available type categories for filtering
 * @returns {Array<string>} Array of type names
 */
function getAllTypes() {
  return Object.values(TYPE_MAPPINGS).sort()
}

/**
 * Group objects by their type
 * @param {Array} objects - Array of objects with type property
 * @returns {Object} Objects grouped by type
 */
function groupByType(objects) {
  const grouped = {}
  
  objects.forEach(obj => {
    const typeName = getTypeName(obj.type)
    if (!grouped[typeName]) {
      grouped[typeName] = []
    }
    grouped[typeName].push(obj)
  })
  
  return grouped
}

module.exports = {
  TYPE_MAPPINGS,
  getTypeName,
  getAllTypes,
  groupByType
}
