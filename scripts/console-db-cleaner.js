// ========================================
// CONSOLE DATABASE CLEANER SCRIPT
// ========================================
// Paste this into your browser console to clean IndexedDB databases
// Uses the same constants as your application for consistency

// Database configuration (matches your CONFIG.DATABASE)
const DB_CONFIG = {
  NAME: "NeoKPIApp",
  VERSION: 1,
  STORES: {
    METADATA: "metadata",
    METADATA_URLS: "metadataUrls",
    NOTES: "notes",
    TAGS: "tags",
    SETTINGS: "settings",
  },
};

// Option 1: Clean All Databases (Nuclear Option)
window.cleanAllIndexedDB = async function () {
  try {
    console.log("🧹 Starting complete IndexedDB cleanup...");

    // Get all database names (Chrome/Edge only)
    if ("databases" in indexedDB) {
      const databases = await indexedDB.databases();
      console.log(
        "📊 Found databases:",
        databases.map((db) => db.name),
      );

      for (const db of databases) {
        const deleteReq = indexedDB.deleteDatabase(db.name);
        await new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => {
            console.log(`✅ Deleted database: ${db.name}`);
            resolve();
          };
          deleteReq.onerror = () => {
            console.error(`❌ Failed to delete database: ${db.name}`);
            reject(deleteReq.error);
          };
          deleteReq.onblocked = () => {
            console.warn(
              `⚠️  Deletion blocked for: ${db.name} (close all tabs using this database)`,
            );
            reject(new Error("Blocked"));
          };
        });
      }
      console.log("🎉 All IndexedDB databases deleted!");
      console.log("💡 Refresh the page to create fresh databases");
    } else {
      console.warn("indexedDB.databases() not supported in this browser");
    }
  } catch (error) {
    console.error("Error cleaning IndexedDB:", error);
  }
};

// Option 2: Clean Only App Database
window.cleanAppDatabase = async function () {
  const dbName = DB_CONFIG.NAME;

  try {
    console.log(`🧹 Deleting app database: ${dbName}`);
    const deleteReq = indexedDB.deleteDatabase(dbName);

    await new Promise((resolve, reject) => {
      deleteReq.onsuccess = () => {
        console.log(`✅ Deleted database: ${dbName}`);
        resolve();
      };
      deleteReq.onerror = () => {
        console.log(`ℹ️  Database not found or already deleted: ${dbName}`);
        resolve(); // Don't treat as error
      };
      deleteReq.onblocked = () => {
        console.warn(
          `⚠️  Deletion blocked for: ${dbName} (close all tabs using this database)`,
        );
        reject(new Error("Blocked"));
      };
    });

    console.log("🎉 App database cleaned!");
    console.log("💡 Refresh the page to create a fresh database");
  } catch (error) {
    console.error(`Error deleting ${dbName}:`, error);
  }
};

// Option 3: Clear Specific Store Data
window.clearAppStore = async function (storeName) {
  if (!Object.values(DB_CONFIG.STORES).includes(storeName)) {
    console.error(
      `❌ Invalid store name. Valid stores: ${Object.values(DB_CONFIG.STORES).join(", ")}`,
    );
    return;
  }

  try {
    console.log(`🧹 Clearing store: ${storeName}`);

    const openReq = indexedDB.open(DB_CONFIG.NAME);
    const db = await new Promise((resolve, reject) => {
      openReq.onsuccess = () => resolve(openReq.result);
      openReq.onerror = () => reject(openReq.error);
    });

    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    await new Promise((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        console.log(`✅ Cleared store: ${storeName}`);
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });

    db.close();
    console.log("🎉 Store cleared successfully!");
  } catch (error) {
    console.error(`Error clearing store ${storeName}:`, error);
  }
};

// Option 4: Database Inspector
window.inspectAppDatabase = async function () {
  try {
    console.log(`🔍 Inspecting database: ${DB_CONFIG.NAME}`);

    const openReq = indexedDB.open(DB_CONFIG.NAME);
    const db = await new Promise((resolve, reject) => {
      openReq.onsuccess = () => resolve(openReq.result);
      openReq.onerror = () => reject(openReq.error);
    });

    console.log(`📊 Database: ${db.name} (version: ${db.version})`);
    console.log(
      `🏪 Object Stores: ${Array.from(db.objectStoreNames).join(", ")}`,
    );

    // Get count for each store
    for (const storeName of Array.from(db.objectStoreNames)) {
      try {
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);

        const count = await new Promise((resolve, reject) => {
          const countReq = store.count();
          countReq.onsuccess = () => resolve(countReq.result);
          countReq.onerror = () => reject(countReq.error);
        });

        console.log(`   📦 ${storeName}: ${count} entries`);
      } catch (error) {
        console.log(`   ❌ ${storeName}: Error getting count`);
      }
    }

    db.close();
  } catch (error) {
    console.error("Database does not exist or error inspecting:", error);
    console.log("💡 This is normal if the database hasn't been created yet");
  }
};

// Display available commands
console.log(`
🗃️ IndexedDB Database Cleaner Commands:

🧹 cleanAllIndexedDB()     - Delete ALL IndexedDB databases (nuclear option)
🎯 cleanAppDatabase()      - Delete only the ${DB_CONFIG.NAME} database  
🗑️ clearAppStore('store')  - Clear data from a specific store
🔍 inspectAppDatabase()    - Inspect current database structure

Valid store names: ${Object.values(DB_CONFIG.STORES).join(", ")}

Example usage:
  cleanAppDatabase()                    // Clean everything
  clearAppStore('${DB_CONFIG.STORES.METADATA_URLS}')    // Clear metadata URL tracking
  inspectAppDatabase()                  // See current state
`);
