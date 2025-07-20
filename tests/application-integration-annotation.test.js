import { describe, test, expect, vi, beforeEach } from "vitest";
import { Application } from "../src/core/application.js";
import { Utils } from "../src/utils/utils.js";
import { MetadataManager } from "../src/services/metadata.js";
import { SettingsManager } from "../src/services/settings.js";
import { NotesManager } from "../src/features/notes.js";
import { VideoControlsManager } from "../src/ui/video-controls.js";
import { AnnotationManager } from "../src/features/annotations/annotation-manager.js";

// Mock all dependencies
vi.mock("../src/utils/utils.js", () => ({
  Utils: {
    log: vi.fn(),
    waitForElements: vi.fn().mockResolvedValue({ 
      input: {}, 
      button: {},
      typeDropdown: {} 
    }),
  },
}));

vi.mock("../src/services/metadata.js", () => ({
  MetadataManager: {
    init: vi.fn(),
  },
}));

vi.mock("../src/services/settings.js", () => ({
  SettingsManager: {
    init: vi.fn(),
  },
}));

vi.mock("../src/features/notes.js", () => ({
  NotesManager: {
    init: vi.fn(),
  },
}));

vi.mock("../src/ui/video-controls.js", () => ({
  VideoControlsManager: {
    init: vi.fn(),
  },
}));

vi.mock("../src/ui/fireworks.js", () => ({
  FireworkShow: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
  })),
}));

vi.mock("../src/ui/ui-manager.js", () => ({
  UIManager: {
    showNotification: vi.fn(),
  },
  NotepadUI: {},
}));

vi.mock("../src/features/annotations/annotation-manager.js", () => ({
  AnnotationManager: {
    init: vi.fn(),
  },
}));

describe("Application Integration", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Application();

    // Mock app instance methods that might fail
    app.restoreBulkAlerts = vi.fn();
    app.setupInputMonitoring = vi.fn();
    app.setupKeyboardHandlers = vi.fn();
    app.autoOpenNotepad = vi.fn();
  });

  describe("init", () => {
    test("should initialize application successfully", async () => {
      await app.init();

      expect(Utils.log).toHaveBeenCalledWith(
        expect.stringContaining("NeoKPI V0.9.0 initialized successfully"),
      );
    });

    test("should initialize annotation manager", async () => {
      await app.init();

      expect(AnnotationManager.init).toHaveBeenCalled();
    });

    test("should initialize all core services", async () => {
      await app.init();

      expect(MetadataManager.init).toHaveBeenCalled();
      expect(SettingsManager.init).toHaveBeenCalled();
      expect(NotesManager.init).toHaveBeenCalled();
      expect(VideoControlsManager.init).toHaveBeenCalled();
      expect(AnnotationManager.init).toHaveBeenCalled();
    });
  });
});
