import { Utils } from "../utils/utils.js";
import { StorageManager } from "../utils/storage.js";
// import { AdminTools } from '../utils/admin.js';
import { CONFIG } from "../config/constants.js";
import { AppState } from "./app-state.js";
import { KeyboardManager } from "./keyboard-manager.js";
import { URLMonitor } from "./url-monitor.js";
import { SettingsManager } from "../services/settings.js";
import { MetadataManager } from "../services/metadata.js";
import { VideoSyncOverride } from "../services/video-sync-override.js";
import { NotesManager } from "../features/notes.js";
import { BulkProcessor } from "../features/bulk-processor.js";
import { FireworkShow } from "../ui/fireworks.js";
import { VideoControlsManager } from "../ui/video-controls.js";
import { UIManager, NotepadUI } from "../ui/ui-manager.js";
import { AnnotationManager } from "../features/annotations/annotation-manager.js";

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
      // Initialize URL monitoring first
      URLMonitor.init();

      // Initialize beautiful fireworks on first load
      // const fireworks = new FireworkShow();
      // fireworks.init();

      // Initialize features
      await this.initializeFeatures();
    } catch (error) {
      console.error("Failed to initialize UserScript:", error);
      UIManager.showNotification("UserScript initialization failed", "error");
    }
  }

  /**
   * Initialize all application features once DOM elements are ready
   */
  async initializeFeatures() {
    try {
      // Wait for required elements first
      const elements = await Utils.waitForElements();

      // Initialize core services
      MetadataManager.init();
      SettingsManager.init();
      VideoSyncOverride.init(); // Override Dash video sync with enhanced version
      await NotesManager.init(); // Initialize IndexedDB for notes
      await NotesManager.initCache(); // Initialize notes cache for synchronous access

      // Restore application state
      this.restoreBulkAlerts();

      // Set up event handlers
      this.setupInputMonitoring(elements);
      await KeyboardManager.init(); // KeyboardManager now handles its own elements

      // Initialize UI components
      VideoControlsManager.init();
      AnnotationManager.init();

      // Auto-open notepad on page load
      this.autoOpenNotepad();

      Utils.log(`NeoKPI V${this.VERSION} initialized successfully 🚀`);
    } catch (error) {
      console.error("Failed to initialize features:", error);
      UIManager.showNotification("Feature initialization failed", "error");
    }
  }

  /**
   * Restore bulk alerts from storage
   */
  restoreBulkAlerts() {
    if (BulkProcessor.loadBulkAlerts()) {
      const count = BulkProcessor.state.alertIds.length;
      const progress = BulkProcessor.getProgress();
      UIManager.showBulkStatus(
        `Bulk mode: ${count} alerts loaded. Current: ${progress}`,
      );
    }
  }

  /**
   * Set up input monitoring for notepad updates
   */
  setupInputMonitoring(elements) {
    elements.input.addEventListener(
      "input",
      Utils.debounce(async () => {
        const alertId = elements.input.value.trim();
        if (alertId && alertId !== AppState.notepad.currentAlertId) {
          // Always update current alert (for annotations)
          await AppState.setCurrentAlert(alertId);
          
          // Update notepad only if open
          if (AppState.notepad.isOpen) {
            NotepadUI.updateContent();
          }
        }
      }, 300),
    );
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
    // Use URL monitor's cleanup which is more comprehensive
    URLMonitor.cleanup();
    
    // Additional cleanup
    StorageManager.clear();
    Utils.log("UserScript cleanup complete");
  }
}
