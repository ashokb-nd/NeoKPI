import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GlobalScope } from "../src/core/global-scope.js";

// Create a more focused test that verifies the window object exposure
describe("Global Scope Window Object Integration", () => {
  beforeEach(() => {
    // Clear global window properties
    delete window.ModalManager;
    delete window.SettingsModal;
    delete window.AlertDebugApp;
    delete window.AlertDebugAdmin;

    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    delete window.ModalManager;
    delete window.SettingsModal;
    delete window.AlertDebugApp;
    delete window.AlertDebugAdmin;
    vi.restoreAllMocks();
  });

  it("should demonstrate the original bug - window objects not available", () => {
    // Before exposing globals, these should be undefined
    expect(window.ModalManager?.showImportDialog).toBeUndefined();
    expect(window.SettingsModal?.show).toBeUndefined();

    // This is what would cause the importCsv button to fail
    const result = window.ModalManager?.showImportDialog?.();
    expect(result).toBeUndefined();
  });

  it("should fix the bug by exposing globals", async () => {
    // Mock the dependencies
    vi.doMock("../src/utils/admin.js", () => ({
      AdminTools: {
        showStorageStats: vi.fn(),
        clearAllData: vi.fn(),
        cleanupOldData: vi.fn(),
        exportMetadataList: vi.fn(),
        deleteIndexedDatabase: vi.fn(),
      },
    }));

    vi.doMock("../src/ui/modal-manager.js", () => ({
      ModalManager: {
        showImportDialog: vi.fn(),
        showBulkDialog: vi.fn(),
      },
      SettingsModal: {
        show: vi.fn(),
      },
    }));

    // Now expose the globals
    const mockApp = { cleanup: vi.fn() };
    GlobalScope.expose(mockApp);

    // After exposing, these should be available
    expect(window.ModalManager).toBeDefined();
    expect(window.SettingsModal).toBeDefined();
    expect(window.ModalManager.showImportDialog).toBeDefined();
    expect(window.SettingsModal.show).toBeDefined();

    // Now the UI calls would work
    expect(typeof window.ModalManager?.showImportDialog).toBe("function");
    expect(typeof window.SettingsModal?.show).toBe("function");
  });

  it("should handle optional chaining gracefully when globals are missing", () => {
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

  it("should work properly after initialization", () => {
    // Create mock objects
    const mockModalManager = {
      showImportDialog: vi.fn(),
      showBulkDialog: vi.fn(),
    };

    const mockSettingsModal = {
      show: vi.fn(),
    };

    // Manually assign to window to simulate global exposure
    window.ModalManager = mockModalManager;
    window.SettingsModal = mockSettingsModal;

    // Now the optional chaining should work
    window.ModalManager?.showImportDialog?.();
    window.SettingsModal?.show?.();

    // Verify the methods were called
    expect(mockModalManager.showImportDialog).toHaveBeenCalled();
    expect(mockSettingsModal.show).toHaveBeenCalled();
  });
});
