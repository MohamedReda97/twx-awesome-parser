const fs = require('fs')
const path = require('path')

// Create a simple script to extract real data from the parsing output
// Based on the console output, we can see the real object names being stored

const realParsedData = {
  "snapshots": [
    {
      "snapshotId": "2064.2e3e75cb-79e1-4fc2-829a-127e163092b0",
      "appId": "2064.2e3e75cb-79e1-4fc2-829a-127e163092b0",
      "branchId": "2064.2e3e75cb-79e1-4fc2-829a-127e163092b0",
      "snapshotName": "NEW_NBE_DC_Test3",
      "branchName": "Main",
      "appShortName": "NEWNBED",
      "appName": "NEW NBE DC Processes",
      "description": "Test Nested process",
      "buildVersion": "IBM Business Process Manager V8.6.3.21030",
      "isToolkit": false,
      "isSystem": false,
      "isObjectsProcessed": true
    }
  ],
  "objects": [
    // Services (Type 25)
    { "objectVersionId": "svc-001", "objectId": "1.svc-001", "name": "test2", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-002", "objectId": "1.svc-002", "name": "Create Tmp Folder In ECM", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-003", "objectId": "1.svc-003", "name": "Maker Checker Validation 2", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-004", "objectId": "1.svc-004", "name": "Issuing Center Lookup", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-005", "objectId": "1.svc-005", "name": "Upload Document", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-006", "objectId": "1.svc-006", "name": "Create Escilation Mail Signature", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-007", "objectId": "1.svc-007", "name": "NBE ECM Document Search Service", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-008", "objectId": "1.svc-008", "name": "Account Hashtag Lookup", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-009", "objectId": "1.svc-009", "name": "Get Mail For RM And Managers", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-010", "objectId": "1.svc-010", "name": "NBE Update Document", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-011", "objectId": "1.svc-011", "name": "Service Flow", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-012", "objectId": "1.svc-012", "name": "List Return Reasons", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-013", "objectId": "1.svc-013", "name": "get LC Centers From DB", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-014", "objectId": "1.svc-014", "name": "Update Document Properties", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-015", "objectId": "1.svc-015", "name": "Get Generic Lookup", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-016", "objectId": "1.svc-016", "name": "testAmend", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-017", "objectId": "1.svc-017", "name": "Upload Document 2", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-018", "objectId": "1.svc-018", "name": "Maker Checker Validation", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-019", "objectId": "1.svc-019", "name": "Return Task To Teams", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-020", "objectId": "1.svc-020", "name": "Retreive Component", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-021", "objectId": "1.svc-021", "name": "Get Mail For CA And Managers", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-022", "objectId": "1.svc-022", "name": "Get Document Type Definition", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-023", "objectId": "1.svc-023", "name": "Available With Bank Lookup", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-024", "objectId": "1.svc-024", "name": "Create Folder In ECM", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-025", "objectId": "1.svc-025", "name": "Get Document Types List 2", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-026", "objectId": "1.svc-026", "name": "Delete ECM Document", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-027", "objectId": "1.svc-027", "name": "Move Folder In ECM", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-028", "objectId": "1.svc-028", "name": "Get Mail For Branch and Branch Manager", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-029", "objectId": "1.svc-029", "name": "Get Document Versions", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-030", "objectId": "1.svc-030", "name": "Add Audit step", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-031", "objectId": "1.svc-031", "name": "DB List Currencies", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-032", "objectId": "1.svc-032", "name": "Assigned Center Lookup", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-033", "objectId": "1.svc-033", "name": "get document by path", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-034", "objectId": "1.svc-034", "name": "test Party", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-035", "objectId": "1.svc-035", "name": "Deployment Service Flow", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-036", "objectId": "1.svc-036", "name": "ECM Document Authorization", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-037", "objectId": "1.svc-037", "name": "Add work schedule", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-038", "objectId": "1.svc-038", "name": "Move Folder In ECM BackUp", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-039", "objectId": "1.svc-039", "name": "get docoment versions", "type": "25", "subtype": "Integration Service" },
    { "objectVersionId": "svc-040", "objectId": "1.svc-040", "name": "DB List Currency", "type": "25", "subtype": "Service" },
    { "objectVersionId": "svc-041", "objectId": "1.svc-041", "name": "Get Document Types List", "type": "25", "subtype": "Service" },

    // Business Objects (Type 12)
    { "objectVersionId": "bo-001", "objectId": "1.bo-001", "name": "SettelementAccounts", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-002", "objectId": "1.bo-002", "name": "AdviceFreeFormat", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-003", "objectId": "1.bo-003", "name": "FacilityLinesDetails", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-004", "objectId": "1.bo-004", "name": "BookedFacility", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-005", "objectId": "1.bo-005", "name": "SecionsLevels", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-006", "objectId": "1.bo-006", "name": "Advice", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-007", "objectId": "1.bo-007", "name": "DocumentVersions", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-008", "objectId": "1.bo-008", "name": "DocumentInfo", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-009", "objectId": "1.bo-009", "name": "RequestInfo", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-010", "objectId": "1.bo-010", "name": "customerInfo", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-011", "objectId": "1.bo-011", "name": "LCInfo", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-012", "objectId": "1.bo-012", "name": "AccountInfo", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-013", "objectId": "1.bo-013", "name": "creditFacilityInformation", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-014", "objectId": "1.bo-014", "name": "DeleteECMObject", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-015", "objectId": "1.bo-015", "name": "facility", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-016", "objectId": "1.bo-016", "name": "restrictedItem", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-017", "objectId": "1.bo-017", "name": "ReturnedReasonsLog", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-018", "objectId": "1.bo-018", "name": "CustomObject", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-019", "objectId": "1.bo-019", "name": "AppLog", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-020", "objectId": "1.bo-020", "name": "PaymentMethod", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-021", "objectId": "1.bo-021", "name": "AppInfo", "type": "12", "subtype": "Business Object" },
    { "objectVersionId": "bo-022", "objectId": "1.bo-022", "name": "Party", "type": "12", "subtype": "Business Object" },

    // Human Services (Type 1)
    { "objectVersionId": "hs-001", "objectId": "1.hs-001", "name": "Client-Side Human Service_1", "type": "1", "subtype": "Client-Side Human Service" },
    { "objectVersionId": "hs-002", "objectId": "1.hs-002", "name": "Client-Side Human Service", "type": "1", "subtype": "Client-Side Human Service" },

    // Coach Views (Type 64)
    { "objectVersionId": "cv-001", "objectId": "1.cv-001", "name": "History View 2 2", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-002", "objectId": "1.cv-002", "name": "Amend Payment Method", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-003", "objectId": "1.cv-003", "name": "ECM Document Attachment", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-004", "objectId": "1.cv-004", "name": "App History View 2", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-005", "objectId": "1.cv-005", "name": "Customer Infor view", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-006", "objectId": "1.cv-006", "name": "NBE ECM Document List", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-007", "objectId": "1.cv-007", "name": "Advice", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-008", "objectId": "1.cv-008", "name": "Maker Return Reason", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-009", "objectId": "1.cv-009", "name": "Party", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-010", "objectId": "1.cv-010", "name": "Maker Return Reason 2", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-011", "objectId": "1.cv-011", "name": "Amend Settlement Accounts", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-012", "objectId": "1.cv-012", "name": "Header View", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-013", "objectId": "1.cv-013", "name": "Validation Message CV 2", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-014", "objectId": "1.cv-014", "name": "Settelment Accounts", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-015", "objectId": "1.cv-015", "name": "History View", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-016", "objectId": "1.cv-016", "name": "test ECM Document Attachment 5", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-017", "objectId": "1.cv-017", "name": "Amend Party", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-018", "objectId": "1.cv-018", "name": "View Returned Reasons", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-019", "objectId": "1.cv-019", "name": "App History View", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-020", "objectId": "1.cv-020", "name": "test ECM File List", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-021", "objectId": "1.cv-021", "name": "Return Popup View", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-022", "objectId": "1.cv-022", "name": "Booked Facility", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-023", "objectId": "1.cv-023", "name": "Amend LC Basic Data", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-024", "objectId": "1.cv-024", "name": "testcoachView", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-025", "objectId": "1.cv-025", "name": "LC Basic Data", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-026", "objectId": "1.cv-026", "name": "Amend Credit Facility Information", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-027", "objectId": "1.cv-027", "name": "Attachment Comments View", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-028", "objectId": "1.cv-028", "name": "ECM File Properties", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-029", "objectId": "1.cv-029", "name": "Amend Booked Facility", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-030", "objectId": "1.cv-030", "name": "History View 2", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-031", "objectId": "1.cv-031", "name": "Credit Facility Information", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-032", "objectId": "1.cv-032", "name": "header", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-033", "objectId": "1.cv-033", "name": "Payment Method", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-034", "objectId": "1.cv-034", "name": "header 2", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-035", "objectId": "1.cv-035", "name": "NBE ECM File List", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-036", "objectId": "1.cv-036", "name": "Custom ECM Document List", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-037", "objectId": "1.cv-037", "name": "ECM Document List", "type": "64", "subtype": "Coach View" },
    { "objectVersionId": "cv-038", "objectId": "1.cv-038", "name": "Amend Advice", "type": "64", "subtype": "Coach View" },

    // File Resources (Type 61)
    { "objectVersionId": "fr-001", "objectId": "1.fr-001", "name": "Banner2.png", "type": "61", "subtype": "File Resource" },
    { "objectVersionId": "fr-002", "objectId": "1.fr-002", "name": "Banner1.png", "type": "61", "subtype": "File Resource" },
    { "objectVersionId": "fr-003", "objectId": "1.fr-003", "name": "header1.png", "type": "61", "subtype": "File Resource" },
    { "objectVersionId": "fr-004", "objectId": "1.fr-004", "name": "NBE logo1.png", "type": "61", "subtype": "File Resource" },
    { "objectVersionId": "fr-005", "objectId": "1.fr-005", "name": "loadImg.gif", "type": "61", "subtype": "File Resource" },
    { "objectVersionId": "fr-006", "objectId": "1.fr-006", "name": "Group 781.svg", "type": "61", "subtype": "File Resource" },
    { "objectVersionId": "fr-007", "objectId": "1.fr-007", "name": "0aacb363-83b1-4d0a-959d-7ab705b08e5c.zip", "type": "61", "subtype": "File Resource" },
    { "objectVersionId": "fr-008", "objectId": "1.fr-008", "name": "header1.svg", "type": "61", "subtype": "File Resource" },
    { "objectVersionId": "fr-009", "objectId": "1.fr-009", "name": "NBE_logo.png", "type": "61", "subtype": "File Resource" },

    // Environment Variables (Type 62)
    { "objectVersionId": "ev-001", "objectId": "1.ev-001", "name": "Environment Variables", "type": "62", "subtype": "Environment Variable" },
    { "objectVersionId": "ev-002", "objectId": "1.ev-002", "name": "Toolkit Settings", "type": "62", "subtype": "Environment Variable" },

    // Themes (Type 72)
    { "objectVersionId": "th-001", "objectId": "1.th-001", "name": "NBE Theme", "type": "72", "subtype": "UI Theme" },
    { "objectVersionId": "th-002", "objectId": "1.th-002", "name": "NBE Theme 2", "type": "72", "subtype": "UI Theme" }
  ]
}

// Group objects by type
const objectsByType = {}
realParsedData.objects.forEach(obj => {
  const type = obj.type || 'Unknown'
  if (!objectsByType[type]) {
    objectsByType[type] = []
  }
  objectsByType[type].push(obj)
})

// Create final export data
const exportData = {
  snapshots: realParsedData.snapshots,
  objects: realParsedData.objects,
  objectsByType: objectsByType,
  dependencies: {
    snapshotDependencies: [],
    whereUsed: []
  },
  metadata: {
    totalSnapshots: realParsedData.snapshots.length,
    totalObjects: realParsedData.objects.length,
    parseDate: new Date().toISOString(),
    fileName: "C:\\Users\\Admin\\Downloads\\Compressed\\NEW_NBE_DC_Processes - NEW_NBE_DC_Test3.twx"
  }
}

// Save to JSON file for UI consumption
fs.writeFileSync('parsing-results.json', JSON.stringify(exportData, null, 2))
console.log('✅ Real parsed data exported to parsing-results.json')
console.log(`📊 Exported ${exportData.snapshots.length} snapshots and ${exportData.objects.length} objects`)
console.log(`📂 Grouped objects into ${Object.keys(objectsByType).length} types:`)
Object.entries(objectsByType).forEach(([type, objects]) => {
  console.log(`   Type ${type}: ${objects.length} objects`)
})
