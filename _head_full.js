const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const BusinessObjectSchemaParser = require("./business-object-schema-parser");
/**
 * Extract per-object XML files from a TWX archive or extracted directory.
 */
class ObjectExtractor {
	constructor() {
		this.parser = new xml2js.Parser({
			explicitArray: false,
			ignoreAttrs: false,
			mergeAttrs: true,
		});
		this.businessObjectParser = new BusinessObjectSchemaParser();
	}
	/**
	 * @param {ADMZip} zip
	 * @param {Array} objectList — entries from package.xml
	 * @returns {Promise<Array>}
	 */
	async extractObjects(zip, objectList) {
		const objects = [];
		for (const objMeta of objectList) {
			try {
				let objectFileName = `objects/${objMeta.versionId}.xml`;
				let objectEntry = zip.getEntry(objectFileName);
				if (!objectEntry) {
					objectFileName = `objects/${objMeta.id}.xml`;
					objectEntry = zip.getEntry(objectFileName);
... more files changed
