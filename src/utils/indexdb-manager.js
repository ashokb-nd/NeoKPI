/* Wrapper for IndexedDB operations
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology 
*/


import { Utils } from "./utils.js";
import { CONFIG } from "../config/constants.js";

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
      keyPath: config.keyPath || "id",
      autoIncrement: config.autoIncrement || false,
      indexes: config.indexes || [],
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
              autoIncrement: config.autoIncrement,
            });

            // Create indexes
            config.indexes.forEach((index) => {
              store.createIndex(index.name, index.keyPath || index.name, {
                unique: index.unique || false,
              });
            });

            Utils.log(`Created IndexedDB store: ${storeName}`);
          }
        }
      };
    });
  }

  // Helper method to get transaction and store
  _getStore(storeName, mode = "readonly") {
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // Generic CRUD operations
  async get(storeName, key) {
    if (!this.db) await this.init();

    const store = this._getStore(storeName, "readonly");

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // key it inferred from data
  async put(storeName, data) {
    if (!this.db) await this.init();
    console.log(`Putting data in store: ${storeName}`, data);

    const store = this._getStore(storeName, "readwrite");

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(storeName, data) {
    if (!this.db) await this.init();

    const store = this._getStore(storeName, "readwrite");

    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    if (!this.db) await this.init();

    const store = this._getStore(storeName, "readwrite");

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, query = null, count = null) {
    if (!this.db) await this.init();

    const store = this._getStore(storeName, "readonly");

    return new Promise((resolve, reject) => {
      const request = store.getAll(query, count);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    if (!this.db) await this.init();

    const store = this._getStore(storeName, "readwrite");

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Query by index
  // This indexName should have been defined in the store configuration
  async getAllByIndex(storeName, indexName, value = null) {
    if (!this.db) await this.init();

    const store = this._getStore(storeName, "readonly");
    const index = store.index(indexName); // create a index reference, instead of using the store directly

    return new Promise((resolve, reject) => {
      const request = value ? index.getAll(value) : index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Maintenance operations
  async getStats(storeName) {
    if (!this.db) await this.init();

    const store = this._getStore(storeName, "readonly");

    return new Promise((resolve, reject) => {
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        resolve({
          count: countRequest.result,
          storeName: storeName,
        });
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  async cleanup(storeName, options = {}) {
    const {
      maxEntries = 1000,
      maxAgeInDays = 30,
      timestampField = "timestamp",
    } = options;

    if (!this.db) await this.init();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

    const store = this._getStore(storeName, "readwrite");

    // Get all entries
    const allEntries = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    let deletedCount = 0;

    // Delete by age
    if (timestampField) {
      const toDeleteByAge = allEntries.filter((entry) => {
        const entryDate = new Date(entry[timestampField]);
        return entryDate < cutoffDate;
      });

      for (const entry of toDeleteByAge) {
        await this.delete(storeName, entry[this.stores.get(storeName).keyPath]);
        deletedCount++;
      }
    }

    // Delete by count (keep only newest entries)
    const remaining = allEntries.filter((entry) => {
      if (!timestampField) return true;
      const entryDate = new Date(entry[timestampField]);
      return entryDate >= cutoffDate;
    });

    if (remaining.length > maxEntries) {
      // Sort by timestamp and keep only newest entries
      const sorted = remaining.sort((a, b) =>
        b[timestampField].localeCompare(a[timestampField]),
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

  // Delete entire database
  async deleteDatabase() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close();
        this.db = null;
        Utils.log(`Closed IndexedDB: ${this.dbName}`);
      }

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
        reject(new Error("Database deletion blocked"));
      };
    });
  }
}

// ========================================
// Singleton instance for global IndexedDB manager
// ========================================
let appDatabaseInstance = null;

// Factory function for creating commonly used databases (Singleton pattern)
export const createAppDatabase = () => {
  if (!appDatabaseInstance) {
    appDatabaseInstance = new IndexedDBManager(CONFIG.DATABASE.NAME, CONFIG.DATABASE.VERSION)
      // Metadata stores
      .defineStore(CONFIG.DATABASE.STORES.METADATA, {
        keyPath: "alertId",
        indexes: [
          { name: "timestamp", unique: false },
          { name: "downloaded", unique: false },
        ],
      })
      .defineStore(CONFIG.DATABASE.STORES.METADATA_URLS, {
        keyPath: "alertId",
        indexes: [{ name: "timestamp", unique: false }],
      })
      // Notes store (tags are stored as arrays within notes)
      .defineStore(CONFIG.DATABASE.STORES.NOTES, {
        keyPath: "id",
        autoIncrement: true,
        indexes: [
          { name: "alertId", unique: false },
          { name: "timestamp", unique: false },
          { name: "category", unique: false },
        ],
      });
  }
  return appDatabaseInstance;
};
