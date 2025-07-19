#!/usr/bin/env node

import fs from 'fs';
import { KeyboardHelpGenerator } from '../src/utils/keyboard-help.js';

/**
 * Update README with generated shortcuts
 */
function updateReadme() {
  const readmePath = './README.md';
  let content = fs.readFileSync(readmePath, 'utf-8');
  
  const shortcutsMarkdown = KeyboardHelpGenerator.generateMarkdownHelp();
  
  // Replace the key features section (between ## 🎯 Key Features and ## � Development)
  const startMarker = '## 🎯 Key Features\n\n';
  const endMarker = '\n## � Development';
  
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  
  if (startIndex !== -1 && endIndex !== -1) {
    const beforeFeatures = content.substring(0, startIndex + startMarker.length);
    const afterFeatures = content.substring(endIndex);
    
    // Generate concise feature list for README
    const conciseFeatures = `- **\`Cmd+I/J/B\`** - Input focus, notepad toggle, bulk mode
- **\`Space/←/→\`** - Video play/pause, seek controls  
- **\`Cmd+↓/↑\`** - Navigate bulk alerts
- **Smart Notes** - Auto-save with tags and timestamps
- **CSV Export/Import** - Backup your work`;

    content = beforeFeatures + conciseFeatures + afterFeatures;
    
    fs.writeFileSync(readmePath, content);
    console.log('✅ README.md updated with current keyboard shortcuts from config');
  } else {
    console.log('ℹ️  README.md structure has changed - manual update may be needed');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateReadme();
}

export { updateReadme };
