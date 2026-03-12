import { AdminTools } from "../utils/admin.js";
import { ModalManager } from "../ui/modal-manager.js";
import { MetadataManager } from "../services/metadata.js";
import { NotesManager } from "../features/notes.js";
import { TagsUI } from "../ui/tags-ui.js";

/**
 * Global scope utilities for console access and development
 */
export class GlobalScope {  
  /**
   * Expose application utilities to global scope
   */
  static expose(app) {
    if (typeof window === "undefined") return;

    // Expose main application instance
    window.AlertDebugApp = app;

    // Expose modal managers for UI access
    window.ModalManager = ModalManager;
    window.SettingsModal = {
      show: () => ModalManager.showSettingsDialog(),
    };

    // Expose TagsUI for UI components
    window.TagsUI = TagsUI;

    // Expose admin tools for console access
    window.AlertDebugAdmin = {
      showStats: () => AdminTools.showStorageStats(),
      clearAll: () => AdminTools.clearAllData(),
    };

    // Expose database instances for console access
    window.AlertDebugDB = {
      metadata: MetadataManager,
      notes: NotesManager,
    };

  }
}
