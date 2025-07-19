import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotesManager } from '../src/features/notes.js';
import { StorageManager } from '../src/utils/storage.js';
import { TagManager } from '../src/features/tags.js';

// Mock dependencies
vi.mock('../src/config/constants.js', () => ({
  CONFIG: {
    STORAGE_KEYS: {
      NOTES: 'alert-debug-notes'
    }
  }
}));

vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    getCurrentAlertType: vi.fn(() => 'test-alert-type'),
    log: vi.fn()
  }
}));

vi.mock('../src/utils/storage.js', () => ({
  StorageManager: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('../src/features/tags.js', () => ({
  TagManager: {
    extractHashtagsFromText: vi.fn(() => []),
    mergeTags: vi.fn((manual, hashtag) => [...(manual || []), ...(hashtag || [])])
  }
}));

// Mock IndexedDB manager
const mockIndexedDBManager = {
  init: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  add: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getAllByIndex: vi.fn(),
  clear: vi.fn(),
  getStats: vi.fn(),
  cleanup: vi.fn()
};

vi.mock('../src/utils/indexdb-manager.js', () => ({
  createAppDatabase: vi.fn(() => mockIndexedDBManager)
}));

// Mock global functions
global.alert = vi.fn();
global.document = {
  createElement: vi.fn(() => ({
    setAttribute: vi.fn(),
    style: { visibility: '' },
    click: vi.fn()
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
};

global.URL = {
  createObjectURL: vi.fn(() => 'blob:url'),
  revokeObjectURL: vi.fn()
};

global.Blob = vi.fn();

describe('NotesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the db property
    NotesManager.db = null;
    
    // Setup default date mock
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('init', () => {
    test('should initialize IndexedDB manager', async () => {
      mockIndexedDBManager.init.mockResolvedValue(true);
      mockIndexedDBManager.getAll.mockResolvedValue([]);
      vi.mocked(StorageManager.get).mockReturnValue({});
      
      await NotesManager.init();
      
      expect(mockIndexedDBManager.init).toHaveBeenCalled();
      expect(NotesManager.db).toBe(mockIndexedDBManager);
    });
  });

  describe('getAllNotes', () => {
    test('should return notes from IndexedDB in legacy format', async () => {
      const mockIndexedDBNotes = [
        {
          id: 1,
          alertId: '12345',
          content: 'Test note',
          tags: ['test'],
          category: 'test-type',
          timestamp: '2025-01-15T10:30:00.000Z'
        }
      ];
      
      mockIndexedDBManager.init.mockResolvedValue(true);
      mockIndexedDBManager.getAll.mockResolvedValue(mockIndexedDBNotes);
      
      const result = await NotesManager.getAllNotes();
      
      expect(result).toEqual({
        '12345': {
          note: 'Test note',
          tags: ['test'],
          alertType: 'test-type',
          timestamp: '2025-01-15T10:30:00.000Z'
        }
      });
    });
  });

  describe('saveNote', () => {
    test('should save new note to IndexedDB', async () => {
      mockIndexedDBManager.init.mockResolvedValue(true);
      mockIndexedDBManager.getAllByIndex.mockResolvedValue([]); // No existing note
      mockIndexedDBManager.add.mockResolvedValue(1);
      vi.mocked(TagManager.extractHashtagsFromText).mockReturnValue(['hashtag1']);
      vi.mocked(TagManager.mergeTags).mockReturnValue(['manual1', 'hashtag1']);
      vi.mocked(StorageManager.get).mockReturnValue({});
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = await NotesManager.saveNote('12345', 'Test note #hashtag1', ['manual1']);
      
      expect(mockIndexedDBManager.add).toHaveBeenCalledWith('notes', expect.objectContaining({
        alertId: '12345',
        content: 'Test note #hashtag1',
        tags: ['manual1', 'hashtag1'],
        category: 'test-alert-type'
      }));
      expect(result).toBe(true);
    });
  });

  describe('deleteNote', () => {
    test('should delete note from IndexedDB', async () => {
      const existingNote = { id: 1, alertId: '12345' };
      
      mockIndexedDBManager.init.mockResolvedValue(true);
      mockIndexedDBManager.getAllByIndex.mockResolvedValue([existingNote]);
      mockIndexedDBManager.delete.mockResolvedValue(true);
      vi.mocked(StorageManager.get).mockReturnValue({'12345': {}});
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = await NotesManager.deleteNote('12345');
      
      expect(mockIndexedDBManager.delete).toHaveBeenCalledWith('notes', 1);
      expect(result).toBe(true);
    });
  });
});
