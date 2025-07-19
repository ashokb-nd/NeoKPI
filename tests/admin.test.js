import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdminTools } from '../src/utils/admin.js';

// Mock dependencies
vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    log: vi.fn()
  }
}));

vi.mock('../src/utils/storage.js', () => ({
  StorageManager: {
    clear: vi.fn()
  }
}));

// Mock global objects
global.console = {
  ...global.console,
  log: vi.fn()
};

global.confirm = vi.fn();

global.URL = {
  createObjectURL: vi.fn(() => 'blob:url'),
  revokeObjectURL: vi.fn()
};

global.Blob = vi.fn();

global.document = {
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    click: vi.fn()
  }))
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

// Set up localStorage with some test data
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock window object
global.window = {
  ...global.window,
  MetadataManager: null,
  UIManager: null
};

describe('AdminTools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset window mocks
    global.window.MetadataManager = null;
    global.window.UIManager = null;
    
    // Set up localStorage mock with test data
    mockLocalStorage.hasOwnProperty = vi.fn((key) => ['notes', 'settings', 'bulk'].includes(key));
    Object.defineProperty(mockLocalStorage, 'notes', {
      value: 'test-notes-data',
      enumerable: true
    });
    Object.defineProperty(mockLocalStorage, 'settings', {
      value: 'test-settings-data',
      enumerable: true
    });
    Object.defineProperty(mockLocalStorage, 'bulk', {
      value: 'test-bulk-data',
      enumerable: true
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getLocalStorageSize', () => {
    test('should calculate localStorage size correctly', () => {
      const size = AdminTools.getLocalStorageSize();
      
      // Each character is 2 bytes in UTF-16
      // 'notes' (5) + 'test-notes-data' (15) = 20 chars = 40 bytes
      // 'settings' (8) + 'test-settings-data' (18) = 26 chars = 52 bytes  
      // 'bulk' (4) + 'test-bulk-data' (14) = 18 chars = 36 bytes
      // Total: 128 bytes
      expect(size).toBe(128);
    });

    test('should handle empty localStorage', () => {
      mockLocalStorage.hasOwnProperty = vi.fn(() => false);
      
      const size = AdminTools.getLocalStorageSize();
      expect(size).toBe(0);
    });
  });

  describe('showStorageStats', () => {
    test('should show storage statistics without MetadataManager', async () => {
      const mockUIManager = {
        showNotification: vi.fn()
      };
      global.window.UIManager = mockUIManager;
      
      const result = await AdminTools.showStorageStats();
      
      expect(console.log).toHaveBeenCalledWith('=== Storage Usage Statistics ===');
      expect(console.log).toHaveBeenCalledWith('localStorage: 0.13 KB');
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'Storage: 0.1KB localStorage + 0MB IndexedDB',
        'info',
        5000
      );
      
      expect(result).toEqual({
        localStorage: {
          sizeBytes: 128,
          sizeKB: 0 // Math.round(128 / 1024) = 0
        },
        indexedDB: {
          total: 0,
          downloaded: 0,
          cachedEntries: 0,
          totalSizeMB: 0,
          totalSizeKB: 0,
          pending: 0
        }
      });
    });

    test('should show storage statistics with MetadataManager', async () => {
      const mockMetadataManager = {
        getStats: vi.fn().mockResolvedValue({
          total: 100,
          downloaded: 75,
          cachedEntries: 50,
          totalSizeMB: 5,
          totalSizeKB: 5120,
          pending: 25
        })
      };
      
      const mockUIManager = {
        showNotification: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      global.window.UIManager = mockUIManager;
      
      const result = await AdminTools.showStorageStats();
      
      expect(mockMetadataManager.getStats).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('IndexedDB URLs: 100 entries (75 downloaded)');
      expect(console.log).toHaveBeenCalledWith('IndexedDB Metadata: 50 cached entries');
      expect(console.log).toHaveBeenCalledWith('IndexedDB Size: 5 MB (5120 KB)');
      expect(console.log).toHaveBeenCalledWith('Pending Downloads: 25');
      
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'Storage: 0.1KB localStorage + 5MB IndexedDB',
        'info',
        5000
      );
      
      expect(result.indexedDB).toEqual({
        total: 100,
        downloaded: 75,
        cachedEntries: 50,
        totalSizeMB: 5,
        totalSizeKB: 5120,
        pending: 25
      });
    });

    test('should handle MetadataManager errors gracefully', async () => {
      const mockMetadataManager = {
        getStats: vi.fn().mockRejectedValue(new Error('DB Error'))
      };
      
      global.window.MetadataManager = mockMetadataManager;
      
      const result = await AdminTools.showStorageStats();
      
      expect(result.indexedDB).toEqual({
        total: 0,
        downloaded: 0,
        cachedEntries: 0,
        totalSizeMB: 0,
        totalSizeKB: 0,
        pending: 0
      });
    });
  });

  describe('clearAllData', () => {
    test('should clear all data when confirmed', async () => {
      global.confirm.mockReturnValue(true);
      
      const mockMetadataManager = {
        clearAll: vi.fn().mockResolvedValue()
      };
      
      const mockUIManager = {
        showNotification: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      global.window.UIManager = mockUIManager;
      
      await AdminTools.clearAllData();
      
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('This will clear ALL stored data')
      );
      
      const { StorageManager } = await import('../src/utils/storage.js');
      expect(StorageManager.clear).toHaveBeenCalled();
      expect(mockMetadataManager.clearAll).toHaveBeenCalled();
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'All data cleared successfully',
        'success'
      );
    });

    test('should not clear data when not confirmed', async () => {
      global.confirm.mockReturnValue(false);
      
      await AdminTools.clearAllData();
      
      const { StorageManager } = await import('../src/utils/storage.js');
      expect(StorageManager.clear).not.toHaveBeenCalled();
    });

    test('should handle errors during clearing', async () => {
      global.confirm.mockReturnValue(true);
      
      const mockMetadataManager = {
        clearAll: vi.fn().mockRejectedValue(new Error('Clear error'))
      };
      
      const mockUIManager = {
        showNotification: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      global.window.UIManager = mockUIManager;
      
      await AdminTools.clearAllData();
      
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'Error clearing data: Clear error',
        'error'
      );
    });
  });

  describe('deleteIndexedDatabase', () => {
    test('should delete IndexedDB when confirmed', async () => {
      global.confirm.mockReturnValue(true);
      
      const mockMetadataManager = {
        deleteDatabase: vi.fn().mockResolvedValue()
      };
      
      const mockUIManager = {
        showNotification: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      global.window.UIManager = mockUIManager;
      
      await AdminTools.deleteIndexedDatabase();
      
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('This will DELETE the entire IndexedDB database')
      );
      expect(mockMetadataManager.deleteDatabase).toHaveBeenCalled();
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'IndexedDB database deleted successfully',
        'success'
      );
    });

    test('should not delete when not confirmed', async () => {
      global.confirm.mockReturnValue(false);
      
      const mockMetadataManager = {
        deleteDatabase: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      
      await AdminTools.deleteIndexedDatabase();
      
      expect(mockMetadataManager.deleteDatabase).not.toHaveBeenCalled();
    });

    test('should handle missing MetadataManager', async () => {
      global.confirm.mockReturnValue(true);
      global.window.MetadataManager = null;
      
      await AdminTools.deleteIndexedDatabase();
      
      const { Utils } = await import('../src/utils/utils.js');
      expect(Utils.log).toHaveBeenCalledWith('MetadataManager not available');
    });
  });

  describe('cleanupOldData', () => {
    test('should cleanup old data successfully', async () => {
      const mockMetadataManager = {
        cleanupOldEntries: vi.fn().mockResolvedValue(true)
      };
      
      const mockUIManager = {
        showNotification: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      global.window.UIManager = mockUIManager;
      
      await AdminTools.cleanupOldData(500, 15);
      
      expect(mockMetadataManager.cleanupOldEntries).toHaveBeenCalledWith(500, 15);
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'Cleanup completed - kept 500 newest entries',
        'success'
      );
    });

    test('should handle no cleanup needed', async () => {
      const mockMetadataManager = {
        cleanupOldEntries: vi.fn().mockResolvedValue(false)
      };
      
      const mockUIManager = {
        showNotification: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      global.window.UIManager = mockUIManager;
      
      await AdminTools.cleanupOldData();
      
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'No cleanup needed',
        'info'
      );
    });

    test('should use default parameters', async () => {
      const mockMetadataManager = {
        cleanupOldEntries: vi.fn().mockResolvedValue(true)
      };
      
      global.window.MetadataManager = mockMetadataManager;
      
      await AdminTools.cleanupOldData();
      
      expect(mockMetadataManager.cleanupOldEntries).toHaveBeenCalledWith(1000, 30);
    });
  });

  describe('exportMetadataList', () => {
    test('should export metadata list successfully', async () => {
      const mockMetadataManager = {
        getAllMetadataUrls: vi.fn().mockResolvedValue({
          '12345': { url: 'test-url', timestamp: '2025-01-01' }
        }),
        getStats: vi.fn().mockResolvedValue({
          total: 1,
          downloaded: 1
        })
      };
      
      const mockUIManager = {
        showNotification: vi.fn()
      };
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      global.window.UIManager = mockUIManager;
      global.document.createElement.mockReturnValue(mockLink);
      
      await AdminTools.exportMetadataList();
      
      expect(mockMetadataManager.getAllMetadataUrls).toHaveBeenCalled();
      expect(mockMetadataManager.getStats).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('=== Metadata Export ===');
      expect(global.Blob).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'Metadata list exported',
        'success'
      );
    });

    test('should handle export errors', async () => {
      const mockMetadataManager = {
        getAllMetadataUrls: vi.fn().mockRejectedValue(new Error('Export error'))
      };
      
      const mockUIManager = {
        showNotification: vi.fn()
      };
      
      global.window.MetadataManager = mockMetadataManager;
      global.window.UIManager = mockUIManager;
      
      await AdminTools.exportMetadataList();
      
      expect(mockUIManager.showNotification).toHaveBeenCalledWith(
        'Export error: Export error',
        'error'
      );
    });

    test('should handle missing MetadataManager', async () => {
      global.window.MetadataManager = null;
      
      await AdminTools.exportMetadataList();
      
      const { Utils } = await import('../src/utils/utils.js');
      expect(Utils.log).toHaveBeenCalledWith('MetadataManager not available');
    });
  });
});
