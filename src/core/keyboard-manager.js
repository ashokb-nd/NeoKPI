import { CONFIG } from "../config/constants.js";
import { Utils } from "../utils/utils.js";
import { BulkProcessor } from "../features/bulk-processor.js";
import { UIManager, NotepadUI } from "../ui/ui-manager.js";
import { ModalManager } from "../ui/modal-manager.js";
import { AppState } from "./app-state.js";
import { FilterManager } from "../features/filter.js";

export const KeyboardManager = {
  handlers: {
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
              ? this.getFilteredProgress(filters, logic)
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
              ? this.getFilteredProgress(filters, logic)
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

    toggleBulkMode(event) {
      if (
        event.key === CONFIG.KEYS.BULK_PROCESS &&
        event.metaKey &&
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

    focusBody(event) {
      if (event.key === "Escape") {
        document.activeElement.blur();
        document.body.focus();
        return true;
      }
      return false;
    },
  },

  getFilteredProgress(filters, logic) {
    const filteredIds = FilterManager.getFilteredAlertIds(
      filters,
      logic,
      AppState.notepad.includeHashtags,
    );
    const current = BulkProcessor.getCurrentAlert();
    const index = filteredIds.indexOf(current);

    if (index !== -1) {
      const filterText = filters.join(` ${logic} `);
      return `[${index + 1}/${filteredIds.length}] filtered by "${filterText}"`;
    }

    return BulkProcessor.getProgress();
  },

  handleKeydown(event, elements) {
    const handlerList = [
      this.handlers.focusBody,
      this.handlers.focusInput,
      this.handlers.submitForm,
      this.handlers.bulkProcessing,
      this.handlers.toggleBulkMode,
      this.handlers.toggleNotepad,
      this.handlers.videoControls,
    ];

    for (const handler of handlerList) {
      if (handler.call(this, event, elements)) {
        break;
      }
    }
  },
};
