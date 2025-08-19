# Business Object Builder User Guide

## Overview

The Business Object Builder allows you to create IBM BPM Business Objects from simple JSON definitions and add them directly to TWX files without manual extraction/compression.

## Features

✅ **Simple JSON Input**: Define business objects using familiar JSON syntax  
✅ **Direct TWX Modification**: Modify TWX files directly without extraction  
✅ **Type Mapping**: Automatic mapping to IBM BPM type IDs  
✅ **Real-time Validation**: JSON validation with error highlighting  
✅ **Preview Mode**: Preview objects before adding to TWX  
✅ **Proper XML Generation**: Follows exact IBM BPM XML structure  

## How to Use

### 1. Access the Business Object Builder

1. Start the TWX Parser application
2. Open your web browser to the TWX Parser interface
3. Look for the "🏗️ Business Object Builder" section

### 2. Define Your Business Objects

Use simple JSON syntax to define your business objects:

```json
{
  "CustomerProfile": {
    "customerId": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "age": "Integer",
    "isActive": "Boolean",
    "registrationDate": "Date",
    "preferences": "NameValuePair"
  },
  "OrderDetails": {
    "orderId": "string",
    "customerId": "string",
    "orderDate": "Date",
    "totalAmount": "Decimal",
    "isCompleted": "Boolean",
    "items": "TWList"
  }
}
```

### 3. Supported Types

#### Primitive Types
- `string` - Text data
- `Integer` - Whole numbers
- `Boolean` - True/false values
- `Date` - Date/time values
- `Decimal` - Decimal numbers

#### System Types
- `NameValuePair` - Key-value pairs
- `TWList` - Lists/arrays
- `TWObject` - Generic objects

### 4. Select Your TWX File

1. Click "📂 Select TWX File"
2. Choose your target TWX file
3. The file will be validated automatically

### 5. Generate Business Objects

#### Preview Mode
1. Click "👁️ Preview Objects" to see what will be generated
2. Review the object structure and properties
3. Check for any type mapping issues

#### Generation Mode
1. Configure generation options:
   - ✅ Skip duplicate objects
   - ✅ Create backup of original TWX
   - ⚠️ Strict type validation (optional)
2. Click "🚀 Generate & Add to TWX"
3. The modified TWX file will be downloaded automatically

## Type Mapping

The Business Object Builder uses actual IBM BPM type IDs:

| Simple Type | IBM BPM Type ID |
|-------------|-----------------|
| string | 12.db884a3c-c533-44b7-bb2d-47bec8ad4022 |
| Integer | 12.c09c9b6e-aabd-4897-bef2-ed61db106297 |
| Boolean | 12.83ff975e-8dbc-42e5-b738-fa8bc08274a2 |
| Date | 12.19e8dc33-1100-46be-89a6-36c9040f7b3e |
| NameValuePair | toolkit.TWSYS.NameValuePair |

## Generated XML Structure

The builder generates XML that follows the exact IBM BPM structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<teamworks>
    <twClass id="12.xxx-xxx-xxx" name="CustomerProfile">
        <lastModified>timestamp</lastModified>
        <lastModifiedBy>BusinessObjectBuilder</lastModifiedBy>
        <classId>12.xxx-xxx-xxx</classId>
        <type>1</type>
        <!-- ... IBM BPM metadata ... -->
        <jsonData>{"complexType":[...]}</jsonData>
        <definition>
            <property>
                <n>customerId</n>
                <classRef>projectId/12.db884a3c-c533-44b7-bb2d-47bec8ad4022</classRef>
                <!-- ... property metadata ... -->
            </property>
            <!-- ... more properties ... -->
        </definition>
    </twClass>
</teamworks>
```

## Error Handling

### Common Errors

**"Invalid JSON"**
- Check your JSON syntax
- Ensure proper quotes and commas
- Use the validation feature

**"TWX file not found"**
- Verify the file path
- Ensure the file exists and is accessible

**"Invalid TWX file: package.xml not found"**
- File may be corrupted
- Ensure it's a valid TWX file
- Try re-exporting from IBM BPM

**"Unsupported type"**
- Check the supported types list
- Use type suggestions feature
- Consider using similar supported types

### Validation Features

- **Real-time JSON validation** with syntax highlighting
- **Type checking** with suggestions for unsupported types
- **TWX file validation** before processing
- **Preview mode** to verify objects before generation

## Best Practices

### Naming Conventions
- Use PascalCase for object names: `CustomerProfile`
- Use camelCase for property names: `firstName`
- Avoid special characters and spaces
- Keep names descriptive but concise

### Object Design
- Group related properties together
- Use appropriate data types
- Consider using NameValuePair for flexible key-value data
- Use TWList for collections

### Testing
- Always use preview mode first
- Test with a copy of your TWX file
- Verify generated objects in IBM BPM
- Keep backups of original files

## Troubleshooting

### File Upload Issues
1. Ensure TWX file is not corrupted
2. Check file size (max 100MB)
3. Verify file extension is `.twx`
4. Try with a fresh export from IBM BPM

### Generation Issues
1. Validate JSON syntax first
2. Check for unsupported types
3. Ensure TWX file has proper structure
4. Review error messages carefully

### Performance Tips
- Limit to reasonable number of objects per generation
- Use preview mode for large object sets
- Process in batches if needed

## API Integration

For programmatic access, the Business Object Builder provides REST API endpoints:

- `GET /api/business-objects/types` - Get supported types
- `POST /api/business-objects/validate` - Validate JSON input
- `POST /api/business-objects/preview` - Preview objects
- `POST /api/business-objects/generate` - Generate and add to TWX

## Support

For issues or questions:
1. Check the error messages and validation feedback
2. Review this guide for common solutions
3. Verify your TWX file is valid
4. Test with simpler object definitions first

## Version History

- **v1.0** - Initial release with core functionality
- **v1.1** - Added real-time validation and preview mode
- **v1.2** - Improved error handling and TWX validation
- **v1.3** - Added proper IBM BPM type ID mapping