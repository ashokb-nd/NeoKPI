import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeyboardManager } from '../src/core/keyboard-manager.js';

// Mock dependencies
vi.mock('../src/config/constants.js', () => ({
  CONFIG: {
    KEYS: {
      FOCUS_INPUT: 'i',
      SUBMIT: 'Enter',
      NEXT_ALERT: 'ArrowDown',
      PREV_ALERT: 'ArrowUp',
      BULK_PROCESS: 'b',
      TOGGLE_NOTEPAD: 'j',
      PLAY_PAUSE: 'Space',
      REWIND: 'ArrowLeft',
      FAST_FORWARD: 'ArrowRight'
    },
    TIMING: {
      VIDEO_SEEK_SECONDS: 5
    }
  }
}));

vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    isInputFocused: vi.fn(),
    isBodyFocused: vi.fn(),
    getVideoElement: vi.fn(),
    log: vi.fn(),
    debounce: vi.fn((fn) => fn)
  }
}));

// Import mocked modules
import { Utils } from '../src/utils/utils.js';

vi.mock('../src/features/bulk-processor.js', () => ({
  BulkProcessor: {
    parseAlertIds: vi.fn(),
    loadAlertIds: vi.fn(),
    state: { isProcessing: false },
    nextAlert: vi.fn(),
    prevAlert: vi.fn(),
    nextFilteredAlert: vi.fn(),
    prevFilteredAlert: vi.fn(),
    getCurrentAlert: vi.fn(),
    getProgress: vi.fn(),
    clearBulkAlerts: vi.fn()
  }
}));

vi.mock('../src/ui/ui-manager.js', () => ({
  UIManager: {
    showBulkStatus: vi.fn(),
    loadAlertId: vi.fn()
  },
  NotepadUI: {
    toggle: vi.fn(),
    updateContent: vi.fn()
  }
}));

vi.mock('../src/ui/modal-manager.js', () => ({
  ModalManager: {
    showBulkDialog: vi.fn()
  }
}));

vi.mock('../src/core/app-state.js', () => ({
  AppState: {
    notepad: {
      isOpen: false,
      selectedFilters: [],
      filterLogic: 'AND'
    },
    setCurrentAlert: vi.fn()
  }
}));

vi.mock('../src/features/filter.js', () => ({
  FilterManager: {
    getFilteredAlertIds: vi.fn(),
    isFilterActive: vi.fn()
  }
}));

// Import mocked modules
import { Utils } from '../src/utils/utils.js';
import { BulkProcessor } from '../src/features/bulk-processor.js';
import { UIManager, NotepadUI } from '../src/ui/ui-manager.js';
import { ModalManager } from '../src/ui/modal-manager.js';
import { FilterManager } from '../src/features/filter.js';
import { AppState } from '../src/core/app-state.js';

describe('KeyboardManager', () => {
  let mockElements;

  beforeEach(() => {
    mockElements = {
      input: {
        focus: vi.fn(),
        blur: vi.fn(),
        value: '123'
      },
      button: {
        click: vi.fn()
      }
    };
    vi.clearAllMocks();
  });

  describe('handlers.focusInput', () => {
    it('should focus input when correct key combination is pressed', () => {
      Utils.isInputFocused.mockReturnValue(false);
      
      const event = {
        key: 'i',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.focusInput(event, mockElements);
      
      expect(result).toBe(true);
      expect(mockElements.input.focus).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not focus input when already focused', () => {
      Utils.isInputFocused.mockReturnValue(true);
      
      const event = {
        key: 'i',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.focusInput(event, mockElements);
      
      expect(result).toBe(false);
      expect(mockElements.input.focus).not.toHaveBeenCalled();
    });
  });

  describe('handlers.submitForm', () => {
    it('should submit form when Enter is pressed in input', () => {
      
      
      
      
      Utils.isInputFocused.mockReturnValue(true);
      BulkProcessor.parseAlertIds.mockReturnValue(['123']); // Single alert
      AppState.notepad.isOpen = true;
      
      const event = {
        key: 'Enter',
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.submitForm(event, mockElements);
      
      expect(result).toBe(true);
      expect(mockElements.button.click).toHaveBeenCalled();
      expect(mockElements.input.blur).toHaveBeenCalled();
      expect(AppState.setCurrentAlert).toHaveBeenCalledWith('123');
    });

    it('should handle bulk alerts input', () => {
      
      
      
      
      Utils.isInputFocused.mockReturnValue(true);
      BulkProcessor.parseAlertIds.mockReturnValue(['123', '456', '789']); // Multiple alerts
      BulkProcessor.loadAlertIds.mockReturnValue(2); // Return count
      
      const event = {
        key: 'Enter',
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.submitForm(event, mockElements);
      
      expect(result).toBe(true);
      expect(BulkProcessor.loadAlertIds).toHaveBeenCalledWith('123');
      expect(UIManager.showBulkStatus).toHaveBeenCalledWith('Bulk mode: 2 alerts loaded. Press ↓ to start');
    });
  });

  describe('handlers.bulkProcessing', () => {
    it('should handle next alert in bulk mode', () => {
      
      
      
      BulkProcessor.state.isProcessing = true;
      BulkProcessor.nextAlert.mockReturnValue('456');
      BulkProcessor.getProgress.mockReturnValue('[1/2]');
      
      const event = {
        code: 'ArrowDown',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.bulkProcessing(event, mockElements);
      
      expect(result).toBe(true);
      expect(BulkProcessor.nextAlert).toHaveBeenCalled();
      expect(UIManager.loadAlertId).toHaveBeenCalledWith('456', mockElements);
      expect(UIManager.showBulkStatus).toHaveBeenCalledWith('[1/2] 456');
    });

    it('should handle previous alert in bulk mode', () => {
      
      
      
      BulkProcessor.state.isProcessing = true;
      BulkProcessor.prevAlert.mockReturnValue('123');
      BulkProcessor.getProgress.mockReturnValue('[1/2]');
      
      const event = {
        code: 'ArrowUp',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.bulkProcessing(event, mockElements);
      
      expect(result).toBe(true);
      expect(BulkProcessor.prevAlert).toHaveBeenCalled();
      expect(UIManager.loadAlertId).toHaveBeenCalledWith('123', mockElements);
    });

    it('should return false when not in bulk processing mode', () => {
      
      
      BulkProcessor.state.isProcessing = false;
      
      const event = {
        code: 'ArrowDown',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.bulkProcessing(event, mockElements);
      
      expect(result).toBe(false);
    });
  });

  describe('handlers.toggleBulkMode', () => {
    it('should show bulk dialog when not in bulk mode', () => {
      
      
      
      BulkProcessor.state.isProcessing = false;
      
      const event = {
        key: 'b',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.toggleBulkMode(event);
      
      expect(result).toBe(true);
      expect(ModalManager.showBulkDialog).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should exit bulk mode when in bulk mode and confirmed', () => {
      
      
      
      BulkProcessor.state.isProcessing = true;
      window.confirm = vi.fn(() => true);
      
      const event = {
        key: 'b',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.toggleBulkMode(event);
      
      expect(result).toBe(true);
      expect(BulkProcessor.clearBulkAlerts).toHaveBeenCalled();
      expect(UIManager.showBulkStatus).toHaveBeenCalledWith('Bulk mode disabled');
    });
  });

  describe('handlers.toggleNotepad', () => {
    it('should toggle notepad when correct key is pressed', () => {
      
      
      const event = {
        key: 'j',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.toggleNotepad(event);
      
      expect(result).toBe(true);
      expect(NotepadUI.toggle).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('handlers.videoControls', () => {
    it('should play/pause video when space is pressed', () => {
      
      const mockVideo = {
        paused: true,
        muted: false,
        play: vi.fn().mockResolvedValue(undefined)
      };
      
      Utils.isBodyFocused.mockReturnValue(true);
      Utils.getVideoElement.mockReturnValue(mockVideo);
      
      const event = {
        code: 'Space',
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.videoControls(event);
      
      expect(result).toBe(true);
      expect(mockVideo.muted).toBe(true);
      expect(mockVideo.play).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should rewind video when left arrow is pressed', () => {
      
      const mockVideo = {
        currentTime: 10,
        duration: 100
      };
      
      Utils.isBodyFocused.mockReturnValue(true);
      Utils.getVideoElement.mockReturnValue(mockVideo);
      
      const event = {
        code: 'ArrowLeft',
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.videoControls(event);
      
      expect(result).toBe(true);
      expect(mockVideo.currentTime).toBe(5); // 10 - 5 seconds
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should fast forward video when right arrow is pressed', () => {
      
      const mockVideo = {
        currentTime: 10,
        duration: 100
      };
      
      Utils.isBodyFocused.mockReturnValue(true);
      Utils.getVideoElement.mockReturnValue(mockVideo);
      
      const event = {
        code: 'ArrowRight',
        preventDefault: vi.fn()
      };
      
      const result = KeyboardManager.handlers.videoControls(event);
      
      expect(result).toBe(true);
      expect(mockVideo.currentTime).toBe(15); // 10 + 5 seconds
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('handlers.focusBody', () => {
    it('should blur active element and focus body on Escape', () => {
      const mockActiveElement = {
        blur: vi.fn()
      };
      
      document.activeElement = mockActiveElement;
      document.body.focus = vi.fn();
      
      const event = {
        key: 'Escape'
      };
      
      const result = KeyboardManager.handlers.focusBody(event);
      
      expect(result).toBe(true);
      expect(mockActiveElement.blur).toHaveBeenCalled();
      expect(document.body.focus).toHaveBeenCalled();
    });
  });

  describe('getFilteredProgress', () => {
    it('should return filtered progress when filters are applied', () => {
      
      
      
      FilterManager.getFilteredAlertIds.mockReturnValue(['123', '456', '789']);
      BulkProcessor.getCurrentAlert.mockReturnValue('456');
      
      const result = KeyboardManager.getFilteredProgress(['test'], 'AND');
      
      expect(result).toBe('[2/3] filtered by "test"');
    });

    it('should return regular progress when alert not in filtered results', () => {
      
      
      
      FilterManager.getFilteredAlertIds.mockReturnValue(['456', '789']);
      BulkProcessor.getCurrentAlert.mockReturnValue('123');
      BulkProcessor.getProgress.mockReturnValue('[1/3]');
      
      const result = KeyboardManager.getFilteredProgress(['test'], 'AND');
      
      expect(result).toBe('[1/3]');
    });
  });

  describe('handleKeydown', () => {
    it('should call handlers in correct order', () => {
      const mockEvent = {
        key: 'Escape'
      };
      
      // Mock document.activeElement
      const mockActiveElement = {
        blur: vi.fn()
      };
      document.activeElement = mockActiveElement;
      document.body.focus = vi.fn();
      
      KeyboardManager.handleKeydown(mockEvent, mockElements);
      
      // Should call focusBody handler first and return true, stopping other handlers
      expect(mockActiveElement.blur).toHaveBeenCalled();
      expect(document.body.focus).toHaveBeenCalled();
    });

    it('should continue to next handler if current handler returns false', () => {
      
      
      
      Utils.isInputFocused.mockReturnValue(false);
      
      const mockEvent = {
        key: 'j',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };
      
      KeyboardManager.handleKeydown(mockEvent, mockElements);
      
      // Should skip focusBody, focusInput, submitForm, bulkProcessing, toggleBulkMode
      // and reach toggleNotepad
      expect(NotepadUI.toggle).toHaveBeenCalled();
    });
  });
});
