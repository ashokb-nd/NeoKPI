import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

// Chrome Extension build configuration
const chromeExtensionConfig = {
  input: "src/index.js",
  output: {
    file: "dist/chrome-extension/content-script.js",
    format: "iife",
    banner: `// NeoKPI Chrome Extension Content Script
// Version: ${packageJson.version}
// Generated: ${new Date().toISOString()}`,
  banner: `// NeoKPI Chrome Extension Content Script
// Version: ${packageJson.version}
// Generated: ${new Date().toISOString()}`,
  },
  plugins: [nodeResolve(), json()],
};

// Tampermonkey UserScript build configuration  
const tampermonkeyConfig = {
  input: "src/index.js",
  output: {
    file: "dist/tampermonkey-script.js",
    format: "iife",
    banner: `// ==UserScript==
// @name         Alert Debug Shortcut (Refactored)
// @namespace    http://tampermonkey.net/
// @version      ${packageJson.version}
// @description  Keyboard shortcuts with notes, tags, filtering, and bulk processing
// @author       Batakal Ashok
// @match        https://analytics-kpis.netradyne.com/alert-debug
// @grant        none
// ==/UserScript==`,
  },
  plugins: [nodeResolve(), json()],
};

// Post-build function to copy Chrome Extension files
function copyExtensionFiles() {
  const distDir = 'dist/chrome-extension';
  
  // Ensure directory exists
  mkdirSync(distDir, { recursive: true });
  mkdirSync(`${distDir}/icons`, { recursive: true });
  
  // Copy manifest.json
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
  manifest.version = packageJson.version;
  writeFileSync(`${distDir}/manifest.json`, JSON.stringify(manifest, null, 2));
  
  // Copy popup files
  writeFileSync(`${distDir}/popup.html`, readFileSync('popup.html', 'utf8'));
  writeFileSync(`${distDir}/popup.js`, readFileSync('popup.js', 'utf8'));
  
  // Copy icons if they exist
  try {
    writeFileSync(`${distDir}/icons/icon16.png`, readFileSync('icons/icon16.png'));
    writeFileSync(`${distDir}/icons/icon48.png`, readFileSync('icons/icon48.png'));
    writeFileSync(`${distDir}/icons/icon128.png`, readFileSync('icons/icon128.png'));
    console.log('✅ Icons copied to extension');
  } catch (e) {
    console.log('⚠️  Icons not found - extension will work but won\'t have custom icons');
  }
  
  console.log('✅ Chrome Extension files copied to dist/chrome-extension/');
  console.log('📁 Ready to load as unpacked extension in Chrome');
}

// Build both Tampermonkey and Chrome Extension versions
export default [chromeExtensionConfig, tampermonkeyConfig].map(config => ({
  ...config,
  plugins: [
    ...config.plugins,
    {
      name: 'post-build',
      writeBundle() {
        if (config === chromeExtensionConfig) {
          copyExtensionFiles();
        }
      }
    }
  ]
}));
