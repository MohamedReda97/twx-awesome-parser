const JSONWorkspace = require('./classes/JSONWorkspace')
const JSONParser = require('./parser/json-parser')
const TWXExtractor = require('./parser/twx-extractor')

/**
 *  Entry point for the refactored TWX parser library
 *  @namespace twx-parser
 */
module.exports = {
  /**
   * Create a new JSON-based workspace
   * @memberOf twx-parser
   *
   * @param   {string} outputDir Directory to store JSON files (default: './output')
   *
   * @returns {JSONWorkspace} A new JSONWorkspace instance
   */
  createWorkspace: (outputDir = './output') => {
    return new JSONWorkspace(outputDir)
  },

  /**
   * Parse a TWX file directly without workspace
   * @memberOf twx-parser
   *
   * @param   {string} twxFilePath Path to the TWX file
   * @param   {string} outputDir Directory to store JSON files (default: './output')
   *
   * @returns {Promise<Object>} Promise that resolves with parsing results
   */
  parseTWX: async (twxFilePath, outputDir = './output') => {
    const parser = new JSONParser(outputDir)
    return await parser.parseTWX(twxFilePath)
  },

  /**
   * Extract raw data from TWX file without generating JSON files
   * @memberOf twx-parser
   *
   * @param   {string} twxFilePath Path to the TWX file
   *
   * @returns {Promise<Object>} Promise that resolves with extracted data
   */
  extractTWX: async (twxFilePath) => {
    const extractor = new TWXExtractor()
    return await extractor.extractTWX(twxFilePath)
  },

  // Export classes for advanced usage
  JSONWorkspace,
  JSONParser,
  TWXExtractor
}
