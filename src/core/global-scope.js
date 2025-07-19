import { AdminTools } from '../utils/admin.js';

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
    
    // Expose admin tools for console access
    window.AlertDebugAdmin = {
      showStats: () => AdminTools.showStorageStats(),
      clearAll: () => AdminTools.clearAllData(),
      cleanup: (maxEntries, maxDays) => AdminTools.cleanupOldData(maxEntries, maxDays),
      exportMetadata: () => AdminTools.exportMetadataList(),
      deleteDB: () => AdminTools.deleteIndexedDatabase()
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
    console.log('AlertDebugAdmin.cleanup(1000, 30) - Clean up old entries');
    console.log('AlertDebugAdmin.exportMetadata() - Export metadata list');
    console.log('AlertDebugAdmin.deleteDB() - Delete IndexedDB database');
    console.log('AlertDebugApp.cleanup() - Clean up all UI elements and storage');
  }
}
