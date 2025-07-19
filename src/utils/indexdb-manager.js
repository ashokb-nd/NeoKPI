import { Utils } from './utils.js';
import { CONFIG } from '../config/constants.js';

// ========================================
// INDEXEDDB MANAGER - Reusable IndexedDB Utility
// ========================================
export class IndexedDBManager {
  constructor(dbName, dbVersion = 1) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.db = null;
    this.stores = new Map(); // Store configurations
  }

  // Define a store configuration
  defineStore(storeName, config = {}) {
    this.stores.set(storeName, {
      keyPath: config.keyPath || 'id',
      autoIncrement: config.autoIncrement || false,
      indexes: config.indexes || []
    });
    return this;
  }

  // Initialize the database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        Utils.log(`IndexedDB failed to open: ${this.dbName}`);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        Utils.log(`IndexedDB opened successfully: ${this.dbName}`);
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create all defined stores
        for (const [storeName, config] of this.stores) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: config.keyPath,
              autoIncrement: config.autoIncrement
            });
            
            // Create indexes
            config.indexes.forEach(index => {
              store.createIndex(
                index.name,
                index.keyPath || index.name,
                { unique: index.unique || false }
              );
            });
            
            Utils.log(`Created IndexedDB store: ${storeName}`);
          }
        }
      };
    });
  }

  // Generic CRUD operations
  async get(storeName, key) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(storeName, data) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, query = null, count = null) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll(query, count);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Query by index
  async getByIndex(storeName, indexName, value) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const request = index.get(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex(storeName, indexName, value = null) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise((resolve, reject) => {
      const request = value ? index.getAll(value) : index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Batch operations
  async batchPut(storeName, dataArray) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const promises = dataArray.map(data => {
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return Promise.all(promises);
  }

  async batchDelete(storeName, keys) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const promises = keys.map(key => {
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return Promise.all(promises);
  }

  // Maintenance operations
  async getStats(storeName) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        resolve({
          count: countRequest.result,
          storeName: storeName
        });
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  async cleanup(storeName, options = {}) {
    const { maxEntries = 1000, maxAgeInDays = 30, timestampField = 'timestamp' } = options;
    
    if (!this.db) await this.init();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
    
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // Get all entries
    const allEntries = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    let deletedCount = 0;
    
    // Delete by age
    if (timestampField) {
      const toDeleteByAge = allEntries.filter(entry => {
        const entryDate = new Date(entry[timestampField]);
        return entryDate < cutoffDate;
      });
      
      for (const entry of toDeleteByAge) {
        await this.delete(storeName, entry[this.stores.get(storeName).keyPath]);
        deletedCount++;
      }
    }
    
    // Delete by count (keep only newest entries)
    const remaining = allEntries.filter(entry => {
      if (!timestampField) return true;
      const entryDate = new Date(entry[timestampField]);
      return entryDate >= cutoffDate;
    });
    
    if (remaining.length > maxEntries) {
      // Sort by timestamp and keep only newest entries
      const sorted = remaining.sort((a, b) => 
        b[timestampField].localeCompare(a[timestampField])
      );
      const toDeleteByCount = sorted.slice(maxEntries);
      
      for (const entry of toDeleteByCount) {
        await this.delete(storeName, entry[this.stores.get(storeName).keyPath]);
        deletedCount++;
      }
    }
    
    Utils.log(`Cleaned up ${deletedCount} entries from ${storeName}`);
    return deletedCount;
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      Utils.log(`Closed IndexedDB: ${this.dbName}`);
    }
  }

  // Delete entire database
  async deleteDatabase() {
    return new Promise((resolve, reject) => {
      this.close();
      
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      
      deleteRequest.onsuccess = () => {
        Utils.log(`IndexedDB database deleted: ${this.dbName}`);
        resolve();
      };
      
      deleteRequest.onerror = () => {
        Utils.log(`Error deleting IndexedDB database: ${this.dbName}`);
        reject(deleteRequest.error);
      };
      
      deleteRequest.onblocked = () => {
        Utils.log(`IndexedDB deletion blocked: ${this.dbName}`);
        reject(new Error('Database deletion blocked'));
      };
    });
  }
}

// Factory function for creating commonly used databases
export const createAppDatabase = () => {
  return new IndexedDBManager(CONFIG.DATABASE.NAME, CONFIG.DATABASE.VERSION)
    // Metadata stores
    .defineStore(CONFIG.DATABASE.STORES.METADATA, {
      keyPath: 'alertId',
      indexes: [
        { name: 'timestamp', unique: false },
        { name: 'downloaded', unique: false }
      ]
    })
    .defineStore(CONFIG.DATABASE.STORES.METADATA_URLS, {
      keyPath: 'alertId',
      indexes: [
        { name: 'timestamp', unique: false }
      ]
    })
    // Notes store
    .defineStore(CONFIG.DATABASE.STORES.NOTES, {
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'alertId', unique: false },
        { name: 'timestamp', unique: false },
        { name: 'category', unique: false }
      ]
    })
    // Tags store
    .defineStore(CONFIG.DATABASE.STORES.TAGS, {
      keyPath: 'name',
      indexes: [
        { name: 'color', unique: false },
        { name: 'createdAt', unique: false }
      ]
    })
    // Settings store
    .defineStore(CONFIG.DATABASE.STORES.SETTINGS, {
      keyPath: 'key',
      indexes: [
        { name: 'category', unique: false },
        { name: 'updatedAt', unique: false }
      ]
    });
};
