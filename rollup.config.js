import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/tampermonkey-script.js',
    format: 'iife',
    banner: `// ==UserScript==
// @name         Alert Debug Shortcut (Refactored)
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Keyboard shortcuts with notes, tags, filtering, and bulk processing
// @author       Batakal Ashok
// @match        https://analytics-kpis.netradyne.com/alert-debug
// @grant        none
// ==/UserScript==`,
  },
  plugins: [
    nodeResolve()
  ]
};
