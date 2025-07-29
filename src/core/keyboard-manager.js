/**
 * KeyboardManager - Handles global keyboard shortcuts for the application
 * 
 * Structure:
 * - init(): Sets up event listeners and waits for DOM elements [PUBLIC API - ENTRY POINT]
 * 
 * - handlers: Object containing individual shortcut handler functions
 * - handlerList: Array defining execution order (priority-based)
 * - handleKeydown(): Main dispatcher that calls handlers in sequence until one returns true
 */


import { CONFIG } from "../config/constants.js";
import { Utils } from "../utils/utils.js";
import { BulkProcessor } from "../features/bulk-processor.js";
import { UIManager, NotepadUI } from "../ui/ui-manager.js";
import { ModalManager } from "../ui/modal-manager.js";
import { AppState } from "./app-state.js";


export const KeyboardManager = {
  elements: null,

  async init() {
    // Wait for required elements
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
  handlers: {
    // Cmd+I - Focus input field
    focusInput(event, elements) {
      if (
        event.key === CONFIG.KEYS.FOCUS_INPUT &&
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !Utils.isInputFocused(elements.input)
      ) {
        event.preventDefault();
        elements.input.focus();
        Utils.log("Focused input box");
        return true;
      }
      return false;
    },

    // Enter - Submit form when input is focused
    submitForm(event, elements) {
      if (
        event.key === CONFIG.KEYS.SUBMIT &&
        Utils.isInputFocused(elements.input)
      ) {
        event.preventDefault();

        const inputValue = elements.input.value.trim();
        const alertIds = BulkProcessor.parseAlertIds(inputValue);

        if (alertIds.length > 1) {
          const count = BulkProcessor.loadAlertIds(inputValue);
          UIManager.showBulkStatus(
            `Bulk mode: ${count} alerts loaded. Press ↓ to start`,
          );
          return true;
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

        return true;
      }
      return false;
    },

    // Cmd+↓/↑ - Navigate through bulk alerts
    bulkProcessing(event, elements) {
      if (!BulkProcessor.state.isProcessing) return false;

      const filters = AppState.notepad.selectedFilters;
      const logic = AppState.notepad.filterLogic;

      if (
        event.code === CONFIG.KEYS.NEXT_ALERT &&
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();

        const nextAlert =
          filters.length > 0
            ? BulkProcessor.nextFilteredAlert(filters, logic)
            : BulkProcessor.nextAlert();

        if (nextAlert) {
          UIManager.loadAlertId(nextAlert, elements);
          const progress =
            filters.length > 0
              ? BulkProcessor.getFilteredProgress(filters, logic, AppState.notepad.includeHashtags)
              : BulkProcessor.getProgress();
          UIManager.showBulkStatus(`${progress} ${nextAlert}`);
        } else {
          UIManager.showBulkStatus(
            filters.length > 0 ? "End of filtered alerts" : "End of alerts",
          );
        }
        return true;
      }

      if (
        event.code === CONFIG.KEYS.PREV_ALERT &&
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();

        const prevAlert =
          filters.length > 0
            ? BulkProcessor.prevFilteredAlert(filters, logic)
            : BulkProcessor.prevAlert();

        if (prevAlert) {
          UIManager.loadAlertId(prevAlert, elements);
          const progress =
            filters.length > 0
              ? BulkProcessor.getFilteredProgress(filters, logic, AppState.notepad.includeHashtags)
              : BulkProcessor.getProgress();
          UIManager.showBulkStatus(`${progress} ${prevAlert}`);
        } else {
          UIManager.showBulkStatus(
            filters.length > 0 ? "At first filtered alert" : "At first alert",
          );
        }
        return true;
      }

      return false;
    },

    // Cmd+Shift+B - Toggle bulk processing mode
    toggleBulkMode(event) {
      if (
        event.key === CONFIG.KEYS.BULK_PROCESS &&
        event.metaKey &&
        event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();

        if (BulkProcessor.state.isProcessing) {
          if (confirm("Are you sure you want to exit bulk processing mode?")) {
            BulkProcessor.clearBulkAlerts();
            UIManager.showBulkStatus("Bulk mode disabled");
          }
        } else {
          ModalManager.showBulkDialog();
        }
        return true;
      }
      return false;
    },

    // Cmd+J - Toggle notepad
    toggleNotepad(event) {
      if (
        event.key === CONFIG.KEYS.TOGGLE_NOTEPAD &&
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        NotepadUI.toggle();
        return true;
      }
      return false;
    },

    // Space, ←/→ - Video controls (play/pause, seek)
    videoControls(event) {
      if (!Utils.isBodyFocused()) return false;

      if (event.code === CONFIG.KEYS.PLAY_PAUSE) {
        event.preventDefault();
        const video = Utils.getVideoElement();
        if (video) {
          if (video.paused) {
            video.muted = true;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
        return true;
      }

      if (
        event.code === CONFIG.KEYS.REWIND ||
        event.code === CONFIG.KEYS.FAST_FORWARD
      ) {
        event.preventDefault();
        const video = Utils.getVideoElement();
        if (video) {
          const seekDirection =
            event.code === CONFIG.KEYS.REWIND
              ? -CONFIG.TIMING.VIDEO_SEEK_SECONDS
              : CONFIG.TIMING.VIDEO_SEEK_SECONDS;
          const newTime = video.currentTime + seekDirection;
          video.currentTime = Math.max(
            0,
            Math.min(video.duration || 0, newTime),
          );
        }
        return true;
      }

      return false;
    },

    // Escape - Focus body (blur active element)
    focusBody(event) {
      if (event.key === "Escape") {
        document.activeElement.blur();
        document.body.focus();
        return true;
      }
      return false;
    },
  },

  // Debug function to print key combinations
  debugKeydown(event) {
    const modifiers = [];
    if (event.metaKey) modifiers.push('cmd');
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    
    const key = event.key.toLowerCase();
    const combination = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
    
    console.log(`Key pressed: ${combination}`);
  },

  // Handler execution order (priority matters - focusBody first for Escape handling)
  handlerList: [
    'focusBody',
    'focusInput', 
    'submitForm',
    'bulkProcessing',
    'toggleBulkMode',
    'toggleNotepad',
    'videoControls',
  ],

  handleKeydown(event, elements) {
    // Uncomment the line below for debugging key combinations
    this.debugKeydown(event);
    
    for (const handlerName of this.handlerList) {
      if (this.handlers[handlerName](event, elements)) {
        break;
      }
    }
  },
};
