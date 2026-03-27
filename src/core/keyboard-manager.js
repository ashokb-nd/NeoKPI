/**
 * KeyboardManager - Handles global keyboard shortcuts for the application
 * 
 * Structure:
 * - init(): Sets up event listeners and waits for DOM elements [PUBLIC API - ENTRY POINT]
 * - shortcutMap: Map of key combinations to handler functions (e.g., 'cmd+i' -> focusInput)
 * - buildKeyString(): Converts keyboard event to standardized key string
 * - handleKeydown(): Gets key string and directly calls mapped handler
 * 
 * To add a new shortcut:
 * 1. Add to `shortcutMap` with key combination and handler name
 * 2. Implement the handler function in `handlers` object
 */


import { Utils } from "../utils/utils.js";
import { BulkProcessor } from "../features/bulk-processor.js";
import { UIManager, NotepadUI } from "../ui/ui-manager.js";
import { ModalManager } from "../ui/modal-manager.js";
import { AppState } from "./app-state.js";
import { AnnotationManager } from "../features/annotation-manager.js";
import { MetadataManager } from "../services/metadata.js";


export const KeyboardManager = {
  isInitialized: false,
  keydownHandler: null,

  elements: null, // DOM elements required for keyboard interactions eg. input fields, buttons etc.

  // Keyboard shortcuts mapping
  shortcutMap: new Map([
    ['cmd+i', 'focusInput'],
    ['enter', 'submitForm'],
    ['cmd+arrowdown', 'nextAlert'],
    ['cmd+arrowup', 'previousAlert'],
    ['cmd+shift+b', 'toggleBulkMode'],
    ['cmd+j', 'toggleNotepad'],
    ['escape', 'focusBody'],
    ['ctrl+a', 'toggleAnnotations']
  ]),

  async init() {
    if (this.isInitialized) return;

    this.elements = await Utils.waitForElements();

    // Set up global keyboard event handlers
    this.keydownHandler = (event) => {
      try {
        this.handleKeydown(event, this.elements);
      } catch (error) {
        console.error("Keyboard handler error:", error);
      }
    };

    document.addEventListener("keydown", this.keydownHandler);
    this.isInitialized = true;
  },

  cleanup() {
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler);
    }

    this.keydownHandler = null;
    this.elements = null;
    this.isInitialized = false;
  },

  // Handler functions
  handlers: {
    focusInput(event, elements) {
      if (!Utils.isInputFocused(elements.input)) {
        event.preventDefault();
        elements.input.focus();
        Utils.log("Focused input box");
      }
    },

    submitForm(event, elements) {
      if (Utils.isInputFocused(elements.input)) {
        event.preventDefault();

        const inputValue = elements.input.value.trim();
        const alertIds = BulkProcessor.parseAlertIds(inputValue);

        if (alertIds.length > 1) {
          const count = BulkProcessor.loadAlertIds(inputValue);
          UIManager.showBulkStatus(
            `Bulk mode: ${count} alerts loaded. Press ↓ to start`,
          );
          return;
        }

        elements.button.click();
        elements.input.blur();

        // Always update current alert (for annotations)
        AppState.setCurrentAlert(inputValue);
        
        // Update notepad only if open
        if (AppState.notepad.isOpen) {
          NotepadUI.updateContent();
        }
      }
    },

    nextAlert(event, elements) {
      if (BulkProcessor.state.isProcessing) {
        event.preventDefault();
        
        const filters = AppState.notepad.selectedFilters;
        const logic = AppState.notepad.filterLogic;
        const includeHashtags = AppState.notepad.includeHashtags;
        
        const nextAlert = filters.length > 0
          ? BulkProcessor.nextFilteredAlert(filters, logic, includeHashtags)
          : BulkProcessor.nextAlert();

        if (nextAlert) {
          UIManager.loadAlertId(nextAlert, elements);
          const progress = filters.length > 0
            ? BulkProcessor.getFilteredProgress(filters, logic, includeHashtags)
            : BulkProcessor.getProgress();
          UIManager.showBulkStatus(`${progress} ${nextAlert}`);
        } else {
          UIManager.showBulkStatus(
            filters.length > 0 ? "End of filtered alerts" : "End of alerts"
          );
        }
      }
    },

    previousAlert(event, elements) {
      if (BulkProcessor.state.isProcessing) {
        event.preventDefault();
        
        const filters = AppState.notepad.selectedFilters;
        const logic = AppState.notepad.filterLogic;
        const includeHashtags = AppState.notepad.includeHashtags;
        
        const prevAlert = filters.length > 0
          ? BulkProcessor.prevFilteredAlert(filters, logic, includeHashtags)
          : BulkProcessor.prevAlert();

        if (prevAlert) {
          UIManager.loadAlertId(prevAlert, elements);
          const progress = filters.length > 0
            ? BulkProcessor.getFilteredProgress(filters, logic, includeHashtags)
            : BulkProcessor.getProgress();
          UIManager.showBulkStatus(`${progress} ${prevAlert}`);
        } else {
          UIManager.showBulkStatus(
            filters.length > 0 ? "At first filtered alert" : "At first alert"
          );
        }
      }
    },

    toggleBulkMode(event) {
      event.preventDefault();

      if (BulkProcessor.state.isProcessing) {
        if (confirm("Are you sure you want to exit bulk processing mode?")) {
          BulkProcessor.clearBulkAlerts();
          UIManager.showBulkStatus("Bulk mode disabled");
        }
      } else {
        ModalManager.showBulkDialog();
      }
    },

    toggleNotepad(event) {
      event.preventDefault();
      NotepadUI.toggle();
    },

    focusBody(event) {
      document.activeElement.blur();
      document.body.focus();
    },
    async toggleAnnotations(event) {
      event.preventDefault();

      const currentAlert = AppState.notepad.currentAlertId || null;
      if (!currentAlert) {
        UIManager.showNotification("Select an alert before loading annotations", "warning");
        return;
      }

      const metadata = await MetadataManager.getMetadata(currentAlert);
      if (!metadata) {
        UIManager.showNotification("Metadata unavailable for current alert", "warning");
        return;
      }

      const initialized = await AnnotationManager.init(metadata);
      if (!initialized) {
        UIManager.showNotification("Unable to initialize annotations", "error");
      }
    },
  },

  // Build standardized key string from event
  buildKeyString(event) {
    const modifiers = [];
    if (event.metaKey) modifiers.push('cmd');
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    
    let key = event.key.toLowerCase();
    
    // Handle special keys
    if (key === ' ') key = 'space';
    
    if (modifiers.length > 0) {
      return `${modifiers.join('+')}+${key}`;
    }
    return key;
  },


  handleKeydown(event, elements) {
    // console.log(`Key pressed: ${this.buildKeyString(event)}`);
    
    const keyString = this.buildKeyString(event);
    const handlerName = this.shortcutMap.get(keyString);
    
    if (handlerName && this.handlers[handlerName]) {
      const result = this.handlers[handlerName](event, elements);
      if (result && typeof result.catch === "function") {
        result.catch((error) => {
          console.error(`Keyboard handler failure for ${handlerName}:`, error);
        });
      }
    }
  },
};
