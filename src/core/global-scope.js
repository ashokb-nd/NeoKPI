import { AdminTools } from '../utils/admin.js';
import { ModalManager } from '../ui/modal-manager.js';
import { MetadataManager } from '../services/metadata.js';
import { NotesManager } from '../features/notes.js';
import { TagsUI } from '../ui/tags-ui.js';
import { AnnotationManager } from '../features/annotations/annotation-manager.js';
import { AnnotationParser } from '../features/annotations/annotation-parser.js';
import { CONFIG } from '../config/constants.js';

/**
 * Global scope utilities for console access and development
 */
export class GlobalScope {
  /**
   * Expose application utilities to global scope
   */
  static expose(app) {
    if (typeof window === 'undefined') return;
    
    // Expose main application instance
    window.AlertDebugApp = app;
    
    // Expose modal managers for UI access
    window.ModalManager = ModalManager;
    window.SettingsModal = {
      show: () => ModalManager.showSettingsDialog()
    };
    
    // Expose TagsUI for UI components
    window.TagsUI = TagsUI;
    
    // Expose admin tools for console access
    window.AlertDebugAdmin = {
      showStats: () => AdminTools.showStorageStats(),
      clearAll: () => AdminTools.clearAllData(),
      cleanup: (maxEntries, maxDays) => AdminTools.cleanupOldData(maxEntries, maxDays),
      exportMetadata: () => AdminTools.exportMetadataList(),
      deleteDB: () => AdminTools.deleteIndexedDatabase()
    };

    // Expose database instances for console access
    window.AlertDebugDB = {
      metadata: MetadataManager,
      notes: NotesManager,
      // Direct access to database instances
      get metadataDB() { return MetadataManager.db; },
      get notesDB() { return NotesManager.db; },
      
      // Convenient helper functions using constants
      async inspectStore(storeName) {
        const db = MetadataManager.db || NotesManager.db;
        if (!db) {
          console.error('Database not initialized');
          return null;
        }
        
        try {
          const data = await db.getAll(storeName);
          const stats = await db.getStats(storeName);
          
          console.log(`📊 Store: ${storeName}`);
          console.log(`📦 Count: ${stats.count}`);
          console.log('📋 Data:', data);
          
          return { data, stats };
        } catch (error) {
          console.error(`Error inspecting store ${storeName}:`, error);
          return null;
        }
      },
      
      // Store constants for easy access
      STORES: CONFIG.DATABASE.STORES
    };

    // Expose annotation system for console access
    window.AlertDebugAnnotations = {
      manager: AnnotationManager,
      parser: AnnotationParser,
      
      // Helper functions for testing
      createSample: () => AnnotationParser.createSampleAnnotation(),
      loadSample: async () => {
        const sample = AnnotationParser.createSampleAnnotation();
        return await AnnotationManager.loadAnnotationsForAlert(sample.alertId);
      },
      hide: () => AnnotationManager.hideAnnotations(),
      show: () => AnnotationManager.showAnnotations(),
      clear: () => AnnotationManager.clearAnnotations()
    };
    
    this.logAvailableCommands();
  }

  /**
   * Log available console commands for developers
   */
  static logAvailableCommands() {
    console.log('%cAlert Debug Admin Commands Available:', 'color: #4CAF50; font-weight: bold;');
    console.log('AlertDebugAdmin.showStats() - Show storage statistics');
    console.log('AlertDebugAdmin.clearAll() - Clear all data');
    console.log('AlertDebugAdmin.exportMetadata() - Export metadata list');
    console.log('AlertDebugAdmin.deleteDB() - Delete IndexedDB database');
    
    console.log('%cAnnotation System Commands:', 'color: #2196F3; font-weight: bold;');
    console.log('AlertDebugAnnotations.createSample() - Create sample annotation');
    console.log('AlertDebugAnnotations.loadSample() - Load sample annotation');
    console.log('AlertDebugAnnotations.hide() - Hide all annotations');
    console.log('AlertDebugAnnotations.show() - Show all annotations');
    console.log('AlertDebugAnnotations.clear() - Clear all annotations');
    console.log('AlertDebugAdmin.cleanup(1000, 30) - Clean up old entries');
    console.log('AlertDebugAdmin.exportMetadata() - Export metadata list');
    console.log('AlertDebugAdmin.deleteDB() - Delete IndexedDB database');
    console.log('AlertDebugApp.cleanup() - Clean up all UI elements and storage');
    
    console.log('%cAlert Debug Database Access:', 'color: #2196F3; font-weight: bold;');
    console.log('AlertDebugDB.metadata - MetadataManager instance');
    console.log('AlertDebugDB.notes - NotesManager instance');
    console.log('AlertDebugDB.metadataDB - Direct IndexedDB instance for metadata');
    console.log('AlertDebugDB.notesDB - Direct IndexedDB instance for notes');
    console.log('AlertDebugDB.STORES - Database store name constants');
    console.log('AlertDebugDB.inspectStore(storeName) - Inspect any store with data & stats');
    
    console.log('%cExample database usage:', 'color: #FF9800; font-style: italic;');
    console.log('AlertDebugDB.metadata.getAllMetadataUrls() - Get all metadata URLs');
    console.log('AlertDebugDB.notes.getAllNotes() - Get all notes');
    console.log('AlertDebugDB.inspectStore("metadataUrls") - Inspect metadata URLs store');
    console.log('AlertDebugDB.inspectStore(AlertDebugDB.STORES.METADATA) - Using constants');
  }
}
