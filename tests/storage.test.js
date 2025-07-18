import { describe, test, expect, vi, beforeEach } from 'vitest';
import { StorageManager } from '../src/utils/storage.js';

describe('StorageManager Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('get method', () => {
    test('should retrieve and parse stored data', () => {
      const testData = { name: 'test', value: 123 };
      localStorage.setItem('test-key', JSON.stringify(testData));

      const result = StorageManager.get('test-key');

      expect(result).toEqual(testData);
    });

    test('should return null for non-existent key', () => {
      const result = StorageManager.get('non-existent-key');

      expect(result).toBeNull();
    });

    test('should handle JSON parsing errors gracefully', () => {
      localStorage.setItem('malformed-key', 'invalid-json{');

      const result = StorageManager.get('malformed-key');

      expect(result).toBeNull();
    });

    test('should return null when localStorage.getItem returns null', () => {
      // Clear any existing data for this key
      localStorage.removeItem('test-key');

      const result = StorageManager.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set method', () => {
    test('should store data as JSON string', () => {
      const testData = { name: 'test', value: 123 };
      
      StorageManager.set('test-key', testData);

      const stored = localStorage.getItem('test-key');
      expect(stored).toBe(JSON.stringify(testData));
    });

    test('should handle null data', () => {
      StorageManager.set('null-key', null);

      const stored = localStorage.getItem('null-key');
      expect(stored).toBe('null');
    });

    test('should handle undefined data', () => {
      StorageManager.set('undefined-key', undefined);

      const stored = localStorage.getItem('undefined-key');
      expect(stored).toBe('undefined');
    });
  });

  describe('remove method', () => {
    test('should remove item from localStorage', () => {
      localStorage.setItem('test-key', JSON.stringify({ data: 'test' }));
      
      StorageManager.remove('test-key');

      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('clear method', () => {
    test('should clear all script-related storage keys', () => {
      // Set up some test data
      localStorage.setItem('alert-debug-notes', '{}');
      localStorage.setItem('alert-debug-bulk-alerts', '[]');
      localStorage.setItem('notepad-panel-height', '400');
      localStorage.setItem('alert-debug-settings', '{}');
      localStorage.setItem('unrelated-key', 'should-remain');

      StorageManager.clear();

      // Verify script-related keys are removed
      expect(localStorage.getItem('alert-debug-notes')).toBeNull();
      expect(localStorage.getItem('alert-debug-bulk-alerts')).toBeNull();
      expect(localStorage.getItem('notepad-panel-height')).toBeNull();
      expect(localStorage.getItem('alert-debug-settings')).toBeNull();
      
      // Verify unrelated keys remain
      expect(localStorage.getItem('unrelated-key')).toBe('should-remain');
    });
  });

  describe('integration tests', () => {
    test('should handle complete storage lifecycle', () => {
      const testData = {
        alertId: 'TEST-123',
        note: 'Test note',
        tags: ['tag1', 'tag2'],
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      // Store data
      const setResult = StorageManager.set('test-lifecycle', testData);
      expect(setResult).toBe(true);

      // Retrieve data
      const retrievedData = StorageManager.get('test-lifecycle');
      expect(retrievedData).toEqual(testData);

      // Remove data
      const removeResult = StorageManager.remove('test-lifecycle');
      expect(removeResult).toBe(true);

      // Verify removal
      const afterRemoval = StorageManager.get('test-lifecycle');
      expect(afterRemoval).toBeNull();
    });

    test('should handle concurrent operations', () => {
      const data1 = { id: 1, value: 'first' };
      const data2 = { id: 2, value: 'second' };
      const data3 = { id: 3, value: 'third' };

      // Perform multiple operations
      StorageManager.set('key1', data1);
      StorageManager.set('key2', data2);
      StorageManager.set('key3', data3);

      // Verify all operations succeeded
      expect(StorageManager.get('key1')).toEqual(data1);
      expect(StorageManager.get('key2')).toEqual(data2);
      expect(StorageManager.get('key3')).toEqual(data3);
    });

    test('should handle complex nested objects', () => {
      const complexData = {
        notes: {
          'alert-1': {
            note: 'Complex note',
            tags: ['urgent', 'review'],
            metadata: {
              created: '2024-01-01',
              author: 'test-user',
              nested: {
                deep: {
                  value: 'deeply nested'
                }
              }
            }
          }
        },
        settings: {
          theme: 'dark',
          notifications: true,
          features: ['tags', 'export', 'import']
        }
      };

      StorageManager.set('complex-data', complexData);
      const retrieved = StorageManager.get('complex-data');

      expect(retrieved).toEqual(complexData);
      expect(retrieved.notes['alert-1'].metadata.nested.deep.value).toBe('deeply nested');
    });
  });
});
