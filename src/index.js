/**
 * Alert Debug UserScript
 * 
 * This UserScript provides keyboard shortcuts for the Alert Debug page:
 * 
 * Input Management:
 *   - "Cmd+i" key: Focus the alert debug input field
 *   - Enter key: Submit the form (when input is focused) and blur input
 *   - Multiple alert IDs: Paste space/comma/newline separated IDs and press Enter
 * 
 * Bulk Processing:
 *   - "Cmd+b" key: Toggle bulk processing mode (shows paste dialog)
 *   - Cmd+Down arrow (↓): Load next alert ID in bulk mode
 *   - Cmd+Up arrow (↑): Load previous alert ID in bulk mode
 *   - Bulk alerts and alert type are automatically saved and restored between sessions
 *   - Clear bulk alerts option available in notepad panel
 * 
 * Video Controls:
 *   - Space bar: Toggle play/pause video (autoplay-safe with muting)
 *   - Left arrow (←): Rewind video by 5 seconds
 *   - Right arrow (→): Fast-forward video by 5 seconds
 * 
 * Notepad Feature:
 *   - "Cmd+j" key: Smart notepad toggle behavior
 *   - Notes are automatically saved per alert ID using local storage
 *   - Export notes as CSV with columns: [alert id, alert type, notes, timestamp]
 *   - Type "@" in notes to insert current video timestamp (mm:ss format)
 * 
 * Notes:
 *   - Video controls only work when no input field is focused
 *   - Bulk processing shows progress in top-right corner
 *   - Bulk alerts are persisted across browser sessions
 *   - The script waits for required elements to load before activating shortcuts
 *   - All shortcuts include proper event prevention to avoid conflicts
 *   - Video is automatically muted when played via spacebar for autoplay compliance
 *   - Notepad automatically shows notes for the current alert ID
 */

import { CONFIG } from './config/constants.js';
import { Utils } from './utils/utils.js';
import { StorageManager } from './utils/storage.js';
import { SettingsManager } from './managers/settings.js';
import { TagManager } from './managers/tags.js';

// Ensure imports are not tree-shaken
[CONFIG, Utils, StorageManager, SettingsManager, TagManager];

(() => {
  'use strict';

  // ========================================
  // METADATA MANAGER
  // ========================================
  const MetadataManager = {
    db: null,
    dbName: 'AlertDebugMetadata',
    dbVersion: 1,

    async init() {
      await this.initIndexedDB();
      this.interceptDashRequests();
      Utils.log('Metadata manager initialized - intercepting Dash requests and IndexedDB');
    },

    async initIndexedDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => {
          Utils.log('IndexedDB failed to open');
          reject(request.error);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          Utils.log('IndexedDB opened successfully');
          resolve(this.db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            const metadataStore = db.createObjectStore('metadata', { keyPath: 'alertId' });
            metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
            metadataStore.createIndex('downloaded', 'downloaded', { unique: false });
            Utils.log('Created metadata object store');
          }
          
          // Create URLs store for quick lookups
          if (!db.objectStoreNames.contains('urls')) {
            const urlsStore = db.createObjectStore('urls', { keyPath: 'alertId' });
            urlsStore.createIndex('timestamp', 'timestamp', { unique: false });
            Utils.log('Created URLs object store');
          }
        };
      });
    },

    interceptDashRequests() {
      const originalFetch = window.fetch;
      
      window.fetch = async function (...args) {
        const url = args[0];
        const options = args[1];

        // Only intercept Dash update component requests
        if (url.includes('/_dash-update-component') && options?.method === 'POST') {
          const response = await originalFetch(...args);
          
          // Clone response to read without consuming the original
          const clone = response.clone();
          
          try {
            const responseData = await clone.json();
            
            // Check if this response contains any metadata components
            const hasMetadataComponent = responseData?.response && (
              responseData.response['debug-alert-details-div'] ||
              responseData.response['debug_alert_details_div'] ||
              responseData.response['debug_alert_details']
            );
            
            if (hasMetadataComponent) {
              MetadataManager.processResponse(responseData);
            }
            
          } catch (error) {
            // Silently ignore JSON parsing errors (empty responses are normal)
          }
          
          return response;
        }
        
        // For all other requests, proceed normally
        return originalFetch(...args);
      };
    },

    processResponse(responseData) {
      try {
        // Check for the metadata component - try both hyphenated and underscored versions
        const possibleKeys = [
          'debug-alert-details-div',  // Original hyphenated version
          'debug_alert_details_div',  // Underscored version
          'debug_alert_details'       // Shortened underscored version
        ];
        
        for (const key of possibleKeys) {
          if (responseData?.response?.[key]?.data) {
            const data = responseData.response[key].data;
            
            if (data.alert_id && (data.metadata_path || data.summaryPath)) {
              const metadataUrl = data.metadata_path || data.summaryPath;
              this.storeMetadataUrl(data.alert_id, metadataUrl);
              Utils.log(`🎯 Captured metadata URL for alert ${data.alert_id}`);
              break;
            }
          }
        }
      } catch (error) {
        Utils.log(`Error extracting metadata from response: ${error.message}`);
      }
    },

    async storeMetadataUrl(alertId, metadataPath) {
      try {
        if (!this.db) await this.initIndexedDB();
        
        const urlData = {
          alertId,
          url: metadataPath,
          timestamp: new Date().toISOString(),
          downloaded: false
        };
        
        const transaction = this.db.transaction(['urls'], 'readwrite');
        const store = transaction.objectStore('urls');
        
        // Check if already exists
        const existing = await this.getFromStore(store, alertId);
        if (!existing) {
          await this.putToStore(store, urlData);
          Utils.log(`Stored metadata URL for alert ${alertId} in IndexedDB`);
        }
      } catch (error) {
        Utils.log(`Error storing metadata URL in IndexedDB: ${error.message}`);
        throw error;
      }
    },

    async getMetadataUrl(alertId) {
      try {
        if (!this.db) await this.initIndexedDB();
        
        const transaction = this.db.transaction(['urls'], 'readonly');
        const store = transaction.objectStore('urls');
        const result = await this.getFromStore(store, alertId);
        
        return result?.url || null;
      } catch (error) {
        Utils.log(`Error getting metadata URL from IndexedDB: ${error.message}`);
        throw error;
      }
    },

    async getAllMetadataUrls() {
      try {
        if (!this.db) await this.initIndexedDB();
        
        const transaction = this.db.transaction(['urls'], 'readonly');
        const store = transaction.objectStore('urls');
        const result = await this.getAllFromStore(store);
        
        // Convert array to object for backwards compatibility
        const urlsObject = {};
        result.forEach(item => {
          urlsObject[item.alertId] = {
            url: item.url,
            timestamp: item.timestamp,
            downloaded: item.downloaded
          };
        });
        
        return urlsObject;
      } catch (error) {
        Utils.log(`Error getting all metadata URLs from IndexedDB: ${error.message}`);
        throw error;
      }
    },

    async downloadMetadata(alertId) {
      try {
        if (!this.db) await this.initIndexedDB();
        
        // First check if we have the metadata content in IndexedDB
        const cachedMetadata = await this.getMetadataFromIndexedDB(alertId);
        if (cachedMetadata) {
          console.log('🔍 Found cached metadata in IndexedDB for alertId:', alertId);
          return cachedMetadata.content;
        }
        
        // Get URL from IndexedDB
        const metadataUrl = await this.getMetadataUrl(alertId);
        
        console.log('🔍 downloadMetadata called for alertId:', alertId);
        console.log('🔍 metadataUrl:', metadataUrl);
        
        if (!metadataUrl) {
          Utils.log(`No metadata URL found for alert ID: ${alertId}`);
          return null;
        }
        
        // Download fresh metadata
        console.log('🔍 About to call getSignedUrl with url:', metadataUrl);
        const signedUrl = await this.getSignedUrl(metadataUrl);
        
        if (!signedUrl) {
          throw new Error('Failed to get signed URL - check if S3 presigner server is running');
        }
        
        // Download the metadata file
        const response = await fetch(signedUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Store in IndexedDB
        await this.storeMetadataInIndexedDB(alertId, content, metadataUrl);
        
        // Process the metadata
        this.processMetadata(alertId, content);
        
        return content;
        
      } catch (error) {
        Utils.log(`Error downloading metadata for alert ${alertId}: ${error.message}`);
        return null;
      }
    },

    async getSignedUrl(s3Url) {
      try {
        // Debug logging
        console.log('🔍 getSignedUrl called with:', s3Url);
        
        if (!s3Url) {
          console.error('❌ s3Url is empty or undefined!');
          return null;
        }
        
        const requestBody = {
          url: s3Url
        };
        
        console.log('📤 Sending request to presigner:', CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL);
        console.log('📤 Request body:', requestBody);
        
        const response = await fetch(CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`Presigner server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📥 Presigner response:', data);
        return data.presigned_url;
        
      } catch (error) {
        // Check if it's a network error (server not running)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          Utils.log(`Presigner server not running on ${CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL}`);
          UIManager.showNotification(
            `S3 presigner server not running. Please start the server on ${CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL}`,
            'error',
            5000
          );
        } else {
          Utils.log(`Error getting signed URL: ${error.message}`);
          UIManager.showNotification(`Error getting signed URL: ${error.message}`, 'error');
        }
        return null;
      }
    },

    processMetadata(alertId, content) {
      try {
        Utils.log(`Processing metadata for alert ID: ${alertId}`);
        
        // Try to parse as JSON if it looks like JSON
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          try {
            const jsonData = JSON.parse(content);
            // TODO: Add specific metadata processing logic here
          } catch (e) {
            // Handle as text content
          }
        }
        
        // TODO: Add specific metadata processing logic here
        
      } catch (error) {
        Utils.log(`Error processing metadata for alert ${alertId}: ${error.message}`);
      }
    },

    // Helper method to download metadata for current alert
    async downloadCurrentMetadata() {
      const elements = Utils.getRequiredElements();
      const alertId = elements.input?.value.trim();
      
      if (!alertId) {
        UIManager.showNotification('No alert ID found', 'warning');
        return;
      }
      
      UIManager.showNotification(`Downloading metadata for alert ${alertId}...`, 'info');
      
      const content = await this.downloadMetadata(alertId);
      
      if (content) {
        UIManager.showNotification(`Metadata downloaded successfully for alert ${alertId}`, 'success');
        
        // Also download as JSON file
        await this.downloadMetadataAsFile(alertId, content);
        UIManager.showNotification(`JSON file download initiated for alert ${alertId}`, 'info');
      } else {
        UIManager.showNotification(`Failed to download metadata for alert ${alertId}`, 'error');
      }
      
      return content;
    },

    // IndexedDB Helper Functions
    async getFromStore(store, key) {
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    async putToStore(store, data) {
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    async getAllFromStore(store) {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    async deleteFromStore(store, key) {
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },

    async getMetadataFromIndexedDB(alertId) {
      try {
        const transaction = this.db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        return await this.getFromStore(store, alertId);
      } catch (error) {
        Utils.log(`Error getting metadata from IndexedDB: ${error.message}`);
        return null;
      }
    },

    async storeMetadataInIndexedDB(alertId, content, url) {
      try {
        const metadataData = {
          alertId,
          content,
          url,
          timestamp: new Date().toISOString(),
          downloaded: true,
          downloadedAt: new Date().toISOString(),
          size: content.length
        };
        
        const transaction = this.db.transaction(['metadata', 'urls'], 'readwrite');
        
        // Store full metadata
        const metadataStore = transaction.objectStore('metadata');
        await this.putToStore(metadataStore, metadataData);
        
        // Update URL record
        const urlsStore = transaction.objectStore('urls');
        const urlData = await this.getFromStore(urlsStore, alertId);
        if (urlData) {
          urlData.downloaded = true;
          urlData.downloadedAt = new Date().toISOString();
          await this.putToStore(urlsStore, urlData);
        }
        
        Utils.log(`Stored metadata content for alert ${alertId} in IndexedDB (${(content.length / 1024).toFixed(2)} KB)`);
      } catch (error) {
        Utils.log(`Error storing metadata in IndexedDB: ${error.message}`);
      }
    },

    // Download metadata content as a JSON file
    // along with some additional metadata
    async downloadMetadataAsFile(alertId, content) {
      try {
        // Create metadata object with additional info
        const metadataObject = {
          alertId: alertId,
          downloadedAt: new Date().toISOString(),
          url: await this.getMetadataUrl(alertId),
          content: content,
          contentType: this.detectContentType(content)
        };
        
        // Convert to JSON
        const jsonContent = JSON.stringify(metadataObject, null, 2);
        
        // Create filename with date
        const today = new Date().toISOString().split('T')[0];
        const filename = `metadata-alert-${alertId}-${today}.json`;
        
        Utils.log(`Attempting to download file: ${filename}`);
        
        // Create and download file with improved method
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        
        // Try using the newer showSaveFilePicker API if available
        if ('showSaveFilePicker' in window) {
          this.downloadWithFilePicker(blob, filename);
        } else {
          // Fallback to traditional method
          this.downloadWithLink(blob, filename);
        }
        
        Utils.log(`Downloaded metadata file for alert ${alertId}`);
      } catch (error) {
        Utils.log(`Error downloading metadata file: ${error.message}`);
        UIManager.showNotification(`Error downloading file: ${error.message}`, 'error');
      }
    },

    // Modern file download using File System Access API
    async downloadWithFilePicker(blob, filename) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'JSON files',
            accept: { 'application/json': ['.json'] }
          }]
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        Utils.log('File saved successfully using File System Access API');
      } catch (error) {
        Utils.log(`File picker failed, falling back to link method: ${error.message}`);
        this.downloadWithLink(blob, filename);
      }
    },

    // Traditional file download using anchor tag
    downloadWithLink(blob, filename) {
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Set attributes
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove
        document.body.appendChild(link);
        
        // Force click with user gesture
        setTimeout(() => {
          link.click();
          
          // Clean up after a delay
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
        }, 10);
        
        Utils.log('File download initiated using anchor tag method');
      } catch (error) {
        Utils.log(`Link download failed: ${error.message}`);
        throw error;
      }
    },

    // Detect if content is JSON, text, etc.
    detectContentType(content) {
      if (!content) return 'empty';
      
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          JSON.parse(trimmed);
          return 'json';
        } catch (e) {
          return 'text';
        }
      }
      
      return 'text';
    },

    // Get stats about stored metadata
    async getStats() {
      try {
        if (!this.db) await this.initIndexedDB();
        
        const transaction = this.db.transaction(['urls', 'metadata'], 'readonly');
        
        // Get URL stats
        const urlsStore = transaction.objectStore('urls');
        const allUrls = await this.getAllFromStore(urlsStore);
        
        // Get metadata stats
        const metadataStore = transaction.objectStore('metadata');
        const allMetadata = await this.getAllFromStore(metadataStore);
        
        const total = allUrls.length;
        const downloaded = allUrls.filter(item => item.downloaded).length;
        const totalSize = allMetadata.reduce((sum, item) => sum + (item.size || 0), 0);
        
        return {
          total,
          downloaded,
          pending: total - downloaded,
          totalSizeBytes: totalSize,
          totalSizeKB: Math.round(totalSize / 1024),
          totalSizeMB: Math.round(totalSize / (1024 * 1024)),
          cachedEntries: allMetadata.length
        };
      } catch (error) {
        Utils.log(`Error getting IndexedDB stats: ${error.message}`);
        throw error;
      }
    },

    // Clean up old metadata entries to prevent storage bloat
    async cleanupOldEntries(maxEntries = 1000, maxAgeInDays = 30) {
      try {
        if (!this.db) await this.initIndexedDB();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
        
        const transaction = this.db.transaction(['urls', 'metadata'], 'readwrite');
        
        // Clean URLs store
        const urlsStore = transaction.objectStore('urls');
        const allUrls = await this.getAllFromStore(urlsStore);
        
        if (allUrls.length > maxEntries) {
          // Sort by timestamp and keep only newest entries
          const sorted = allUrls.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
          const toDelete = sorted.slice(0, sorted.length - maxEntries);
          
          for (const item of toDelete) {
            await this.deleteFromStore(urlsStore, item.alertId);
          }
          
          Utils.log(`Cleaned up ${toDelete.length} old URL entries from IndexedDB`);
        }
        
        // Clean metadata store
        const metadataStore = transaction.objectStore('metadata');
        const allMetadata = await this.getAllFromStore(metadataStore);
        
        let deletedMetadata = 0;
        for (const item of allMetadata) {
          const itemDate = new Date(item.timestamp);
          if (itemDate < cutoffDate) {
            await this.deleteFromStore(metadataStore, item.alertId);
            deletedMetadata++;
          }
        }
        
        if (deletedMetadata > 0) {
          Utils.log(`Cleaned up ${deletedMetadata} old metadata entries from IndexedDB`);
        }
        
        return true;
      } catch (error) {
        Utils.log(`Error cleaning up IndexedDB: ${error.message}`);
        throw error;
      }
    },

    // Clear all metadata from IndexedDB
    async clearAll() {
      try {
        if (!this.db) await this.initIndexedDB();
        
        const transaction = this.db.transaction(['urls', 'metadata'], 'readwrite');
        
        // Clear both stores
        const urlsStore = transaction.objectStore('urls');
        const metadataStore = transaction.objectStore('metadata');
        
        await new Promise((resolve, reject) => {
          const clearUrls = urlsStore.clear();
          clearUrls.onsuccess = resolve;
          clearUrls.onerror = reject;
        });
        
        await new Promise((resolve, reject) => {
          const clearMetadata = metadataStore.clear();
          clearMetadata.onsuccess = resolve;
          clearMetadata.onerror = reject;
        });
        
        Utils.log('Cleared all metadata from IndexedDB');
        
        return true;
      } catch (error) {
        Utils.log(`Error clearing IndexedDB: ${error.message}`);
        throw error;
      }
    },

    // Delete entire IndexedDB database
    async deleteDatabase() {
      return new Promise((resolve, reject) => {
        if (this.db) {
          this.db.close();
          this.db = null;
        }
        
        const deleteRequest = indexedDB.deleteDatabase(this.dbName);
        
        deleteRequest.onsuccess = () => {
          Utils.log('IndexedDB database deleted successfully');
          resolve();
        };
        
        deleteRequest.onerror = () => {
          Utils.log('Error deleting IndexedDB database');
          reject(deleteRequest.error);
        };
        
        deleteRequest.onblocked = () => {
          Utils.log('IndexedDB deletion blocked - close other tabs');
          reject(new Error('Database deletion blocked'));
        };
      });
    }
  };

  // ========================================
  // ADMIN TOOLS
  // ========================================
  const AdminTools = {
    // Show detailed storage statistics
    async showStorageStats() {
      const localStorageSize = this.getLocalStorageSize();
      const metadataStats = await MetadataManager.getStats();
      
      console.log('=== Storage Usage Statistics ===');
      console.log(`localStorage: ${(localStorageSize/1024).toFixed(2)} KB`);
      console.log(`IndexedDB URLs: ${metadataStats.total} entries (${metadataStats.downloaded} downloaded)`);
      console.log(`IndexedDB Metadata: ${metadataStats.cachedEntries} cached entries`);
      console.log(`IndexedDB Size: ${metadataStats.totalSizeMB} MB (${metadataStats.totalSizeKB} KB)`);
      console.log(`Pending Downloads: ${metadataStats.pending}`);
      
      UIManager.showNotification(
        `Storage: ${(localStorageSize/1024).toFixed(1)}KB localStorage + ${metadataStats.totalSizeMB}MB IndexedDB`,
        'info',
        5000
      );
      
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
        
        // Clear IndexedDB
        await MetadataManager.clearAll();
        Utils.log('Cleared IndexedDB');
        
        UIManager.showNotification('All data cleared successfully', 'success');
      } catch (error) {
        Utils.log(`Error clearing data: ${error.message}`);
        UIManager.showNotification(`Error clearing data: ${error.message}`, 'error');
      }
    },

    // Delete entire IndexedDB database
    async deleteIndexedDatabase() {
      const confirmed = confirm(
        'This will DELETE the entire IndexedDB database.\n\nThis will permanently remove:\n- All metadata URLs\n- All cached metadata content\n\nContinue?'
      );
      
      if (!confirmed) return;
      
      try {
        await MetadataManager.deleteDatabase();
        UIManager.showNotification('IndexedDB database deleted successfully', 'success');
      } catch (error) {
        Utils.log(`Error deleting IndexedDB database: ${error.message}`);
        UIManager.showNotification(`Error deleting database: ${error.message}`, 'error');
      }
    },

    // Clean up old entries
    async cleanupOldData(maxEntries = 1000, maxAgeInDays = 30) {
      try {
        const result = await MetadataManager.cleanupOldEntries(maxEntries, maxAgeInDays);
        if (result) {
          UIManager.showNotification(`Cleanup completed - kept ${maxEntries} newest entries`, 'success');
        } else {
          UIManager.showNotification('No cleanup needed', 'info');
        }
      } catch (error) {
        Utils.log(`Error during cleanup: ${error.message}`);
        UIManager.showNotification(`Cleanup error: ${error.message}`, 'error');
      }
    },

    // Export metadata statistics to console
    async exportMetadataList() {
      try {
        const allUrls = await MetadataManager.getAllMetadataUrls();
        const stats = await MetadataManager.getStats();
        
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
        
        UIManager.showNotification('Metadata list exported', 'success');
      } catch (error) {
        Utils.log(`Error exporting metadata: ${error.message}`);
        UIManager.showNotification(`Export error: ${error.message}`, 'error');
      }
    }
  };

  // ========================================
  // NOTES MANAGER  
  // ========================================
  const NotesManager = {
    getAllNotes() {
      return StorageManager.get(CONFIG.STORAGE_KEYS.NOTES) || {};
    },

    getNote(alertId) {
      const notes = this.getAllNotes();
      const noteData = notes[alertId];
      
      // Handle legacy string format
      if (typeof noteData === 'string') {
        return noteData;
      }
      
      return noteData ? noteData.note : '';
    },

    getTags(alertId) {
      const notes = this.getAllNotes();
      const noteData = notes[alertId];
      
      // Handle legacy string format
      if (typeof noteData === 'string') {
        return [];
      }
      
      return noteData ? (noteData.tags || []) : [];
    },

    saveNote(alertId, note, manualTags = []) {
      if (!alertId) return false;

      const notes = this.getAllNotes();
      const hashtagTags = TagManager.extractHashtagsFromText(note);
      const allTags = TagManager.mergeTags(manualTags, hashtagTags);
      const alertType = Utils.getCurrentAlertType() || 'unknown';
      
      if (note.trim() || allTags.length > 0) {
        notes[alertId] = {
          note: note.trim(),
          tags: allTags,
          alertType: alertType,
          timestamp: new Date().toISOString()
        };
      } else {
        delete notes[alertId];
      }
      
      return StorageManager.set(CONFIG.STORAGE_KEYS.NOTES, notes);
    },

    deleteNote(alertId) {
      if (!alertId) return false;

      const notes = this.getAllNotes();
      delete notes[alertId];
      return StorageManager.set(CONFIG.STORAGE_KEYS.NOTES, notes);
    },

    clearAllNotes() {
      return StorageManager.remove(CONFIG.STORAGE_KEYS.NOTES);
    },

    exportToCsv() {
      const notes = this.getAllNotes();
      const entries = Object.entries(notes);
      
      if (entries.length === 0) {
        alert('No notes to export');
        return;
      }
      
      const csvContent = this.generateCsvContent(entries);
      this.downloadCsv(csvContent);
    },

    generateCsvContent(entries) {
      const headers = ['Alert ID', 'Alert Type', 'Notes', 'Tags', 'Timestamp'];
      const rows = entries.map(([alertId, noteData]) => {
        // Handle legacy format
        if (typeof noteData === 'string') {
          return [alertId, 'unknown', noteData, '', ''];
        }
        
        return [
          alertId,
          noteData.alertType || 'unknown',
          noteData.note || '',
          (noteData.tags || []).join(', '),
          noteData.timestamp || ''
        ];
      });
      
      return [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`))
        .join('\n');
    },

    downloadCsv(csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `alert-debug-notes-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // ========================================
  // FILTER MANAGER
  // ========================================
  const FilterManager = {
    getFilteredNotes(filterTags, logic = 'AND', includeHashtags = true) {
      if (!filterTags || filterTags.length === 0) {
        return NotesManager.getAllNotes();
      }
      
      const notes = NotesManager.getAllNotes();
      const filtered = {};
      
      Object.entries(notes).forEach(([alertId, noteData]) => {
        if (noteData && typeof noteData === 'object') {
          let alertTags = noteData.tags || [];
          
          // Include hashtags from note text if enabled
          if (includeHashtags && noteData.note) {
            const hashtagTags = TagManager.extractHashtagsFromText(noteData.note);
            alertTags = TagManager.mergeTags(alertTags, hashtagTags);
          }
          
          let matches = false;
          
          if (logic === 'AND') {
            matches = filterTags.every(tag => alertTags.includes(tag));
          } else {
            matches = filterTags.some(tag => alertTags.includes(tag));
          }
          
          if (matches) {
            filtered[alertId] = noteData;
          }
        }
      });
      
      return filtered;
    },

    getFilteredAlertIds(filterTags, logic = 'AND', includeHashtags = true) {
      const filteredNotes = this.getFilteredNotes(filterTags, logic, includeHashtags);
      return Object.keys(filteredNotes).sort();
    }
  };

  // ========================================
  // BULK PROCESSOR
  // ========================================
  const BulkProcessor = {
    state: {
      alertIds: [],
      currentIndex: -1,
      isProcessing: false,
      alertType: null
    },

    parseAlertIds(input) {
      if (!input) return [];
      
      return input
        .split(/[\s,\n]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0);
    },

    loadAlertIds(input) {
      const alertIds = this.parseAlertIds(input);
      this.state.alertIds = alertIds;
      this.state.currentIndex = -1;
      this.state.isProcessing = alertIds.length > 0;
      this.state.alertType = Utils.getCurrentAlertType();
      this.saveBulkAlerts();
      return alertIds.length;
    },

    saveBulkAlerts() {
      return StorageManager.set(CONFIG.STORAGE_KEYS.BULK_ALERTS, this.state);
    },

    loadBulkAlerts() {
      const saved = StorageManager.get(CONFIG.STORAGE_KEYS.BULK_ALERTS);
      if (saved) {
        this.state = { ...this.state, ...saved };
        return this.state.alertIds.length > 0;
      }
      return false;
    },

    clearBulkAlerts() {
      this.state = {
        alertIds: [],
        currentIndex: -1,
        isProcessing: false,
        alertType: null
      };
      return StorageManager.remove(CONFIG.STORAGE_KEYS.BULK_ALERTS);
    },

    getCurrentAlert() {
      return this.state.alertIds[this.state.currentIndex] || null;
    },

    hasNext() {
      return this.state.currentIndex < this.state.alertIds.length - 1;
    },

    hasPrevious() {
      return this.state.currentIndex > 0;
    },

    nextAlert() {
      if (this.hasNext()) {
        this.state.currentIndex++;
        this.saveBulkAlerts();
        return this.getCurrentAlert();
      }
      return null;
    },

    prevAlert() {
      if (this.hasPrevious()) {
        this.state.currentIndex--;
        this.saveBulkAlerts();
        return this.getCurrentAlert();
      }
      return null;
    },

    getProgress() {
      if (!this.state.isProcessing) return '';
      return `[${this.state.currentIndex + 1}/${this.state.alertIds.length}]`;
    },

    // Get current position in the list
    getCurrentPosition() {
      return {
        current: this.state.currentIndex + 1,
        total: this.state.alertIds.length,
        percentage: this.state.alertIds.length > 0 ? 
          Math.round(((this.state.currentIndex + 1) / this.state.alertIds.length) * 100) : 0
      };
    },

    // Navigate to a specific alert by index
    goToAlert(index) {
      if (index >= 0 && index < this.state.alertIds.length) {
        this.state.currentIndex = index;
        this.saveBulkAlerts();
        return this.getCurrentAlert();
      }
      return null;
    },

    nextFilteredAlert(filterTags, logic) {
      if (!filterTags || filterTags.length === 0) {
        return this.nextAlert();
      }
      
      const filteredIds = FilterManager.getFilteredAlertIds(filterTags, logic, AppState.notepad.includeHashtags);
      const currentAlert = this.getCurrentAlert();
      const currentIndex = filteredIds.indexOf(currentAlert);
      
      if (currentIndex !== -1 && currentIndex < filteredIds.length - 1) {
        const nextAlert = filteredIds[currentIndex + 1];
        const nextIndex = this.state.alertIds.indexOf(nextAlert);
        if (nextIndex !== -1) {
          this.state.currentIndex = nextIndex;
          this.saveBulkAlerts();
          return nextAlert;
        }
      }
      
      return null;
    },

    prevFilteredAlert(filterTags, logic) {
      if (!filterTags || filterTags.length === 0) {
        return this.prevAlert();
      }
      
      const filteredIds = FilterManager.getFilteredAlertIds(filterTags, logic, AppState.notepad.includeHashtags);
      const currentAlert = this.getCurrentAlert();
      const currentIndex = filteredIds.indexOf(currentAlert);
      
      if (currentIndex > 0) {
        const prevAlert = filteredIds[currentIndex - 1];
        const prevIndex = this.state.alertIds.indexOf(prevAlert);
        if (prevIndex !== -1) {
          this.state.currentIndex = prevIndex;
          this.saveBulkAlerts();
          return prevAlert;
        }
      }
      
      return null;
    }
  };

  // ========================================
  // APPLICATION STATE
  // ========================================
  const AppState = {
    notepad: {
      isOpen: false,
      currentAlertId: null,
      selectedFilters: [],
      filterLogic: 'AND',
      includeHashtags: true
    },

    setCurrentAlert(alertId) {
      this.notepad.currentAlertId = alertId;
    },

    toggleNotepad() {
      this.notepad.isOpen = !this.notepad.isOpen;
    },

    setFilters(filters) {
      this.notepad.selectedFilters = filters;
    },

    setFilterLogic(logic) {
      this.notepad.filterLogic = logic;
    },

    setIncludeHashtags(include) {
      this.notepad.includeHashtags = include;
    }
  };

  // ========================================
  // FIREWORKS MANAGER
  // ========================================
  const FireworksManager = {
    COLORS: [
      '#FF1744', '#FF9800', '#FFEB3B', '#4CAF50', '#00BCD4',
      '#2196F3', '#9C27B0', '#E91E63', '#FF5722', '#8BC34A'
    ],

    init() {
      this.createFireworksDisplay();
    },

    createFireworksDisplay() {
      const canvas = this.createCanvas();
      const ctx = canvas.getContext('2d');
      
      this.setupCanvasDimensions(canvas);
      this.startFireworksAnimation(ctx, canvas);
      this.handleWindowResize(canvas);
    },

    createCanvas() {
      const canvas = document.createElement('canvas');
      canvas.id = 'fireworks-canvas';
      canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 999999;
        pointer-events: none;
        background: transparent;
      `;
      
      document.body.appendChild(canvas);
      return canvas;
    },

    setupCanvasDimensions(canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    },

    startFireworksAnimation(ctx, canvas) {
      const fireworks = [];
      const particles = [];
      const duration = 8000; // 8 seconds
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed > duration) {
          this.fadeOutCanvas(canvas, elapsed - duration);
          if (elapsed > duration + 1500) {
            document.body.removeChild(canvas);
            return;
          }
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Launch new fireworks
        if (Math.random() < 0.12 && elapsed < duration - 1500) {
          const firework = this.createFirework(canvas);
          fireworks.push(firework);
        }
        
        // Update and draw fireworks
        this.updateFireworks(fireworks, particles, ctx);
        this.updateParticles(particles, ctx);
        
        requestAnimationFrame(animate);
      };
      
      animate();
    },

    createFirework(canvas) {
      const startX = Math.random() * canvas.width;
      const startY = canvas.height;
      const targetX = Math.random() * canvas.width;
      const targetY = Math.random() * canvas.height * 0.5;
      const color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
      
      return new Firework(startX, startY, targetX, targetY, color);
    },

    updateFireworks(fireworks, particles, ctx) {
      for (let i = fireworks.length - 1; i >= 0; i--) {
        if (!fireworks[i].update()) {
          fireworks[i].explode(particles);
          fireworks.splice(i, 1);
        } else {
          fireworks[i].draw(ctx);
        }
      }
    },

    updateParticles(particles, ctx) {
      for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update()) {
          particles.splice(i, 1);
        } else {
          particles[i].draw(ctx);
        }
      }
    },

    fadeOutCanvas(canvas, fadeTime) {
      canvas.style.opacity = Math.max(0, 1 - (fadeTime / 1500));
    },

    handleWindowResize(canvas) {
      window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      });
    }
  };

  // Firework class
  class Firework {
    constructor(x, y, targetX, targetY, color) {
      this.x = x;
      this.y = y;
      this.targetX = targetX;
      this.targetY = targetY;
      this.color = color;
      this.speed = 10;
      this.angle = Math.atan2(targetY - y, targetX - x);
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.distanceToTarget = Math.sqrt((targetX - x) ** 2 + (targetY - y) ** 2);
      this.distanceTraveled = 0;
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.distanceTraveled += this.speed;
      
      return this.distanceTraveled < this.distanceToTarget;
    }
    
    draw(ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    explode(particles) {
      const particleCount = 25 + Math.random() * 15;
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(this.targetX, this.targetY, this.color));
      }
    }
  }

  // Particle class
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.opacity = 1;
      this.decay = Math.random() * 0.02 + 0.01;
      this.speed = Math.random() * 6 + 2;
      this.angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.gravity = 0.15;
      this.friction = 0.98;
      this.size = Math.random() * 2 + 1;
    }
    
    update() {
      this.vy += this.gravity;
      this.vx *= this.friction;
      this.vy *= this.friction;
      
      this.x += this.vx;
      this.y += this.vy;
      
      this.opacity -= this.decay;
      
      return this.opacity > 0;
    }
    
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      ctx.shadowBlur = 5;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }

  // ========================================
  // VIDEO CONTROLS MANAGER
  // ========================================
  const VideoControlsManager = {
    init() {
      this.injectStyles();
      this.setupVideoObserver();
      this.enhanceExistingVideos();
    },

    injectStyles() {
      if (document.querySelector('#video-controls-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'video-controls-styles';
      style.textContent = this.getVideoControlsCSS();
      document.head.appendChild(style);
    },

    getVideoControlsCSS() {
      return `
        /* Hide native video controls */
        video::-webkit-media-controls {
          display: none !important;
        }
        
        video::-webkit-media-controls-panel {
          display: none !important;
        }
        
        /* Enhanced video container styling */
        .video-controls-enhanced {
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        .video-controls-enhanced video {
          width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
        }
        
        /* Custom controls panel positioned below video */
        .custom-video-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          margin-top: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          color: #333;
        }
        
        .custom-video-controls-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .custom-video-controls-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .video-control-button {
          background: transparent;
          border: none;
          color: #666;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        
        .video-control-button:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #333;
        }
        
        .video-control-button:active {
          background: rgba(0, 0, 0, 0.1);
          transform: translateY(1px);
        }
        
        .video-control-button.active {
          background: rgba(0, 0, 0, 0.08);
          color: #222;
        }
        
        .video-progress-container {
          flex: 1;
          margin: 0 16px;
          position: relative;
        }
        
        .video-progress-bar {
          width: 100%;
          height: 3px;
          background: #eee;
          border-radius: 2px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        
        .video-progress-fill {
          height: 100%;
          background: #333;
          border-radius: 2px;
          transition: width 0.1s ease;
        }
        
        .video-time-display {
          color: #666;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
          font-size: 10px;
          min-width: 70px;
          text-align: center;
          font-weight: 500;
        }
        
        /* Keyboard shortcuts indicator */
        .video-keyboard-hint {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 9px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 10;
          backdrop-filter: blur(5px);
        }
        
        .video-controls-enhanced:hover .video-keyboard-hint {
          opacity: 1;
        }
      `;
    },

    setupVideoObserver() {
      // Watch for new video elements being added to the page
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll('video');
              videos.forEach(video => this.enhanceVideo(video));
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    enhanceExistingVideos() {
      // Enhance all existing videos on the page
      const videos = document.querySelectorAll('video');
      videos.forEach(video => this.enhanceVideo(video));
    },

    enhanceVideo(video) {
      if (video.dataset.controlsEnhanced) return;
      
      const container = video.parentElement;
      if (!container) return;
      
      // Mark as enhanced
      video.dataset.controlsEnhanced = 'true';
      container.classList.add('video-controls-enhanced');
      
      // Remove native controls
      video.controls = false;
      
      // Create custom controls
      const controlsPanel = this.createCustomControls(video);
      container.appendChild(controlsPanel);
      
      // Add keyboard shortcuts hint
      this.addKeyboardHint(container);
      
      // Setup enhanced keyboard controls
      this.setupKeyboardControls(video);
      
      // Setup progress and volume updates
      this.setupVideoEvents(video, controlsPanel);
      
      Utils.log(`Enhanced video controls for video: ${video.src || 'unknown'}`);
    },

    createCustomControls(video) {
      const controls = document.createElement('div');
      controls.className = 'custom-video-controls';
      
      const leftSection = this.createLeftSection(video);
      const progressContainer = this.createProgressContainer(video);
      const rightSection = this.createRightSection(video);
      
      controls.appendChild(leftSection);
      controls.appendChild(progressContainer);
      controls.appendChild(rightSection);
      
      return controls;
    },

    createLeftSection(video) {
      const leftSection = document.createElement('div');
      leftSection.className = 'custom-video-controls-left';
      
      // Play/Pause button
      const playButton = document.createElement('button');
      playButton.className = 'video-control-button';
      playButton.innerHTML = '▶';
      playButton.addEventListener('click', () => {
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      });
      
      // Time display
      const timeDisplay = document.createElement('span');
      timeDisplay.className = 'video-time-display';
      timeDisplay.textContent = '0:00 / 0:00';
      
      leftSection.appendChild(playButton);
      leftSection.appendChild(timeDisplay);
      
      return leftSection;
    },

    createProgressContainer(video) {
      const progressContainer = document.createElement('div');
      progressContainer.className = 'video-progress-container';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'video-progress-bar';
      
      const progressFill = document.createElement('div');
      progressFill.className = 'video-progress-fill';
      
      progressBar.appendChild(progressFill);
      progressContainer.appendChild(progressBar);
      
      // Progress bar interaction
      progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * video.duration;
      });
      
      return progressContainer;
    },

    createRightSection(video) {
      const rightSection = document.createElement('div');
      rightSection.className = 'custom-video-controls-right';
      
      // Fullscreen button
      const fullscreenButton = document.createElement('button');
      fullscreenButton.className = 'video-control-button';
      fullscreenButton.innerHTML = '⛶';
      fullscreenButton.addEventListener('click', () => {
        if (video.requestFullscreen) {
          video.requestFullscreen();
        }
      });
      
      rightSection.appendChild(fullscreenButton);
      
      return rightSection;
    },

    setupVideoEvents(video, controlsPanel) {
      const playButton = controlsPanel.querySelector('.video-control-button');
      const timeDisplay = controlsPanel.querySelector('.video-time-display');
      const progressFill = controlsPanel.querySelector('.video-progress-fill');
      
      // Update play button
      const updatePlayButton = () => {
        playButton.innerHTML = video.paused ? '▶' : '⏸';
        playButton.classList.toggle('active', !video.paused);
      };
      
      // Update time display
      const updateTimeDisplay = () => {
        const current = Utils.formatTime(video.currentTime);
        const duration = Utils.formatTime(video.duration);
        timeDisplay.textContent = `${current} / ${duration}`;
      };
      
      // Update progress bar
      const updateProgress = () => {
        if (video.duration) {
          const percent = (video.currentTime / video.duration) * 100;
          progressFill.style.width = `${percent}%`;
        }
      };
      
      // Event listeners
      video.addEventListener('play', updatePlayButton);
      video.addEventListener('pause', updatePlayButton);
      video.addEventListener('timeupdate', Utils.debounce(() => {
        updateTimeDisplay();
        updateProgress();
      }, 100));
      video.addEventListener('loadedmetadata', updateTimeDisplay);
      
      // Initial state
      updatePlayButton();
      updateTimeDisplay();
      updateProgress();
    },

    addKeyboardHint(container) {
      if (container.querySelector('.video-keyboard-hint')) return;
      
      const hint = document.createElement('div');
      hint.className = 'video-keyboard-hint';
      hint.textContent = 'Space: Play/Pause • ←/→: Seek • F: Fullscreen';
      container.appendChild(hint);
    },

    setupKeyboardControls(video) {
      // Enhanced keyboard controls for individual videos
      video.addEventListener('keydown', (e) => {
        if (e.target !== video) return;
        
        switch (e.key) {
          case ' ':
            e.preventDefault();
            video.paused ? video.play() : video.pause();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            video.currentTime = Math.max(0, video.currentTime - CONFIG.TIMING.VIDEO_SEEK_SECONDS);
            break;
          case 'ArrowRight':
            e.preventDefault();
            video.currentTime = Math.min(video.duration, video.currentTime + CONFIG.TIMING.VIDEO_SEEK_SECONDS);
            break;
          case 'f':
            e.preventDefault();
            if (video.requestFullscreen) {
              video.requestFullscreen();
            }
            break;
        }
      });
      
      // Make video focusable for keyboard controls
      video.setAttribute('tabindex', '0');
    }
  };

  // ========================================
  // UI MANAGER
  // ========================================
  const UIManager = {
    BULK_STATUS_STYLES: {
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
      color: '#ffffff',
      padding: '10px 16px',
      borderRadius: '8px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
      fontSize: '13px',
      fontWeight: '500',
      zIndex: '10000',
      border: '2px solid #4a90e2',
      boxShadow: '0 0 20px rgba(74, 144, 226, 0.6), 0 0 40px rgba(74, 144, 226, 0.4), 0 0 60px rgba(74, 144, 226, 0.2)',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
      animation: 'pulseGlow 2s ease-in-out infinite alternate'
    },

    showBulkStatus(message) {
      let statusEl = document.querySelector('#bulk-status');
      if (!statusEl) {
        statusEl = this.createBulkStatusElement();
        document.body.appendChild(statusEl);
      }
      statusEl.textContent = message;
      
      if (!BulkProcessor.state.isProcessing) {
        setTimeout(() => {
          if (statusEl && statusEl.parentNode) {
            statusEl.parentNode.removeChild(statusEl);
          }
        }, 3000);
      }
    },

    createBulkStatusElement() {
      const statusEl = document.createElement('div');
      statusEl.id = 'bulk-status';
      
      // Apply styles
      Object.assign(statusEl.style, this.BULK_STATUS_STYLES);
      
      this.addGlowAnimation();
      return statusEl;
    },

    addGlowAnimation() {
      if (!document.querySelector('#bulk-status-keyframes')) {
        const style = document.createElement('style');
        style.id = 'bulk-status-keyframes';
        style.textContent = `
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 20px rgba(74, 144, 226, 0.6); }
            100% { box-shadow: 0 0 30px rgba(74, 144, 226, 0.8); }
          }
        `;
        document.head.appendChild(style);
      }
    },

    loadAlertId(alertId, elements) {
      Utils.log(`Loading alert ID: ${alertId}`);
      
      // Update notepad if open
      if (AppState.notepad.isOpen) {
        AppState.setCurrentAlert(alertId);
        NotepadUI.updateContent();
      }
      
      // Set input value without focusing to prevent page scroll
      this.setInputValue(elements.input, alertId);
      
      // Click submit button without focusing input
      setTimeout(() => {
        elements.button.click();
      }, 200);
    },

    setInputValue(input, value) {
      input.value = '';
      
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      
      // Trigger input events for Dash
      this.triggerInputEvents(input);
    },

    triggerInputEvents(input) {
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      Object.defineProperty(inputEvent, 'target', { writable: false, value: input });
      input.dispatchEvent(inputEvent);
      
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      Object.defineProperty(changeEvent, 'target', { writable: false, value: input });
      input.dispatchEvent(changeEvent);
    },

    // Show notification message
    showNotification(message, type = 'info', duration = 3000) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${this.getNotificationColor(type)};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
      `;
      
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, duration);
    },

    getNotificationColor(type) {
      const colors = {
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336'
      };
      return colors[type] || colors.info;
    },

    // Create a loading spinner
    createLoadingSpinner() {
      const spinner = document.createElement('div');
      spinner.style.cssText = `
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
        display: inline-block;
      `;
      
      // Add spin animation if not already present
      if (!document.querySelector('#spinner-animation')) {
        const style = document.createElement('style');
        style.id = 'spinner-animation';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      return spinner;
    }
  };

  // ========================================
  // NOTEPAD UI
  // ========================================
  const NotepadUI = {
    createPanel() {
      const panel = document.createElement('div');
      panel.id = 'notepad-panel';
      panel.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${CONFIG.UI.PANEL_DEFAULT_HEIGHT}px;
        background: #1e1e1e;
        border-top: 1px solid #3c3c3c;
        display: none;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #d4d4d4;
        overflow: hidden;
        min-height: ${CONFIG.UI.PANEL_MIN_HEIGHT}px;
        max-height: ${CONFIG.UI.PANEL_MAX_HEIGHT_RATIO * 100}vh;
        transform: translateY(100%);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      `;

      // Add resizer, header, and content
      panel.appendChild(this.createTopResizer(panel));
      panel.appendChild(this.createHeader());
      panel.appendChild(this.createMainContent());
      
      // Load saved dimensions
      this.loadSavedDimensions(panel);
      
      return panel;
    },

    createTopResizer(panel) {
      const resizer = document.createElement('div');
      resizer.style.cssText = `
        height: 4px;
        background: #3c3c3c;
        cursor: ns-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      `;
      
      const dots = document.createElement('div');
      dots.style.cssText = `
        width: 20px;
        height: 2px;
        background: repeating-linear-gradient(to right, #666 0px, #666 2px, transparent 2px, transparent 4px);
        opacity: 0.5;
      `;
      resizer.appendChild(dots);
      
      this.addResizerEvents(resizer, panel, dots);
      return resizer;
    },

    createHeader() {
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background: #2d2d30;
        border-bottom: 1px solid #3c3c3c;
        font-size: 13px;
      `;
      
      const left = document.createElement('div');
      left.style.cssText = 'display: flex; align-items: center; gap: 12px;';
      
      const title = document.createElement('span');
      title.textContent = 'Notes & Tags';
      title.style.cssText = 'font-weight: 500; color: #cccccc;';
      
      const alertId = document.createElement('span');
      alertId.id = 'notepad-alert-id';
      alertId.style.cssText = 'color: #569cd6; font-family: monospace; font-size: 12px;';
      
      const alertType = document.createElement('span');
      alertType.id = 'notepad-alert-type';
      alertType.style.cssText = 'color: #ce9178; font-family: monospace; font-size: 12px; font-style: italic;';
      
      left.appendChild(title);
      left.appendChild(alertId);
      left.appendChild(alertType);
      
      const right = this.createHeaderButtons();
      
      header.appendChild(left);
      header.appendChild(right);
      
      return header;
    },

    createHeaderButtons() {
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      
      const buttons = [
        { text: 'Download Metadata', color: '#6f42c1', action: () => MetadataManager.downloadCurrentMetadata() },
        { text: 'Import CSV', color: '#28a745', action: () => this.importCsv() },
        { text: 'Export CSV', color: '#0e639c', action: () => NotesManager.exportToCsv() },
        { text: 'Clear Notes', color: '#a1260d', action: () => this.clearAllNotes() },
        { text: 'Clear Bulk', color: '#d16c02', action: () => this.clearBulkAlerts() },
        { text: '⚙️', color: '#6c757d', action: () => this.openSettings() },
        { text: '×', color: '#3c3c3c', action: () => this.toggle() }
      ];
      
      buttons.forEach(btn => {
        const button = Utils.createButton(btn.text, btn.color, btn.action);
        container.appendChild(button);
      });
      
      return container;
    },

    createMainContent() {
      const content = document.createElement('div');
      content.style.cssText = `
        display: flex;
        height: calc(100% - 45px);
        overflow: hidden;
        position: relative;
      `;
      
      const leftPanel = this.createNotesPanel();
      const resizer = this.createVerticalResizer();
      const rightPanel = this.createTagsPanel();
      
      content.appendChild(leftPanel);
      content.appendChild(resizer);
      content.appendChild(rightPanel);
      
      return content;
    },

    createNotesPanel() {
      const panel = document.createElement('div');
      panel.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 16px;
        border-right: 1px solid #3c3c3c;
        min-width: 200px;
      `;
      
      // Add tags section above textarea
      const tagsSection = TagsUI.createCurrentAlertTagsSection();
      panel.appendChild(tagsSection);
      
      const textarea = document.createElement('textarea');
      textarea.id = 'notepad-textarea';
      textarea.placeholder = 'Enter your notes for this alert ID... (Type @ to insert video timestamp)';
      textarea.style.cssText = `
        width: 100%;
        flex: 1;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        padding: 12px;
        font-family: monospace;
        font-size: 13px;
        line-height: 1.5;
        resize: none;
        outline: none;
        box-sizing: border-box;
        margin-top: 8px;
      `;
      
      textarea.addEventListener('input', (e) => this.handleNoteInput(textarea, e));
      panel.appendChild(textarea);
      
      return panel;
    },

    createTagsPanel() {
      const panel = document.createElement('div');
      panel.id = 'notepad-right-panel';
      panel.style.cssText = `
        width: ${CONFIG.UI.TAGS_DEFAULT_WIDTH}px;
        display: flex;
        flex-direction: column;
        padding: 16px;
        gap: 16px;
        min-width: ${CONFIG.UI.TAGS_MIN_WIDTH}px;
      `;
      
      // Only include the filter section
      panel.appendChild(TagsUI.createFilterSection());
      
      return panel;
    },

    toggle() {
      let panel = document.querySelector('#notepad-panel');
      
      if (!panel) {
        panel = this.createPanel();
        document.body.appendChild(panel);
      }
      
      if (AppState.notepad.isOpen) {
        // If notepad is open, check if focus is within the notepad
        if (Utils.isNotepadFocused()) {
          // Focus is within notepad, so close it with animation
          panel.style.transform = 'translateY(100%)';
          setTimeout(() => {
            panel.style.display = 'none';
          }, 250);
          AppState.toggleNotepad();
          document.body.focus();
        } else {
          // Focus is outside notepad, so focus on the textarea instead of closing
          const textarea = document.querySelector('#notepad-textarea');
          if (textarea) {
            textarea.focus();
          }
        }
      } else {
        // Notepad is closed, so open it with animation
        panel.style.display = 'block';
        // Force reflow to ensure display change takes effect
        panel.offsetHeight;
        panel.style.transform = 'translateY(0)';
        AppState.toggleNotepad();
        
        const elements = Utils.getRequiredElements();
        const alertId = elements.input?.value.trim();
        if (alertId) {
          AppState.setCurrentAlert(alertId);
        }
        
        this.updateContent();
        // Focus after animation starts
        setTimeout(() => {
          document.querySelector('#notepad-textarea')?.focus();
        }, 100);
      }
    },

    updateContent() {
      const alertDisplay = document.querySelector('#notepad-alert-id');
      const alertTypeDisplay = document.querySelector('#notepad-alert-type');
      const textarea = document.querySelector('#notepad-textarea');
      
      if (alertDisplay && alertTypeDisplay && textarea) {
        const alertId = AppState.notepad.currentAlertId;
        if (alertId) {
          // Get alert type from stored notes data
          const notes = NotesManager.getAllNotes();
          const noteData = notes[alertId];
          let alertType = 'unknown';
          
          if (noteData && typeof noteData === 'object' && noteData.alertType) {
            alertType = noteData.alertType;
          }
          
          // Check if current dropdown selection matches the alert type
          const currentDropdownType = Utils.getCurrentAlertType();
          const isTypeMismatch = currentDropdownType && alertType !== 'unknown' && 
                                 currentDropdownType.toLowerCase() !== alertType.toLowerCase();
          
          if (isTypeMismatch) {
            alertDisplay.innerHTML = `[${alertType}:${alertId}] <span style="color: #ff6b6b;">⚠️ Change dropdown to "${alertType}"</span>`;
            alertDisplay.style.color = '#569cd6'; // Keep default color for the main part
          } else {
            alertDisplay.textContent = `[${alertType}:${alertId}]`;
            alertDisplay.style.color = '#569cd6'; // Default blue color
          }
          
          alertTypeDisplay.textContent = ''; // Clear the separate type display
          textarea.value = NotesManager.getNote(alertId);
        } else {
          alertDisplay.textContent = 'No alert ID selected';
          alertDisplay.style.color = '#569cd6'; // Reset to default color
          alertTypeDisplay.textContent = '';
          textarea.value = '';
        }
      }
      
      TagsUI.updateTagsDisplay();
      TagsUI.updateFilterDisplay();
    },

    handleNoteInput(textarea, event) {
      const alertId = AppState.notepad.currentAlertId;
      if (!alertId) return;
      
      // Check if the user just typed "@" and replace it with video timestamp
      if (event && event.inputType === 'insertText' && event.data === '@') {
        const timestamp = Utils.getCurrentVideoTimestamp();
        if (timestamp) {
          // Get current cursor position
          const cursorPos = textarea.selectionStart;
          const textBefore = textarea.value.substring(0, cursorPos - 1); // -1 to exclude the "@"
          const textAfter = textarea.value.substring(cursorPos);
          
          // Replace the "@" with the timestamp
          textarea.value = textBefore + timestamp + textAfter;
          
          // Set cursor position after the timestamp
          const newCursorPos = cursorPos - 1 + timestamp.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }
      }
      
      const existingTags = NotesManager.getTags(alertId);
      const previousText = NotesManager.getNote(alertId);
      const previousHashtags = TagManager.extractHashtagsFromText(previousText);
      const manualTags = existingTags.filter(tag => !previousHashtags.includes(tag));
      
      NotesManager.saveNote(alertId, textarea.value, manualTags);
      TagsUI.updateTagsDisplay();
      TagsUI.updateFilterDisplay();
    },

    // Helper methods for resizing and saving dimensions
    addResizerEvents(resizer, panel, dots) {
      let isResizing = false;
      
      resizer.addEventListener('mouseenter', () => {
        resizer.style.backgroundColor = '#569cd6';
        dots.style.opacity = '1';
      });
      
      resizer.addEventListener('mouseleave', () => {
        resizer.style.backgroundColor = '#3c3c3c';
        dots.style.opacity = '0.5';
      });
      
      resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const viewportHeight = window.innerHeight;
        const newHeight = viewportHeight - e.clientY;
        const minHeight = CONFIG.UI.PANEL_MIN_HEIGHT;
        const maxHeight = viewportHeight * CONFIG.UI.PANEL_MAX_HEIGHT_RATIO;
        const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        
        panel.style.height = `${clampedHeight}px`;
        StorageManager.set(CONFIG.STORAGE_KEYS.PANEL_HEIGHT, clampedHeight);
      });
      
      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
        }
      });
    },

    createVerticalResizer() {
      const resizer = document.createElement('div');
      resizer.style.cssText = `
        width: 4px;
        background: #3c3c3c;
        cursor: col-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      `;
      
      const dots = document.createElement('div');
      dots.style.cssText = `
        width: 2px;
        height: 20px;
        background: repeating-linear-gradient(to bottom, #666 0px, #666 2px, transparent 2px, transparent 4px);
        opacity: 0.5;
      `;
      resizer.appendChild(dots);
      
      let isResizing = false;
      
      resizer.addEventListener('mouseenter', () => {
        resizer.style.backgroundColor = '#569cd6';
        dots.style.opacity = '1';
      });
      
      resizer.addEventListener('mouseleave', () => {
        resizer.style.backgroundColor = '#3c3c3c';
        dots.style.opacity = '0.5';
      });
      
      resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const rightPanel = document.querySelector('#notepad-right-panel');
        const container = rightPanel.parentElement;
        const containerRect = container.getBoundingClientRect();
        const newWidth = containerRect.right - e.clientX;
        const clampedWidth = Math.max(CONFIG.UI.TAGS_MIN_WIDTH, Math.min(containerRect.width - 250, newWidth));
        
        rightPanel.style.width = `${clampedWidth}px`;
        StorageManager.set(CONFIG.STORAGE_KEYS.PANEL_WIDTH, clampedWidth);
      });
      
      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
        }
      });
      
      return resizer;
    },

    loadSavedDimensions(panel) {
      const savedHeight = StorageManager.get(CONFIG.STORAGE_KEYS.PANEL_HEIGHT);
      if (savedHeight) {
        panel.style.height = `${savedHeight}px`;
      }
      
      setTimeout(() => {
        const savedWidth = StorageManager.get(CONFIG.STORAGE_KEYS.PANEL_WIDTH);
        const rightPanel = document.querySelector('#notepad-right-panel');
        if (savedWidth && rightPanel) {
          rightPanel.style.width = `${savedWidth}px`;
        }
      }, 100);
    },

    clearAllNotes() {
      if (confirm('Are you sure you want to clear all notes and tags?')) {
        NotesManager.clearAllNotes();
        document.querySelector('#notepad-textarea').value = '';
        this.updateContent();
      }
    },

    clearBulkAlerts() {
      if (confirm('Are you sure you want to clear all bulk alerts?')) {
        BulkProcessor.clearBulkAlerts();
        UIManager.showBulkStatus('Bulk alerts cleared');
      }
    },

    openSettings() {
      SettingsModal.show();
    },

    importCsv() {
      ModalManager.showImportDialog();
    }
  };

  // ========================================
  // TAGS UI
  // ========================================
  const TagsUI = {
    createCurrentAlertTagsSection() {
      const section = document.createElement('div');
      section.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
      
      // Create horizontal container for input and tags
      const tagsContainer = document.createElement('div');
      tagsContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        background: #252526;
        min-height: 32px;
      `;
      
      const input = document.createElement('input');
      input.id = 'tag-input';
      input.placeholder = 'Add tag...';
      input.style.cssText = `
        flex: 0 0 120px;
        padding: 4px 6px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 1px solid #3c3c3c;
        border-radius: 3px;
        font-size: 11px;
        outline: none;
        box-sizing: border-box;
      `;
      
      const display = document.createElement('div');
      display.id = 'current-tags-display';
      display.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        flex: 1;
        min-height: 24px;
        align-items: center;
      `;
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          this.addTag(input.value.trim());
          input.value = '';
        }
      });
      
      tagsContainer.appendChild(input);
      tagsContainer.appendChild(display);
      
      section.appendChild(tagsContainer);
      
      return section;
    },

    createTagsSection() {
      const section = document.createElement('div');
      section.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
      
      const title = document.createElement('div');
      title.textContent = 'Tags';
      title.style.cssText = `
        font-weight: 500;
        color: #cccccc;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      
      const display = document.createElement('div');
      display.id = 'current-tags-display';
      display.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        min-height: 24px;
        padding: 4px;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        background: #252526;
      `;
      
      const input = document.createElement('input');
      input.id = 'tag-input';
      input.placeholder = 'Add tag...';
      input.style.cssText = `
        width: 100%;
        padding: 6px 8px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        font-size: 12px;
        outline: none;
        box-sizing: border-box;
      `;
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          this.addTag(input.value.trim());
          input.value = '';
        }
      });
      
      section.appendChild(title);
      section.appendChild(display);
      section.appendChild(input);
      
      return section;
    },

    createFilterSection() {
      const section = document.createElement('div');
      section.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';
      
      // Combine hashtag toggle and logic buttons in one row
      const topRow = document.createElement('div');
      topRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 8px;';
      
      const hashtagToggle = this.createHashtagToggle();
      const logicButtons = this.createLogicButtons();
      
      topRow.appendChild(hashtagToggle);
      topRow.appendChild(logicButtons);
      
      const filterDisplay = this.createFilterDisplay();
      const clearButton = this.createClearButton();
      const searchBox = this.createSearchBox();
      const tagsList = this.createTagsList();
      
      section.appendChild(topRow);
      section.appendChild(filterDisplay);
      section.appendChild(clearButton);
      section.appendChild(searchBox);
      section.appendChild(tagsList);
      
      return section;
    },

    createHashtagToggle() {
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; align-items: center; gap: 6px;';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'includeHashtagsToggle';
      checkbox.checked = AppState.notepad.includeHashtags;
      checkbox.style.cssText = `
        width: 14px;
        height: 14px;
        accent-color: #0e639c;
        cursor: pointer;
      `;
      
      const label = document.createElement('label');
      label.htmlFor = 'includeHashtagsToggle';
      label.textContent = 'Include hashtags';
      label.style.cssText = `
        color: #cccccc;
        font-size: 11px;
        cursor: pointer;
        user-select: none;
      `;
      
      checkbox.addEventListener('change', (e) => {
        AppState.setIncludeHashtags(e.target.checked);
        this.updateTagsList();
        this.updateFilterDisplay();
      });
      
      container.appendChild(checkbox);
      container.appendChild(label);
      
      return container;
    },

    createLogicButtons() {
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; gap: 4px;';
      
      ['AND', 'OR'].forEach(logic => {
        const button = document.createElement('button');
        button.textContent = logic;
        button.style.cssText = `
          padding: 2px 6px;
          border: 1px solid #464647;
          background: ${AppState.notepad.filterLogic === logic ? '#0e639c' : '#2d2d30'};
          color: ${AppState.notepad.filterLogic === logic ? '#ffffff' : '#cccccc'};
          border-radius: 2px;
          cursor: pointer;
          font-size: 10px;
          font-family: inherit;
          font-weight: ${AppState.notepad.filterLogic === logic ? 'bold' : 'normal'};
        `;
        
        button.addEventListener('click', () => {
          AppState.setFilterLogic(logic);
          this.updateFilterDisplay();
        });
        
        container.appendChild(button);
      });
      
      return container;
    },

    createSearchBox() {
      const searchBox = document.createElement('input');
      searchBox.type = 'text';
      searchBox.id = 'tag-search-box';
      searchBox.placeholder = 'Search tags...';
      searchBox.style.cssText = `
        width: 100%;
        padding: 6px 8px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        font-size: 12px;
        outline: none;
        box-sizing: border-box;
      `;
      
      searchBox.addEventListener('input', (e) => {
        this.filterTagsList(e.target.value);
      });
      
      searchBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.selectTopSearchResult();
        }
      });
      
      return searchBox;
    },

    selectTopSearchResult() {
      const searchBox = document.querySelector('#tag-search-box');
      if (!searchBox || !searchBox.value.trim()) return;
      
      const searchTerm = searchBox.value.toLowerCase();
      const notes = NotesManager.getAllNotes();
      const tagCounts = TagManager.getTagCounts(notes, AppState.notepad.includeHashtags);
      const filters = AppState.notepad.selectedFilters;
      
      // Find the first unselected tag that matches the search term
      const matchingTag = Object.keys(tagCounts)
        .filter(tag => !filters.includes(tag)) // Only consider unselected tags
        .filter(tag => tag.toLowerCase().includes(searchTerm))
        .sort()[0]; // Get the first one alphabetically
      
      if (matchingTag) {
        // Add the tag to filters (we know it's not selected since we filtered it out)
        filters.push(matchingTag);
        AppState.setFilters(filters);
        
        // Clear the search box
        searchBox.value = '';
        
        // Update the display
        this.updateFilterDisplay();
      }
    },

    createFilterDisplay() {
      const display = document.createElement('div');
      display.id = 'current-filter-display';
      display.style.cssText = `
        font-size: 12px;
        color: #569cd6;
        font-style: italic;
        min-height: 32px;
        padding: 4px;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        background: #252526;
      `;
      
      return display;
    },

    createClearButton() {
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; gap: 4px;';
      
      const clearButton = document.createElement('button');
      clearButton.textContent = 'Clear All Filters';
      clearButton.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        border: 1px solid #464647;
        background: #2d2d30;
        color: #cccccc;
        border-radius: 2px;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
      `;
      
      clearButton.addEventListener('click', () => {
        AppState.setFilters([]);
        this.updateFilterDisplay();
      });
      
      const enterButton = document.createElement('button');
      enterButton.textContent = 'Enter Filter';
      enterButton.style.cssText = `
        flex: 1;
        padding: 4px 8px;
        border: 1px solid #464647;
        background: #0e639c;
        color: #ffffff;
        border-radius: 2px;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
        font-weight: bold;
      `;
      
      enterButton.addEventListener('click', () => {
        this.enterFilter();
      });
      
      container.appendChild(clearButton);
      container.appendChild(enterButton);
      
      return container;
    },

    enterFilter() {
      const filters = AppState.notepad.selectedFilters;
      const logic = AppState.notepad.filterLogic;
      
      if (filters.length === 0) {
        UIManager.showBulkStatus('No filters selected');
        return;
      }
      
      if (!BulkProcessor.state.isProcessing) {
        UIManager.showBulkStatus('No bulk processing active');
        return;
      }
      
      const filteredIds = FilterManager.getFilteredAlertIds(filters, logic, AppState.notepad.includeHashtags);
      
      if (filteredIds.length === 0) {
        UIManager.showBulkStatus('No alerts match the selected filters');
        return;
      }
      
      // Save this filter group to recent history
      this.saveRecentFilterGroup(filters, logic);
      
      // Load the first filtered alert
      const firstAlert = filteredIds[0];
      const firstIndex = BulkProcessor.state.alertIds.indexOf(firstAlert);
      
      if (firstIndex !== -1) {
        BulkProcessor.state.currentIndex = firstIndex;
        BulkProcessor.saveBulkAlerts();
        
        const elements = Utils.getRequiredElements();
        UIManager.loadAlertId(firstAlert, elements);
        
        const filterText = filters.join(` ${logic} `);
        UIManager.showBulkStatus(`[1/${filteredIds.length}] filtered by "${filterText}" ${firstAlert}`);
      }
    },

    createClearButton_OLD() {
      const button = document.createElement('button');
      button.textContent = 'Clear All Filters';
      button.style.cssText = `
        padding: 4px 8px;
        border: 1px solid #464647;
        background: #2d2d30;
        color: #cccccc;
        border-radius: 2px;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
      `;
      
      button.addEventListener('click', () => {
        AppState.setFilters([]);
        this.updateFilterDisplay();
        
        if (BulkProcessor.state.isProcessing) {
          const current = BulkProcessor.getCurrentAlert();
          UIManager.showBulkStatus(`${BulkProcessor.getProgress()} ${current}`);
        }
      });
      
      return button;
    },

    createTagsList() {
      const list = document.createElement('div');
      list.id = 'available-tags-list';
      list.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        background: #252526;
        padding: 4px;
      `;
      
      return list;
    },

    addTag(tagName) {
      const alertId = AppState.notepad.currentAlertId;
      if (!alertId || !tagName) return;
      
      const currentTags = NotesManager.getTags(alertId);
      if (!currentTags.includes(tagName)) {
        currentTags.push(tagName);
        const noteText = document.querySelector('#notepad-textarea').value;
        NotesManager.saveNote(alertId, noteText, currentTags);
        this.updateTagsDisplay();
        this.updateFilterDisplay();
      }
    },

    removeTag(tagName) {
      const alertId = AppState.notepad.currentAlertId;
      if (!alertId) return;
      
      const currentTags = NotesManager.getTags(alertId);
      const updatedTags = currentTags.filter(tag => tag !== tagName);
      const noteText = document.querySelector('#notepad-textarea').value;
      NotesManager.saveNote(alertId, noteText, updatedTags);
      this.updateTagsDisplay();
      this.updateFilterDisplay();
    },

    updateTagsDisplay() {
      const display = document.querySelector('#current-tags-display');
      if (!display) return;
      
      display.innerHTML = '';
      
      const alertId = AppState.notepad.currentAlertId;
      if (alertId) {
        const tags = NotesManager.getTags(alertId);
        const noteText = NotesManager.getNote(alertId);
        const hashtagTags = TagManager.extractHashtagsFromText(noteText);
        
        tags.forEach(tag => {
          const isHashtag = hashtagTags.includes(tag);
          const chip = this.createTagChip(tag, !isHashtag, isHashtag);
          display.appendChild(chip);
        });
      }
    },

    updateFilterDisplay() {
      const display = document.querySelector('#current-filter-display');
      const list = document.querySelector('#available-tags-list');
      
      if (!display || !list) return;
      
      // Update logic buttons
      const buttons = document.querySelectorAll('#notepad-panel button');
      buttons.forEach(btn => {
        if (btn.textContent === 'AND' || btn.textContent === 'OR') {
          const isActive = btn.textContent === AppState.notepad.filterLogic;
          btn.style.background = isActive ? '#0e639c' : '#2d2d30';
          btn.style.color = isActive ? '#ffffff' : '#cccccc';
          btn.style.fontWeight = isActive ? 'bold' : 'normal';
        }
      });
      
      // Update filter display
      const filters = AppState.notepad.selectedFilters;
      if (filters.length > 0) {
        const filteredIds = FilterManager.getFilteredAlertIds(filters, AppState.notepad.filterLogic, AppState.notepad.includeHashtags);
        
        // Create the main structure
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = 'font-weight: bold; margin-bottom: 4px;';
        headerDiv.textContent = `Active Filters (${AppState.notepad.filterLogic}): ${filteredIds.length} alerts`;
        
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px;';
        
        // Create filter chips with proper event listeners
        filters.forEach(tag => {
          const chip = this.createFilterChip(tag);
          container.appendChild(chip);
        });
        
        // Clear and rebuild display
        display.innerHTML = '';
        display.appendChild(headerDiv);
        display.appendChild(container);
        
        if (BulkProcessor.state.isProcessing) {
          const hintDiv = document.createElement('div');
          hintDiv.style.cssText = 'font-size: 10px; color: #888; margin-top: 4px;';
          hintDiv.textContent = 'Use Cmd+↑/↓ to navigate filtered alerts';
          display.appendChild(hintDiv);
        }
      } else {
        display.innerHTML = `
          <div style="color: #888; font-style: italic;">
            No filters active - click tags below to filter
          </div>
        `;
      }
      
      // Update tags list
      this.updateTagsList();
    },

    createFilterChip(tag) {
      const chip = document.createElement('span');
      chip.style.cssText = `
        background: #0e639c;
        color: white;
        padding: 2px 6px;
        border-radius: 12px;
        font-size: 10px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        user-select: none;
      `;
      
      const tagText = document.createElement('span');
      tagText.textContent = tag;
      
      const removeBtn = document.createElement('span');
      removeBtn.textContent = '×';
      removeBtn.style.cssText = `
        cursor: pointer;
        color: #ccc;
        font-weight: bold;
        font-size: 12px;
        padding: 0 2px;
        border-radius: 2px;
        transition: background-color 0.2s;
      `;
      
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFromFilter(tag);
      });
      
      removeBtn.addEventListener('mouseenter', () => {
        removeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      });
      
      removeBtn.addEventListener('mouseleave', () => {
        removeBtn.style.backgroundColor = 'transparent';
      });
      
      chip.appendChild(tagText);
      chip.appendChild(removeBtn);
      
      return chip;
    },

    updateTagsList() {
      const list = document.querySelector('#available-tags-list');
      if (!list) return;
      
      list.innerHTML = '';
      const notes = NotesManager.getAllNotes();
      const tagCounts = TagManager.getTagCounts(notes, AppState.notepad.includeHashtags);
      const filters = AppState.notepad.selectedFilters;
      
      // Get search term
      const searchBox = document.querySelector('#tag-search-box');
      const searchTerm = searchBox ? searchBox.value.toLowerCase() : '';
      
      // Filter tags based on search AND exclude already selected filters
      const filteredTags = Object.entries(tagCounts)
        .filter(([tag]) => !filters.includes(tag)) // Only show unselected tags
        .filter(([tag]) => tag.toLowerCase().includes(searchTerm))
        .sort();
      
      // Add filtered tags
      filteredTags.forEach(([tag, count]) => {
        const item = this.createTagItem(tag, count, false); // Always false since we're only showing unselected
        list.appendChild(item);
      });
      
      // Add recent filter groups at the bottom
      this.addRecentFilterGroups(list);
    },

    filterTagsList(searchTerm) {
      this.updateTagsList();
    },

    addRecentFilterGroups(list) {
      const recentGroups = this.getRecentFilterGroups();
      
      if (recentGroups.length > 0) {
        // Add separator
        const separator = document.createElement('div');
        separator.style.cssText = `
          margin: 8px 0 4px 0;
          border-top: 1px solid #3c3c3c;
          padding-top: 8px;
        `;
        
        const title = document.createElement('div');
        title.textContent = 'Recent Filter Groups';
        title.style.cssText = `
          font-size: 10px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        `;
        
        separator.appendChild(title);
        list.appendChild(separator);
        
        // Add recent groups
        recentGroups.forEach(group => {
          const groupItem = this.createRecentGroupItem(group);
          list.appendChild(groupItem);
        });
      }
    },

    getRecentFilterGroups() {
      const recent = StorageManager.get('recent-filter-groups') || [];
      return recent.slice(0, 3); // Keep only last 3
    },

    saveRecentFilterGroup(filters, logic) {
      if (filters.length === 0) return;
      
      const group = {
        filters: [...filters],
        logic: logic,
        timestamp: Date.now()
      };
      
      let recent = StorageManager.get('recent-filter-groups') || [];
      
      // Remove duplicate if exists
      recent = recent.filter(r => 
        !(r.filters.length === group.filters.length && 
          r.filters.every(f => group.filters.includes(f)) &&
          r.logic === group.logic)
      );
      
      // Add to beginning
      recent.unshift(group);
      
      // Keep only last 3
      recent = recent.slice(0, 3);
      
      StorageManager.set('recent-filter-groups', recent);
    },

    createRecentGroupItem(group) {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 6px 8px;
        margin: 2px 0;
        border: 1px solid #3c3c3c;
        border-radius: 4px;
        background: #252526;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      
      const content = document.createElement('div');
      content.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
      
      const tagsRow = document.createElement('div');
      tagsRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 2px; align-items: center;';
      
      // Add logic indicator
      const logicIndicator = document.createElement('span');
      logicIndicator.textContent = group.logic;
      logicIndicator.style.cssText = `
        font-size: 8px;
        color: #888;
        background: #1e1e1e;
        padding: 1px 3px;
        border-radius: 2px;
        margin-right: 4px;
      `;
      tagsRow.appendChild(logicIndicator);
      
      // Add tags
      group.filters.forEach(tag => {
        const tagChip = document.createElement('span');
        tagChip.textContent = tag;
        tagChip.style.cssText = `
          font-size: 9px;
          color: #ccc;
          background: #3c3c3c;
          padding: 1px 4px;
          border-radius: 8px;
        `;
        tagsRow.appendChild(tagChip);
      });
      
      const timeRow = document.createElement('div');
      timeRow.style.cssText = 'font-size: 8px; color: #666;';
      timeRow.textContent = this.formatRecentTime(group.timestamp);
      
      content.appendChild(tagsRow);
      content.appendChild(timeRow);
      item.appendChild(content);
      
      item.addEventListener('click', () => {
        AppState.setFilters([...group.filters]);
        AppState.setFilterLogic(group.logic);
        this.updateFilterDisplay();
      });
      
      item.addEventListener('mouseenter', () => {
        item.style.background = '#3c3c3c';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.background = '#252526';
      });
      
      return item;
    },

    formatRecentTime(timestamp) {
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'just now';
    },

    createTagChip(tagName, removable = false, isHashtag = false) {
      const chip = document.createElement('div');
      chip.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        background: ${isHashtag ? '#28a745' : '#0e639c'};
        color: white;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      `;
      
      const text = document.createElement('span');
      text.textContent = isHashtag ? `#${tagName}` : tagName;
      chip.appendChild(text);
      
      if (removable) {
        const removeBtn = document.createElement('span');
        removeBtn.textContent = '×';
        removeBtn.style.cssText = `
          cursor: pointer;
          color: #ccc;
          font-weight: bold;
          font-size: 12px;
          line-height: 1;
          padding: 0 1px;
        `;
        removeBtn.addEventListener('click', () => this.removeTag(tagName));
        chip.appendChild(removeBtn);
      } else if (isHashtag) {
        const indicator = document.createElement('span');
        indicator.textContent = '🏷️';
        indicator.style.cssText = 'font-size: 8px; opacity: 0.7; margin-left: 2px;';
        indicator.title = 'Auto-detected from text';
        chip.appendChild(indicator);
      }
      
      return chip;
    },

    createTagItem(tag, count, isSelected) {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 6px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
        background: transparent;
        color: #d4d4d4;
        border: 1px solid transparent;
      `;
      
      const content = document.createElement('div');
      content.style.cssText = 'display: flex; align-items: center; gap: 6px;';
      
      const tagText = document.createElement('span');
      tagText.textContent = tag;
      
      const tagCount = document.createElement('span');
      tagCount.textContent = count;
      tagCount.style.cssText = `
        color: #888;
        font-size: 10px;
      `;
      
      content.appendChild(tagText);
      content.appendChild(tagCount);
      item.appendChild(content);
      
      // Add click handler to add to filter
      item.addEventListener('click', () => {
        const filters = AppState.notepad.selectedFilters;
        filters.push(tag);
        AppState.setFilters(filters);
        this.updateFilterDisplay();
      });
      
      return item;
    },

    removeFromFilter(tag) {
      const filters = AppState.notepad.selectedFilters;
      const index = filters.indexOf(tag);
      
      if (index !== -1) {
        filters.splice(index, 1);
        AppState.setFilters(filters);
        this.updateFilterDisplay();
      }
    },

    toggleFilter(tag) {
      const filters = AppState.notepad.selectedFilters;
      const index = filters.indexOf(tag);
      
      if (index === -1) {
        filters.push(tag);
      } else {
        filters.splice(index, 1);
      }
      
      AppState.setFilters(filters);
      this.updateFilterDisplay();
    }
  };

  // ========================================
  // MODAL DIALOGS
  // ========================================
  const ModalManager = {
    showBulkDialog() {
      const modal = this.createModal();
      const dialog = this.createBulkDialog();
      
      modal.appendChild(dialog);
      document.body.appendChild(modal);
      
      dialog.querySelector('textarea').focus();
    },

    showImportDialog() {
      const modal = this.createModal();
      const dialog = this.createImportDialog();
      
      modal.appendChild(dialog);
      document.body.appendChild(modal);
    },

    createModal() {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
      `;
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
      document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', escapeHandler);
        }
      });
      
      return modal;
    },

    createBulkDialog() {
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        width: 500px;
        max-width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      `;
      
      const title = document.createElement('h3');
      title.textContent = 'Bulk Alert Processing';
      title.style.cssText = 'margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;';
      
      const instruction = document.createElement('p');
      instruction.textContent = 'Paste your alert IDs (space, comma, or newline separated):';
      instruction.style.cssText = 'margin: 0 0 10px 0; color: #666; font-family: Arial, sans-serif;';
      
      const textarea = document.createElement('textarea');
      textarea.placeholder = 'e.g., 679289778 679434984 679443707';
      textarea.style.cssText = `
        width: 100%;
        height: 120px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: monospace;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
      `;
      
      const buttons = document.createElement('div');
      buttons.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: #f5f5f5;
        border-radius: 4px;
        cursor: pointer;
        font-family: Arial, sans-serif;
      `;
      
      const startBtn = document.createElement('button');
      startBtn.textContent = 'Start Bulk Processing';
      startBtn.style.cssText = `
        padding: 8px 16px;
        border: none;
        background: #007bff;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-family: Arial, sans-serif;
      `;
      
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog.parentElement);
      });
      
      startBtn.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (text) {
          const count = BulkProcessor.loadAlertIds(text);
          if (count > 0) {
            UIManager.showBulkStatus(`Bulk mode: ${count} alerts loaded. Press cmd + ↓ to start`);
          } else {
            UIManager.showBulkStatus('No valid alert IDs found');
          }
        }
        document.body.removeChild(dialog.parentElement);
      });
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(startBtn);
      
      dialog.appendChild(title);
      dialog.appendChild(instruction);
      dialog.appendChild(textarea);
      dialog.appendChild(buttons);
      
      return dialog;
    },

    createImportDialog() {
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        width: 500px;
        max-width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      `;
      
      const title = document.createElement('h3');
      title.textContent = 'Import Notes from CSV';
      title.style.cssText = 'margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;';
      
      const instruction = document.createElement('div');
      instruction.innerHTML = `
        <p style="margin: 0 0 10px 0; color: #666; font-family: Arial, sans-serif;">
          Select a CSV file with your notes to import. The file should contain columns for:
        </p>
        <ul style="margin: 0 0 15px 20px; color: #666; font-family: Arial, sans-serif;">
          <li><strong>Alert ID</strong> (required)</li>
          <li>Alert Type</li>
          <li>Notes</li>
          <li>Tags (comma-separated)</li>
          <li>Timestamp</li>
        </ul>
        <p style="margin: 0 0 10px 0; color: #888; font-size: 12px; font-family: Arial, sans-serif;">
          <strong>Note:</strong> If not already in bulk mode, a bulk processing mode will be automatically created with the imported Alert IDs for easy review.
        </p>
        <p style="margin: 0 0 15px 0; color: #888; font-size: 12px; font-family: Arial, sans-serif;">
          <strong>Warning:</strong> Existing notes with the same Alert ID will be overwritten.
        </p>
      `;
      
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.csv';
      fileInput.style.cssText = `
        width: 100%;
        padding: 10px;
        border: 2px dashed #ddd;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        cursor: pointer;
        background: #f9f9f9;
      `;
      
      const statusDiv = document.createElement('div');
      statusDiv.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        border-radius: 4px;
        display: none;
        font-family: Arial, sans-serif;
        font-size: 13px;
      `;
      
      const buttons = document.createElement('div');
      buttons.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: #f5f5f5;
        border-radius: 4px;
        cursor: pointer;
        font-family: Arial, sans-serif;
      `;
      
      const importBtn = document.createElement('button');
      importBtn.textContent = 'Import CSV';
      importBtn.style.cssText = `
        padding: 8px 16px;
        border: none;
        background: #28a745;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-family: Arial, sans-serif;
        opacity: 0.5;
      `;
      importBtn.disabled = true;
      
      let selectedFile = null;
      
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
          selectedFile = file;
          importBtn.disabled = false;
          importBtn.style.opacity = '1';
          statusDiv.style.display = 'block';
          statusDiv.style.background = '#e3f2fd';
          statusDiv.style.color = '#0066cc';
          statusDiv.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)}KB)`;
        } else {
          selectedFile = null;
          importBtn.disabled = true;
          importBtn.style.opacity = '0.5';
          statusDiv.style.display = 'none';
        }
      });
      
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog.parentElement);
      });
      
      importBtn.addEventListener('click', () => {
        if (!selectedFile) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target.result;
          const result = NotesManager.importFromCsv(csvContent);
          
          statusDiv.style.display = 'block';
          if (result.success) {
            statusDiv.style.background = '#d4edda';
            statusDiv.style.color = '#155724';
            
            let statusMessage = `
              <div style="font-weight: bold; margin-bottom: 5px;">Import Successful!</div>
              <div>${result.message}</div>
            `;
            
            // Create bulk mode if not already in bulk mode and we have alert IDs
            if (!BulkProcessor.state.isProcessing && result.alertIds && result.alertIds.length > 0) {
              const bulkInput = result.alertIds.join(' ');
              const bulkCount = BulkProcessor.loadAlertIds(bulkInput);
              
              if (bulkCount > 0) {
                statusMessage += `
                  <div style="margin-top: 10px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px;">
                    <strong>Bulk Mode Created:</strong> ${bulkCount} alert IDs loaded for processing.<br>
                    Use Cmd+↓ to start navigating through the imported alerts.
                  </div>
                `;
                
                // Show bulk status
                setTimeout(() => {
                  UIManager.showBulkStatus(`Bulk mode: ${bulkCount} imported alerts loaded. Press Cmd+↓ to start`);
                }, 1000);
              }
            }
            
            statusDiv.innerHTML = statusMessage;
            
            // Update the notepad if it's open
            if (AppState.notepad.isOpen) {
              NotepadUI.updateContent();
            }
          } else {
            statusDiv.style.background = '#f8d7da';
            statusDiv.style.color = '#721c24';
            statusDiv.innerHTML = `
              <div style="font-weight: bold; margin-bottom: 5px;">Import Failed!</div>
              <div>${result.message}</div>
            `;
          }
        };
        
        reader.onerror = () => {
          statusDiv.style.display = 'block';
          statusDiv.style.background = '#f8d7da';
          statusDiv.style.color = '#721c24';
          statusDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Error!</div>
            <div>Could not read the file. Please try again.</div>
          `;
        };
        
        reader.readAsText(selectedFile);
      });
      
      buttons.appendChild(cancelBtn);
      buttons.appendChild(importBtn);
      
      dialog.appendChild(title);
      dialog.appendChild(instruction);
      dialog.appendChild(fileInput);
      dialog.appendChild(statusDiv);
      dialog.appendChild(buttons);
      
      return dialog;
    }
  };

  // ========================================
  // SETTINGS MODAL
  // ========================================
  const SettingsModal = {
    show() {
      const modal = this.createModal();
      const dialog = this.createSettingsDialog();
      
      modal.appendChild(dialog);
      document.body.appendChild(modal);
      
      // Focus the first input
      setTimeout(() => {
        const firstInput = dialog.querySelector('input[type="text"]');
        if (firstInput) firstInput.focus();
      }, 100);
    },

    createModal() {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
      `;
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
      document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', escapeHandler);
        }
      });
      
      return modal;
    },

    createSettingsDialog() {
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #1e1e1e;
        color: #cccccc;
        padding: 24px;
        border-radius: 8px;
        width: 500px;
        max-width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      const title = document.createElement('h3');
      title.textContent = '⚙️ Settings';
      title.style.cssText = 'margin: 0 0 20px 0; color: #ffffff; font-size: 18px;';
      
      // Add current status info
      const statusInfo = document.createElement('div');
      statusInfo.style.cssText = `
        background: #2d2d30;
        border: 1px solid #404040;
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 20px;
        font-size: 12px;
        color: #cccccc;
      `;
      
      const currentSettings = SettingsManager.getSettings();
      statusInfo.innerHTML = `
        <strong>Current Status:</strong><br>
        📡 Presigner Server: <code>${currentSettings.presignerUrl}</code><br>
        💾 Auto-save: ${currentSettings.autoSaveNotes ? 'Enabled' : 'Disabled'}<br>
        ⌨️ Keyboard Hints: ${currentSettings.showKeyboardHints ? 'Enabled' : 'Disabled'}<br>
        🎆 Fireworks: ${currentSettings.enableFireworks ? 'Enabled' : 'Disabled'}
      `;
      
      const form = this.createSettingsForm();
      const keyboardHelp = this.createKeyboardHelp();
      const buttons = this.createButtons(dialog);
      
      dialog.appendChild(title);
      dialog.appendChild(statusInfo);
      dialog.appendChild(form);
      dialog.appendChild(keyboardHelp);
      dialog.appendChild(buttons);
      
      return dialog;
    },

    createSettingsForm() {
      const form = document.createElement('div');
      form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
      
      const settings = SettingsManager.getSettings();
      
      // Presigner URL Setting
      const presignerGroup = this.createInputGroup(
        'S3 Presigner URL',
        'presignerUrl',
        settings.presignerUrl,
        'text',
        'URL of the local S3 presigner server'
      );
      
      // Auto-save Notes Setting
      const autoSaveGroup = this.createCheckboxGroup(
        'Auto-save Notes',
        'autoSaveNotes',
        settings.autoSaveNotes,
        'Automatically save notes as you type'
      );
      
      // Show Keyboard Hints Setting
      const keyboardHintsGroup = this.createCheckboxGroup(
        'Show Keyboard Hints',
        'showKeyboardHints',
        settings.showKeyboardHints,
        'Display keyboard shortcut hints on hover'
      );
      
      // Enable Fireworks Setting
      const fireworksGroup = this.createCheckboxGroup(
        'Enable Fireworks',
        'enableFireworks',
        settings.enableFireworks,
        'Show celebration fireworks for special events'
      );
      
      form.appendChild(presignerGroup);
      form.appendChild(autoSaveGroup);
      form.appendChild(keyboardHintsGroup);
      form.appendChild(fireworksGroup);
      
      return form;
    },

    createInputGroup(label, name, value, type = 'text', description = '') {
      const group = document.createElement('div');
      group.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
      
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.style.cssText = 'font-weight: 500; color: #ffffff; font-size: 14px;';
      
      const input = document.createElement('input');
      input.type = type;
      input.name = name;
      input.value = value;
      input.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #404040;
        background: #2d2d30;
        color: #cccccc;
        border-radius: 4px;
        font-size: 14px;
        font-family: inherit;
      `;
      
      if (description) {
        const desc = document.createElement('small');
        desc.textContent = description;
        desc.style.cssText = 'color: #999999; font-size: 12px;';
        group.appendChild(labelEl);
        group.appendChild(input);
        group.appendChild(desc);
      } else {
        group.appendChild(labelEl);
        group.appendChild(input);
      }
      
      return group;
    },

    createSelectGroup(label, name, value, options, description = '') {
      const group = document.createElement('div');
      group.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
      
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.style.cssText = 'font-weight: 500; color: #ffffff; font-size: 14px;';
      
      const select = document.createElement('select');
      select.name = name;
      select.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #404040;
        background: #2d2d30;
        color: #cccccc;
        border-radius: 4px;
        font-size: 14px;
        font-family: inherit;
      `;
      
      options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        optionEl.selected = option.value === value;
        select.appendChild(optionEl);
      });
      
      group.appendChild(labelEl);
      group.appendChild(select);
      
      if (description) {
        const desc = document.createElement('small');
        desc.textContent = description;
        desc.style.cssText = 'color: #999999; font-size: 12px;';
        group.appendChild(desc);
      }
      
      return group;
    },

    createCheckboxGroup(label, name, checked, description = '') {
      const group = document.createElement('div');
      group.style.cssText = 'display: flex; align-items: flex-start; gap: 8px;';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = name;
      checkbox.checked = checked;
      checkbox.style.cssText = `
        margin-top: 2px;
        accent-color: #0e639c;
      `;
      
      const labelContainer = document.createElement('div');
      labelContainer.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
      
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.style.cssText = 'font-weight: 500; color: #ffffff; font-size: 14px; cursor: pointer;';
      
      labelEl.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
      });
      
      labelContainer.appendChild(labelEl);
      
      if (description) {
        const desc = document.createElement('small');
        desc.textContent = description;
        desc.style.cssText = 'color: #999999; font-size: 12px;';
        labelContainer.appendChild(desc);
      }
      
      group.appendChild(checkbox);
      group.appendChild(labelContainer);
      
      return group;
    },

    createKeyboardHelp() {
      const help = document.createElement('div');
      help.style.cssText = `
        background: #252526;
        border: 1px solid #404040;
        border-radius: 4px;
        padding: 16px;
        margin-top: 20px;
      `;
      
      const title = document.createElement('h4');
      title.textContent = '⌨️ Keyboard Shortcuts';
      title.style.cssText = 'margin: 0 0 12px 0; color: #ffffff; font-size: 14px;';
      
      const shortcuts = document.createElement('div');
      shortcuts.style.cssText = 'font-size: 12px; color: #cccccc; line-height: 1.4;';
      shortcuts.innerHTML = `
        <style>
          kbd {
            background: #1e1e1e;
            border: 1px solid #404040;
            border-radius: 3px;
            padding: 2px 6px;
            font-family: monospace;
            font-size: 11px;
            color: #ffffff;
          }
        </style>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div><kbd>i</kbd> Focus input field</div>
          <div><kbd>j</kbd> Toggle notepad</div>
          <div><kbd>Space</kbd> Video play/pause</div>
          <div><kbd>b</kbd> Bulk process mode</div>
          <div><kbd>←/→</kbd> Video rewind/forward</div>
          <div><kbd>↑/↓</kbd> Previous/next alert</div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #404040; font-size: 11px; color: #999999;">
          <strong>Tip:</strong> Use <kbd>Cmd+↓/↑</kbd> for bulk alert navigation
        </div>
      `;
      
      help.appendChild(title);
      help.appendChild(shortcuts);
      
      return help;
    },

    createButtons(dialog) {
      const buttons = document.createElement('div');
      buttons.style.cssText = 'display: flex; justify-content: space-between; gap: 10px; margin-top: 24px;';
      
      const leftButtons = document.createElement('div');
      leftButtons.style.cssText = 'display: flex; gap: 10px;';
      
      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset to Defaults';
      resetBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #404040;
        background: #3c3c3c;
        color: #cccccc;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
      `;
      
      const rightButtons = document.createElement('div');
      rightButtons.style.cssText = 'display: flex; gap: 10px;';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #404040;
        background: #3c3c3c;
        color: #cccccc;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
      `;
      
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save Settings';
      saveBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #0e639c;
        background: #0e639c;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
      `;
      
      // Event handlers
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all settings to their default values?')) {
          SettingsManager.resetSettings();
          UIManager.showNotification('Settings reset to defaults', 'success');
          document.body.removeChild(dialog.parentElement);
        }
      });
      
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog.parentElement);
      });
      
      saveBtn.addEventListener('click', () => {
        this.saveSettings(dialog);
      });
      
      leftButtons.appendChild(resetBtn);
      rightButtons.appendChild(cancelBtn);
      rightButtons.appendChild(saveBtn);
      
      buttons.appendChild(leftButtons);
      buttons.appendChild(rightButtons);
      
      return buttons;
    },

    saveSettings(dialog) {
      const form = dialog.querySelector('div[style*="flex-direction: column"]');
      const inputs = form.querySelectorAll('input, select');
      const newSettings = {};
      
      inputs.forEach(input => {
        if (input.type === 'checkbox') {
          newSettings[input.name] = input.checked;
        } else {
          newSettings[input.name] = input.value;
        }
      });
      
      // Validate presigner URL
      if (newSettings.presignerUrl && !newSettings.presignerUrl.startsWith('http')) {
        UIManager.showNotification('Presigner URL must start with http:// or https://', 'error');
        return;
      }
      
      if (SettingsManager.setSettings(newSettings)) {
        UIManager.showNotification('Settings saved successfully', 'success');
        document.body.removeChild(dialog.parentElement);
      } else {
        UIManager.showNotification('Failed to save settings', 'error');
      }
    }
  };

  // ========================================
  // KEYBOARD HANDLERS
  // ========================================
  const KeyboardManager = {
    handlers: {
      focusInput(event, elements) {
        if (
          event.key === CONFIG.KEYS.FOCUS_INPUT &&
          event.metaKey &&
          !event.ctrlKey && !event.altKey &&
          !Utils.isInputFocused(elements.input)
        ) {
          event.preventDefault();
          elements.input.focus();
          Utils.log('Focused input box');
          return true;
        }
        return false;
      },

      submitForm(event, elements) {
        if (event.key === CONFIG.KEYS.SUBMIT && Utils.isInputFocused(elements.input)) {
          event.preventDefault();
          
          const inputValue = elements.input.value.trim();
          const alertIds = BulkProcessor.parseAlertIds(inputValue);
          
          if (alertIds.length > 1) {
            const count = BulkProcessor.loadAlertIds(inputValue);
            UIManager.showBulkStatus(`Bulk mode: ${count} alerts loaded. Press ↓ to start`);
            return true;
          }
          
          elements.button.click();
          elements.input.blur();
          
          if (AppState.notepad.isOpen) {
            AppState.setCurrentAlert(inputValue);
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
        
        if (event.code === CONFIG.KEYS.NEXT_ALERT && event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          
          const nextAlert = filters.length > 0 ? 
            BulkProcessor.nextFilteredAlert(filters, logic) : 
            BulkProcessor.nextAlert();
          
          if (nextAlert) {
            UIManager.loadAlertId(nextAlert, elements);
            const progress = filters.length > 0 ? 
              this.getFilteredProgress(filters, logic) : 
              BulkProcessor.getProgress();
            UIManager.showBulkStatus(`${progress} ${nextAlert}`);
          } else {
            UIManager.showBulkStatus(filters.length > 0 ? 'End of filtered alerts' : 'End of alerts');
          }
          return true;
        }
        
        if (event.code === CONFIG.KEYS.PREV_ALERT && event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          
          const prevAlert = filters.length > 0 ? 
            BulkProcessor.prevFilteredAlert(filters, logic) : 
            BulkProcessor.prevAlert();
          
          if (prevAlert) {
            UIManager.loadAlertId(prevAlert, elements);
            const progress = filters.length > 0 ? 
              this.getFilteredProgress(filters, logic) : 
              BulkProcessor.getProgress();
            UIManager.showBulkStatus(`${progress} ${prevAlert}`);
          } else {
            UIManager.showBulkStatus(filters.length > 0 ? 'At first filtered alert' : 'At first alert');
          }
          return true;
        }
        
        return false;
      },

      toggleBulkMode(event) {
        if (
          event.key === CONFIG.KEYS.BULK_PROCESS &&
          event.metaKey &&
          !event.ctrlKey && !event.altKey
        ) {
          event.preventDefault();
          
          if (BulkProcessor.state.isProcessing) {
            if (confirm('Are you sure you want to exit bulk processing mode?')) {
              BulkProcessor.clearBulkAlerts();
              UIManager.showBulkStatus('Bulk mode disabled');
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
          !event.ctrlKey && !event.altKey
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
        
        if (event.code === CONFIG.KEYS.REWIND || event.code === CONFIG.KEYS.FAST_FORWARD) {
          event.preventDefault();
          const video = Utils.getVideoElement();
          if (video) {
            const seekDirection = event.code === CONFIG.KEYS.REWIND ? -CONFIG.TIMING.VIDEO_SEEK_SECONDS : CONFIG.TIMING.VIDEO_SEEK_SECONDS;
            const newTime = video.currentTime + seekDirection;
            video.currentTime = Math.max(0, Math.min(video.duration || 0, newTime));
          }
          return true;
        }
        
        return false;
      },

      focusBody(event) {
        if (event.key === 'Escape') {
          document.activeElement.blur();
          document.body.focus();
          return true;
        }
        return false;
      }
    },

    getFilteredProgress(filters, logic) {
      const filteredIds = FilterManager.getFilteredAlertIds(filters, logic, AppState.notepad.includeHashtags);
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
        this.handlers.videoControls
      ];

      for (const handler of handlerList) {
        if (handler.call(this, event, elements)) {
          break;
        }
      }
    }
  };

  // ========================================
  // APPLICATION INITIALIZATION
  // ========================================
  const App = {
    VERSION: '0.5',
    
    init() {
      try {
        Utils.log(`Initializing Alert Debug UserScript v${this.VERSION}`);
        
        // Initialize beautiful fireworks on first load
        FireworksManager.init();
        
        // Wait for required elements and initialize
        Utils.waitForElements((elements) => {
          this.initializeFeatures(elements);
        });
        
      } catch (error) {
        console.error('Failed to initialize UserScript:', error);
        UIManager.showNotification('UserScript initialization failed', 'error');
      }
    },

    initializeFeatures(elements) {
      try {
        Utils.log('Required elements found - activating features');
        
        // Initialize metadata manager to intercept Dash requests
        MetadataManager.init();
        
        // Initialize settings manager
        SettingsManager.init();
        
        // Restore bulk alerts
        this.restoreBulkAlerts();
        
        // Monitor input changes
        this.setupInputMonitoring(elements);
        
        // Set up keyboard handlers
        this.setupKeyboardHandlers(elements);
        
        // Initialize video controls manager
        VideoControlsManager.init();
        
        // Auto-open notepad on page load
        this.autoOpenNotepad();
        
        Utils.log('UserScript initialization complete');
        
      } catch (error) {
        console.error('Failed to initialize features:', error);
        UIManager.showNotification('Feature initialization failed', 'error');
      }
    },

    restoreBulkAlerts() {
      if (BulkProcessor.loadBulkAlerts()) {
        const count = BulkProcessor.state.alertIds.length;
        const progress = BulkProcessor.getProgress();
        UIManager.showBulkStatus(`Bulk mode: ${count} alerts loaded. Current: ${progress}`);
      }
    },

    setupInputMonitoring(elements) {
      elements.input.addEventListener('input', Utils.debounce(() => {
        if (AppState.notepad.isOpen) {
          const alertId = elements.input.value.trim();
          if (alertId && alertId !== AppState.notepad.currentAlertId) {
            AppState.setCurrentAlert(alertId);
            NotepadUI.updateContent();
          }
        }
      }, 300));
    },

    setupKeyboardHandlers(elements) {
      document.addEventListener('keydown', (event) => {
        try {
          KeyboardManager.handleKeydown(event, elements);
        } catch (error) {
          console.error('Keyboard handler error:', error);
        }
      });
    },

    autoOpenNotepad() {
      setTimeout(() => {
        if (!AppState.notepad.isOpen) {
          NotepadUI.toggle();
        }
      }, 500);
    },

    // Cleanup function for development/testing
    cleanup() {
      // Remove all created elements
      const elementsToRemove = [
        '#fireworks-canvas',
        '#bulk-status',
        '#notepad-panel',
        '#video-controls-styles',
        '#bulk-status-keyframes',
        '#spinner-animation'
      ];
      
      elementsToRemove.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.remove();
        }
      });
      
      // Clear storage
      StorageManager.clear();
      
      Utils.log('UserScript cleanup complete');
    }
  };

  // Start the application
  App.init();

  // Expose useful functions to global scope for console access
  if (typeof window !== 'undefined') {
    window.AlertDebugApp = App;
    
    // Admin tools for console access
    window.AlertDebugAdmin = {
      showStats: () => AdminTools.showStorageStats(),
      clearAll: () => AdminTools.clearAllData(),
      cleanup: (maxEntries, maxDays) => AdminTools.cleanupOldData(maxEntries, maxDays),
      exportMetadata: () => AdminTools.exportMetadataList(),
      deleteDB: () => AdminTools.deleteIndexedDatabase()
    };
    
    // Log available commands
    console.log('%cAlert Debug Admin Commands Available:', 'color: #4CAF50; font-weight: bold;');
    console.log('AlertDebugAdmin.showStats() - Show storage statistics');
    console.log('AlertDebugAdmin.clearAll() - Clear all data');
    console.log('AlertDebugAdmin.cleanup(1000, 30) - Clean up old entries');
    console.log('AlertDebugAdmin.exportMetadata() - Export metadata list');
    console.log('AlertDebugAdmin.deleteDB() - Delete IndexedDB database');
  }
})();
