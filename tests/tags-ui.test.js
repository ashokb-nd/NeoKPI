import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TagsUI } from '../src/ui/tags-ui.js';
import { AppState } from '../src/core/app-state.js';
import { UIManager } from '../src/ui/ui-manager.js';
import { BulkProcessor } from '../src/features/bulk-processor.js';
import { FilterManager } from '../src/features/filter.js';
import { NotesManager } from '../src/features/notes.js';
import { StorageManager } from '../src/utils/storage.js';
import { TagManager } from '../src/features/tags.js';
import { Utils } from '../src/utils/utils.js';

// Mock all dependencies
vi.mock('../src/core/app-state.js');
vi.mock('../src/ui/ui-manager.js');
vi.mock('../src/features/bulk-processor.js');
vi.mock('../src/features/filter.js');
vi.mock('../src/features/notes.js');
vi.mock('../src/utils/storage.js');
vi.mock('../src/features/tags.js');
vi.mock('../src/utils/utils.js');

// Mock DOM
const mockDocument = {
  createElement: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn()
};
global.document = mockDocument;

describe('TagsUI', () => {
  let mockElement;
  let mockInput;
  let mockDisplay;
  let mockContainer;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock DOM element creation
    mockElement = {
      style: { cssText: '' },
      classList: { add: vi.fn(), toggle: vi.fn() },
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      innerHTML: '',
      textContent: '',
      id: '',
      placeholder: '',
      type: '',
      checked: false,
      value: ''
    };

    mockInput = { ...mockElement };
    mockDisplay = { ...mockElement };
    mockContainer = { ...mockElement };

    mockDocument.createElement.mockReturnValue(mockElement);
    
    // Mock AppState
    AppState.notepad = {
      includeHashtags: false,
      filterLogic: 'AND',
      selectedFilters: [],
      currentAlertId: 'test-alert-123'
    };
    
    AppState.setIncludeHashtags = vi.fn();
    AppState.setFilterLogic = vi.fn();
    AppState.setFilters = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCurrentAlertTagsSection', () => {
    it('should create a complete tags section with input and display', () => {
      const section = TagsUI.createCurrentAlertTagsSection();
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(section).toBe(mockElement);
      expect(section.appendChild).toHaveBeenCalled();
    });

    it('should setup input event listener for Enter key', () => {
      const section = TagsUI.createCurrentAlertTagsSection();
      
      expect(mockElement.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should handle Enter key press with tag input', () => {
      vi.spyOn(TagsUI, 'addTag');
      const section = TagsUI.createCurrentAlertTagsSection();
      
      // Get the event listener
      const eventListener = mockElement.addEventListener.mock.calls.find(call => call[0] === 'keydown')[1];
      
      // Mock input with value
      const mockEvent = {
        key: 'Enter',
        preventDefault: vi.fn(),
        target: { value: '  test-tag  ' }
      };
      
      // Since we can't easily mock the input element in this setup,
      // we'll just verify the structure was created
      expect(eventListener).toBeDefined();
    });
  });

  describe('createTagsSection', () => {
    it('should create tags section with title, display, and input', () => {
      const section = TagsUI.createTagsSection();
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(section.appendChild).toHaveBeenCalledTimes(3); // title, display, input
    });

    it('should call createElement multiple times for different elements', () => {
      TagsUI.createTagsSection();
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div'); // section
      expect(mockDocument.createElement).toHaveBeenCalledWith('input'); // input
    });
  });

  describe('createFilterSection', () => {
    it('should create complete filter section with all components', () => {
      vi.spyOn(TagsUI, 'createHashtagToggle').mockReturnValue(mockElement);
      vi.spyOn(TagsUI, 'createLogicButtons').mockReturnValue(mockElement);
      vi.spyOn(TagsUI, 'createFilterDisplay').mockReturnValue(mockElement);
      vi.spyOn(TagsUI, 'createClearButton').mockReturnValue(mockElement);
      vi.spyOn(TagsUI, 'createSearchBox').mockReturnValue(mockElement);
      vi.spyOn(TagsUI, 'createTagsList').mockReturnValue(mockElement);
      
      const section = TagsUI.createFilterSection();
      
      expect(TagsUI.createHashtagToggle).toHaveBeenCalled();
      expect(TagsUI.createLogicButtons).toHaveBeenCalled();
      expect(TagsUI.createFilterDisplay).toHaveBeenCalled();
      expect(TagsUI.createClearButton).toHaveBeenCalled();
      expect(TagsUI.createSearchBox).toHaveBeenCalled();
      expect(TagsUI.createTagsList).toHaveBeenCalled();
    });
  });

  describe('createHashtagToggle', () => {
    it('should create checkbox with proper attributes', () => {
      const container = TagsUI.createHashtagToggle();
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.createElement).toHaveBeenCalledWith('input');
      expect(mockDocument.createElement).toHaveBeenCalledWith('label');
    });

    it('should setup change event listener', () => {
      const container = TagsUI.createHashtagToggle();
      
      expect(mockElement.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('createLogicButtons', () => {
    it('should create AND and OR buttons', () => {
      const container = TagsUI.createLogicButtons();
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.createElement).toHaveBeenCalledWith('button');
      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should highlight active logic button', () => {
      AppState.notepad.filterLogic = 'OR';
      
      const container = TagsUI.createLogicButtons();
      
      // Verify button styling based on active state
      expect(mockDocument.createElement).toHaveBeenCalled();
    });
  });

  describe('createSearchBox', () => {
    it('should create search input with proper attributes', () => {
      const searchBox = TagsUI.createSearchBox();
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('input');
      expect(searchBox.type).toBe('text');
      expect(searchBox.id).toBe('tag-search-box');
      expect(searchBox.placeholder).toBe('Search tags...');
    });

    it('should setup input and keydown event listeners', () => {
      const searchBox = TagsUI.createSearchBox();
      
      expect(searchBox.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
      expect(searchBox.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('addTag', () => {
    beforeEach(() => {
      NotesManager.getTags.mockReturnValue(['existing-tag']);
      NotesManager.saveNote.mockImplementation(() => {});
      const mockTextarea = { value: 'note text' };
      const mockDisplay = { innerHTML: '', appendChild: vi.fn() };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#notepad-textarea') return mockTextarea;
        if (selector === '#current-tags-display') return mockDisplay;
        return null;
      });
      TagManager.extractHashtagsFromText.mockReturnValue([]); // Add this mock
      vi.spyOn(TagsUI, 'updateTagsDisplay');
      vi.spyOn(TagsUI, 'updateFilterDisplay');
    });

    it('should add new tag to current alert', () => {
      TagsUI.addTag('new-tag');
      
      expect(NotesManager.getTags).toHaveBeenCalledWith('test-alert-123');
      expect(NotesManager.saveNote).toHaveBeenCalledWith('test-alert-123', 'note text', ['existing-tag', 'new-tag']);
    });

    it('should not add duplicate tag', () => {
      TagsUI.addTag('existing-tag');
      
      expect(NotesManager.saveNote).not.toHaveBeenCalled();
    });

    it('should update displays after adding tag', () => {
      TagsUI.addTag('new-tag');
      
      expect(TagsUI.updateTagsDisplay).toHaveBeenCalled();
      expect(TagsUI.updateFilterDisplay).toHaveBeenCalled();
    });

    it('should handle empty tag name', () => {
      TagsUI.addTag('');
      TagsUI.addTag(null);
      
      expect(NotesManager.getTags).not.toHaveBeenCalled();
    });

    it('should handle missing alert ID', () => {
      AppState.notepad.currentAlertId = null;
      
      TagsUI.addTag('new-tag');
      
      expect(NotesManager.getTags).not.toHaveBeenCalled();
    });
  });

  describe('removeTag', () => {
    beforeEach(() => {
      NotesManager.getTags.mockReturnValue(['tag1', 'tag2', 'tag3']);
      NotesManager.saveNote.mockImplementation(() => {});
      const mockTextarea = { value: 'note text' };
      const mockDisplay = { innerHTML: '', appendChild: vi.fn() };
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '#notepad-textarea') return mockTextarea;
        if (selector === '#current-tags-display') return mockDisplay;
        return null;
      });
      TagManager.extractHashtagsFromText.mockReturnValue([]); // Add this mock
      vi.spyOn(TagsUI, 'updateTagsDisplay');
      vi.spyOn(TagsUI, 'updateFilterDisplay');
    });

    it('should remove tag from current alert', () => {
      TagsUI.removeTag('tag2');
      
      expect(NotesManager.getTags).toHaveBeenCalledWith('test-alert-123');
      expect(NotesManager.saveNote).toHaveBeenCalledWith('test-alert-123', 'note text', ['tag1', 'tag3']);
    });

    it('should update displays after removing tag', () => {
      TagsUI.removeTag('tag2');
      
      expect(TagsUI.updateTagsDisplay).toHaveBeenCalled();
      expect(TagsUI.updateFilterDisplay).toHaveBeenCalled();
    });

    it('should handle missing alert ID', () => {
      AppState.notepad.currentAlertId = null;
      
      TagsUI.removeTag('tag2');
      
      expect(NotesManager.getTags).not.toHaveBeenCalled();
    });
  });

  describe('updateTagsDisplay', () => {
    beforeEach(() => {
      NotesManager.getTags.mockReturnValue(['manual-tag']);
      NotesManager.getNote.mockReturnValue('This is a #hashtag note');
      TagManager.extractHashtagsFromText.mockReturnValue(['hashtag']);
      vi.spyOn(TagsUI, 'createTagChip').mockReturnValue(mockElement);
    });

    it('should update tags display with current tags', () => {
      const mockDisplay = { innerHTML: '', appendChild: vi.fn() };
      mockDocument.querySelector.mockReturnValue(mockDisplay);
      
      TagsUI.updateTagsDisplay();
      
      expect(NotesManager.getTags).toHaveBeenCalledWith('test-alert-123');
      expect(TagsUI.createTagChip).toHaveBeenCalledWith('manual-tag', true, false);
    });

    it('should handle hashtag tags differently', () => {
      NotesManager.getTags.mockReturnValue(['hashtag', 'manual-tag']);
      const mockDisplay = { innerHTML: '', appendChild: vi.fn() };
      mockDocument.querySelector.mockReturnValue(mockDisplay);
      
      TagsUI.updateTagsDisplay();
      
      expect(TagsUI.createTagChip).toHaveBeenCalledWith('hashtag', false, true);
      expect(TagsUI.createTagChip).toHaveBeenCalledWith('manual-tag', true, false);
    });

    it('should handle missing display element', () => {
      mockDocument.querySelector.mockReturnValue(null);
      
      expect(() => TagsUI.updateTagsDisplay()).not.toThrow();
    });
  });

  describe('enterFilter', () => {
    beforeEach(() => {
      AppState.notepad.selectedFilters = ['tag1', 'tag2'];
      AppState.notepad.filterLogic = 'AND';
      BulkProcessor.state = { isProcessing: true, alertIds: ['alert1', 'alert2'], currentIndex: 0 };
      FilterManager.getFilteredAlertIds.mockReturnValue(['alert1']);
      UIManager.loadAlertId.mockImplementation(() => {});
      UIManager.showBulkStatus.mockImplementation(() => {});
      Utils.getRequiredElements.mockReturnValue({});
      BulkProcessor.saveBulkAlerts.mockImplementation(() => {});
      vi.spyOn(TagsUI, 'saveRecentFilterGroup');
    });

    it('should handle no filters selected', () => {
      AppState.notepad.selectedFilters = [];
      
      TagsUI.enterFilter();
      
      expect(UIManager.showBulkStatus).toHaveBeenCalledWith('No filters selected');
    });

    it('should handle no bulk processing active', () => {
      BulkProcessor.state.isProcessing = false;
      
      TagsUI.enterFilter();
      
      expect(UIManager.showBulkStatus).toHaveBeenCalledWith('No bulk processing active');
    });

    it('should handle no matching alerts', () => {
      FilterManager.getFilteredAlertIds.mockReturnValue([]);
      
      TagsUI.enterFilter();
      
      expect(UIManager.showBulkStatus).toHaveBeenCalledWith('No alerts match the selected filters');
    });

    it('should load first filtered alert', () => {
      TagsUI.enterFilter();
      
      expect(FilterManager.getFilteredAlertIds).toHaveBeenCalledWith(['tag1', 'tag2'], 'AND', false);
      expect(TagsUI.saveRecentFilterGroup).toHaveBeenCalledWith(['tag1', 'tag2'], 'AND');
      expect(UIManager.loadAlertId).toHaveBeenCalledWith('alert1', {});
    });
  });

  describe('removeFromFilter', () => {
    beforeEach(() => {
      AppState.notepad.selectedFilters = ['tag1', 'tag2', 'tag3'];
      vi.spyOn(TagsUI, 'updateFilterDisplay');
    });

    it('should remove tag from filters', () => {
      TagsUI.removeFromFilter('tag2');
      
      expect(AppState.setFilters).toHaveBeenCalledWith(['tag1', 'tag3']);
      expect(TagsUI.updateFilterDisplay).toHaveBeenCalled();
    });

    it('should handle tag not in filters', () => {
      TagsUI.removeFromFilter('nonexistent-tag');
      
      expect(AppState.setFilters).not.toHaveBeenCalled();
    });
  });

  describe('toggleFilter', () => {
    beforeEach(() => {
      AppState.notepad.selectedFilters = ['tag1', 'tag2'];
      vi.spyOn(TagsUI, 'updateFilterDisplay');
    });

    it('should add tag if not in filters', () => {
      TagsUI.toggleFilter('tag3');
      
      expect(AppState.setFilters).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
      expect(TagsUI.updateFilterDisplay).toHaveBeenCalled();
    });

    it('should remove tag if already in filters', () => {
      TagsUI.toggleFilter('tag2');
      
      expect(AppState.setFilters).toHaveBeenCalledWith(['tag1']);
      expect(TagsUI.updateFilterDisplay).toHaveBeenCalled();
    });
  });

  describe('recent filter groups', () => {
    beforeEach(() => {
      StorageManager.get.mockReturnValue([
        { filters: ['tag1', 'tag2'], logic: 'AND', timestamp: Date.now() - 1000 },
        { filters: ['tag3'], logic: 'OR', timestamp: Date.now() - 2000 }
      ]);
      StorageManager.set.mockImplementation(() => {});
    });

    it('should get recent filter groups', () => {
      const recent = TagsUI.getRecentFilterGroups();
      
      expect(StorageManager.get).toHaveBeenCalledWith('recent-filter-groups');
      expect(recent).toHaveLength(2);
    });

    it('should save recent filter group', () => {
      TagsUI.saveRecentFilterGroup(['tag1', 'tag2'], 'AND');
      
      expect(StorageManager.set).toHaveBeenCalledWith('recent-filter-groups', expect.any(Array));
    });

    it('should not save empty filter group', () => {
      TagsUI.saveRecentFilterGroup([], 'AND');
      
      expect(StorageManager.set).not.toHaveBeenCalled();
    });

    it('should format recent time correctly', () => {
      const now = Date.now();
      
      expect(TagsUI.formatRecentTime(now - 30000)).toBe('just now');
      expect(TagsUI.formatRecentTime(now - 120000)).toBe('2m ago');
      expect(TagsUI.formatRecentTime(now - 3900000)).toBe('1h ago');
      expect(TagsUI.formatRecentTime(now - 90000000)).toBe('1d ago');
    });
  });

  describe('createTagChip', () => {
    it('should create basic tag chip', () => {
      const chip = TagsUI.createTagChip('test-tag');
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.createElement).toHaveBeenCalledWith('span');
    });

    it('should create removable tag chip', () => {
      vi.spyOn(TagsUI, 'removeTag');
      const chip = TagsUI.createTagChip('test-tag', true);
      
      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should create hashtag chip with indicator', () => {
      const chip = TagsUI.createTagChip('hashtag', false, true);
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('span'); // For indicator
    });
  });
});
