import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotesManager } from '../src/managers/notes.js';
import { StorageManager } from '../src/utils/storage.js';
import { TagManager } from '../src/managers/tags.js';

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
    getCurrentAlertType: vi.fn(() => 'test-alert-type')
  }
}));

vi.mock('../src/utils/storage.js', () => ({
  StorageManager: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('../src/managers/tags.js', () => ({
  TagManager: {
    extractHashtagsFromText: vi.fn(() => []),
    mergeTags: vi.fn((manual, hashtag) => [...(manual || []), ...(hashtag || [])])
  }
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
    
    // Setup default date mock
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('getAllNotes', () => {
    test('should return notes from storage', () => {
      const mockNotes = {
        '12345': { note: 'Test note', tags: ['test'] }
      };
      
      vi.mocked(StorageManager.get).mockReturnValue(mockNotes);
      
      const result = NotesManager.getAllNotes();
      
      expect(StorageManager.get).toHaveBeenCalledWith('alert-debug-notes');
      expect(result).toEqual(mockNotes);
    });

    test('should return empty object when no notes exist', () => {
      vi.mocked(StorageManager.get).mockReturnValue(null);
      
      const result = NotesManager.getAllNotes();
      
      expect(result).toEqual({});
    });
  });

  describe('getNote', () => {
    test('should return note content for existing alert', () => {
      const mockNotes = {
        '12345': { note: 'Test note', tags: ['test'] }
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(mockNotes);
      
      const result = NotesManager.getNote('12345');
      
      expect(result).toBe('Test note');
    });

    test('should return empty string for non-existent alert', () => {
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue({});
      
      const result = NotesManager.getNote('99999');
      
      expect(result).toBe('');
    });

    test('should handle legacy string format', () => {
      const mockNotes = {
        '12345': 'Legacy note format'
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(mockNotes);
      
      const result = NotesManager.getNote('12345');
      
      expect(result).toBe('Legacy note format');
    });
  });

  describe('getTags', () => {
    test('should return tags for existing alert', () => {
      const mockNotes = {
        '12345': { note: 'Test note', tags: ['tag1', 'tag2'] }
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(mockNotes);
      
      const result = NotesManager.getTags('12345');
      
      expect(result).toEqual(['tag1', 'tag2']);
    });

    test('should return empty array for non-existent alert', () => {
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue({});
      
      const result = NotesManager.getTags('99999');
      
      expect(result).toEqual([]);
    });

    test('should return empty array for legacy string format', () => {
      const mockNotes = {
        '12345': 'Legacy note format'
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(mockNotes);
      
      const result = NotesManager.getTags('12345');
      
      expect(result).toEqual([]);
    });

    test('should handle missing tags property', () => {
      const mockNotes = {
        '12345': { note: 'Test note' }
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(mockNotes);
      
      const result = NotesManager.getTags('12345');
      
      expect(result).toEqual([]);
    });
  });

  describe('saveNote', () => {
    test('should save note with tags successfully', () => {
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue({});
      vi.mocked(TagManager.extractHashtagsFromText).mockReturnValue(['hashtag1']);
      vi.mocked(TagManager.mergeTags).mockReturnValue(['manual1', 'hashtag1']);
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = NotesManager.saveNote('12345', 'Test note #hashtag1', ['manual1']);
      
      expect(TagManager.extractHashtagsFromText).toHaveBeenCalledWith('Test note #hashtag1');
      expect(TagManager.mergeTags).toHaveBeenCalledWith(['manual1'], ['hashtag1']);
      expect(StorageManager.set).toHaveBeenCalledWith('alert-debug-notes', {
        '12345': {
          note: 'Test note #hashtag1',
          tags: ['manual1', 'hashtag1'],
          alertType: 'test-alert-type',
          timestamp: expect.any(String)
        }
      });
      expect(result).toBe(true);
    });

    test('should not save empty note without tags', () => {
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue({});
      vi.mocked(TagManager.extractHashtagsFromText).mockReturnValue([]);
      vi.mocked(TagManager.mergeTags).mockReturnValue([]);
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = NotesManager.saveNote('12345', '   ', []);
      
      expect(StorageManager.set).toHaveBeenCalledWith('alert-debug-notes', {});
      expect(result).toBe(true);
    });

    test('should return false for empty alert ID', () => {
      const result = NotesManager.saveNote('', 'Test note');
      
      expect(result).toBe(false);
    });

    test('should delete note when saving empty content and no tags', () => {
      const existingNotes = {
        '12345': { note: 'Existing note', tags: [] },
        '67890': { note: 'Other note', tags: [] }
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(existingNotes);
      vi.mocked(TagManager.extractHashtagsFromText).mockReturnValue([]);
      vi.mocked(TagManager.mergeTags).mockReturnValue([]);
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = NotesManager.saveNote('12345', '', []);
      
      expect(StorageManager.set).toHaveBeenCalledWith('alert-debug-notes', {
        '67890': { note: 'Other note', tags: [] }
      });
      expect(result).toBe(true);
    });
  });

  describe('deleteNote', () => {
    test('should delete note successfully', () => {
      const existingNotes = {
        '12345': { note: 'Test note', tags: [] },
        '67890': { note: 'Other note', tags: [] }
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(existingNotes);
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const result = NotesManager.deleteNote('12345');
      
      expect(StorageManager.set).toHaveBeenCalledWith('alert-debug-notes', {
        '67890': { note: 'Other note', tags: [] }
      });
      expect(result).toBe(true);
    });

    test('should return false for empty alert ID', () => {
      const result = NotesManager.deleteNote('');
      
      expect(result).toBe(false);
    });
  });

  describe('clearAllNotes', () => {
    test('should clear all notes', () => {
      vi.mocked(StorageManager.remove).mockReturnValue(true);
      
      const result = NotesManager.clearAllNotes();
      
      expect(StorageManager.remove).toHaveBeenCalledWith('alert-debug-notes');
      expect(result).toBe(true);
    });
  });

  describe('exportToCsv', () => {
    test('should export notes to CSV', () => {
      const mockNotes = {
        '12345': {
          note: 'Test note',
          tags: ['tag1', 'tag2'],
          alertType: 'security',
          timestamp: '2025-01-15T10:30:00.000Z'
        }
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(mockNotes);
      vi.spyOn(NotesManager, 'generateCsvContent').mockReturnValue('csv,content');
      vi.spyOn(NotesManager, 'downloadCsv').mockImplementation(() => {});
      
      NotesManager.exportToCsv();
      
      expect(NotesManager.generateCsvContent).toHaveBeenCalledWith([
        ['12345', mockNotes['12345']]
      ]);
      expect(NotesManager.downloadCsv).toHaveBeenCalledWith('csv,content');
    });

    test('should alert when no notes to export', () => {
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue({});
      
      NotesManager.exportToCsv();
      
      expect(global.alert).toHaveBeenCalledWith('No notes to export');
    });
  });

  describe('generateCsvContent', () => {
    test('should generate correct CSV content', () => {
      const entries = [
        ['12345', {
          note: 'Test note',
          tags: ['tag1', 'tag2'],
          alertType: 'security',
          timestamp: '2025-01-15T10:30:00.000Z'
        }]
      ];
      
      const result = NotesManager.generateCsvContent(entries);
      
      const expectedCsv = [
        '"Alert ID","Alert Type","Notes","Tags","Timestamp"',
        '"12345","security","Test note","tag1, tag2","2025-01-15T10:30:00.000Z"'
      ].join('\n');
      
      expect(result).toBe(expectedCsv);
    });

    test('should handle legacy string format', () => {
      const entries = [
        ['12345', 'Legacy note']
      ];
      
      const result = NotesManager.generateCsvContent(entries);
      
      const expectedCsv = [
        '"Alert ID","Alert Type","Notes","Tags","Timestamp"',
        '"12345","unknown","Legacy note","",""'
      ].join('\n');
      
      expect(result).toBe(expectedCsv);
    });

    test('should escape quotes in CSV content', () => {
      const entries = [
        ['12345', {
          note: 'Note with "quotes"',
          tags: [],
          alertType: 'test',
          timestamp: '2025-01-15T10:30:00.000Z'
        }]
      ];
      
      const result = NotesManager.generateCsvContent(entries);
      
      expect(result).toContain('"Note with ""quotes"""');
    });
  });

  describe('downloadCsv', () => {
    test('should create download link and trigger download', () => {
      const mockLink = {
        setAttribute: vi.fn(),
        style: { visibility: '' },
        click: vi.fn()
      };
      
      global.document.createElement.mockReturnValue(mockLink);
      
      NotesManager.downloadCsv('test,csv,content');
      
      expect(global.Blob).toHaveBeenCalledWith(['test,csv,content'], { type: 'text/csv;charset=utf-8;' });
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'alert-debug-notes-2025-01-15.csv');
      expect(mockLink.style.visibility).toBe('hidden');
      expect(global.document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalledWith(mockLink);
    });
  });

  describe('importFromCsv', () => {
    test('should import valid CSV content', () => {
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue({});
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const csvContent = [
        'Alert ID,Alert Type,Notes,Tags,Timestamp',
        '12345,security,"Test note","tag1, tag2",2025-01-15T10:30:00.000Z',
        '67890,warning,"Another note","tag3",2025-01-15T11:30:00.000Z'
      ].join('\n');
      
      const result = NotesManager.importFromCsv(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.alertIds).toEqual(['12345', '67890']);
      
      expect(StorageManager.set).toHaveBeenCalledWith('alert-debug-notes', {
        '12345': {
          note: 'Test note',
          tags: ['tag1', 'tag2'],
          alertType: 'security',
          timestamp: '2025-01-15T10:30:00.000Z'
        },
        '67890': {
          note: 'Another note',
          tags: ['tag3'],
          alertType: 'warning',
          timestamp: '2025-01-15T11:30:00.000Z'
        }
      });
    });

    test('should handle CSV without Alert ID column', () => {
      const csvContent = [
        'Type,Notes,Tags',
        'security,Test note,tag1'
      ].join('\n');
      
      const result = NotesManager.importFromCsv(csvContent);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Import failed: CSV must contain an "Alert ID" column');
    });

    test('should handle empty CSV', () => {
      const result = NotesManager.importFromCsv('');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Import failed: CSV file must contain at least a header and one data row');
    });

    test('should handle CSV with only headers', () => {
      const csvContent = 'Alert ID,Notes';
      
      const result = NotesManager.importFromCsv(csvContent);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Import failed: CSV file must contain at least a header and one data row');
    });

    test('should update existing notes', () => {
      const existingNotes = {
        '12345': {
          note: 'Old note',
          tags: ['old'],
          alertType: 'old-type',
          timestamp: '2025-01-14T10:30:00.000Z'
        }
      };
      
      vi.spyOn(NotesManager, 'getAllNotes').mockReturnValue(existingNotes);
      vi.mocked(StorageManager.set).mockReturnValue(true);
      
      const csvContent = [
        'Alert ID,Notes,Tags',
        '12345,"Updated note","new-tag"'
      ].join('\n');
      
      const result = NotesManager.importFromCsv(csvContent);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.updated).toBe(1);
    });
  });
});
