import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Utils } from '../src/utils/utils.js';

// Mock DOM elements for testing
const createMockElement = (id, value = '') => ({
  id,
  value,
  querySelector: vi.fn(),
  textContent: '',
  style: {},
  addEventListener: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn()
});

describe('Utils Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log method', () => {
    test('should log messages with UserScript prefix', () => {
      Utils.log('test message');
      expect(console.log).toHaveBeenCalledWith('[UserScript] test message');
    });
  });

  describe('getRequiredElements method', () => {
    test('should return elements when they exist', () => {
      const mockInput = createMockElement('alert-debug-user-input', 'test-alert-id');
      const mockButton = createMockElement('debug-alert-id-submit');
      const mockDropdown = createMockElement('alert-debug-user-input-type');

      document.querySelector
        .mockReturnValueOnce(mockInput)
        .mockReturnValueOnce(mockButton)
        .mockReturnValueOnce(mockDropdown);

      const elements = Utils.getRequiredElements();

      expect(elements.input).toBe(mockInput);
      expect(elements.button).toBe(mockButton);
      expect(elements.typeDropdown).toBe(mockDropdown);
      expect(document.querySelector).toHaveBeenCalledTimes(3);
    });

    test('should return null elements when they do not exist', () => {
      document.querySelector.mockReturnValue(null);

      const elements = Utils.getRequiredElements();

      expect(elements.input).toBeNull();
      expect(elements.button).toBeNull();
      expect(elements.typeDropdown).toBeNull();
    });
  });

  describe('getVideoElement method', () => {
    test('should return video element when container exists', () => {
      const mockVideo = createMockElement('video');
      const mockContainer = {
        querySelector: vi.fn().mockReturnValue(mockVideo)
      };

      document.querySelector.mockReturnValue(mockContainer);

      const video = Utils.getVideoElement();

      expect(video).toBe(mockVideo);
      expect(document.querySelector).toHaveBeenCalledWith('#debug-exp-box-1-video');
      expect(mockContainer.querySelector).toHaveBeenCalledWith('video');
    });

    test('should return null when container does not exist', () => {
      document.querySelector.mockReturnValue(null);

      const video = Utils.getVideoElement();

      expect(video).toBeNull();
    });

    test('should return null when video element does not exist', () => {
      const mockContainer = {
        querySelector: vi.fn().mockReturnValue(null)
      };

      document.querySelector.mockReturnValue(mockContainer);

      const video = Utils.getVideoElement();

      expect(video).toBeNull();
    });
  });

  describe('isInputFocused method', () => {
    test('should return true when input is focused', () => {
      const mockInput = createMockElement('test-input');
      document.activeElement = mockInput;

      const result = Utils.isInputFocused(mockInput);

      expect(result).toBe(true);
    });

    test('should return false when input is not focused', () => {
      const mockInput = createMockElement('test-input');
      const mockOtherElement = createMockElement('other-element');
      document.activeElement = mockOtherElement;

      const result = Utils.isInputFocused(mockInput);

      expect(result).toBe(false);
    });
  });

  describe('isBodyFocused method', () => {
    test('should return true when body is focused', () => {
      document.activeElement = document.body;

      const result = Utils.isBodyFocused();

      expect(result).toBe(true);
    });

    test('should return false when body is not focused', () => {
      const mockElement = createMockElement('test-element');
      document.activeElement = mockElement;

      const result = Utils.isBodyFocused();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentVideoTimestamp method', () => {
    test('should return formatted timestamp when video exists and has currentTime', () => {
      const mockVideo = {
        currentTime: 125.5 // 2 minutes and 5.5 seconds
      };

      Utils.getVideoElement = vi.fn().mockReturnValue(mockVideo);

      const timestamp = Utils.getCurrentVideoTimestamp();

      expect(timestamp).toBe('[2:05]');
    });

    test('should return null when video does not exist', () => {
      Utils.getVideoElement = vi.fn().mockReturnValue(null);

      const timestamp = Utils.getCurrentVideoTimestamp();

      expect(timestamp).toBeNull();
    });

    test('should return null when video currentTime is NaN', () => {
      const mockVideo = {
        currentTime: NaN
      };

      Utils.getVideoElement = vi.fn().mockReturnValue(mockVideo);

      const timestamp = Utils.getCurrentVideoTimestamp();

      expect(timestamp).toBeNull();
    });
  });

  describe('processTimestampReplacements method', () => {
    test('should replace @ symbols with video timestamp', () => {
      Utils.getCurrentVideoTimestamp = vi.fn().mockReturnValue('[2:30]');

      const result = Utils.processTimestampReplacements('Note @ timestamp @');

      expect(result).toBe('Note [2:30] timestamp [2:30]');
    });

    test('should return original text when no video timestamp available', () => {
      Utils.getCurrentVideoTimestamp = vi.fn().mockReturnValue(null);

      const result = Utils.processTimestampReplacements('Note @ timestamp @');

      expect(result).toBe('Note @ timestamp @');
    });

    test('should handle text without @ symbols', () => {
      Utils.getCurrentVideoTimestamp = vi.fn().mockReturnValue('[2:30]');

      const result = Utils.processTimestampReplacements('Note without timestamps');

      expect(result).toBe('Note without timestamps');
    });
  });

  describe('formatTime method', () => {
    test('should format time correctly', () => {
      expect(Utils.formatTime(0)).toBe('0:00');
      expect(Utils.formatTime(5)).toBe('0:05');
      expect(Utils.formatTime(65)).toBe('1:05');
      expect(Utils.formatTime(125)).toBe('2:05');
      expect(Utils.formatTime(3661)).toBe('61:01');
    });

    test('should handle NaN input', () => {
      expect(Utils.formatTime(NaN)).toBe('0:00');
    });

    test('should handle negative input', () => {
      expect(Utils.formatTime(-10)).toBe('0:00');
    });
  });

  describe('createButton method', () => {
    test('should create button with correct properties', () => {
      const mockButton = {
        textContent: '',
        style: {
          cssText: ''
        },
        addEventListener: vi.fn()
      };

      document.createElement.mockReturnValue(mockButton);

      const action = vi.fn();
      const button = Utils.createButton('Test Button', '#ff0000', action);

      expect(document.createElement).toHaveBeenCalledWith('button');
      expect(button.textContent).toBe('Test Button');
      expect(button.style.cssText).toContain('#ff0000');
      expect(button.addEventListener).toHaveBeenCalledWith('click', action);
    });
  });

  describe('debounce method', () => {
    test('should debounce function calls', (done) => {
      const mockFn = vi.fn();
      const debouncedFn = Utils.debounce(mockFn, 100);

      // Call function multiple times quickly
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      // Function should not be called immediately
      expect(mockFn).not.toHaveBeenCalled();

      // Wait for debounce delay
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('arg3');
        done();
      }, 150);
    });
  });

  describe('waitForElements method', () => {
    test('should call callback when elements are found', (done) => {
      const callback = vi.fn();
      const mockElements = {
        input: createMockElement('input'),
        button: createMockElement('button'),
        typeDropdown: createMockElement('dropdown')
      };

      // Mock getRequiredElements to return elements after first call
      let callCount = 0;
      Utils.getRequiredElements = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return { input: null, button: null, typeDropdown: null };
        }
        return mockElements;
      });

      Utils.waitForElements(callback);

      setTimeout(() => {
        expect(callback).toHaveBeenCalledWith(mockElements);
        done();
      }, 400); // Wait longer than the interval
    });
  });
});
