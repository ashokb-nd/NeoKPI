import { CONFIG } from "../config/constants.js";
import { StorageManager } from "../utils/storage.js";
import { Utils } from "../utils/utils.js";

export const SettingsManager = {
  // Default settings
  defaultSettings: {
    presignerUrl: "http://localhost:8080",
    autoSaveNotes: true,
    showKeyboardHints: true,
    enableFireworks: true,
  },

  getSettings() {
    const saved = StorageManager.get(CONFIG.STORAGE_KEYS.SETTINGS);
    return saved ? { ...this.defaultSettings, ...saved } : this.defaultSettings;
  },

  getSetting(key) {
    const settings = this.getSettings();
    return settings[key];
  },

  setSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;

    // Update CONFIG if it's the presigner URL
    if (key === "presignerUrl") {
      CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL = value;
    }

    return StorageManager.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
  },

  setSettings(newSettings) {
    const settings = { ...this.getSettings(), ...newSettings };

    // Update CONFIG if presigner URL changed
    if (newSettings.presignerUrl) {
      CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL = newSettings.presignerUrl;
    }

    return StorageManager.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
  },

  resetSettings() {
    StorageManager.remove(CONFIG.STORAGE_KEYS.SETTINGS);
    CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL = this.defaultSettings.presignerUrl;
    return true;
  },

  // Initialize settings on startup
  init() {
    const settings = this.getSettings();

    // Apply settings to CONFIG
    if (settings.presignerUrl) {
      CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL = settings.presignerUrl;
    }

    Utils.log("Settings manager initialized");
  },
};
