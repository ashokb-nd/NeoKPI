import { CONFIG } from "../config/constants.js";

// ========================================
// STORAGE MANAGER
// ========================================
export const StorageManager = {
  get(key) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to storage (${key}):`, error);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from storage (${key}):`, error);
      return false;
    }
  },

  // Clear all storage related to this script
  clear() {
    const keys = Object.values(CONFIG.STORAGE_KEYS);
    keys.forEach((key) => this.remove(key));
  },
};
