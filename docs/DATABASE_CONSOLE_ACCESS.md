# Database Console Access Guide

## Overview
The application now exposes database instances and helper functions to the global scope for easy console access and debugging.

## Available Global Objects

### `AlertDebugDB` - Main Database Access
Access database instances and perform operations directly from the browser console.

```javascript
// Database Manager Instances
AlertDebugDB.metadata        // MetadataManager instance
AlertDebugDB.notes          // NotesManager instance

// Direct IndexedDB Access
AlertDebugDB.metadataDB     // Raw IndexedDB instance for metadata
AlertDebugDB.notesDB        // Raw IndexedDB instance for notes

// Store Name Constants
AlertDebugDB.STORES         // Object with all store name constants
AlertDebugDB.STORES.METADATA      // 'metadata'
AlertDebugDB.STORES.METADATA_URLS // 'metadataUrls' 
AlertDebugDB.STORES.NOTES         // 'notes'
AlertDebugDB.STORES.TAGS          // 'tags'
AlertDebugDB.STORES.SETTINGS      // 'settings'

// Helper Functions
AlertDebugDB.inspectStore(storeName)  // Inspect any store with data & stats
```

## Usage Examples

### High-Level Manager Operations
```javascript
// Get all metadata URLs (using manager)
await AlertDebugDB.metadata.getAllMetadataUrls()

// Get all notes (using manager) 
await AlertDebugDB.notes.getAllNotes()

// Store metadata URL
await AlertDebugDB.metadata.storeMetadataUrl('alert123', 's3://bucket/path.json')

// Get metadata statistics
await AlertDebugDB.metadata.getStats()
```

### Direct Database Operations
```javascript
// Direct access using constants (recommended)
await AlertDebugDB.metadataDB.getAll(AlertDebugDB.STORES.METADATA_URLS)
await AlertDebugDB.notesDB.getAll(AlertDebugDB.STORES.NOTES)

// Clear specific store
await AlertDebugDB.metadataDB.clear(AlertDebugDB.STORES.METADATA_URLS)

// Get single entry
await AlertDebugDB.metadataDB.get(AlertDebugDB.STORES.METADATA_URLS, 'alert123')

// Put new data
await AlertDebugDB.metadataDB.put(AlertDebugDB.STORES.METADATA_URLS, {
  alertId: 'alert123',
  url: 's3://bucket/path.json',
  timestamp: new Date().toISOString(),
  downloaded: false
})
```

### Store Inspection Helper
```javascript
// Inspect any store with detailed output
await AlertDebugDB.inspectStore('metadataUrls')
await AlertDebugDB.inspectStore(AlertDebugDB.STORES.METADATA)
await AlertDebugDB.inspectStore('notes')

// Output example:
// 📊 Store: metadataUrls
// 📦 Count: 5
// 📋 Data: [{alertId: '123', url: '...', ...}, ...]
```

### Debugging & Troubleshooting
```javascript
// Check if databases are initialized
AlertDebugDB.metadataDB  // Should not be null
AlertDebugDB.notesDB     // Should not be null

// Get database stats for all stores
for (const storeName of Object.values(AlertDebugDB.STORES)) {
  await AlertDebugDB.inspectStore(storeName)
}

// Clear all metadata
await AlertDebugDB.metadata.clearAll()

// Manual database recreation (if needed)
await AlertDebugDB.metadata.deleteDatabase()
// Refresh page to recreate
```

## Legacy Console Database Cleaner

You can still use the console database cleaner script from `scripts/console-db-cleaner.js`:

```javascript
// Clean everything (nuclear option)
cleanAllIndexedDB()

// Clean just app database
cleanAppDatabase()

// Clear specific store data
clearAppStore('metadataUrls')

// Inspect database structure
inspectAppDatabase()
```

## Database Schema Reference

### metadataUrls Store
```javascript
{
  alertId: string,      // Primary key
  url: string,          // S3 URL
  timestamp: string,    // ISO timestamp
  downloaded: boolean   // Download status
}
```

### metadata Store  
```javascript
{
  alertId: string,      // Primary key
  content: string,      // File content
  url: string,          // Original S3 URL
  timestamp: string,    // ISO timestamp
  size: number          // Content size in bytes
}
```

### notes Store
```javascript
{
  id: number,           // Auto-increment primary key
  alertId: string,      // Alert ID
  content: string,      // Note content
  timestamp: string,    // ISO timestamp
  category: string      // Note category
}
```

## Best Practices

1. **Use constants instead of magic strings**:
   ```javascript
   // Good
   AlertDebugDB.STORES.METADATA_URLS
   
   // Bad
   'metadataUrls'
   ```

2. **Use manager methods when available**:
   ```javascript
   // Preferred - includes business logic
   await AlertDebugDB.metadata.getAllMetadataUrls()
   
   // Direct access - for debugging only
   await AlertDebugDB.metadataDB.getAll('metadataUrls')
   ```

3. **Always handle async operations**:
   ```javascript
   // Use await in console
   const data = await AlertDebugDB.inspectStore('notes')
   ```

This provides comprehensive database access for debugging, testing, and development purposes while maintaining the clean architecture of your application.
