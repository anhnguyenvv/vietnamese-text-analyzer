const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'node_modules', 'react-dev-utils', 'checkRequiredFiles.js');
const deprecatedUsage = 'fs.accessSync(filePath, fs.F_OK)';
const fixedUsage = 'fs.accessSync(filePath, fs.constants.F_OK)';

try {
  if (!fs.existsSync(targetFile)) {
    process.exit(0);
  }

  const currentContents = fs.readFileSync(targetFile, 'utf8');
  if (!currentContents.includes(deprecatedUsage)) {
    process.exit(0);
  }

  const updatedContents = currentContents.replace(deprecatedUsage, fixedUsage);
  fs.writeFileSync(targetFile, updatedContents, 'utf8');
  console.log('[postinstall] patched react-dev-utils/checkRequiredFiles.js for DEP0176');
} catch (error) {
  console.warn('[postinstall] unable to patch react-dev-utils/checkRequiredFiles.js:', error.message);
}
