import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetadataManager } from '../src/managers/metadata.js';

// Mock dependencies
vi.mock('../src/config/constants.js', () => ({
  CONFIG: {
    S3_PRESIGNER: {
      LOCAL_SERVER_URL: 'http://localhost:3000/presign'
    }
  }
}));

vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    log: vi.fn(),
    getRequiredElements: vi.fn(() => ({
      input: { value: '12345' }
    }))
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
  delete: vi.fn(),
  getAll: vi.fn(),
  clear: vi.fn()
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore)
};

// Mock global fetch
global.fetch = vi.fn();

// Mock window methods
global.window = {
  ...global.window,
  fetch: global.fetch,
  showSaveFilePicker: vi.fn(),
  URL: {
    createObjectURL: vi.fn(() => 'blob:url'),
    revokeObjectURL: vi.fn()
  }
};

// Mock document methods
global.document = {
  ...global.document,
  createElement: vi.fn(() => ({
    style: {},
    click: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn()
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
};

global.indexedDB = mockIndexedDB;

describe('MetadataManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MetadataManager.db = null;
    
    // Setup default mock behaviors
    mockIndexedDB.open.mockReturnValue({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDatabase
    });
    
    mockDatabase.transaction.mockReturnValue(mockTransaction);
    mockDatabase.objectStoreNames.contains.mockReturnValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initIndexedDB', () => {
    test('should initialize IndexedDB successfully', async () => {
      const openRequest = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDatabase
      };
      
      mockIndexedDB.open.mockReturnValue(openRequest);
      
      const initPromise = MetadataManager.initIndexedDB();
      
      // Simulate successful opening
      openRequest.onsuccess();
      
      await expect(initPromise).resolves.toBe(mockDatabase);
      expect(MetadataManager.db).toBe(mockDatabase);
      expect(mockIndexedDB.open).toHaveBeenCalledWith('AlertDebugMetadata', 1);
    });

    test('should handle IndexedDB open errors', async () => {
      const openRequest = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        error: new Error('DB open failed')
      };
      
      mockIndexedDB.open.mockReturnValue(openRequest);
      
      const initPromise = MetadataManager.initIndexedDB();
      
      // Simulate error
      openRequest.onerror();
      
      await expect(initPromise).rejects.toThrow('DB open failed');
    });

    test('should create object stores on upgrade', async () => {
      const openRequest = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDatabase
      };
      
      const mockCreateObjectStore = vi.fn(() => mockObjectStore);
      const upgradeDB = {
        createObjectStore: mockCreateObjectStore,
        objectStoreNames: {
          contains: vi.fn(() => false)
        }
      };
      
      mockIndexedDB.open.mockReturnValue(openRequest);
      
      const initPromise = MetadataManager.initIndexedDB();
      
      // Simulate upgrade needed
      openRequest.onupgradeneeded({ target: { result: upgradeDB } });
      
      // Then success
      openRequest.onsuccess();
      
      await initPromise;
      
      expect(mockCreateObjectStore).toHaveBeenCalledWith('metadata', { keyPath: 'alertId' });
      expect(mockCreateObjectStore).toHaveBeenCalledWith('urls', { keyPath: 'alertId' });
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith('timestamp', 'timestamp', { unique: false });
    });
  });

  describe('interceptDashRequests', () => {
    test('should intercept fetch requests to dash update component', async () => {
      const originalFetch = vi.fn().mockResolvedValue({
        clone: () => ({
          json: () => Promise.resolve({
            response: {
              'debug-alert-details-div': {
                data: {
                  alert_id: '12345',
                  metadata_path: 's3://bucket/path/metadata.json'
                }
              }
            }
          })
        })
      });
      
      // Set up the spy before interception
      window.fetch = originalFetch;
      
      const processSpy = vi.spyOn(MetadataManager, 'processResponse');
      
      MetadataManager.interceptDashRequests();
      
      // Call intercepted fetch
      await window.fetch('/_dash-update-component', { method: 'POST' });
      
      expect(originalFetch).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalled();
    });

    test('should not intercept non-dash requests', async () => {
      const originalFetch = vi.fn().mockResolvedValue({
        clone: () => ({
          json: () => Promise.resolve({})
        })
      });
      
      // Set up the spy before interception
      window.fetch = originalFetch;
      
      const processSpy = vi.spyOn(MetadataManager, 'processResponse');
      
      MetadataManager.interceptDashRequests();
      
      // Call intercepted fetch with regular URL
      await window.fetch('/api/data', { method: 'GET' });
      
      expect(originalFetch).toHaveBeenCalled();
      expect(processSpy).not.toHaveBeenCalled();
    });
  });

  describe('processResponse', () => {
    test('should extract metadata from response data', () => {
      const storeMetadataSpy = vi.spyOn(MetadataManager, 'storeMetadataUrl').mockResolvedValue();
      
      const responseData = {
        response: {
          'debug-alert-details-div': {
            data: {
              alert_id: '12345',
              metadata_path: 's3://bucket/path/metadata.json'
            }
          }
        }
      };
      
      MetadataManager.processResponse(responseData);
      
      expect(storeMetadataSpy).toHaveBeenCalledWith('12345', 's3://bucket/path/metadata.json');
    });

    test('should handle different key formats', () => {
      const storeMetadataSpy = vi.spyOn(MetadataManager, 'storeMetadataUrl').mockResolvedValue();
      
      const responseData = {
        response: {
          'debug_alert_details_div': {
            data: {
              alert_id: '67890',
              summaryPath: 's3://bucket/path/summary.json'
            }
          }
        }
      };
      
      MetadataManager.processResponse(responseData);
      
      expect(storeMetadataSpy).toHaveBeenCalledWith('67890', 's3://bucket/path/summary.json');
    });

    test('should handle malformed response data gracefully', () => {
      const storeMetadataSpy = vi.spyOn(MetadataManager, 'storeMetadataUrl').mockResolvedValue();
      
      const responseData = {
        response: {}
      };
      
      expect(() => MetadataManager.processResponse(responseData)).not.toThrow();
      expect(storeMetadataSpy).not.toHaveBeenCalled();
    });
  });

  describe('getSignedUrl', () => {
    test('should get signed URL from presigner server', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presigned_url: 'https://signed-url.com/metadata.json'
        })
      });
      
      const result = await MetadataManager.getSignedUrl('s3://bucket/path/metadata.json');
      
      expect(result).toBe('https://signed-url.com/metadata.json');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/presign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 's3://bucket/path/metadata.json' })
        }
      );
    });

    test('should handle presigner server errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });
      
      const result = await MetadataManager.getSignedUrl('s3://bucket/path/metadata.json');
      
      expect(result).toBeNull();
    });

    test('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
      
      const result = await MetadataManager.getSignedUrl('s3://bucket/path/metadata.json');
      
      expect(result).toBeNull();
    });

    test('should handle empty URL', async () => {
      const result = await MetadataManager.getSignedUrl('');
      
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('detectContentType', () => {
    test('should detect JSON content', () => {
      const jsonContent = '{"key": "value"}';
      expect(MetadataManager.detectContentType(jsonContent)).toBe('json');
    });

    test('should detect array JSON content', () => {
      const arrayContent = '[{"key": "value"}]';
      expect(MetadataManager.detectContentType(arrayContent)).toBe('json');
    });

    test('should detect text content', () => {
      const textContent = 'This is plain text';
      expect(MetadataManager.detectContentType(textContent)).toBe('text');
    });

    test('should detect malformed JSON as text', () => {
      const malformedJson = '{"key": value}';
      expect(MetadataManager.detectContentType(malformedJson)).toBe('text');
    });

    test('should handle empty content', () => {
      expect(MetadataManager.detectContentType('')).toBe('empty');
      expect(MetadataManager.detectContentType(null)).toBe('empty');
      expect(MetadataManager.detectContentType(undefined)).toBe('empty');
    });
  });

  describe('downloadWithLink', () => {
    test('should create download link and trigger click', () => {
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      };
      
      global.document.createElement.mockReturnValue(mockLink);
      
      const blob = new Blob(['test content'], { type: 'application/json' });
      const filename = 'test-file.json';
      
      MetadataManager.downloadWithLink(blob, filename);
      
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe(filename);
      expect(mockLink.style.display).toBe('none');
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockLink);
    });
  });

  describe('Helper Functions', () => {
    beforeEach(async () => {
      // Initialize MetadataManager.db for helper function tests
      MetadataManager.db = mockDatabase;
    });

    test('getFromStore should return store data', async () => {
      const mockRequest = {
        onsuccess: null,
        onerror: null,
        result: { alertId: '12345', data: 'test' }
      };
      
      mockObjectStore.get.mockReturnValue(mockRequest);
      
      const promise = MetadataManager.getFromStore(mockObjectStore, '12345');
      mockRequest.onsuccess();
      
      const result = await promise;
      expect(result).toEqual({ alertId: '12345', data: 'test' });
      expect(mockObjectStore.get).toHaveBeenCalledWith('12345');
    });

    test('putToStore should store data', async () => {
      const mockRequest = {
        onsuccess: null,
        onerror: null,
        result: 'success'
      };
      
      mockObjectStore.put.mockReturnValue(mockRequest);
      
      const testData = { alertId: '12345', data: 'test' };
      const promise = MetadataManager.putToStore(mockObjectStore, testData);
      mockRequest.onsuccess();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(mockObjectStore.put).toHaveBeenCalledWith(testData);
    });

    test('getAllFromStore should return all data', async () => {
      const mockRequest = {
        onsuccess: null,
        onerror: null,
        result: [
          { alertId: '12345', data: 'test1' },
          { alertId: '67890', data: 'test2' }
        ]
      };
      
      mockObjectStore.getAll.mockReturnValue(mockRequest);
      
      const promise = MetadataManager.getAllFromStore(mockObjectStore);
      mockRequest.onsuccess();
      
      const result = await promise;
      expect(result).toHaveLength(2);
      expect(mockObjectStore.getAll).toHaveBeenCalled();
    });

    test('deleteFromStore should delete data', async () => {
      const mockRequest = {
        onsuccess: null,
        onerror: null,
        result: 'deleted'
      };
      
      mockObjectStore.delete.mockReturnValue(mockRequest);
      
      const promise = MetadataManager.deleteFromStore(mockObjectStore, '12345');
      mockRequest.onsuccess();
      
      const result = await promise;
      expect(result).toBe('deleted');
      expect(mockObjectStore.delete).toHaveBeenCalledWith('12345');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null database in getMetadataUrl', async () => {
      MetadataManager.db = null;
      
      const initSpy = vi.spyOn(MetadataManager, 'initIndexedDB').mockResolvedValue(mockDatabase);
      const getFromStoreSpy = vi.spyOn(MetadataManager, 'getFromStore').mockResolvedValue(null);
      
      const result = await MetadataManager.getMetadataUrl('12345');
      
      expect(initSpy).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should handle database errors in getStats', async () => {
      MetadataManager.db = null;
      
      const initSpy = vi.spyOn(MetadataManager, 'initIndexedDB').mockRejectedValue(new Error('DB Error'));
      
      await expect(MetadataManager.getStats()).rejects.toThrow('DB Error');
    });
  });
});
