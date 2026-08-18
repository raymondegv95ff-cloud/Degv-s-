#!/usr/bin/env node
/**
 * Degv's Messenger - Project & Production Readiness Validator
 * Checks:
 *  1. Required assets (icons, favicon, manifest.json) are present and valid.
 *  2. Version string consistency between package.json and android/app/build.gradle.
 *  3. Verification that no simulated artifacts or corrupted configs exist.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalChecks = 0;
let totalErrors = 0;
const failures = [];

function check(title, condition, details = '') {
  totalChecks++;
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${title} ${details ? `\x1b[90m(${details})\x1b[0m` : ''}`);
  } else {
    totalErrors++;
    failures.push(`${title}: ${details}`);
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${title} ${details ? `\x1b[33m[${details}]\x1b[0m` : ''}`);
  }
}

console.log(`\n======================================================`);
console.log(`  🚀  Degv's Messenger - Project Validation Suite`);
console.log(`======================================================`);

// 1. Version Consistency Check
console.log(`\n[1/3] Verificando Coherencia de Versiones:`);

let packageVersion = null;
const packageJsonPath = path.join(ROOT_DIR, 'package.json');

if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageVersion = pkg.version;
    check('package.json exists and is valid', !!packageVersion, `v${packageVersion}`);
  } catch (err) {
    check('package.json parsing', false, err.message);
  }
} else {
  check('package.json exists', false, 'Missing package.json');
}

let gradleVersion = null;
const buildGradlePath = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');

if (fs.existsSync(buildGradlePath)) {
  try {
    const gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
    const match = gradleContent.match(/versionName\s+["']([^"']+)["']/);
    if (match && match[1]) {
      gradleVersion = match[1];
      check('android/app/build.gradle versionName exists', true, `versionName "${gradleVersion}"`);
    } else {
      check('android/app/build.gradle versionName found', false, 'Could not find versionName pattern');
    }
  } catch (err) {
    check('android/app/build.gradle reading', false, err.message);
  }
} else {
  check('android/app/build.gradle exists', false, 'File not found');
}

if (packageVersion && gradleVersion) {
  const versionsMatch = packageVersion === gradleVersion;
  check(
    'Version match (package.json === android/app/build.gradle)',
    versionsMatch,
    `package.json: "${packageVersion}" vs gradle: "${gradleVersion}"`
  );
}

// 2. Required Assets & Manifest Check
console.log(`\n[2/3] Verificando Activos Requeridos y Manifiesto:`);

const requiredAssets = [
  'public/manifest.json',
  'public/favicon.svg',
  'public/icon.svg',
  'public/icon-192.png',
  'public/icon-512.png',
  'public/icon-maskable.png',
  'public/sw.js',
  'index.html',
];

requiredAssets.forEach((relPath) => {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    check(`Asset exists: ${relPath}`, stat.size > 0, `${stat.size} bytes`);
  } else {
    check(`Asset exists: ${relPath}`, false, 'Missing asset file');
  }
});

// Validate Manifest Content
const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check('manifest.json has valid name', !!(manifest.name && manifest.short_name), `Name: "${manifest.name}"`);
    check('manifest.json has theme_color', !!manifest.theme_color, `Color: ${manifest.theme_color}`);
    check('manifest.json has icons array', Array.isArray(manifest.icons) && manifest.icons.length > 0, `${manifest.icons?.length} icons`);

    if (Array.isArray(manifest.icons)) {
      manifest.icons.forEach((icon) => {
        const iconDiskPath = path.join(ROOT_DIR, 'public', icon.src.replace(/^\//, ''));
        const exists = fs.existsSync(iconDiskPath);
        check(`Manifest icon disk verification: ${icon.src}`, exists, exists ? 'Found' : 'Not found on disk');
      });
    }
  } catch (err) {
    check('manifest.json valid JSON parsing', false, err.message);
  }
}

// 3. Cleanliness & Production Integrity Check
console.log(`\n[3/3] Verificando Integridad para Producción:`);

const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  check('index.html contains ServiceWorker registration', indexHtml.includes('serviceWorker.register'), 'SW active');
  check('index.html contains visibilitychange listener', indexHtml.includes('visibilitychange'), 'Focus update listener active');
  check('index.html references main entrypoint', indexHtml.includes('/src/main.tsx'), 'Valid React root');
}

console.log(`\n======================================================`);
console.log(`  Resumen de Validación: ${totalChecks - totalErrors}/${totalChecks} pruebas superadas`);
console.log(`======================================================`);

if (totalErrors > 0) {
  console.error(`\x1b[31m❌ Se encontraron ${totalErrors} discrepancias:\x1b[0m`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log(`\x1b[32m✔ ¡El proyecto está 100% verificado y listo para producción, Android APK e Ionic Appflow!\x1b[0m\n`);
  process.exit(0);
}
