// ========================================
// CONSTANTS & CONFIGURATION
// ========================================

// Read version from package.json to maintain single source of truth
import packageJson from '../../package.json' with { type: 'json' };

export const CONFIG = {
  VERSION: packageJson.version,
  SELECTORS: {
    INPUT: '#alert-debug-user-input',
    BUTTON: '#debug-alert-id-submit',
    VIDEO_CONTAINER: '#debug-exp-box-1-video',
    VIDEO: 'video',
    TYPE_DROPDOWN: '#alert-debug-user-input-type'
  },
  TIMING: {
    ELEMENT_CHECK_INTERVAL: 300,
    VIDEO_SEEK_SECONDS: 5
  },
  KEYS: {
    FOCUS_INPUT: 'i',
    SUBMIT: 'Enter',
    PLAY_PAUSE: 'Space',
    REWIND: 'ArrowLeft',
    FAST_FORWARD: 'ArrowRight',
    NEXT_ALERT: 'ArrowDown',
    PREV_ALERT: 'ArrowUp',
    BULK_PROCESS: 'b',
    TOGGLE_NOTEPAD: 'j'  // Reverted back
  },
  STORAGE_KEYS: {
    NOTES: 'alert-debug-notes',
    BULK_ALERTS: 'alert-debug-bulk-alerts',
    PANEL_HEIGHT: 'notepad-panel-height',
    PANEL_WIDTH: 'notepad-right-panel-width',
    SETTINGS: 'alert-debug-settings'
  },
  UI: {
    PANEL_DEFAULT_HEIGHT: 400,
    PANEL_MIN_HEIGHT: 200,
    PANEL_MAX_HEIGHT_RATIO: 0.8,
    TAGS_DEFAULT_WIDTH: 300,
    TAGS_MIN_WIDTH: 200
  },
  S3_PRESIGNER: {
    LOCAL_SERVER_URL: 'http://localhost:8080'
  }
};
