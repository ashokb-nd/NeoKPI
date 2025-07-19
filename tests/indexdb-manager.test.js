import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndexedDBManager, createAppDatabase } from '../src/utils/indexdb-manager.js';

// Mock Utils
vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    log: vi.fn()
  }
}));

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
};

const mockDatabase = {
  close: vi.fn(),
  transaction: vi.fn(),
  objectStoreNames: {
    contains: vi.fn()
  }
};

const mockObjectStore = {
  createIndex: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  add: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  index: vi.fn()
};

const mockIndex = {
  get: vi.fn(),
  getAll: vi.fn()
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore)
};

global.indexedDB = mockIndexedDB;

describe('IndexedDBManager', () => {
  let dbManager;
  
  beforeEach(() => {
    vi.clearAllMocks();
    dbManager = new IndexedDBManager('TestDB', 1);
    
    // Setup mock chain
    mockObjectStore.index.mockReturnValue(mockIndex);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockDatabase.transaction.mockReturnValue(mockTransaction);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct properties', () => {
      expect(dbManager.dbName).toBe('TestDB');
      expect(dbManager.dbVersion).toBe(1);
      expect(dbManager.db).toBeNull();
      expect(dbManager.stores).toBeInstanceOf(Map);
    });
  });

  describe('defineStore', () => {
    test('should define a store with default options', () => {
      dbManager.defineStore('users');
      
      const storeConfig = dbManager.stores.get('users');
      expect(storeConfig).toEqual({
        keyPath: 'id',
        autoIncrement: false,
        indexes: []
      });
    });

    test('should define a store with custom options', () => {
      dbManager.defineStore('posts', {
        keyPath: 'postId',
        autoIncrement: true,
        indexes: [
          { name: 'userId', unique: false },
          { name: 'email', unique: true }
        ]
      });
      
      const storeConfig = dbManager.stores.get('posts');
      expect(storeConfig).toEqual({
        keyPath: 'postId',
        autoIncrement: true,
        indexes: [
          { name: 'userId', unique: false },
          { name: 'email', unique: true }
        ]
      });
    });

    test('should return this for method chaining', () => {
      const result = dbManager.defineStore('users');
      expect(result).toBe(dbManager);
    });
  });

  describe('init', () => {
    test('should initialize database successfully', async () => {
      // Mock successful database opening with proper event simulation
      const mockRequest = {
        result: mockDatabase,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      
      mockIndexedDB.open.mockReturnValue(mockRequest);

      const initPromise = dbManager.init();
      
      // Immediately trigger success
      mockRequest.onsuccess({ target: { result: mockDatabase } });

      const result = await initPromise;
      expect(result).toBe(mockDatabase);
      expect(dbManager.db).toBe(mockDatabase);
    });

    test('should handle database initialization error', async () => {
      const mockError = new Error('Failed to open database');
      const mockRequest = {
        result: null,
        error: mockError,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      
      mockIndexedDB.open.mockReturnValue(mockRequest);

      const initPromise = dbManager.init();
      
      // Immediately trigger error
      mockRequest.onerror({ target: { error: mockError } });

      await expect(initPromise).rejects.toThrow('Failed to open database');
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      dbManager.db = mockDatabase;
    });

    test('get should retrieve data by key', async () => {
      const testData = { id: 1, name: 'Test' };
      const mockRequest = {
        result: testData,
        onsuccess: null,
        onerror: null
      };
      
      mockObjectStore.get.mockReturnValue(mockRequest);

      const getPromise = dbManager.get('users', 1);
      
      // Immediately trigger success
      mockRequest.onsuccess();

      const result = await getPromise;
      expect(result).toEqual(testData);
      expect(mockDatabase.transaction).toHaveBeenCalledWith(['users'], 'readonly');
    });

    test('put should store data', async () => {
      const testData = { id: 1, name: 'Test' };
      const mockRequest = {
        result: 1,
        onsuccess: null,
        onerror: null
      };
      
      mockObjectStore.put.mockReturnValue(mockRequest);

      const putPromise = dbManager.put('users', testData);
      
      // Immediately trigger success
      mockRequest.onsuccess();

      const result = await putPromise;
      expect(result).toBe(1);
      expect(mockDatabase.transaction).toHaveBeenCalledWith(['users'], 'readwrite');
    });

    test('delete should remove data by key', async () => {
      const mockRequest = {
        result: undefined,
        onsuccess: null,
        onerror: null
      };
      
      mockObjectStore.delete.mockReturnValue(mockRequest);

      const deletePromise = dbManager.delete('users', 1);
      
      // Immediately trigger success
      mockRequest.onsuccess();

      await deletePromise;
      expect(mockDatabase.transaction).toHaveBeenCalledWith(['users'], 'readwrite');
      expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('batch operations', () => {
    beforeEach(() => {
      dbManager.db = mockDatabase;
    });

    test('batchPut should store multiple items', async () => {
      const testData = [
        { id: 1, name: 'Test1' },
        { id: 2, name: 'Test2' }
      ];

      // Create separate mock requests for each put operation
      const mockRequest1 = { result: 1, onsuccess: null, onerror: null };
      const mockRequest2 = { result: 2, onsuccess: null, onerror: null };
      
      mockObjectStore.put
        .mockReturnValueOnce(mockRequest1)
        .mockReturnValueOnce(mockRequest2);

      const batchPromise = dbManager.batchPut('users', testData);
      
      // Immediately trigger success for both requests
      mockRequest1.onsuccess();
      mockRequest2.onsuccess();

      const results = await batchPromise;
      expect(results).toEqual([1, 2]);
      expect(mockObjectStore.put).toHaveBeenCalledTimes(2);
      expect(mockObjectStore.put).toHaveBeenNthCalledWith(1, testData[0]);
      expect(mockObjectStore.put).toHaveBeenNthCalledWith(2, testData[1]);
    });
  });
});

describe('createAppDatabase', () => {
  test('should create database with predefined stores', () => {
    const db = createAppDatabase();
    
    expect(db).toBeInstanceOf(IndexedDBManager);
    expect(db.dbName).toBe('NeoKPIApp');
    expect(db.dbVersion).toBe(1);
    
    // Check that stores are defined
    expect(db.stores.has('metadata')).toBe(true);
    expect(db.stores.has('metadataUrls')).toBe(true);
    expect(db.stores.has('notes')).toBe(true);
    expect(db.stores.has('tags')).toBe(true);
    expect(db.stores.has('settings')).toBe(true);
  });

  test('should have correct store configurations', () => {
    const db = createAppDatabase();
    
    const notesConfig = db.stores.get('notes');
    expect(notesConfig).toEqual({
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'alertId', unique: false },
        { name: 'timestamp', unique: false },
        { name: 'category', unique: false }
      ]
    });
  });
});
