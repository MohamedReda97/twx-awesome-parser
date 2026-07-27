const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const { getTypeName } = require("../utils/type-mappings");

/**
 * Parses META-INF/package.xml from a TWX archive or extracted directory.
 */
class PackageXmlParser {
	constructor() {
		this.parser = new xml2js.Parser({
			explicitArray: false,
			ignoreAttrs: false,
			mergeAttrs: true,
		});
	}

	/**
	 * Parse metadata from a package.xml stored inside a ZIP.
	 * @param {ADMZip} zip
	 * @returns {Promise<{metadata: Object, objectList: Array}>}
	 */
	async extractPackageMetadata(zip) {
		const packageEntry = zip.getEntry("META-INF/package.xml");
		if (!packageEntry) {
			throw new Error("META-INF/package.xml not found in TWX file");
		}

		const packageXml = packageEntry.getData().toString("utf8");
		return this._parsePackageXml(packageXml);
	}

	/**
	 * Parse metadata from a package.xml on disk.
	 * @param {string} twxDirPath
	 * @returns {Promise<{metadata: Object, objectList: Array}>}
	 */
	async extractPackageMetadataFromDir(twxDirPath) {
		const packagePath = path.join(twxDirPath, "META-INF", "package.xml");
		if (!fs.existsSync(packagePath)) {
			throw new Error(`META-INF/package.xml not found in directory: ${twxDirPath}`);
		}

		const packageXml = fs.readFileSync(packagePath, "utf8");
		return this._parsePackageXml(packageXml);
	}

	/**
	 * Shared parser for the XML content.
	 * @param {string} packageXml
	 * @returns {Promise<{metadata: Object, objectList: Array}>}
	 */
	async _parsePackageXml(packageXml) {
		const packageData = await this.parser.parseStringPromise(packageXml);

		const pkg = packageData["p:package"] || packageData.package;

		const target = pkg.target;
		const project = target.project;
		const branch = target.branch;
		const snapshot = target.snapshot;

		const metadata = {
			project: {
				id: project.id,
				name: project.name,
				shortName: project.shortName,
				description: project.description || "",
				isToolkit: project.isToolkit === "true",
				isSystem: project.isSystem === "true",
			},
			branch: {
				id: branch.id,
				name: branch.name,
				description: branch.description || "",
			},
			snapshot: {
				id: snapshot.id,
				name: snapshot.name,
				description: snapshot.description || "",
				creationDate: snapshot.originalCreationDate,
			},
			buildInfo: {
				buildId: pkg.buildId,
				buildVersion: pkg.buildVersion,
				buildDescription: pkg.buildDescription,
			},
		};

		const objectList = [];
		if (pkg.objects && pkg.objects.object) {
			const objects = Array.isArray(pkg.objects.object) ? pkg.objects.object : [pkg.objects.object];
			objects.forEach((obj) => {
				objectList.push({
					id: obj.id,
					versionId: obj.versionId,
					name: obj.name,
					type: obj.type,
					typeName: getTypeName(obj.type),
				});
			});
		}

		// ponytail: extract toolkit dependencies (v1 – per-object deps are v2)
		const dependencies = [];
		if (pkg.dependencies && pkg.dependencies.dependency) {
			const deps = Array.isArray(pkg.dependencies.dependency)
				? pkg.dependencies.dependency
				: [pkg.dependencies.dependency];
			deps.forEach((dep) => {
				dependencies.push({
					id: dep.id,
					name: dep.project ? dep.project.name : null,
					shortName: dep.project ? dep.project.shortName : null,
					version: dep.snapshot ? dep.snapshot.name : null,
				});
			});
		}

		return { metadata, objectList, dependencies };
	}
}

module.exports = PackageXmlParser;
