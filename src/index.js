/**
 * Alert Debug UserScript
 * 
 * This UserScript provides keyboard shortcuts for the Alert Debug page:
 * 
 * Input Management:
 *   - "Cmd+i" key: Focus the alert debug input field
 *   - Enter key: Submit the form (when input is focused) and blur input
 *   - Multiple alert IDs: Paste space/comma/newline separated IDs and press Enter
 * 
 * Bulk Processing:
 *   - "Cmd+b" key: Toggle bulk processing mode (shows paste dialog)
 *   - Cmd+Down arrow (↓): Load next alert ID in bulk mode
 *   - Cmd+Up arrow (↑): Load previous alert ID in bulk mode
 *   - Bulk alerts and alert type are automatically saved and restored between sessions
 *   - Clear bulk alerts option available in notepad panel
 * 
 * Video Controls:
 *   - Space bar: Toggle play/pause video (autoplay-safe with muting)
 *   - Left arrow (←): Rewind video by 5 seconds
 *   - Right arrow (→): Fast-forward video by 5 seconds
 * 
 * Notepad Feature:
 *   - "Cmd+j" key: Smart notepad toggle behavior
 *   - Notes are automatically saved per alert ID using local storage
 *   - Export notes as CSV with columns: [alert id, alert type, notes, timestamp]
 *   - Type "@" in notes to insert current video timestamp (mm:ss format)
 * 
 * Notes:
 *   - Video controls only work when no input field is focused
 *   - Bulk processing shows progress in top-right corner
 *   - Bulk alerts are persisted across browser sessions
 *   - The script waits for required elements to load before activating shortcuts
 *   - All shortcuts include proper event prevention to avoid conflicts
 *   - Video is automatically muted when played via spacebar for autoplay compliance
 *   - Notepad automatically shows notes for the current alert ID
 */

import { CONFIG } from './config/constants.js';
import { Utils } from './utils/utils.js';
import { StorageManager } from './utils/storage.js';
import { AdminTools } from './utils/admin.js';

// Core modules
import { AppState } from './core/app-state.js';
import { KeyboardManager } from './core/keyboard-manager.js';

// Service modules
import { SettingsManager } from './services/settings.js';
import { MetadataManager } from './services/metadata.js';

// Feature modules
import { TagManager } from './features/tags.js';
import { NotesManager } from './features/notes.js';
import { FilterManager } from './features/filter.js';
import { BulkProcessor } from './features/bulk-processor.js';

// UI modules
import { FireworksManager } from './ui/fireworks.js';
import { TagsUI } from './ui/tags-ui.js';
import { VideoControlsManager } from './ui/video-controls.js';
import { UIManager, NotepadUI } from './ui/ui-manager.js';
import { ModalManager, SettingsModal } from './ui/modal-manager.js';

// Ensure imports are not tree-shaken
[CONFIG, Utils, StorageManager, SettingsManager, TagManager, MetadataManager, NotesManager, AdminTools, FilterManager, UIManager, NotepadUI, ModalManager, SettingsModal, KeyboardManager];

(() => {
  'use strict';

  // ========================================
  // APPLICATION INITIALIZATION
  // ========================================
  const App = {
    VERSION: '0.5',
    
    init() {
      try {
        Utils.log(`Initializing Alert Debug UserScript v${this.VERSION}`);
        
        // Initialize beautiful fireworks on first load
        FireworksManager.init();
        
        // Wait for required elements and initialize
        Utils.waitForElements((elements) => {
          this.initializeFeatures(elements);
        });
        
      } catch (error) {
        console.error('Failed to initialize UserScript:', error);
        UIManager.showNotification('UserScript initialization failed', 'error');
      }
    },

    initializeFeatures(elements) {
      try {
        Utils.log('Required elements found - activating features');
        
        // Initialize metadata manager to intercept Dash requests
        MetadataManager.init();
        
        // Initialize settings manager
        SettingsManager.init();
        
        // Restore bulk alerts
        this.restoreBulkAlerts();
        
        // Monitor input changes
        this.setupInputMonitoring(elements);
        
        // Set up keyboard handlers
        this.setupKeyboardHandlers(elements);
        
        // Initialize video controls manager
        VideoControlsManager.init();
        
        // Auto-open notepad on page load
        this.autoOpenNotepad();
        
        Utils.log('UserScript initialization complete');
        
      } catch (error) {
        console.error('Failed to initialize features:', error);
        UIManager.showNotification('Feature initialization failed', 'error');
      }
    },

    restoreBulkAlerts() {
      if (BulkProcessor.loadBulkAlerts()) {
        const count = BulkProcessor.state.alertIds.length;
        const progress = BulkProcessor.getProgress();
        UIManager.showBulkStatus(`Bulk mode: ${count} alerts loaded. Current: ${progress}`);
      }
    },

    setupInputMonitoring(elements) {
      elements.input.addEventListener('input', Utils.debounce(() => {
        if (AppState.notepad.isOpen) {
          const alertId = elements.input.value.trim();
          if (alertId && alertId !== AppState.notepad.currentAlertId) {
            AppState.setCurrentAlert(alertId);
            NotepadUI.updateContent();
          }
        }
      }, 300));
    },

    setupKeyboardHandlers(elements) {
      document.addEventListener('keydown', (event) => {
        try {
          KeyboardManager.handleKeydown(event, elements);
        } catch (error) {
          console.error('Keyboard handler error:', error);
        }
      });
    },

    autoOpenNotepad() {
      setTimeout(() => {
        if (!AppState.notepad.isOpen) {
          NotepadUI.toggle();
        }
      }, 500);
    },

    // Cleanup function for development/testing
    cleanup() {
      // Remove all created elements
      const elementsToRemove = [
        '#fireworks-canvas',
        '#bulk-status',
        '#notepad-panel',
        '#video-controls-styles',
        '#bulk-status-keyframes',
        '#spinner-animation'
      ];
      
      elementsToRemove.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.remove();
        }
      });
      
      // Clear storage
      StorageManager.clear();
      
      Utils.log('UserScript cleanup complete');
    }
  };

  // Start the application
  App.init();

  // Expose useful functions to global scope for console access
  if (typeof window !== 'undefined') {
    window.AlertDebugApp = App;
    
    // Admin tools for console access
    window.AlertDebugAdmin = {
      showStats: () => AdminTools.showStorageStats(),
      clearAll: () => AdminTools.clearAllData(),
      cleanup: (maxEntries, maxDays) => AdminTools.cleanupOldData(maxEntries, maxDays),
      exportMetadata: () => AdminTools.exportMetadataList(),
      deleteDB: () => AdminTools.deleteIndexedDatabase()
    };
    
    // Log available commands
    console.log('%cAlert Debug Admin Commands Available:', 'color: #4CAF50; font-weight: bold;');
    console.log('AlertDebugAdmin.showStats() - Show storage statistics');
    console.log('AlertDebugAdmin.clearAll() - Clear all data');
    console.log('AlertDebugAdmin.cleanup(1000, 30) - Clean up old entries');
    console.log('AlertDebugAdmin.exportMetadata() - Export metadata list');
    console.log('AlertDebugAdmin.deleteDB() - Delete IndexedDB database');
  }
})();
