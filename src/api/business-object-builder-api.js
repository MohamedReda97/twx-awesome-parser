/**
 * Business Object Builder API
 * Provides HTTP endpoints for the Business Object Builder functionality
 */

const { BusinessObjectBuilder } = require('../parser/business-object-builder-complete')
const fs = require('fs')
const path = require('path')
// File upload handling without multer

class BusinessObjectBuilderAPI {
  constructor() {
    this.builder = new BusinessObjectBuilder()
  }

  /**
   * Get supported types endpoint
   */
  getSupportedTypes(req, res) {
    try {
      const types = this.builder.getSupportedTypes()
      this.sendJSON(res, 200, {
        success: true,
        types: types,
        count: types.length
      })
    } catch (error) {
      this.sendJSON(res, 500, {
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Get type suggestions endpoint
   */
  getTypeSuggestions(req, res) {
    try {
      const { type } = req.query
      if (!type) {
        return this.sendJSON(res, 400, {
          success: false,
          error: 'Type parameter is required'
        })
      }

      const suggestions = this.builder.getTypeSuggestions(type)
      this.sendJSON(res, 200, {
        success: true,
        type: type,
        suggestions: suggestions
      })
    } catch (error) {
      this.sendJSON(res, 500, {
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Validate JSON input endpoint
   */
  validateJSON(req, res) {
    try {
      const { jsonInput } = req.body
      if (!jsonInput) {
        return this.sendJSON(res, 400, {
          success: false,
          error: 'JSON input is required'
        })
      }

      // Try to parse and validate
      const parsedObjects = this.builder.parser.parseObjectDefinition(jsonInput)
      
      if (!parsedObjects) {
        return this.sendJSON(res, 200, {
          success: false,
          valid: false,
          errors: this.builder.parser.getErrors()
        })
      }

      const structures = this.builder.parser.extractObjectStructure(parsedObjects)
      
      // Validate types
      const typeValidation = this.validateTypes(structures)
      
      this.sendJSON(res, 200, {
        success: true,
        valid: true,
        objectCount: structures.length,
        objects: structures.map(s => ({
          name: s.objectName,
          properties: s.properties.length
        })),
        typeValidation: typeValidation
      })

    } catch (error) {
      this.sendJSON(res, 200, {
        success: false,
        valid: false,
        errors: [error.message]
      })
    }
  }

  /**
   * Preview business objects endpoint (without adding to TWX)
   */
  previewBusinessObjects(req, res) {
    try {
      const { jsonInput } = req.body
      if (!jsonInput) {
        return this.sendJSON(res, 400, {
          success: false,
          error: 'JSON input is required'
        })
      }

      // Parse and generate preview
      const parsedObjects = this.builder.parser.parseObjectDefinition(jsonInput)
      if (!parsedObjects) {
        return this.sendJSON(res, 200, {
          success: false,
          error: 'Failed to parse JSON input',
          errors: this.builder.parser.getErrors()
        })
      }

      const structures = this.builder.parser.extractObjectStructure(parsedObjects)
      const preview = []

      for (const structure of structures) {
        try {
          const businessObject = this.builder.generator.generateBusinessObject(structure)
          preview.push({
            name: businessObject.name,
            id: businessObject.id,
            properties: businessObject.properties.map(p => ({
              name: p.name,
              type: p.bpmType,
              mappedTypeId: this.builder.typeMapper.mapType(p.bpmType),
              supported: this.builder.typeMapper.isSupportedType(p.bpmType)
            }))
          })
        } catch (error) {
          preview.push({
            name: structure.objectName,
            error: error.message
          })
        }
      }

      this.sendJSON(res, 200, {
        success: true,
        preview: preview,
        count: preview.length
      })

    } catch (error) {
      this.sendJSON(res, 500, {
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Generate and add business objects to TWX endpoint
   */
  async generateBusinessObjects(req, res) {
    try {
      const { jsonInput, options = {} } = req.body
      
      if (!jsonInput) {
        return this.sendJSON(res, 400, {
          success: false,
          error: 'JSON input is required'
        })
      }

      if (!req.file) {
        return this.sendJSON(res, 400, {
          success: false,
          error: 'TWX file is required'
        })
      }

      const twxFilePath = req.file.path
      
      try {
        // Generate business objects and add to TWX
        const results = await this.builder.buildAndAddToTWX(jsonInput, twxFilePath, options)
        
        if (results.success) {
          // Read the modified TWX file to send back
          const modifiedTWXBuffer = fs.readFileSync(results.outputPath)
          
          // Set headers for file download
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${req.file.originalname}"`
          })
          
          // Send the modified TWX file
          res.end(modifiedTWXBuffer)
          
          // Clean up uploaded file
          fs.unlinkSync(twxFilePath)
          
        } else {
          this.sendJSON(res, 200, results)
        }
        
      } catch (error) {
        // Clean up uploaded file on error
        if (fs.existsSync(twxFilePath)) {
          fs.unlinkSync(twxFilePath)
        }
        throw error
      }

    } catch (error) {
      this.sendJSON(res, 500, {
        success: false,
        error: error.message
      })
    }
  }

  /**
   * Validate types in object structures
   */
  validateTypes(structures) {
    const supportedTypes = []
    const unsupportedTypes = []
    const warnings = []
    
    for (const structure of structures) {
      for (const property of structure.properties) {
        if (this.builder.typeMapper.isSupportedType(property.type)) {
          if (!supportedTypes.includes(property.type)) {
            supportedTypes.push(property.type)
          }
        } else {
          if (!unsupportedTypes.includes(property.type)) {
            unsupportedTypes.push(property.type)
            
            const suggestions = this.builder.typeMapper.suggestType(property.type)
            warnings.push(`Unsupported type '${property.type}' in ${structure.objectName}.${property.name}. Suggestions: ${suggestions.join(', ')}`)
          }
        }
      }
    }
    
    return {
      supportedTypes,
      unsupportedTypes,
      warnings,
      totalTypes: supportedTypes.length + unsupportedTypes.length
    }
  }

  /**
   * Setup Express routes
   */
  setupRoutes(app) {
    // Get supported types
    app.get('/api/business-objects/types', (req, res) => this.getSupportedTypes(req, res))
    
    // Get type suggestions
    app.get('/api/business-objects/type-suggestions', (req, res) => this.getTypeSuggestions(req, res))
    
    // Validate JSON input
    app.post('/api/business-objects/validate', (req, res) => this.validateJSON(req, res))
    
    // Preview business objects
    app.post('/api/business-objects/preview', (req, res) => this.previewBusinessObjects(req, res))
    
    // Generate and add business objects to TWX (handled by web server)
  }

  /**
   * Send JSON response (helper for Node.js HTTP)
   */
  sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.builder.cleanup()
  }
}

module.exports = BusinessObjectBuilderAPI