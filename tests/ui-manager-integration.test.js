import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GlobalScope } from '../src/core/global-scope.js';

// Mock the dependencies
vi.mock('../src/utils/admin.js', () => ({
  AdminTools: {
    showStorageStats: vi.fn(),
    clearAllData: vi.fn(),
    cleanupOldData: vi.fn(),
    exportMetadataList: vi.fn(),
    deleteIndexedDatabase: vi.fn()
  }
}));

vi.mock('../src/ui/modal-manager.js', () => ({
  ModalManager: {
    showImportDialog: vi.fn(),
    showBulkDialog: vi.fn()
  },
  SettingsModal: {
    show: vi.fn()
  }
}));

describe('Global Scope Integration for UI Methods', () => {
  let mockApp;
  
  beforeEach(() => {
    // Clear global window properties
    delete window.ModalManager;
    delete window.SettingsModal;
    delete window.AlertDebugApp;
    delete window.AlertDebugAdmin;
    
    mockApp = { cleanup: vi.fn() };
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    delete window.ModalManager;
    delete window.SettingsModal;
    delete window.AlertDebugApp;
    delete window.AlertDebugAdmin;
    vi.restoreAllMocks();
  });

  describe('optional chaining behavior', () => {
    it('should demonstrate the original bug - calls return undefined when globals missing', () => {
      // Before exposing globals, these should be undefined
      expect(window.ModalManager?.showImportDialog).toBeUndefined();
      expect(window.SettingsModal?.show).toBeUndefined();
      
      // This is what would cause the importCsv button to fail silently
      const importResult = window.ModalManager?.showImportDialog?.();
      const settingsResult = window.SettingsModal?.show?.();
      
      expect(importResult).toBeUndefined();
      expect(settingsResult).toBeUndefined();
    });

    it('should fix the bug by exposing globals', async () => {
      // Expose the globals
      GlobalScope.expose(mockApp);

      // After exposing, these should be available
      expect(window.ModalManager).toBeDefined();
      expect(window.SettingsModal).toBeDefined();
      expect(window.ModalManager.showImportDialog).toBeDefined();
      expect(window.SettingsModal.show).toBeDefined();
      
      // Now the UI calls would work
      expect(typeof window.ModalManager?.showImportDialog).toBe('function');
      expect(typeof window.SettingsModal?.show).toBe('function');
    });

    it('should handle optional chaining gracefully when globals are missing', () => {
      // This simulates the fixed code using optional chaining
      const importCsvFunction = () => {
        return window.ModalManager?.showImportDialog?.();
      };
      
      const openSettingsFunction = () => {
        return window.SettingsModal?.show?.();
      };
      
      // Should not throw even when globals are missing
      expect(() => importCsvFunction()).not.toThrow();
      expect(() => openSettingsFunction()).not.toThrow();
      
      // Should return undefined when methods don't exist
      expect(importCsvFunction()).toBeUndefined();
      expect(openSettingsFunction()).toBeUndefined();
    });

    it('should work properly after global scope initialization', () => {
      // Create mock objects
      const mockModalManager = {
        showImportDialog: vi.fn(),
        showBulkDialog: vi.fn()
      };
      
      const mockSettingsModal = {
        show: vi.fn()
      };

      // Manually assign to window to simulate global exposure
      window.ModalManager = mockModalManager;
      window.SettingsModal = mockSettingsModal;
      
      // Now the optional chaining should work and call the methods
      window.ModalManager?.showImportDialog?.();
      window.SettingsModal?.show?.();
      
      // Verify the methods were called
      expect(mockModalManager.showImportDialog).toHaveBeenCalled();
      expect(mockSettingsModal.show).toHaveBeenCalled();
    });
  });

  describe('GlobalScope.expose integration', () => {
    it('should properly expose all required objects', () => {
      // Before expose
      expect(window.ModalManager).toBeUndefined();
      expect(window.SettingsModal).toBeUndefined();
      
      // Call expose
      GlobalScope.expose(mockApp);
      
      // After expose - should be defined
      expect(window.ModalManager).toBeDefined();
      expect(window.SettingsModal).toBeDefined();
      expect(window.AlertDebugApp).toBe(mockApp);
      expect(window.AlertDebugAdmin).toBeDefined();
    });
  });
});
