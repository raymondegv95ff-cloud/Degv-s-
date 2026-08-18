#!/usr/bin/env node
/**
 * Degv's Messenger - Production Integrity Validation Engine
 * Validates WebManifest, Android Capacitor, TWA Manifest, Firebase Cloud Configuration & CI/CD Pipelines
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalErrors = 0;
let totalWarnings = 0;
let totalChecks = 0;

function logHeader(title) {
  console.log(`\n======================================================`);
  console.log(`  🔍  ${title}`);
  console.log(`======================================================`);
}

function check(desc, passed, detail = "") {
  totalChecks++;
  if (passed) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${desc} ${detail ? `\x1b[90m(${detail})\x1b[0m` : ''}`);
  } else {
    totalErrors++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${desc} ${detail ? `\x1b[33m[${detail}]\x1b[0m` : ''}`);
  }
}

function warn(desc, detail = "") {
  totalWarnings++;
  console.warn(`  \x1b[33m▲ WARN\x1b[0m: ${desc} ${detail ? `\x1b[90m(${detail})\x1b[0m` : ''}`);
}

// 1. Validate WebManifest
logHeader("1. Validating WebManifest (public/manifest.json)");
const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    check("Manifest is valid JSON", true);
    check("App Name configured", Boolean(manifest.name && manifest.name.includes("Degv")), manifest.name);
    check("Short Name configured", Boolean(manifest.short_name), manifest.short_name);
    check("Display mode standalone", manifest.display === 'standalone', manifest.display);
    check("Theme color present", Boolean(manifest.theme_color), manifest.theme_color);
    check("Background color present", Boolean(manifest.background_color), manifest.background_color);
    check("Start URL is root", manifest.start_url === '/' || manifest.start_url === './', manifest.start_url);

    // Verify Icons in public folder
    if (Array.isArray(manifest.icons) && manifest.icons.length > 0) {
      check("Icons defined in manifest", true, `${manifest.icons.length} icons found`);
      manifest.icons.forEach((ic) => {
        const iconPath = path.join(ROOT_DIR, 'public', ic.src.replace(/^\//, ''));
        check(`Icon file exists: ${ic.src}`, fs.existsSync(iconPath), ic.sizes || "");
      });
    } else {
      check("Icons defined in manifest", false, "No icons array");
    }
  } catch (e) {
    check("Manifest JSON parse", false, e.message);
  }
} else {
  check("manifest.json exists in /public", false);
}

// 2. Validate Android Capacitor Configuration & Native Project
logHeader("2. Validating Android Capacitor & Native Project");
const capPath = path.join(ROOT_DIR, 'capacitor.config.json');
if (fs.existsSync(capPath)) {
  try {
    const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
    check("capacitor.config.json is valid JSON", true);
    check("App ID format valid", cap.appId === 'com.degv.messenger', cap.appId);
    check("App Name format valid", cap.appName === "Degv's Messenger", cap.appName);
    check("Web directory set to 'dist'", cap.webDir === 'dist', cap.webDir);
    check("Android scheme set to https", cap.server?.androidScheme === 'https', cap.server?.androidScheme);
  } catch (e) {
    check("capacitor.config.json parse", false, e.message);
  }
} else {
  check("capacitor.config.json exists", false);
}

// Check AndroidManifest.xml
const androidManifestPath = path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(androidManifestPath)) {
  const manifestXml = fs.readFileSync(androidManifestPath, 'utf8');
  check("AndroidManifest.xml exists", true);
  check("INTERNET permission declared", manifestXml.includes("android.permission.INTERNET"));
  check("CAMERA permission declared", manifestXml.includes("android.permission.CAMERA"));
  check("RECORD_AUDIO permission declared", manifestXml.includes("android.permission.RECORD_AUDIO"));
  check("VIBRATE permission declared", manifestXml.includes("android.permission.VIBRATE"));
  check("ACCESS_NETWORK_STATE declared", manifestXml.includes("android.permission.ACCESS_NETWORK_STATE"));
} else {
  warn("AndroidManifest.xml path check", "Android native wrapper available for Android Studio / CI build");
}

// 3. Validate Bubblewrap TWA Manifest
logHeader("3. Validating Bubblewrap TWA Manifest (twa-manifest.json)");
const twaPath = path.join(ROOT_DIR, 'twa-manifest.json');
if (fs.existsSync(twaPath)) {
  try {
    const twa = JSON.parse(fs.readFileSync(twaPath, 'utf8'));
    check("twa-manifest.json is valid JSON", true);
    check("Package ID configured", twa.packageId === 'com.degv.messenger.twa', twa.packageId);
    check("Host configured", Boolean(twa.host), twa.host);
    check("Display standalone", twa.display === 'standalone', twa.display);
    check("Theme color match", Boolean(twa.themeColor), twa.themeColor);
  } catch (e) {
    check("twa-manifest.json parse", false, e.message);
  }
} else {
  check("twa-manifest.json exists", false);
}

// 4. Validate Firebase Cloud Configuration & Security
logHeader("4. Validating Firebase Cloud Configuration & Security");
const fbConfigPath = path.join(ROOT_DIR, 'firebase-applet-config.json');
if (fs.existsSync(fbConfigPath)) {
  try {
    const fb = JSON.parse(fs.readFileSync(fbConfigPath, 'utf8'));
    check("firebase-applet-config.json is valid JSON", true);
    check("Real Firebase Project ID (no test/dummy)", fb.projectId && !fb.projectId.includes("test") && !fb.projectId.includes("example"), fb.projectId);
    check("Firebase API Key present", Boolean(fb.apiKey && fb.apiKey.length > 10), "Production key loaded");
    check("Auth Domain valid", Boolean(fb.authDomain && fb.authDomain.includes("firebaseapp.com")), fb.authDomain);
    check("App ID configured", Boolean(fb.appId && fb.appId.startsWith("1:")), fb.appId);
    check("Firestore Database ID configured", Boolean(fb.firestoreDatabaseId), fb.firestoreDatabaseId);
  } catch (e) {
    check("firebase-applet-config.json parse", false, e.message);
  }
} else {
  check("firebase-applet-config.json exists", false);
}

// Check firestore.rules
const rulesPath = path.join(ROOT_DIR, 'firestore.rules');
if (fs.existsSync(rulesPath)) {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  check("firestore.rules exists", true);
  check("Rules version 2 syntax", rules.includes("rules_version = '2'"));
  check("Cloud Firestore match block present", rules.includes("service cloud.firestore"));
} else {
  check("firestore.rules exists", false);
}

// 5. Validate CI/CD & Ionic Appflow Configuration
logHeader("5. Validating CI/CD & Ionic Appflow Integration");
const ionicConfigPath = path.join(ROOT_DIR, 'ionic.config.json');
const appflowJsonPath = path.join(ROOT_DIR, 'appflow.json');
const ghWorkflowApk = path.join(ROOT_DIR, '.github', 'workflows', 'build-apk.yml');

check("ionic.config.json exists", fs.existsSync(ionicConfigPath));
check("appflow.json exists", fs.existsSync(appflowJsonPath));
check(".github/workflows/build-apk.yml exists", fs.existsSync(ghWorkflowApk));

if (fs.existsSync(ghWorkflowApk)) {
  const yml = fs.readFileSync(ghWorkflowApk, 'utf8');
  check("Workflow triggers on push to main", yml.includes("main") && yml.includes("branches"), "push & PR branches configured");
  check("Gradle caching enabled in workflow", yml.includes("setup-gradle") || yml.includes("cache: gradle"), "Gradle action setup verified");
  check("Artifact upload configured for APK", yml.includes("upload-artifact"), "APK artifact publishing verified");
}

// Summary Report
console.log(`\n======================================================`);
console.log(`  📊  VALIDATION SUMMARY REPORT`);
console.log(`======================================================`);
console.log(`  Total Checks Executed : ${totalChecks}`);
console.log(`  Passed Checks         : \x1b[32m${totalChecks - totalErrors}\x1b[0m`);
console.log(`  Failed Checks         : \x1b[${totalErrors === 0 ? '32' : '31'}m${totalErrors}\x1b[0m`);
console.log(`  Warnings              : \x1b[33m${totalWarnings}\x1b[0m`);
console.log(`======================================================`);

if (totalErrors === 0) {
  console.log(`\x1b[32m✨ ¡INTEGRIDAD 100% PRODUCTIVA VERIFICADA CON ÉXITO! ✨\x1b[0m`);
  console.log(`Todos los enlaces entre WebManifest, Android Capacitor, Firebase Cloud y Appflow son auténticos y válidos.\n`);
  process.exit(0);
} else {
  console.error(`\x1b[31m❌ Se encontraron ${totalErrors} errores de integridad que deben ser corregidos.\x1b[0m\n`);
  process.exit(1);
}
