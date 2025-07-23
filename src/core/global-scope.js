import { AdminTools } from "../utils/admin.js";
import { ModalManager } from "../ui/modal-manager.js";
import { MetadataManager } from "../services/metadata.js";
import { NotesManager } from "../features/notes.js";
import { TagsUI } from "../ui/tags-ui.js";
import { AnnotationManager } from "../features/annotations/annotation-manager.js";
import { AnnotationSamples } from "../utils/debug-utils.js";
import { CONFIG } from "../config/constants.js";

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

    // Expose annotation system for console access
    window.AlertDebugAnnotations = {
      manager: AnnotationManager,
      
      // Main function you use
      loadSample: async () => {
        const sample = AnnotationSamples.createFullSample();

        // Load sample annotations directly into all active videos
        let loaded = false;
        AnnotationManager.getVideosWithAnnotators().forEach(video => {
          try {
            video.annotator.loadManifest(sample);
            video.annotator.show();
            loaded = true;
            console.log(
              `✅ Loaded sample annotations for video: ${video.src || "unknown"}`,
            );
          } catch (error) {
            console.error(`❌ Failed to load sample annotations:`, error);
          }
        });

        if (loaded) {
          console.log(
            `🎯 Sample annotation loaded: Vehicle detection (95% confidence) visible 1-5s at position (0.1, 0.1)`,
          );
          return true;
        } else {
          console.log(`⚠️ No video elements found to load annotations into`);
          return false;
        }
      },
      
      // Essential utility functions
      hide: () => AnnotationManager.hideAnnotations(),
      show: () => AnnotationManager.showAnnotations(),
      clear: () => AnnotationManager.clearAnnotations(),
    };

    this.logAvailableCommands();
  }

  /**
   * Log available console commands for developers
   */
  static logAvailableCommands() {
    console.log(
      "%cAlert Debug Admin Commands Available:",
      "color: #4CAF50; font-weight: bold;",
    );
    console.log("AlertDebugAdmin.showStats() - Show storage statistics");
    console.log("AlertDebugAdmin.clearAll() - Clear all data");

    console.log(
      "%cAnnotation System Commands:",
      "color: #2196F3; font-weight: bold;",
    );
    console.log("AlertDebugAnnotations.loadSample() - Load sample annotation");
    console.log("AlertDebugAnnotations.loadAnnotationsForCurrentAlert() - Load annotations for current alert");
    console.log("AlertDebugAnnotations.hide() - Hide all annotations");
    console.log("AlertDebugAnnotations.show() - Show all annotations");
    console.log("AlertDebugAnnotations.clear() - Clear all annotations");
  }
}
