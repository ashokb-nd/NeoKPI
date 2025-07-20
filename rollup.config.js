import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

export default {
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
  plugins: [json(), nodeResolve()],
};
