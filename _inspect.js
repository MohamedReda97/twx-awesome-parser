const AdmZip = require('adm-zip');
const z = new AdmZip('ODC.twx');
const pkg = z.getEntry('META-INF/package.xml');
if (pkg) {
  console.log(pkg.getData().toString('utf8'));
}
