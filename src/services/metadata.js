import { CONFIG } from '../config/constants.js';
import { Utils } from '../utils/utils.js';

// ========================================
// METADATA MANAGER
// ========================================
export const MetadataManager = {
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
        // Handle both real responses and test mocks
        let clone;
        if (response && typeof response.clone === 'function') {
          clone = response.clone();
        } else {
          // For tests or cases where clone is not available, use the original response
          clone = response;
        }
        
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
      
      if (!this.db) {
        Utils.log('IndexedDB not available for metadata URL retrieval');
        return null;
      }
      
      const transaction = this.db.transaction(['urls'], 'readonly');
      const store = transaction.objectStore('urls');
      const result = await this.getFromStore(store, alertId);
      
      return result?.url || null;
    } catch (error) {
      Utils.log(`Error getting metadata URL from IndexedDB: ${error.message}`);
      return null;
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
        // Note: UIManager is imported in index.js, so we can't use it here directly
        // This will be handled by the caller
      } else {
        Utils.log(`Error getting signed URL: ${error.message}`);
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
      // Note: UIManager is imported in index.js, so we can't use it here directly
      Utils.log('No alert ID found');
      return;
    }
    
    Utils.log(`Downloading metadata for alert ${alertId}...`);
    
    const content = await this.downloadMetadata(alertId);
    
    if (content) {
      Utils.log(`Metadata downloaded successfully for alert ${alertId}`);
      
      // Also download as JSON file
      await this.downloadMetadataAsFile(alertId, content);
      Utils.log(`JSON file download initiated for alert ${alertId}`);
    } else {
      Utils.log(`Failed to download metadata for alert ${alertId}`);
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
      throw error;
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
