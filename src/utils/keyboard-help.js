import { CONFIG } from "../config/constants.js";

/**
 * Generate dynamic keyboard shortcuts help from configuration
 */
export const KeyboardHelpGenerator = {
  /**
   * Get formatted keyboard shortcut display
   */
  formatKey(key, modifier = "") {
    const keyMap = {
      ArrowLeft: "←",
      ArrowRight: "→",
      ArrowDown: "↓",
      ArrowUp: "↑",
      Space: "Space",
      Enter: "Enter",
      Escape: "Esc",
    };

    const displayKey = keyMap[key] || key;
    return modifier + displayKey;
  },

  /**
   * Get keyboard shortcuts with descriptions
   */
  getShortcuts() {
    return [
      {
        key: CONFIG.KEYS.FOCUS_INPUT,
        modifier: "Cmd+",
        description: "Focus input field",
        category: "Input",
      },
      {
        key: CONFIG.KEYS.SUBMIT,
        modifier: "",
        description: "Submit form",
        category: "Input",
      },
      {
        key: CONFIG.KEYS.TOGGLE_NOTEPAD,
        modifier: "Cmd+",
        description: "Toggle notepad",
        category: "Notepad",
      },
      {
        key: CONFIG.KEYS.BULK_PROCESS,
        modifier: "Cmd+",
        description: "Bulk process mode",
        category: "Bulk",
      },
      {
        key: CONFIG.KEYS.NEXT_ALERT,
        modifier: "Cmd+",
        description: "Next alert",
        category: "Bulk",
      },
      {
        key: CONFIG.KEYS.PREV_ALERT,
        modifier: "Cmd+",
        description: "Previous alert",
        category: "Bulk",
      },
      {
        key: CONFIG.KEYS.PLAY_PAUSE,
        modifier: "",
        description: "Video play/pause",
        category: "Video",
      },
      {
        key: CONFIG.KEYS.REWIND,
        modifier: "",
        description: "Video rewind",
        category: "Video",
      },
      {
        key: CONFIG.KEYS.FAST_FORWARD,
        modifier: "",
        description: "Video forward",
        category: "Video",
      },
    ];
  },

  /**
   * Generate HTML for keyboard shortcuts help
   */
  generateKeyboardHelpHTML() {
    const shortcuts = this.getShortcuts();

    let html = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
    `;

    shortcuts.forEach((shortcut) => {
      const displayKey = this.formatKey(shortcut.key, shortcut.modifier);
      html += `<div><kbd>${displayKey}</kbd> ${shortcut.description}</div>`;
    });

    html += `
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #404040; font-size: 11px; color: #999999;">
        <strong>Tip:</strong> Use <kbd>Cmd+${this.formatKey(CONFIG.KEYS.PREV_ALERT)}</kbd>/<kbd>Cmd+${this.formatKey(CONFIG.KEYS.NEXT_ALERT)}</kbd> for bulk navigation
      </div>
    `;

    return html;
  },

  /**
   * Generate markdown for documentation
   */
  generateMarkdownHelp() {
    const shortcuts = this.getShortcuts();
    const categories = {};

    // Group by category
    shortcuts.forEach((shortcut) => {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = [];
      }
      categories[shortcut.category].push(shortcut);
    });

    let markdown = "";

    Object.entries(categories).forEach(([category, categoryShortcuts]) => {
      const categoryNames = {
        Input: "Input Management",
        Notepad: "Smart Notepad System",
        Bulk: "Bulk Processing",
        Video: "Video Controls",
      };

      markdown += `### ${categoryNames[category] || category}\n`;

      categoryShortcuts.forEach((shortcut) => {
        const displayKey = this.formatKey(shortcut.key, shortcut.modifier);
        markdown += `- **\`${displayKey}\`** - ${shortcut.description}\n`;
      });

      markdown += "\n";
    });

    return markdown;
  },
};
