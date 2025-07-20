# Configuration Guide

## 🔧 Keyboard Shortcuts

All keyboard shortcuts are defined in `src/config/constants.js`:

```javascript
export const CONFIG = {
  KEYS: {
    FOCUS_INPUT: "i", // Cmd+I - Focus input field
    SUBMIT: "Enter", // Enter - Submit form
    PLAY_PAUSE: "Space", // Space - Video play/pause
    REWIND: "ArrowLeft", // ← - Rewind video
    FAST_FORWARD: "ArrowRight", // → - Fast-forward video
    NEXT_ALERT: "ArrowDown", // Cmd+↓ - Next alert (bulk)
    PREV_ALERT: "ArrowUp", // Cmd+↑ - Previous alert (bulk)
    BULK_PROCESS: "b", // Cmd+B - Toggle bulk mode
    TOGGLE_NOTEPAD: "j", // Cmd+J - Toggle notepad
  },
};
```

## 📝 Changing Shortcuts

### Step 1: Update Config

```javascript
// src/config/constants.js
KEYS: {
  TOGGLE_NOTEPAD: "n"; // Changed from 'j' to 'n'
}
```

### Step 2: Update Documentation

```bash
npm run docs:update  # Updates README automatically
npm run build       # Rebuilds with new shortcuts
```

### Step 3: Automatic Updates

The system prevents documentation drift by:

- ✅ Generating docs from source of truth (config)
- ✅ Pre-commit hooks for automatic updates
- ✅ Runtime help always reflects current config
- ✅ Tests validate documentation sync

## ⚙️ Other Configuration Options

### Element Selectors

```javascript
SELECTORS: {
  INPUT: '#alert-debug-user-input',
  BUTTON: '#debug-alert-id-submit',
  VIDEO_CONTAINER: '#debug-exp-box-1-video',
  VIDEO: 'video',
  TYPE_DROPDOWN: '#alert-debug-user-input-type'
}
```

### Timing Settings

```javascript
TIMING: {
  ELEMENT_CHECK_INTERVAL: 300,  // How often to check for DOM elements
  VIDEO_SEEK_SECONDS: 5         // Video seek jump amount
}
```

### Storage Keys

```javascript
STORAGE_KEYS: {
  NOTES: 'alert-debug-notes',
  BULK_ALERTS: 'alert-debug-bulk-alerts',
  PANEL_HEIGHT: 'notepad-panel-height',
  PANEL_WIDTH: 'notepad-right-panel-width',
  SETTINGS: 'alert-debug-settings'
}
```

### UI Defaults

```javascript
UI: {
  PANEL_DEFAULT_HEIGHT: 400,
  PANEL_MIN_HEIGHT: 200,
  PANEL_MAX_HEIGHT_RATIO: 0.8,
  TAGS_DEFAULT_WIDTH: 300,
  TAGS_MIN_WIDTH: 200
}
```

## 🔄 Runtime Configuration

Some settings can be changed at runtime through the settings panel:

- S3 Presigner URL
- Auto-save preferences
- Keyboard hint visibility
- Fireworks animations
- Panel dimensions (saved automatically)
