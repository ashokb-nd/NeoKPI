import { Utils } from '../utils/utils.js';
import { StorageManager } from '../utils/storage.js';
// import { AdminTools } from '../utils/admin.js';
import { CONFIG } from '../config/constants.js';
import { AppState } from './app-state.js';
import { KeyboardManager } from './keyboard-manager.js';
import { SettingsManager } from '../services/settings.js';
import { MetadataManager } from '../services/metadata.js';
import { NotesManager } from '../features/notes.js';
import { BulkProcessor } from '../features/bulk-processor.js';
import { FireworksManager } from '../ui/fireworks.js';
import { VideoControlsManager } from '../ui/video-controls.js';
import { UIManager, NotepadUI } from '../ui/ui-manager.js';

/**
 * Main Application class that orchestrates the initialization
 * and coordination of all modules
 */
export class Application {
  constructor() {
    this.VERSION = CONFIG.VERSION;
  }

  /**
   * Initialize the application
   */
  async init() {
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
  }

  /**
   * Initialize all application features once DOM elements are ready
   */
  initializeFeatures(elements) {
    try {
      Utils.log('Required elements found - activating features');
      
      // Initialize core services
      MetadataManager.init();
      SettingsManager.init();
      NotesManager.init(); // Initialize IndexedDB for notes
      
      // Restore application state
      this.restoreBulkAlerts();
      
      // Set up event handlers
      this.setupInputMonitoring(elements);
      this.setupKeyboardHandlers(elements);
      
      // Initialize UI components
      VideoControlsManager.init();
      
      // Auto-open notepad on page load
      this.autoOpenNotepad();
      
      Utils.log('UserScript initialization complete');
      
    } catch (error) {
      console.error('Failed to initialize features:', error);
      UIManager.showNotification('Feature initialization failed', 'error');
    }
  }

  /**
   * Restore bulk alerts from storage
   */
  restoreBulkAlerts() {
    if (BulkProcessor.loadBulkAlerts()) {
      const count = BulkProcessor.state.alertIds.length;
      const progress = BulkProcessor.getProgress();
      UIManager.showBulkStatus(`Bulk mode: ${count} alerts loaded. Current: ${progress}`);
    }
  }

  /**
   * Set up input monitoring for notepad updates
   */
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
  }

  /**
   * Set up global keyboard event handlers
   */
  setupKeyboardHandlers(elements) {
    document.addEventListener('keydown', (event) => {
      try {
        KeyboardManager.handleKeydown(event, elements);
      } catch (error) {
        console.error('Keyboard handler error:', error);
      }
    });
  }

  /**
   * Auto-open notepad after initialization
   */
  autoOpenNotepad() {
    setTimeout(() => {
      if (!AppState.notepad.isOpen) {
        NotepadUI.toggle();
      }
    }, 500);
  }

  /**
   * Cleanup function for development/testing
   */
  cleanup() {
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
    
    StorageManager.clear();
    Utils.log('UserScript cleanup complete');
  }
}
