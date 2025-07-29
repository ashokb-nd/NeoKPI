/**
 * KeyboardManager - Handles global keyboard shortcuts for the application
 * 
 * Structure:
 * - init(): Sets up event listeners and waits for DOM elements [PUBLIC API - ENTRY POINT]
 * - shortcutMap: Map of key combinations to handler functions (e.g., 'cmd+i' -> focusInput)
 * - buildKeyString(): Converts keyboard event to standardized key string
 * - handleKeydown(): Gets key string and directly calls mapped handler
 */


import { CONFIG } from "../config/constants.js";
import { Utils } from "../utils/utils.js";
import { BulkProcessor } from "../features/bulk-processor.js";
import { UIManager, NotepadUI } from "../ui/ui-manager.js";
import { ModalManager } from "../ui/modal-manager.js";
import { AppState } from "./app-state.js";


export const KeyboardManager = {

  elements: null, // DOM elements required for keyboard interactions eg. input fields, buttons etc.

  // Keyboard shortcuts mapping
  shortcutMap: new Map([
    ['cmd+i', 'focusInput'],
    ['enter', 'submitForm'],
    ['cmd+arrowdown', 'nextAlert'],
    ['cmd+arrowup', 'previousAlert'],
    ['cmd+shift+b', 'toggleBulkMode'],
    ['cmd+j', 'toggleNotepad'],
    ['space', 'playPauseVideo'],
    ['arrowleft', 'rewindVideo'],
    ['arrowright', 'fastForwardVideo'],
    ['escape', 'focusBody'],
  ]),

  async init() {
    this.elements = await Utils.waitForElements();
    
    // Set up global keyboard event handlers
    document.addEventListener("keydown", (event) => {
      try {
        this.handleKeydown(event, this.elements);
      } catch (error) {
        console.error("Keyboard handler error:", error);
      }
    });
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
        AppState.setCurrentAlert(inputValue).catch(error => 
          console.warn('Failed to set current alert:', error)
        );
        
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
        
        const nextAlert = filters.length > 0
          ? BulkProcessor.nextFilteredAlert(filters, logic)
          : BulkProcessor.nextAlert();

        if (nextAlert) {
          UIManager.loadAlertId(nextAlert, elements);
          const progress = filters.length > 0
            ? BulkProcessor.getFilteredProgress(filters, logic, AppState.notepad.includeHashtags)
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
        
        const prevAlert = filters.length > 0
          ? BulkProcessor.prevFilteredAlert(filters, logic)
          : BulkProcessor.prevAlert();

        if (prevAlert) {
          UIManager.loadAlertId(prevAlert, elements);
          const progress = filters.length > 0
            ? BulkProcessor.getFilteredProgress(filters, logic, AppState.notepad.includeHashtags)
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

    playPauseVideo(event) {
      
      if (Utils.isBodyFocused()) {
        event.preventDefault(); // keep it here only. (we don't want to interfere with typing in input fields)
        const video = Utils.getVideoElement();
        if (video) {
          if (video.paused) {
            video.muted = true;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      }
    },

    rewindVideo(event) {
      if (Utils.isBodyFocused()) {
        event.preventDefault();
        const video = Utils.getVideoElement();
        if (video) {
          const newTime = video.currentTime - CONFIG.TIMING.VIDEO_SEEK_SECONDS;
          video.currentTime = Math.max(0, newTime);
        }
      }
    },

    fastForwardVideo(event) {
      if (Utils.isBodyFocused()) {
        event.preventDefault();
        const video = Utils.getVideoElement();
        if (video) {
          const newTime = video.currentTime + CONFIG.TIMING.VIDEO_SEEK_SECONDS;
          video.currentTime = Math.min(video.duration || 0, newTime);
        }
      }
    },

    focusBody(event) {
      document.activeElement.blur();
      document.body.focus();
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
      this.handlers[handlerName](event, elements);
    }
  },
};
