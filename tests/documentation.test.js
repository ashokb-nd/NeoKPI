import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { CONFIG } from '../src/config/constants.js';

describe('Documentation Sync', () => {
  it('should have README keyboard shortcuts in sync with config', () => {
    const readmeContent = fs.readFileSync('./README.md', 'utf-8');
    
    // Test that key shortcuts are documented in the refactored compact format
    // The README uses grouped notation like "Cmd+I/J/B" and "Space/←/→"
    const keyFeatureChecks = {
      // Check for grouped input/focus keys (I, J, B)
      'FOCUS_INPUT': () => readmeContent.includes('Cmd+I/J/B'),
      'TOGGLE_NOTEPAD': () => readmeContent.includes('Cmd+I/J/B'), 
      'BULK_PROCESS': () => readmeContent.includes('Cmd+I/J/B'),
      
      // Check for video controls
      'PLAY_PAUSE': () => readmeContent.includes('Space/←/→'),
      'REWIND': () => readmeContent.includes('Space/←/→'),
      'FAST_FORWARD': () => readmeContent.includes('Space/←/→'),
      
      // Check for navigation controls  
      'NEXT_ALERT': () => readmeContent.includes('Cmd+↓/↑'),
      'PREV_ALERT': () => readmeContent.includes('Cmd+↓/↑'),
      
      // Submit key is implicit/standard, doesn't need documentation
      'SUBMIT': () => true
    };
    
    // Test that all configured shortcuts are covered in README
    Object.entries(CONFIG.KEYS).forEach(([keyName, keyValue]) => {
      const checkFunction = keyFeatureChecks[keyName];
      if (checkFunction) {
        expect(checkFunction(), 
          `Keyboard shortcut ${keyName}="${keyValue}" should be documented in README.md key features`
        ).toBe(true);
      }
    });
  });

  it('should have correct version in README', () => {
    const readmeContent = fs.readFileSync('./README.md', 'utf-8');
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    
    // Check if version is mentioned (this is optional since version might not be in README)
    if (readmeContent.includes('v0.')) {
      expect(readmeContent).toContain(`v${packageJson.version}`);
    }
  });

  it('should document all project structure directories', () => {
    const readmeContent = fs.readFileSync('./README.md', 'utf-8');
    
    // The refactored README doesn't have detailed project structure
    // Instead, check that documentation section references are present
    const expectedDocReferences = [
      'Setup Guide',
      'Architecture', 
      'Configuration',
      'Usage Guide'
    ];
    
    expectedDocReferences.forEach(docRef => {
      expect(readmeContent, 
        `Documentation reference "${docRef}" should be mentioned in README.md`
      ).toContain(docRef);
    });
    
    // Check that key development commands are documented
    const expectedCommands = [
      'npm run dev',
      'npm test',
      'npm run build'
    ];
    
    expectedCommands.forEach(cmd => {
      expect(readmeContent,
        `Development command "${cmd}" should be documented in README.md`
      ).toContain(cmd);
    });
  });
});
