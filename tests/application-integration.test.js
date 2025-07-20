import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Application } from "../src/core/application.js";
import { GlobalScope } from "../src/core/global-scope.js";

// Mock all the dependencies that Application imports
vi.mock("../src/utils/utils.js", () => ({
  Utils: {
    log: vi.fn(),
    waitForElements: vi.fn((callback) => {
      // Immediately call the callback with mock elements
      callback({
        input: { addEventListener: vi.fn(), value: "", focus: vi.fn() },
        button: { click: vi.fn() },
      });
    }),
    debounce: vi.fn((fn) => fn),
    getRequiredElements: vi.fn(() => ({
      input: { value: "test-alert-123" },
      button: { click: vi.fn() },
    })),
  },
}));

vi.mock("../src/utils/storage.js", () => ({
  StorageManager: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("../src/core/app-state.js", () => ({
  AppState: {
    notepad: { isOpen: false },
    toggleNotepad: vi.fn(),
    setCurrentAlert: vi.fn(),
  },
}));

vi.mock("../src/core/keyboard-manager.js", () => ({
  KeyboardManager: {
    handleKeydown: vi.fn(),
  },
}));

vi.mock("../src/services/settings.js", () => ({
  SettingsManager: {
    init: vi.fn(),
  },
}));

vi.mock("../src/services/metadata.js", () => ({
  MetadataManager: {
    init: vi.fn(),
  },
}));

vi.mock("../src/features/notes.js", () => ({
  NotesManager: {
    init: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => ({})),
    exportAll: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock("../src/features/bulk-processor.js", () => ({
  BulkProcessor: {
    loadBulkAlerts: vi.fn(() => false),
    state: { alertIds: [], isProcessing: false },
    getProgress: vi.fn(() => "[1/5]"),
  },
}));

vi.mock("../src/ui/fireworks.js", () => ({
  FireworksManager: {
    init: vi.fn(),
  },
}));

vi.mock("../src/ui/video-controls.js", () => ({
  VideoControlsManager: {
    init: vi.fn(),
  },
}));

vi.mock("../src/ui/ui-manager.js", () => ({
  UIManager: {
    showNotification: vi.fn(),
    showBulkStatus: vi.fn(),
    importCsv: vi.fn(),
    openSettings: vi.fn(),
  },
  NotepadUI: {
    toggle: vi.fn(),
    updateContent: vi.fn(),
  },
}));

vi.mock("../src/ui/tags-ui.js", () => ({
  TagsUI: {
    createCurrentAlertTagsSection: vi.fn(() => ({ appendChild: vi.fn() })),
    createFilterSection: vi.fn(() => ({ appendChild: vi.fn() })),
    updateTagsDisplay: vi.fn(),
    updateFilterDisplay: vi.fn(),
  },
}));

// Mock the modal manager properly
vi.mock("../src/ui/modal-manager.js", () => ({
  ModalManager: {
    showImportDialog: vi.fn(),
    showBulkDialog: vi.fn(),
  },
  SettingsModal: {
    show: vi.fn(),
  },
}));

vi.mock("../src/utils/admin.js", () => ({
  AdminTools: {
    showStorageStats: vi.fn(),
    clearAllData: vi.fn(),
    cleanupOldData: vi.fn(),
    exportMetadataList: vi.fn(),
    deleteIndexedDatabase: vi.fn(),
  },
}));

describe("Application Bootstrap Integration", () => {
  let app;

  beforeEach(() => {
    // Clear global window properties
    delete window.ModalManager;
    delete window.SettingsModal;
    delete window.TagsUI;
    delete window.AlertDebugApp;
    delete window.AlertDebugAdmin;

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    app = new Application();
  });

  afterEach(() => {
    delete window.ModalManager;
    delete window.SettingsModal;
    delete window.TagsUI;
    delete window.AlertDebugApp;
    delete window.AlertDebugAdmin;
    vi.restoreAllMocks();
  });

  describe("application initialization", () => {
    it("should initialize without errors", async () => {
      // Application should initialize successfully
      await expect(app.init()).resolves.toBeUndefined();
    });

    it("should handle initialization failures gracefully", async () => {
      // Mock an initialization failure
      const { Utils } = await import("../src/utils/utils.js");
      Utils.waitForElements.mockImplementation(() => {
        throw new Error("Elements not found");
      });

      // Should not throw
      await expect(app.init()).resolves.toBeUndefined();

      // Should show error notification
      const { UIManager } = await import("../src/ui/ui-manager.js");
      expect(UIManager.showNotification).toHaveBeenCalledWith(
        "UserScript initialization failed",
        "error",
      );
    });
  });

  describe("cleanup functionality", () => {
    it("should clean up elements and storage on cleanup", async () => {
      // Call cleanup
      app.cleanup();

      // Import the mock after calling cleanup
      const { StorageManager } = await import("../src/utils/storage.js");

      // Verify cleanup was called
      expect(StorageManager.clear).toHaveBeenCalled();
    });
  });

  describe("global scope integration", () => {
    it("should work with GlobalScope when manually exposed", async () => {
      // Initialize the application
      await app.init();

      // Manually expose to global scope (simulating index.js behavior)
      GlobalScope.expose(app);

      // Check that global objects are available
      expect(window.ModalManager).toBeDefined();
      expect(window.SettingsModal).toBeDefined();
      expect(window.TagsUI).toBeDefined();
      expect(window.AlertDebugApp).toBe(app);
    });
  });
});
