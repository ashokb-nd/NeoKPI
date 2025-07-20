import { AdminTools } from "../utils/admin.js";
import { ModalManager } from "../ui/modal-manager.js";
import { MetadataManager } from "../services/metadata.js";
import { NotesManager } from "../features/notes.js";
import { TagsUI } from "../ui/tags-ui.js";
import { AnnotationManager } from "../features/annotations/annotation-manager.js";
import { AnnotationManifest, Annotation } from "../features/annotations/annotation-manifest.js";
import { AnnotationSamples, RenderingDebug, SystemDebug } from "../utils/debug-utils.js";
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
      cleanup: (maxEntries, maxDays) =>
        AdminTools.cleanupOldData(maxEntries, maxDays),
      exportMetadata: () => AdminTools.exportMetadataList(),
      deleteDB: () => AdminTools.deleteIndexedDatabase(),
    };

    // Expose database instances for console access
    window.AlertDebugDB = {
      metadata: MetadataManager,
      notes: NotesManager,
      // Direct access to database instances
      get metadataDB() {
        return MetadataManager.db;
      },
      get notesDB() {
        return NotesManager.db;
      },

      // Convenient helper functions using constants
      async inspectStore(storeName) {
        const db = MetadataManager.db || NotesManager.db;
        if (!db) {
          console.error("Database not initialized");
          return null;
        }

        try {
          const data = await db.getAll(storeName);
          const stats = await db.getStats(storeName);

          console.log(`📊 Store: ${storeName}`);
          console.log(`📦 Count: ${stats.count}`);
          console.log("📋 Data:", data);

          return { data, stats };
        } catch (error) {
          console.error(`Error inspecting store ${storeName}:`, error);
          return null;
        }
      },

      // Store constants for easy access
      STORES: CONFIG.DATABASE.STORES,
    };

    // Expose annotation system for console access
    window.AlertDebugAnnotations = {
      manager: AnnotationManager,
      manifest: AnnotationManifest,
      annotation: Annotation,

      // Helper functions for testing
      createSample: () => {
        return AnnotationSamples.createFullSample();
      },
      
      // Additional sample creation methods
      createDetectionSample: () => {
        return AnnotationSamples.createDetectionSample();
      },
      
      createCrossSample: () => {
        return AnnotationSamples.createCrossSample();
      },
      
      createTextSample: () => {
        return AnnotationSamples.createTextSample();
      },
      
      createTimeBasedSample: () => {
        return AnnotationSamples.createTimeBasedSample();
      },
      loadSample: async () => {
        const sample = window.AlertDebugAnnotations.createSample();

        // Load sample annotations directly into all active videos
        let loaded = false;
        AnnotationManager.annotators.forEach((annotator, videoElement) => {
          try {
            annotator.loadManifest(sample);
            annotator.show();
            loaded = true;
            console.log(
              `✅ Loaded sample annotations for video: ${videoElement.src || "unknown"}`,
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
      debug: () => {
          return SystemDebug.logSystemStatus(AnnotationManager.annotators);
        },
      
      // Quick test function for loading annotations with specific categories
      loadTestAnnotations: async (alertId, categories = ['hello']) => {
        try {
          console.log(`🔄 Loading test annotations for alert: ${alertId} with categories: [${categories.join(', ')}]`);
          const success = await AnnotationManager.loadAnnotationsForAlert(alertId, categories);
          
          if (success) {
            console.log(`✅ Successfully loaded annotations for alert ${alertId}`);
            return true;
          } else {
            console.log(`❌ Failed to load annotations for alert ${alertId}`);
            return false;
          }
        } catch (error) {
          console.error(`💥 Error loading annotations:`, error);
          return false;
        }
      },
      
      testRender: () => {
        console.log("🎨 Testing manual canvas drawing...");
        AnnotationManager.annotators.forEach((annotator, video) => {
          const ctx = annotator.ctx;
          const canvas = annotator.canvas;
          
          RenderingDebug.logCanvasInfo(canvas, ctx);
          RenderingDebug.drawTestShapes(ctx, { width: canvas.width, height: canvas.height });
          
          console.log("✅ Test shapes drawn");
        });
        
        return "Test render complete - check video for test shapes and debug crosses";
      },
      
      testDetectionBoxes: () => {
        console.log("🔍 Testing manual detection box drawing...");
        AnnotationManager.annotators.forEach((annotator, video) => {
          const ctx = annotator.ctx;
          const canvas = annotator.canvas;
          
          // Clear canvas first
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw manual detection boxes using same coordinates as our sample
          RenderingDebug.drawTestDetections(ctx, { width: canvas.width, height: canvas.height });
          
          console.log("✅ Manual detection boxes drawn");
        });
        
        return "Manual detection test complete - check video for red vehicle and green person boxes";
      },
      testAnnotationRender: () => {
        console.log("🔍 Testing annotation coordinate conversion...");
        AnnotationManager.annotators.forEach((annotator, video) => {
          const currentTimeMs = video.currentTime * 1000;
          const visibleAnnotations = annotator.getVisibleAnnotations(currentTimeMs);
          const ctx = annotator.ctx;
          const canvas = annotator.canvas;
          
          console.log(`Testing ${visibleAnnotations.length} visible annotations`);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          visibleAnnotations.forEach((annotation, i) => {
            if (annotation.category === 'detection' && annotation.data.bbox) {
              const bbox = annotation.data.bbox;
              console.log(`Annotation ${i}: ${annotation.data.class}`);
              console.log(`  Normalized bbox:`, bbox);
              
              // Manual coordinate conversion
              const pixelBbox = {
                x: bbox.x * canvas.width,
                y: bbox.y * canvas.height,
                width: bbox.width * canvas.width,
                height: bbox.height * canvas.height
              };
              
              console.log(`  Pixel bbox:`, pixelBbox);
              
              // Draw with bright colors for visibility
              const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
              ctx.strokeStyle = colors[i % colors.length];
              ctx.lineWidth = 3;
              ctx.strokeRect(pixelBbox.x, pixelBbox.y, pixelBbox.width, pixelBbox.height);
              
              // Draw label
              ctx.fillStyle = colors[i % colors.length];
              ctx.font = "14px Arial";
              ctx.fillText(annotation.data.class, pixelBbox.x, pixelBbox.y - 5);
              
              console.log(`  ✅ Drew ${annotation.data.class} at (${pixelBbox.x}, ${pixelBbox.y})`);
            }
          });
        });
        
        return "Manual annotation render test complete";
      },
      hide: () => AnnotationManager.hideAnnotations(),
      show: () => AnnotationManager.showAnnotations(),
      clear: () => AnnotationManager.clearAnnotations(),

      // Debug functions for easier access
      showDebugBorders: () => AnnotationManager.showDebugBorders(),
      hideDebugBorders: () => AnnotationManager.hideDebugBorders(),
      toggleDebugBorders: () => AnnotationManager.toggleDebugBorders(),
      debugInfo: () => AnnotationManager.getDebugInfo(),

      // Utility functions
      getVideoCount: () => AnnotationManager.annotators.size,
      listVideos: () => {
        const videos = [];
        AnnotationManager.annotators.forEach((annotator, video) => {
          videos.push({
            src: video.src || "no src",
            currentTime: video.currentTime,
            paused: video.paused,
            canvasVisible: annotator.canvas.style.display !== "none",
          });
        });
        console.table(videos);
        return videos;
      },
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
    console.log("AlertDebugAdmin.exportMetadata() - Export metadata list");
    console.log("AlertDebugAdmin.deleteDB() - Delete IndexedDB database");

    console.log(
      "%cAnnotation System Commands:",
      "color: #2196F3; font-weight: bold;",
    );
    console.log(
      "AlertDebugAnnotations.createSample() - Create full sample annotation set",
    );
    console.log("AlertDebugAnnotations.createDetectionSample() - Create detection-only sample");
    console.log("AlertDebugAnnotations.createCrossSample() - Create cross-only sample");
    console.log("AlertDebugAnnotations.createTextSample() - Create text annotation sample");
    console.log("AlertDebugAnnotations.createTimeBasedSample() - Create time-based sample");
    console.log("AlertDebugAnnotations.loadSample() - Load sample annotation");
    console.log("AlertDebugAnnotations.loadTestAnnotations(alertId, ['hello']) - Load test annotations");
    console.log("AlertDebugAnnotations.debug() - Debug annotation system state");
    console.log("AlertDebugAnnotations.testRender() - Test canvas drawing");
    console.log("AlertDebugAnnotations.testDetectionBoxes() - Test manual detection boxes");
    console.log("AlertDebugAnnotations.testAnnotationRender() - Test annotation rendering");
    console.log("AlertDebugAnnotations.hide() - Hide all annotations");
    console.log("AlertDebugAnnotations.show() - Show all annotations");
    console.log("AlertDebugAnnotations.clear() - Clear all annotations");

    console.log(
      "%cAnnotation Debug Commands:",
      "color: #FF9800; font-weight: bold;",
    );
    console.log(
      "AlertDebugAnnotations.showDebugBorders() - Show debug borders on canvases",
    );
    console.log(
      "AlertDebugAnnotations.hideDebugBorders() - Hide debug borders on canvases",
    );
    console.log(
      "AlertDebugAnnotations.toggleDebugBorders() - Toggle debug borders on/off",
    );
    console.log(
      "AlertDebugAnnotations.debugInfo() - Get canvas debug information",
    );

    console.log("%cOther Commands:", "color: #4CAF50; font-weight: bold;");
    console.log("AlertDebugAdmin.cleanup(1000, 30) - Clean up old entries");
    console.log("AlertDebugAdmin.exportMetadata() - Export metadata list");
    console.log("AlertDebugAdmin.deleteDB() - Delete IndexedDB database");
    console.log(
      "AlertDebugApp.cleanup() - Clean up all UI elements and storage",
    );

    console.log("%cUI Features:", "color: #E91E63; font-weight: bold;");
    console.log("Notepad: 🎯 Load Annotations button - Load annotations for current alert");
    console.log("Notepad: Button loads with categories: hello, cross, text, detection");
    console.log("Debug borders automatically shown when loading via button");

    console.log(
      "%cAlert Debug Database Access:",
      "color: #2196F3; font-weight: bold;",
    );
    console.log("AlertDebugDB.metadata - MetadataManager instance");
    console.log("AlertDebugDB.notes - NotesManager instance");
    console.log(
      "AlertDebugDB.metadataDB - Direct IndexedDB instance for metadata",
    );
    console.log("AlertDebugDB.notesDB - Direct IndexedDB instance for notes");
    console.log("AlertDebugDB.STORES - Database store name constants");
    console.log(
      "AlertDebugDB.inspectStore(storeName) - Inspect any store with data & stats",
    );

    console.log(
      "%cExample database usage:",
      "color: #FF9800; font-style: italic;",
    );
    console.log(
      "AlertDebugDB.metadata.getAllMetadataUrls() - Get all metadata URLs",
    );
    console.log("AlertDebugDB.notes.getAllNotes() - Get all notes");
    console.log(
      'AlertDebugDB.inspectStore("metadataUrls") - Inspect metadata URLs store',
    );
    console.log(
      "AlertDebugDB.inspectStore(AlertDebugDB.STORES.METADATA) - Using constants",
    );
  }
}
