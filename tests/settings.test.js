import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock the dependencies
vi.mock("../src/utils/storage.js", () => ({
  StorageManager: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../src/utils/utils.js", () => ({
  Utils: {
    log: vi.fn(),
  },
}));

vi.mock("../src/config/constants.js", () => ({
  CONFIG: {
    STORAGE_KEYS: {
      SETTINGS: "alert-debug-settings",
    },
    S3_PRESIGNER: {
      LOCAL_SERVER_URL: "http://localhost:8080",
    },
  },
}));

import { SettingsManager } from "../src/services/settings.js";
import { StorageManager } from "../src/utils/storage.js";
import { Utils } from "../src/utils/utils.js";
import { CONFIG } from "../src/config/constants.js";

describe("SettingsManager Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("defaultSettings", () => {
    test("should have correct default settings", () => {
      expect(SettingsManager.defaultSettings).toEqual({
        presignerUrl: "http://localhost:8080",
        autoSaveNotes: true,
        showKeyboardHints: true,
        enableFireworks: true,
      });
    });
  });

  describe("getSettings method", () => {
    test("should return default settings when no saved settings exist", () => {
      StorageManager.get.mockReturnValue(null);

      const settings = SettingsManager.getSettings();

      expect(settings).toEqual(SettingsManager.defaultSettings);
      expect(StorageManager.get).toHaveBeenCalledWith("alert-debug-settings");
    });

    test("should merge saved settings with defaults", () => {
      const savedSettings = {
        presignerUrl: "http://custom-server:9000",
        autoSaveNotes: false,
      };
      StorageManager.get.mockReturnValue(savedSettings);

      const settings = SettingsManager.getSettings();

      expect(settings).toEqual({
        presignerUrl: "http://custom-server:9000",
        autoSaveNotes: false,
        showKeyboardHints: true,
        enableFireworks: true,
      });
    });
  });

  describe("setSetting method", () => {
    test("should update single setting and save to storage", () => {
      const existingSettings = {
        presignerUrl: "http://localhost:8080",
        autoSaveNotes: true,
        showKeyboardHints: true,
        enableFireworks: true,
      };
      StorageManager.get.mockReturnValue(existingSettings);
      StorageManager.set.mockReturnValue(true);

      const result = SettingsManager.setSetting("autoSaveNotes", false);

      expect(result).toBe(true);
      expect(StorageManager.set).toHaveBeenCalledWith("alert-debug-settings", {
        presignerUrl: "http://localhost:8080",
        autoSaveNotes: false,
        showKeyboardHints: true,
        enableFireworks: true,
      });
    });

    test("should update CONFIG when presignerUrl is changed", () => {
      const existingSettings = { ...SettingsManager.defaultSettings };
      StorageManager.get.mockReturnValue(existingSettings);
      StorageManager.set.mockReturnValue(true);

      SettingsManager.setSetting("presignerUrl", "http://new-server:9000");

      expect(CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL).toBe(
        "http://new-server:9000",
      );
    });
  });

  describe("init method", () => {
    test("should initialize settings and apply presignerUrl to CONFIG", () => {
      const savedSettings = {
        presignerUrl: "http://init-server:7000",
        autoSaveNotes: false,
      };
      StorageManager.get.mockReturnValue(savedSettings);

      SettingsManager.init();

      expect(CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL).toBe(
        "http://init-server:7000",
      );
      expect(Utils.log).toHaveBeenCalledWith("Settings manager initialized");
    });
  });
});
