import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BulkProcessor } from '../src/features/bulk-processor.js';
import { StorageManager } from '../src/utils/storage.js';
import { Utils } from '../src/utils/utils.js';
import { FilterManager } from '../src/features/filter.js';

// Mock dependencies
vi.mock('../src/config/constants.js', () => ({
  CONFIG: {
    STORAGE_KEYS: {
      BULK_ALERTS: 'alert-debug-bulk-alerts'
    }
  }
}));

vi.mock('../src/utils/storage.js', () => ({
  StorageManager: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    getCurrentAlertType: vi.fn(() => 'test-alert-type')
  }
}));

vi.mock('../src/features/filter.js', () => ({
  FilterManager: {
    getFilteredAlertIds: vi.fn(() => [])
  }
}));

describe('BulkProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset state
    BulkProcessor.state = {
      alertIds: [],
      currentIndex: -1,
      isProcessing: false,
      alertType: null
    };
  });

  describe('parseAlertIds', () => {
    test('should parse space-separated alert IDs', () => {
      const result = BulkProcessor.parseAlertIds('12345 67890 11111');
      
      expect(result).toEqual(['12345', '67890', '11111']);
    });

    test('should parse comma-separated alert IDs', () => {
      const result = BulkProcessor.parseAlertIds('12345,67890,11111');
      
      expect(result).toEqual(['12345', '67890', '11111']);
    });

    test('should parse newline-separated alert IDs', () => {
      const result = BulkProcessor.parseAlertIds('12345\n67890\n11111');
      
      expect(result).toEqual(['12345', '67890', '11111']);
    });

    test('should handle mixed separators', () => {
      const result = BulkProcessor.parseAlertIds('12345, 67890\n11111 22222');
      
      expect(result).toEqual(['12345', '67890', '11111', '22222']);
    });

    test('should filter out empty strings', () => {
      const result = BulkProcessor.parseAlertIds('12345,  , 67890');
      
      expect(result).toEqual(['12345', '67890']);
    });

    test('should return empty array for empty input', () => {
      expect(BulkProcessor.parseAlertIds('')).toEqual([]);
      expect(BulkProcessor.parseAlertIds(null)).toEqual([]);
      expect(BulkProcessor.parseAlertIds(undefined)).toEqual([]);
    });
  });

  describe('loadAlertIds', () => {
    test('should load alert IDs and initialize state', () => {
      vi.mocked(StorageManager.set).mockReturnValue(true);
      vi.mocked(Utils.getCurrentAlertType).mockReturnValue('security');
      
      const count = BulkProcessor.loadAlertIds('12345 67890 11111');
      
      expect(count).toBe(3);
      expect(BulkProcessor.state.alertIds).toEqual(['12345', '67890', '11111']);
      expect(BulkProcessor.state.currentIndex).toBe(-1);
      expect(BulkProcessor.state.isProcessing).toBe(true);
      expect(BulkProcessor.state.alertType).toBe('security');
      expect(StorageManager.set).toHaveBeenCalledWith('alert-debug-bulk-alerts', BulkProcessor.state);
    });

    test('should handle empty input', () => {
      const count = BulkProcessor.loadAlertIds('');
      
      expect(count).toBe(0);
      expect(BulkProcessor.state.isProcessing).toBe(false);
    });
  });

  describe('saveBulkAlerts', () => {
    test('should save state to storage', () => {
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = BulkProcessor.saveBulkAlerts();
      
      expect(result).toBe(true);
      expect(StorageManager.set).toHaveBeenCalledWith('alert-debug-bulk-alerts', BulkProcessor.state);
    });
  });

  describe('loadBulkAlerts', () => {
    test('should load state from storage', () => {
      const savedState = {
        alertIds: ['12345', '67890'],
        currentIndex: 1,
        isProcessing: true,
        alertType: 'warning'
      };
      
      vi.mocked(StorageManager.get).mockReturnValue(savedState);
      
      const result = BulkProcessor.loadBulkAlerts();
      
      expect(result).toBe(true);
      expect(BulkProcessor.state.alertIds).toEqual(['12345', '67890']);
      expect(BulkProcessor.state.currentIndex).toBe(1);
      expect(BulkProcessor.state.isProcessing).toBe(true);
      expect(BulkProcessor.state.alertType).toBe('warning');
    });

    test('should return false when no saved state', () => {
      vi.mocked(StorageManager.get).mockReturnValue(null);
      
      const result = BulkProcessor.loadBulkAlerts();
      
      expect(result).toBe(false);
    });

    test('should return false when saved state has no alerts', () => {
      const savedState = {
        alertIds: [],
        currentIndex: -1,
        isProcessing: false,
        alertType: null
      };
      
      vi.mocked(StorageManager.get).mockReturnValue(savedState);
      
      const result = BulkProcessor.loadBulkAlerts();
      
      expect(result).toBe(false);
    });
  });

  describe('clearBulkAlerts', () => {
    test('should reset state and remove from storage', () => {
      // Set up some state first
      BulkProcessor.state = {
        alertIds: ['12345', '67890'],
        currentIndex: 1,
        isProcessing: true,
        alertType: 'security'
      };
      
      vi.mocked(StorageManager.remove).mockReturnValue(true);
      
      const result = BulkProcessor.clearBulkAlerts();
      
      expect(result).toBe(true);
      expect(BulkProcessor.state).toEqual({
        alertIds: [],
        currentIndex: -1,
        isProcessing: false,
        alertType: null
      });
      expect(StorageManager.remove).toHaveBeenCalledWith('alert-debug-bulk-alerts');
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      BulkProcessor.state = {
        alertIds: ['12345', '67890', '11111'],
        currentIndex: 0,
        isProcessing: true,
        alertType: 'security'
      };
    });

    test('getCurrentAlert should return current alert', () => {
      expect(BulkProcessor.getCurrentAlert()).toBe('12345');
      
      BulkProcessor.state.currentIndex = 1;
      expect(BulkProcessor.getCurrentAlert()).toBe('67890');
    });

    test('hasNext should check if next alert exists', () => {
      expect(BulkProcessor.hasNext()).toBe(true);
      
      BulkProcessor.state.currentIndex = 2;
      expect(BulkProcessor.hasNext()).toBe(false);
    });

    test('hasPrevious should check if previous alert exists', () => {
      expect(BulkProcessor.hasPrevious()).toBe(false);
      
      BulkProcessor.state.currentIndex = 1;
      expect(BulkProcessor.hasPrevious()).toBe(true);
    });

    test('nextAlert should move to next alert', () => {
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = BulkProcessor.nextAlert();
      
      expect(result).toBe('67890');
      expect(BulkProcessor.state.currentIndex).toBe(1);
      expect(StorageManager.set).toHaveBeenCalled();
    });

    test('nextAlert should return null at end of list', () => {
      BulkProcessor.state.currentIndex = 2;
      
      const result = BulkProcessor.nextAlert();
      
      expect(result).toBeNull();
      expect(BulkProcessor.state.currentIndex).toBe(2);
    });

    test('prevAlert should move to previous alert', () => {
      BulkProcessor.state.currentIndex = 1;
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = BulkProcessor.prevAlert();
      
      expect(result).toBe('12345');
      expect(BulkProcessor.state.currentIndex).toBe(0);
      expect(StorageManager.set).toHaveBeenCalled();
    });

    test('prevAlert should return null at beginning of list', () => {
      const result = BulkProcessor.prevAlert();
      
      expect(result).toBeNull();
      expect(BulkProcessor.state.currentIndex).toBe(0);
    });

    test('goToAlert should navigate to specific index', () => {
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = BulkProcessor.goToAlert(2);
      
      expect(result).toBe('11111');
      expect(BulkProcessor.state.currentIndex).toBe(2);
      expect(StorageManager.set).toHaveBeenCalled();
    });

    test('goToAlert should return null for invalid index', () => {
      const result = BulkProcessor.goToAlert(5);
      
      expect(result).toBeNull();
      expect(BulkProcessor.state.currentIndex).toBe(0);
    });
  });

  describe('getProgress', () => {
    test('should return progress string when processing', () => {
      BulkProcessor.state = {
        alertIds: ['12345', '67890', '11111'],
        currentIndex: 1,
        isProcessing: true,
        alertType: 'security'
      };
      
      expect(BulkProcessor.getProgress()).toBe('[2/3]');
    });

    test('should return empty string when not processing', () => {
      BulkProcessor.state.isProcessing = false;
      
      expect(BulkProcessor.getProgress()).toBe('');
    });
  });

  describe('getCurrentPosition', () => {
    test('should return current position information', () => {
      BulkProcessor.state = {
        alertIds: ['12345', '67890', '11111'],
        currentIndex: 1,
        isProcessing: true,
        alertType: 'security'
      };
      
      const result = BulkProcessor.getCurrentPosition();
      
      expect(result).toEqual({
        current: 2,
        total: 3,
        percentage: 67
      });
    });

    test('should handle empty alert list', () => {
      const result = BulkProcessor.getCurrentPosition();
      
      expect(result).toEqual({
        current: 0,
        total: 0,
        percentage: 0
      });
    });
  });

  describe('filtered navigation', () => {
    beforeEach(() => {
      BulkProcessor.state = {
        alertIds: ['12345', '67890', '11111', '22222'],
        currentIndex: 1, // Currently on '67890'
        isProcessing: true,
        alertType: 'security'
      };
    });

    test('nextFilteredAlert should use next alert when no filter', () => {
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = BulkProcessor.nextFilteredAlert();
      
      expect(result).toBe('11111');
      expect(BulkProcessor.state.currentIndex).toBe(2);
    });

    test('nextFilteredAlert should navigate to next filtered alert', () => {
      vi.mocked(FilterManager.getFilteredAlertIds).mockReturnValue(['12345', '67890', '22222']);
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = BulkProcessor.nextFilteredAlert(['urgent'], 'AND', true);
      
      expect(result).toBe('22222');
      expect(BulkProcessor.state.currentIndex).toBe(3);
      expect(FilterManager.getFilteredAlertIds).toHaveBeenCalledWith(['urgent'], 'AND', true);
    });

    test('prevFilteredAlert should navigate to previous filtered alert', () => {
      vi.mocked(FilterManager.getFilteredAlertIds).mockReturnValue(['12345', '67890', '22222']);
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = BulkProcessor.prevFilteredAlert(['urgent'], 'AND', true);
      
      expect(result).toBe('12345');
      expect(BulkProcessor.state.currentIndex).toBe(0);
    });
  });
});
