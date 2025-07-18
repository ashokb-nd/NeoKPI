import { CONFIG } from './config.js';

// ========================================
// UTILITY FUNCTIONS
// ========================================
export const Utils = {
  log(message) {
    console.log(`[UserScript] ${message}`);
  },

  waitForElements(callback) {
    const interval = setInterval(() => {
      const elements = this.getRequiredElements();
      if (elements.input && elements.button && elements.typeDropdown) {
        clearInterval(interval);
        callback(elements);
      }
    }, CONFIG.TIMING.ELEMENT_CHECK_INTERVAL);
  },

  getRequiredElements() {
    return {
      input: document.querySelector(CONFIG.SELECTORS.INPUT),
      button: document.querySelector(CONFIG.SELECTORS.BUTTON),
      typeDropdown: document.querySelector(CONFIG.SELECTORS.TYPE_DROPDOWN)
    };
  },

  getVideoElement() {
    const container = document.querySelector(CONFIG.SELECTORS.VIDEO_CONTAINER);
    return container?.querySelector(CONFIG.SELECTORS.VIDEO) || null;
  },

  isInputFocused(input) {
    return document.activeElement === input;
  },

  isBodyFocused() {
    return document.activeElement === document.body;
  },

  isNotepadFocused() {
    const activeElement = document.activeElement;
    const notepadPanel = document.querySelector('#notepad-panel');
    
    if (!notepadPanel || !activeElement) return false;
    
    // Check if the active element is within the notepad panel
    return notepadPanel.contains(activeElement);
  },

  getCurrentAlertType() {
    try {
      const dropdown = document.querySelector(CONFIG.SELECTORS.TYPE_DROPDOWN);
      const selectedLabel = dropdown?.querySelector('.Select-value-label');
      return selectedLabel ? selectedLabel.textContent.trim() : null;
    } catch (error) {
      console.error('Error getting alert type:', error);
      return null;
    }
  },

  getCurrentVideoTimestamp() {
    const video = this.getVideoElement();
    if (!video || isNaN(video.currentTime)) return null;
    
    const mins = Math.floor(video.currentTime / 60);
    const secs = Math.floor(video.currentTime % 60);
    return `[${mins}:${secs.toString().padStart(2, '0')}]`;
  },

  processTimestampReplacements(text) {
    // Replace all @ symbols with current video timestamp
    const timestamp = this.getCurrentVideoTimestamp();
    if (!timestamp) return text;
    
    return text.replace(/@/g, timestamp);
  },

  // Format time in mm:ss format
  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // Create a styled button
  createButton(text, color, action) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      padding: 4px 8px;
      border: 1px solid #464647;
      background: ${color};
      color: white;
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
    `;
    button.addEventListener('click', action);
    return button;
  },

  // Debounce function to limit function calls
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};
