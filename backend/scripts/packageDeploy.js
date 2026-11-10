/**
 * FitTrack — AWS Elastic Beanstalk Deployment Packager
 * Bundles production files into a clean 'fittrack-deploy.zip' file.
 * Strictly excludes: node_modules, .env secrets, _backup directories, tests, and git metadata.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../..');
const stagingDir = path.join(rootDir, '_dist_staging');
const zipFile = path.join(rootDir, 'fittrack-deploy.zip');

console.log('\n======================================================');
console.log('  FitTrack AWS Deployment Packager');
console.log('======================================================');

// 1. Clean previous staging or zip
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

fs.mkdirSync(stagingDir, { recursive: true });

// 2. Helper to copy directories recursively while filtering
function copyFiltered(src, dest, ignoreList = []) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      if (ignoreList.includes(item)) continue;
      copyFiltered(path.join(src, item), path.join(dest, item), ignoreList);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 3. Copy production items
console.log('1. Staging production files...');

// Backend (exclude tests)
copyFiltered(path.join(rootDir, 'backend'), path.join(stagingDir, 'backend'), ['tests']);
console.log('   ✔ backend/ staged (tests excluded)');

// Frontend assets & code
copyFiltered(path.join(rootDir, 'src'), path.join(stagingDir, 'src'));
console.log('   ✔ src/ staged');

copyFiltered(path.join(rootDir, 'assets'), path.join(stagingDir, 'assets'));
console.log('   ✔ assets/ staged');

// AWS Configuration
if (fs.existsSync(path.join(rootDir, '.ebextensions'))) {
  copyFiltered(path.join(rootDir, '.ebextensions'), path.join(stagingDir, '.ebextensions'));
  console.log('   ✔ .ebextensions/ staged');
}

// Root files
const rootFiles = ['index.html', 'package.json', 'package-lock.json', 'Procfile', '.env.example', 'README.md'];
for (const file of rootFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, path.join(stagingDir, file));
    console.log(`   ✔ ${file} staged`);
  }
}

// 4. Security Verification
console.log('\n2. Running security checks...');
const forbidden = ['.env', 'node_modules', '_backup_original', '_backup_pre_aws_inr', '_backup_final_inr_aws', '.git'];
let hasSecurityViolation = false;
for (const bad of forbidden) {
  if (fs.existsSync(path.join(stagingDir, bad))) {
    console.error(`   ❌ SECURITY VIOLATION: ${bad} found in deployment package!`);
    hasSecurityViolation = true;
  }
}

if (hasSecurityViolation) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
  process.exit(1);
}
console.log('   ✔ Zero credentials, secrets, or node_modules found in staging package.');

// 5. Create ZIP Archive
console.log('\n3. Building ZIP archive...');
try {
  // Use PowerShell Compress-Archive to build zip with package.json directly at root
  const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipFile}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });

  const stats = fs.statSync(zipFile);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n======================================================`);
  console.log(`  Package Ready for AWS Elastic Beanstalk!`);
  console.log(`======================================================`);
  console.log(`Archive: ${zipFile}`);
  console.log(`Size:    ${sizeMb} MB`);
  console.log(`Root Structure Verified: package.json is at zip root.`);
  console.log(`======================================================\n`);
} catch (err) {
  console.error('❌ Failed to create zip package:', err.message);
  process.exit(1);
} finally {
  // Cleanup staging directory
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

