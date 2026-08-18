#!/usr/bin/env node
/**
 * Degv's Messenger - Version & Manifest Resource Validator
 * Validates that versionName in android/app/build.gradle matches version in package.json
 * and verifies all manifest resources (icons, theme_color, background_color) exist in the project structure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalChecks = 0;
let totalErrors = 0;
const discrepancies = [];

function check(title, condition, details = "") {
  totalChecks++;
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${title} ${details ? `\x1b[90m(${details})\x1b[0m` : ''}`);
  } else {
    totalErrors++;
    const errMsg = `[FAIL] ${title}: ${details}`;
    discrepancies.push(errMsg);
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${title} ${details ? `\x1b[33m[${details}]\x1b[0m` : ''}`);
  }
}

console.log(`\n======================================================`);
console.log(`  🔍  1. Validating Version Consistency Across Ecosystem`);
console.log(`======================================================`);

// 1. Check package.json version
const packageJsonPath = path.join(ROOT_DIR, 'package.json');
let packageVersion = null;

if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageVersion = pkg.version;
    check("package.json exists and is valid JSON", true, `version: ${packageVersion}`);
  } catch (err) {
    check("package.json parsing", false, err.message);
  }
} else {
  check("package.json exists", false, "File not found at root");
}

// 2. Check android/app/build.gradle versionName
const buildGradlePath = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');
let gradleVersionName = null;

if (fs.existsSync(buildGradlePath)) {
  try {
    const gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
    const match = gradleContent.match(/versionName\s+["']([^"']+)["']/);
    if (match && match[1]) {
      gradleVersionName = match[1];
      check("android/app/build.gradle has versionName", true, `versionName: "${gradleVersionName}"`);
    } else {
      check("android/app/build.gradle has versionName", false, "No versionName string found in build.gradle");
    }
  } catch (err) {
    check("android/app/build.gradle read error", false, err.message);
  }
} else {
  check("android/app/build.gradle exists", false, "File not found at android/app/build.gradle");
}

// 3. Compare package.json version vs build.gradle versionName
if (packageVersion && gradleVersionName) {
  const versionsMatch = packageVersion === gradleVersionName;
  check(
    "Version Synchronization (package.json version === android build.gradle versionName)",
    versionsMatch,
    versionsMatch
      ? `Synchronized at v${packageVersion}`
      : `Discrepancy: package.json='${packageVersion}' vs build.gradle='${gradleVersionName}'`
  );
}

console.log(`\n======================================================`);
console.log(`  🎨  2. Validating WebManifest & Native Resources`);
console.log(`======================================================`);

const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check("manifest.json exists and is valid JSON", true);

    // Theme Color Check
    const hasThemeColor = Boolean(manifest.theme_color && /^#[0-9A-Fa-f]{6}$/.test(manifest.theme_color));
    check("manifest.json has valid theme_color", hasThemeColor, manifest.theme_color || "missing");

    // Background Color Check
    const hasBgColor = Boolean(manifest.background_color && /^#[0-9A-Fa-f]{6}$/.test(manifest.background_color));
    check("manifest.json has valid background_color", hasBgColor, manifest.background_color || "missing");

    // App Name checks
    check("manifest.json has name", Boolean(manifest.name && manifest.name.trim().length > 0), manifest.name);
    check("manifest.json has short_name", Boolean(manifest.short_name && manifest.short_name.trim().length > 0), manifest.short_name);

    // Validate Icons existence in file structure
    if (Array.isArray(manifest.icons) && manifest.icons.length > 0) {
      check("manifest.json defines icons array", true, `${manifest.icons.length} icons declared`);

      manifest.icons.forEach((iconDef, idx) => {
        const rawSrc = iconDef.src || "";
        const cleanSrc = rawSrc.replace(/^\//, '');
        const targetPath = path.join(ROOT_DIR, 'public', cleanSrc);
        const exists = fs.existsSync(targetPath);
        
        let sizeDetails = iconDef.sizes || "unspecified";
        if (exists) {
          const stats = fs.statSync(targetPath);
          sizeDetails += `, ${stats.size} bytes`;
        }

        check(
          `Icon #${idx + 1} exists in file structure (${rawSrc})`,
          exists && fs.statSync(targetPath).size > 0,
          sizeDetails
        );
      });
    } else {
      check("manifest.json icons array present", false, "No icons array declared in manifest.json");
    }

    // Verify index.html theme-color aligns with manifest
    const indexPath = path.join(ROOT_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      const themeColorMatch = indexContent.match(/<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/i);
      if (themeColorMatch && themeColorMatch[1]) {
        const indexThemeColor = themeColorMatch[1];
        const colorsMatch = indexThemeColor.toLowerCase() === (manifest.theme_color || "").toLowerCase();
        check(
          "index.html <meta name='theme-color'> matches manifest theme_color",
          colorsMatch,
          `index.html: ${indexThemeColor} | manifest: ${manifest.theme_color}`
        );
      } else {
        check("index.html contains <meta name='theme-color'>", false, "Tag missing in index.html");
      }
    }
  } catch (err) {
    check("manifest.json parsing", false, err.message);
  }
} else {
  check("public/manifest.json exists", false, "File missing at public/manifest.json");
}

console.log(`\n======================================================`);
console.log(`  📊  VALIDATION SUMMARY & DISCREPANCY REPORT`);
console.log(`======================================================`);
console.log(`  Total Checks Executed : ${totalChecks}`);
console.log(`  Passed Checks         : \x1b[32m${totalChecks - totalErrors}\x1b[0m`);
console.log(`  Discrepancies / Fails : ${totalErrors > 0 ? `\x1b[31m${totalErrors}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
console.log(`======================================================`);

if (totalErrors > 0) {
  console.error(`\n\x1b[31m❌ Se encontraron ${totalErrors} discrepancias:\x1b[0m`);
  discrepancies.forEach((d) => console.error(`  - ${d}`));
  process.exit(1);
} else {
  console.log(`\x1b[32m✨ ¡TODAS LAS VERSIONES Y RECURSOS DEL MANIFEST ESTÁN 100% SINCRONIZADOS! ✨\x1b[0m\n`);
  process.exit(0);
}
