import { Utils } from '../utils/utils.js';
import { StorageManager } from '../utils/storage.js';

// ========================================
// ADMIN TOOLS
// ========================================
export const AdminTools = {
  // Show detailed storage statistics
  async showStorageStats() {
    const localStorageSize = this.getLocalStorageSize();
    
    // Note: MetadataManager will be injected when needed to avoid circular imports
    let metadataStats = {
      total: 0,
      downloaded: 0,
      cachedEntries: 0,
      totalSizeMB: 0,
      totalSizeKB: 0,
      pending: 0
    };
    
    // Try to get metadata stats if MetadataManager is available
    if (typeof window !== 'undefined' && window.MetadataManager) {
      try {
        metadataStats = await window.MetadataManager.getStats();
      } catch (error) {
        Utils.log(`Error getting metadata stats: ${error.message}`);
      }
    }
    
    console.log('=== Storage Usage Statistics ===');
    console.log(`localStorage: ${(localStorageSize/1024).toFixed(2)} KB`);
    console.log(`IndexedDB URLs: ${metadataStats.total} entries (${metadataStats.downloaded} downloaded)`);
    console.log(`IndexedDB Metadata: ${metadataStats.cachedEntries} cached entries`);
    console.log(`IndexedDB Size: ${metadataStats.totalSizeMB} MB (${metadataStats.totalSizeKB} KB)`);
    console.log(`Pending Downloads: ${metadataStats.pending}`);
    
    // Note: UIManager will be available in the main app context
    if (typeof window !== 'undefined' && window.UIManager) {
      window.UIManager.showNotification(
        `Storage: ${(localStorageSize/1024).toFixed(1)}KB localStorage + ${metadataStats.totalSizeMB}MB IndexedDB`,
        'info',
        5000
      );
    }
    
    return {
      localStorage: {
        sizeBytes: localStorageSize,
        sizeKB: Math.round(localStorageSize / 1024)
      },
      indexedDB: metadataStats
    };
  },

  getLocalStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += (localStorage[key].length + key.length) * 2; // UTF-16 encoding
      }
    }
    return total;
  },

  // Clear all data with confirmation
  async clearAllData() {
    const confirmed = confirm(
      'This will clear ALL stored data (localStorage + IndexedDB).\n\nThis includes:\n- Notes\n- Metadata URLs\n- Cached metadata content\n- Settings\n- Bulk processing state\n\nContinue?'
    );
    
    if (!confirmed) return;
    
    try {
      // Clear localStorage
      StorageManager.clear();
      Utils.log('Cleared localStorage');
      
      // Clear IndexedDB if MetadataManager is available
      if (typeof window !== 'undefined' && window.MetadataManager) {
        await window.MetadataManager.clearAll();
        Utils.log('Cleared IndexedDB');
      }
      
      // Show notification if UIManager is available
      if (typeof window !== 'undefined' && window.UIManager) {
        window.UIManager.showNotification('All data cleared successfully', 'success');
      }
    } catch (error) {
      Utils.log(`Error clearing data: ${error.message}`);
      if (typeof window !== 'undefined' && window.UIManager) {
        window.UIManager.showNotification(`Error clearing data: ${error.message}`, 'error');
      }
    }
  },

  // Delete entire IndexedDB database
  async deleteIndexedDatabase() {
    const confirmed = confirm(
      'This will DELETE the entire IndexedDB database.\n\nThis will permanently remove:\n- All metadata URLs\n- All cached metadata content\n\nContinue?'
    );
    
    if (!confirmed) return;
    
    try {
      if (typeof window !== 'undefined' && window.MetadataManager) {
        await window.MetadataManager.deleteDatabase();
        
        if (window.UIManager) {
          window.UIManager.showNotification('IndexedDB database deleted successfully', 'success');
        }
      } else {
        Utils.log('MetadataManager not available');
      }
    } catch (error) {
      Utils.log(`Error deleting IndexedDB database: ${error.message}`);
      if (typeof window !== 'undefined' && window.UIManager) {
        window.UIManager.showNotification(`Error deleting database: ${error.message}`, 'error');
      }
    }
  },

  // Clean up old entries
  async cleanupOldData(maxEntries = 1000, maxAgeInDays = 30) {
    try {
      if (typeof window !== 'undefined' && window.MetadataManager) {
        const result = await window.MetadataManager.cleanupOldEntries(maxEntries, maxAgeInDays);
        
        if (window.UIManager) {
          if (result) {
            window.UIManager.showNotification(`Cleanup completed - kept ${maxEntries} newest entries`, 'success');
          } else {
            window.UIManager.showNotification('No cleanup needed', 'info');
          }
        }
      } else {
        Utils.log('MetadataManager not available');
      }
    } catch (error) {
      Utils.log(`Error during cleanup: ${error.message}`);
      if (typeof window !== 'undefined' && window.UIManager) {
        window.UIManager.showNotification(`Cleanup error: ${error.message}`, 'error');
      }
    }
  },

  // Export metadata statistics to console
  async exportMetadataList() {
    try {
      if (typeof window !== 'undefined' && window.MetadataManager) {
        const allUrls = await window.MetadataManager.getAllMetadataUrls();
        const stats = await window.MetadataManager.getStats();
        
        console.log('=== Metadata Export ===');
        console.log('Statistics:', stats);
        console.log('All URLs:', allUrls);
        
        // Create downloadable JSON
        const exportData = {
          exportDate: new Date().toISOString(),
          statistics: stats,
          urls: allUrls
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `metadata-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        if (window.UIManager) {
          window.UIManager.showNotification('Metadata list exported', 'success');
        }
      } else {
        Utils.log('MetadataManager not available');
      }
    } catch (error) {
      Utils.log(`Error exporting metadata: ${error.message}`);
      if (typeof window !== 'undefined' && window.UIManager) {
        window.UIManager.showNotification(`Export error: ${error.message}`, 'error');
      }
    }
  }
};
