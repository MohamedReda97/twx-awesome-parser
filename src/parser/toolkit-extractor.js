const path = require("path");
const ADMZip = require("adm-zip");
const PackageXmlParser = require("./package-xml-parser");
const ObjectExtractor = require("./object-extractor");

/**
 * Extracts toolkit ZIPs embedded inside a TWX archive.
 *
 * Scans the `toolkits/` folder for ZIP archives, opens each, and uses
 * PackageXmlParser + ObjectExtractor to pull out metadata and objects.
 */
class ToolkitExtractor {
	constructor() {
		this.packageParser = new PackageXmlParser();
		this.objectExtractor = new ObjectExtractor();
		this.diagnostics = [];
	}

	/**
	 * @param {ADMZip} zip — the outer TWX zip
	 * @returns {Promise<Array>} array of toolkit descriptors
	 */
	async extractToolkits(zip) {
		const toolkits = [];
		this.diagnostics = [];
		const entries = zip.getEntries();

		console.log("🔍 Scanning for toolkits...");
		console.log(`📁 Total entries in TWX: ${entries.length}`);

		for (const entry of entries) {
			if (entry.entryName.startsWith("toolkits/") && (entry.entryName.endsWith(".zip") || entry.entryName.endsWith(".twx"))) {
				try {
					console.log(`📦 Processing toolkit ZIP: ${entry.entryName}`);

					const toolkitData = entry.getData();
					const toolkitZip = new ADMZip(toolkitData);

					const toolkitInfo = await this.packageParser.extractPackageMetadata(toolkitZip);

					console.log(`✅ Found toolkit: ${toolkitInfo.metadata.project.name} (isToolkit: ${toolkitInfo.metadata.project.isToolkit})`);

					const toolkitObjects = await this.objectExtractor.extractObjects(toolkitZip, toolkitInfo.objectList);

					const taggedObjects = toolkitObjects.map((obj) => ({
						...obj,
						source: "toolkit",
						toolkitInfo: {
							fileName: path.basename(entry.entryName),
							name: toolkitInfo.metadata.project.name,
							shortName: toolkitInfo.metadata.project.shortName,
							id: toolkitInfo.metadata.project.id,
							isSystem: toolkitInfo.metadata.project.isSystem,
						},
					}));

					console.log(`✅ Extracted ${taggedObjects.length} objects from toolkit: ${toolkitInfo.metadata.project.name}`);

					toolkits.push({
						fileName: path.basename(entry.entryName),
						metadata: toolkitInfo.metadata,
						objectCount: toolkitInfo.objectList.length,
						objects: taggedObjects,
					});
				} catch (error) {
					console.warn(`❌ Error processing toolkit ${entry.entryName}:`, error.message);
					console.warn(`Error details:`, error);
					this.diagnostics.push({
						code: "TOOLKIT_EXTRACTION_FAILED",
						fileName: path.basename(entry.entryName),
						message: error.message,
					});
				}
			}
		}

		if (toolkits.length === 0) {
			console.log("🔍 No toolkits found. TWX file structure:");
			entries.forEach(entry => {
				if (entry.entryName.includes("toolkit") || entry.entryName.endsWith(".zip")) {
					console.log(`  📁 ${entry.entryName} (${entry.header.size} bytes)`);
				}
			});

			console.log("🔍 Looking for any ZIP files that might be toolkits:");
			for (const entry of entries) {
				if (entry.entryName.endsWith(".zip")) {
					console.log(`  📦 Found ZIP file: ${entry.entryName}`);
					try {
						const zipData = entry.getData();
						const innerZip = new ADMZip(zipData);
						const innerEntries = innerZip.getEntries();
						
						const hasMetaInf = innerEntries.some(e => e.entryName.startsWith("META-INF/"));
						const hasObjects = innerEntries.some(e => e.entryName.startsWith("objects/"));
						
						console.log(`    - Has META-INF: ${hasMetaInf}, Has objects: ${hasObjects}`);
						
						if (hasMetaInf) {
							try {
								const toolkitInfo = await this.packageParser.extractPackageMetadata(innerZip);
								console.log(`    - Project name: ${toolkitInfo.metadata.project.name}`);
								console.log(`    - Is toolkit: ${toolkitInfo.metadata.project.isToolkit}`);
								console.log(`    - Object count: ${toolkitInfo.objectList.length}`);
							} catch (metaError) {
								console.log(`    - Error reading metadata: ${metaError.message}`);
							}
						}
					} catch (zipError) {
						console.log(`    - Error reading ZIP: ${zipError.message}`);
					}
				}
			}
		}

		console.log(`📊 Total toolkits processed: ${toolkits.length}`);
		return toolkits;
	}
}

module.exports = ToolkitExtractor;
