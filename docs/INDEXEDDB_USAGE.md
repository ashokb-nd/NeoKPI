# IndexedDB Manager Usage Examples

## Overview

The `IndexedDBManager` class provides a reusable, clean interface for working with IndexedDB across different parts of the application. Instead of writing boilerplate IndexedDB code in every manager, you can use this utility class.

## Basic Usage

### 1. Creating a Database Manager

```javascript
import { IndexedDBManager, createAppDatabase } from '../utils/indexdb-manager.js';

// Option 1: Use the pre-configured app database
const db = createAppDatabase();
await db.init();

// Option 2: Create a custom database
const customDB = new IndexedDBManager('MyCustomDB', 1)
  .defineStore('users', {
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'email', unique: true },
      { name: 'createdAt', unique: false }
    ]
  })
  .defineStore('posts', {
    keyPath: 'id',
    indexes: [
      { name: 'userId', unique: false },
      { name: 'timestamp', unique: false }
    ]
  });

await customDB.init();
```

### 2. CRUD Operations

```javascript
// Create
await db.add('users', { 
  email: 'user@example.com', 
  name: 'John Doe',
  createdAt: new Date().toISOString()
});

// Read
const user = await db.get('users', 1);
const allUsers = await db.getAll('users');
const userByEmail = await db.getByIndex('users', 'email', 'user@example.com');

// Update
await db.put('users', { 
  id: 1, 
  email: 'user@example.com', 
  name: 'John Smith',
  updatedAt: new Date().toISOString()
});

// Delete
await db.delete('users', 1);
```

### 3. Batch Operations

```javascript
// Batch insert
const users = [
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
  { email: 'user3@example.com', name: 'User 3' }
];
await db.batchPut('users', users);

// Batch delete
await db.batchDelete('users', [1, 2, 3]);
```

### 4. Maintenance Operations

```javascript
// Get statistics
const stats = await db.getStats('users');
console.log(`Store has ${stats.count} entries`);

// Cleanup old entries
await db.cleanup('users', {
  maxEntries: 1000,        // Keep max 1000 entries
  maxAgeInDays: 30,        // Delete entries older than 30 days
  timestampField: 'createdAt'  // Field to check for age
});

// Clear all data
await db.clear('users');
```

## Specific Manager Examples

### Notes Manager

```javascript
import { createAppDatabase } from '../utils/indexdb-manager.js';

export const NotesManager = {
  db: null,
  
  async init() {
    this.db = createAppDatabase();
    await this.db.init();
  },
  
  async createNote(alertId, content, category = 'general') {
    const note = {
      alertId,
      content,
      category,
      timestamp: new Date().toISOString()
    };
    return await this.db.add('notes', note);
  },
  
  async getNotesForAlert(alertId) {
    return await this.db.getAllByIndex('notes', 'alertId', alertId);
  }
};
```

### Tags Manager

```javascript
export const TagsManager = {
  db: null,
  
  async init() {
    this.db = createAppDatabase();
    await this.db.init();
  },
  
  async createTag(name, color) {
    const tag = {
      name,
      color,
      createdAt: new Date().toISOString()
    };
    return await this.db.put('tags', tag);
  },
  
  async getAllTags() {
    return await this.db.getAll('tags');
  }
};
```

### Settings Manager

```javascript
export const SettingsManager = {
  db: null,
  
  async init() {
    this.db = createAppDatabase();
    await this.db.init();
  },
  
  async setSetting(key, value, category = 'general') {
    const setting = {
      key,
      value,
      category,
      updatedAt: new Date().toISOString()
    };
    return await this.db.put('settings', setting);
  },
  
  async getSetting(key) {
    const setting = await this.db.get('settings', key);
    return setting?.value;
  }
};
```

## Benefits of This Approach

1. **Code Reusability**: No need to write IndexedDB boilerplate code repeatedly
2. **Consistency**: All managers use the same IndexedDB patterns
3. **Error Handling**: Centralized error handling and logging
4. **Maintenance**: Built-in cleanup and statistics methods
5. **Type Safety**: Consistent method signatures across all managers
6. **Testing**: Easier to mock and test with a standardized interface
7. **Migration**: Easy to change IndexedDB implementation in one place

## Migration from Old Code

The `MetadataManager` was successfully refactored to use this new system:

**Before:**
```javascript
// Lots of boilerplate IndexedDB code
const transaction = this.db.transaction(['urls'], 'readwrite');
const store = transaction.objectStore('urls');
const result = await this.getFromStore(store, alertId);
```

**After:**
```javascript
// Clean, simple API
const result = await this.db.get('metadataUrls', alertId);
```

This approach makes the code much more maintainable and reduces the likelihood of IndexedDB-related bugs.
