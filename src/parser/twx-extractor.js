const fs = require("fs");
const path = require("path");
const ADMZip = require("adm-zip");
const BusinessObjectSchemaParser = require("./business-object-schema-parser");
const PackageXmlParser = require("./package-xml-parser");
const ObjectExtractor = require("./object-extractor");
const ToolkitExtractor = require("./toolkit-extractor");

/**
 * Thin orchestrator for TWX extraction.
 *
 * Delegates package XML parsing, per-object extraction, and toolkit
 * extraction to dedicated modules, then assembles the combined result.
 */
class TWXExtractor {
	constructor() {
		this.packageParser = new PackageXmlParser();
		this.objectExtractor = new ObjectExtractor();
		this.toolkitExtractor = new ToolkitExtractor();
		this.businessObjectParser = new BusinessObjectSchemaParser();
	}

	/**
	 * Extract all data from a TWX file.
	 * @param {string} twxFilePath
	 * @returns {Promise<Object>}
	 */
	async extractTWX(twxFilePath) {
		try {
			console.log(`Extracting TWX file: ${twxFilePath}`);

			const data = fs.readFileSync(twxFilePath);
			const zip = new ADMZip(data);

			const packageData = await this.packageParser.extractPackageMetadata(zip);
			const dependencies = packageData.dependencies || [];
			const objects = await this.objectExtractor.extractObjects(zip, packageData.objectList);
			const toolkits = await this.toolkitExtractor.extractToolkits(zip);

			const taggedObjects = objects.map((obj) => ({
				...obj,
				source: "application",
			}));

			const allToolkitObjects = toolkits.flatMap((toolkit) => toolkit.objects || []);
			const allObjects = [...taggedObjects, ...allToolkitObjects];

			const businessObjects = allObjects.filter((obj) => obj.type === "twClass");
			if (businessObjects.length > 0) {
				console.log(`🔗 Resolving cross-references for ${businessObjects.length} business objects (app + toolkit)...`);
				this.resolveBusinessObjectCrossReferences(businessObjects);
			}

			console.log(`📊 Extraction Summary:`);
			console.log(`  - Application objects: ${taggedObjects.length}`);
			console.log(`  - Toolkit objects: ${allToolkitObjects.length}`);
			console.log(`  - Total objects: ${allObjects.length}`);
			console.log(`  - Toolkits: ${toolkits.length}`);

			return {
				metadata: packageData.metadata,
				dependencies: dependencies,
				objects: taggedObjects,
				toolkits: toolkits,
				allObjects: allObjects,
				extractedAt: new Date().toISOString(),
				sourceFile: path.basename(twxFilePath),
				statistics: {
					applicationObjects: taggedObjects.length,
					toolkitObjects: allToolkitObjects.length,
					totalObjects: allObjects.length,
					toolkitCount: toolkits.length,
				},
			};
		} catch (error) {
			console.error("Error extracting TWX file:", error);
			throw error;
		}
	}

	/**
	 * Extract all data from an already-extracted TWX directory.
	 * @param {string} twxDirPath
	 * @returns {Promise<Object>}
	 */
	async extractFromDirectory(twxDirPath) {
		try {
			console.log(`Extracting TWX directory: ${twxDirPath}`);

			const packageData = await this.packageParser.extractPackageMetadataFromDir(twxDirPath);
			const objects = await this.objectExtractor.extractObjectsFromDir(twxDirPath, packageData.objectList);
			const toolkits = [];

			const taggedObjects = objects.map((obj) => ({
				...obj,
				source: "application",
			}));

			const allToolkitObjects = toolkits.flatMap((toolkit) => toolkit.objects || []);
			const allObjects = [...taggedObjects, ...allToolkitObjects];

			return {
				metadata: packageData.metadata,
				objects: taggedObjects,
				toolkits: toolkits,
				allObjects: allObjects,
				extractedAt: new Date().toISOString(),
				sourceFile: path.basename(twxDirPath),
				statistics: {
					applicationObjects: taggedObjects.length,
					toolkitObjects: allToolkitObjects.length,
					totalObjects: allObjects.length,
					toolkitCount: toolkits.length,
				},
			};
		} catch (error) {
			console.error("Error extracting TWX directory:", error);
			throw error;
		}
	}

	/**
	 * Resolve cross-references for all business objects after processing.
	 * @param {Array} businessObjects
	 */
	resolveBusinessObjectCrossReferences(businessObjects) {
		if (!businessObjects || !Array.isArray(businessObjects)) {
			return;
		}

		console.log(`🔗 Resolving cross-references for ${businessObjects.length} business objects...`);

		businessObjects.forEach((businessObject) => {
			if (businessObject.details && businessObject.details.schema) {
				try {
					const resolvedSchema = this.businessObjectParser.resolveCustomTypes(businessObject.details.schema);
					businessObject.details.schema = resolvedSchema;
					businessObject.details.crossReferencesResolved = true;
				} catch (error) {
					console.warn(`Error resolving cross-references for ${businessObject.name}:`, error.message);
					businessObject.details.crossReferenceError = error.message;
				}
			}
		});

		const typeRegistry = require("../utils/business-object-type-registry");
		const stats = typeRegistry.getStats();
		console.log(`✅ Cross-reference resolution complete:`, stats);
	}
}

module.exports = TWXExtractor;
