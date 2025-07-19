// Quick test to verify version import works
import { CONFIG } from './src/config/constants.js';
import packageJson from './package.json' with { type: 'json' };

console.log('CONFIG.VERSION:', CONFIG.VERSION);
console.log('package.json version:', packageJson.version);
console.log('Versions match:', CONFIG.VERSION === packageJson.version);
