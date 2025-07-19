import { CONFIG } from '../config/constants.js';
import { Utils } from '../utils/utils.js';
import { StorageManager } from '../utils/storage.js';
import { FilterManager } from './filter.js';

// ========================================
// BULK PROCESSOR
// ========================================
export const BulkProcessor = {
  state: {
    alertIds: [],
    currentIndex: -1,
    isProcessing: false,
    alertType: null
  },

  parseAlertIds(input) {
    if (!input) return [];
    
    return input
      .split(/[\s,\n]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);
  },

  loadAlertIds(input) {
    const alertIds = this.parseAlertIds(input);
    this.state.alertIds = alertIds;
    this.state.currentIndex = -1;
    this.state.isProcessing = alertIds.length > 0;
    this.state.alertType = Utils.getCurrentAlertType();
    this.saveBulkAlerts();
    return alertIds.length;
  },

  saveBulkAlerts() {
    return StorageManager.set(CONFIG.STORAGE_KEYS.BULK_ALERTS, this.state);
  },

  loadBulkAlerts() {
    const saved = StorageManager.get(CONFIG.STORAGE_KEYS.BULK_ALERTS);
    if (saved) {
      this.state = { ...this.state, ...saved };
      return this.state.alertIds.length > 0;
    }
    return false;
  },

  clearBulkAlerts() {
    this.state = {
      alertIds: [],
      currentIndex: -1,
      isProcessing: false,
      alertType: null
    };
    return StorageManager.remove(CONFIG.STORAGE_KEYS.BULK_ALERTS);
  },

  getCurrentAlert() {
    return this.state.alertIds[this.state.currentIndex] || null;
  },

  hasNext() {
    return this.state.currentIndex < this.state.alertIds.length - 1;
  },

  hasPrevious() {
    return this.state.currentIndex > 0;
  },

  nextAlert() {
    if (this.hasNext()) {
      this.state.currentIndex++;
      this.saveBulkAlerts();
      return this.getCurrentAlert();
    }
    return null;
  },

  prevAlert() {
    if (this.hasPrevious()) {
      this.state.currentIndex--;
      this.saveBulkAlerts();
      return this.getCurrentAlert();
    }
    return null;
  },

  getProgress() {
    if (!this.state.isProcessing) return '';
    return `[${this.state.currentIndex + 1}/${this.state.alertIds.length}]`;
  },

  // Get current position in the list
  getCurrentPosition() {
    return {
      current: this.state.currentIndex + 1,
      total: this.state.alertIds.length,
      percentage: this.state.alertIds.length > 0 ? 
        Math.round(((this.state.currentIndex + 1) / this.state.alertIds.length) * 100) : 0
    };
  },

  // Navigate to a specific alert by index
  goToAlert(index) {
    if (index >= 0 && index < this.state.alertIds.length) {
      this.state.currentIndex = index;
      this.saveBulkAlerts();
      return this.getCurrentAlert();
    }
    return null;
  },

  nextFilteredAlert(filterTags, logic, includeHashtags) {
    if (!filterTags || filterTags.length === 0) {
      return this.nextAlert();
    }
    
    const filteredIds = FilterManager.getFilteredAlertIds(filterTags, logic, includeHashtags);
    const currentAlert = this.getCurrentAlert();
    const currentIndex = filteredIds.indexOf(currentAlert);
    
    if (currentIndex !== -1 && currentIndex < filteredIds.length - 1) {
      const nextAlert = filteredIds[currentIndex + 1];
      const nextIndex = this.state.alertIds.indexOf(nextAlert);
      if (nextIndex !== -1) {
        this.state.currentIndex = nextIndex;
        this.saveBulkAlerts();
        return nextAlert;
      }
    }
    
    return null;
  },

  prevFilteredAlert(filterTags, logic, includeHashtags) {
    if (!filterTags || filterTags.length === 0) {
      return this.prevAlert();
    }
    
    const filteredIds = FilterManager.getFilteredAlertIds(filterTags, logic, includeHashtags);
    const currentAlert = this.getCurrentAlert();
    const currentIndex = filteredIds.indexOf(currentAlert);
    
    if (currentIndex > 0) {
      const prevAlert = filteredIds[currentIndex - 1];
      const prevIndex = this.state.alertIds.indexOf(prevAlert);
      if (prevIndex !== -1) {
        this.state.currentIndex = prevIndex;
        this.saveBulkAlerts();
        return prevAlert;
      }
    }
    
    return null;
  }
};
