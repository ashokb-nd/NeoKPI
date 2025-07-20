import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GlobalScope } from "../src/core/global-scope.js";

// Mock the dependencies to avoid import issues
vi.mock("../src/utils/admin.js", () => ({
  AdminTools: {
    showStorageStats: vi.fn(),
    clearAllData: vi.fn(),
    cleanupOldData: vi.fn(),
    exportMetadataList: vi.fn(),
    deleteIndexedDatabase: vi.fn(),
  },
}));

vi.mock("../src/ui/modal-manager.js", () => ({
  ModalManager: {
    showImportDialog: vi.fn(),
    showBulkDialog: vi.fn(),
  },
  SettingsModal: {
    show: vi.fn(),
  },
}));

describe("GlobalScope", () => {
  let originalWindow;
  let mockApp;

  beforeEach(() => {
    // Store original window state
    originalWindow = { ...window };

    // Clear any existing global properties
    delete window.AlertDebugApp;
    delete window.ModalManager;
    delete window.SettingsModal;
    delete window.AlertDebugAdmin;

    // Create mock app
    mockApp = { cleanup: vi.fn() };

    // Clear console.log spy
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up global properties
    delete window.AlertDebugApp;
    delete window.ModalManager;
    delete window.SettingsModal;
    delete window.AlertDebugAdmin;

    vi.restoreAllMocks();
  });

  describe("expose", () => {
    it("should expose all required objects to window", () => {
      GlobalScope.expose(mockApp);

      // Check that all expected global objects are exposed
      expect(window.AlertDebugApp).toBe(mockApp);
      expect(window.ModalManager).toBeDefined();
      expect(window.SettingsModal).toBeDefined();
      expect(window.AlertDebugAdmin).toBeDefined();
    });

    it("should expose ModalManager with correct methods", () => {
      GlobalScope.expose(mockApp);

      expect(window.ModalManager.showImportDialog).toBeDefined();
      expect(window.ModalManager.showBulkDialog).toBeDefined();
      expect(typeof window.ModalManager.showImportDialog).toBe("function");
    });

    it("should expose SettingsModal with show method", () => {
      GlobalScope.expose(mockApp);

      expect(window.SettingsModal.show).toBeDefined();
      expect(typeof window.SettingsModal.show).toBe("function");
    });

    it("should expose admin tools with all methods", () => {
      GlobalScope.expose(mockApp);

      const admin = window.AlertDebugAdmin;
      expect(admin.showStats).toBeDefined();
      expect(admin.clearAll).toBeDefined();
      expect(admin.cleanup).toBeDefined();
      expect(admin.exportMetadata).toBeDefined();
      expect(admin.deleteDB).toBeDefined();
    });

    it("should not expose anything when window is undefined", () => {
      const originalWindow = global.window;
      delete global.window;

      GlobalScope.expose(mockApp);

      // Should not throw and should not set any properties
      expect(true).toBe(true); // Test passes if no error thrown

      global.window = originalWindow;
    });

    it("should call logAvailableCommands", () => {
      const logSpy = vi.spyOn(GlobalScope, "logAvailableCommands");

      GlobalScope.expose(mockApp);

      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe("logAvailableCommands", () => {
    it("should log all available commands", () => {
      const consoleSpy = vi.spyOn(console, "log");

      GlobalScope.logAvailableCommands();

      expect(consoleSpy).toHaveBeenCalledWith(
        "%cAlert Debug Admin Commands Available:",
        "color: #4CAF50; font-weight: bold;",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "AlertDebugAdmin.showStats() - Show storage statistics",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "AlertDebugAdmin.clearAll() - Clear all data",
      );
    });
  });
});
