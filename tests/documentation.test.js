import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { CONFIG } from '../src/config/constants.js';

describe('Documentation Sync', () => {
  it('should have README keyboard shortcuts in sync with config', () => {
    const readmeContent = fs.readFileSync('./README.md', 'utf-8');
    
    // Test that all keyboard shortcuts from config are documented
    Object.entries(CONFIG.KEYS).forEach(([keyName, keyValue]) => {
      // Format the key for display
      const displayKey = keyValue
        .replace('ArrowLeft', '←')
        .replace('ArrowRight', '→')
        .replace('ArrowDown', '↓')
        .replace('ArrowUp', '↑');
      
      // Check if the key is mentioned in README (with some flexibility for formatting)
      const keyPatterns = [
        `\`${displayKey}\``,
        `\`Cmd+${displayKey}\``,
        `**\`${displayKey}\`**`,
        `**\`Cmd+${displayKey}\`**`
      ];
      
      const isKeyDocumented = keyPatterns.some(pattern => 
        readmeContent.includes(pattern)
      );
      
      expect(isKeyDocumented, 
        `Keyboard shortcut ${keyName}="${keyValue}" (${displayKey}) should be documented in README.md`
      ).toBe(true);
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
    
    // Expected directories based on actual project structure
    const expectedDirs = [
      'src/',
      'config/',
      'core/',
      'features/',
      'services/',
      'ui/',
      'utils/',
      'tests/'
    ];
    
    expectedDirs.forEach(dir => {
      expect(readmeContent, 
        `Directory "${dir}" should be documented in project structure`
      ).toContain(dir);
    });
  });
});
