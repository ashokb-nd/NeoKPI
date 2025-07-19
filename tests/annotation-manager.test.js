import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnnotationManager } from '../src/features/annotations/annotation-manager.js';
import { VideoAnnotationDrawer } from '../src/features/annotations/canvas-drawer.js';
import { Utils } from '../src/utils/utils.js';

// Mock Utils
vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    log: vi.fn(),
    getVideoElement: vi.fn()
  }
}));

// Mock VideoAnnotationDrawer
vi.mock('../src/features/annotations/canvas-drawer.js', () => {
  const createMockDrawer = () => ({
    loadAnnotations: vi.fn().mockResolvedValue(true),
    show: vi.fn(),
    hide: vi.fn(),
    clearAnnotations: vi.fn(),
    destroy: vi.fn(),
    isVisible: true,
    canvas: { style: {} }
  });

  return {
    VideoAnnotationDrawer: vi.fn().mockImplementation(createMockDrawer)
  };
});

describe('AnnotationManager', () => {
  let mockVideoElement;

  beforeEach(() => {
    // Create mock video element
    mockVideoElement = {
      src: 'test-video.mp4',
      currentTime: 0,
      duration: 100,
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0, top: 0, width: 640, height: 480
      })),
      parentElement: {
        style: {},
        appendChild: vi.fn(),
        querySelector: vi.fn()
      }
    };

    // Setup Utils mock to return the mockVideoElement
    Utils.getVideoElement.mockReturnValue(mockVideoElement);

    // Mock DOM methods
    global.document = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      querySelectorAll: vi.fn(() => [mockVideoElement]),
      querySelector: vi.fn(),
      createElement: vi.fn(() => ({
        style: {},
        getContext: vi.fn(() => ({})),
        addEventListener: vi.fn()
      }))
    };

    global.MutationObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }));

    global.ResizeObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }));

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    AnnotationManager.destroy();
  });

  describe('init', () => {
    test('should initialize successfully', async () => {
      await AnnotationManager.init();
      
      expect(global.MutationObserver).toHaveBeenCalled();
      expect(global.document.querySelectorAll).toHaveBeenCalledWith('video');
    });

    test('should enhance existing video elements', async () => {
      await AnnotationManager.init();
      
      expect(VideoAnnotationDrawer).toHaveBeenCalledWith(
        mockVideoElement,
        expect.objectContaining({
          autoResize: true,
          renderOnVideoTimeUpdate: true,
          debugMode: false
        })
      );
    });
  });

  describe('enhanceVideo', () => {
    test('should create drawer for new video element', () => {
      const drawer = AnnotationManager.enhanceVideo(mockVideoElement);
      
      expect(VideoAnnotationDrawer).toHaveBeenCalledWith(mockVideoElement, expect.any(Object));
      expect(AnnotationManager.drawers.has(mockVideoElement)).toBe(true);
      expect(drawer).toBeDefined();
    });

    test('should return existing drawer for already enhanced video', () => {
      const drawer1 = AnnotationManager.enhanceVideo(mockVideoElement);
      const drawer2 = AnnotationManager.enhanceVideo(mockVideoElement);
      
      expect(drawer1).toBe(drawer2);
      expect(VideoAnnotationDrawer).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadAnnotationsForAlert', () => {
    test('should handle missing annotations gracefully', async () => {
      // Mock the method directly
      AnnotationManager.getAnnotationsFromMetadata = vi.fn().mockResolvedValue(null);
      
      const result = await AnnotationManager.loadAnnotationsForAlert('test-alert');
      
      expect(result).toBe(false);
    });

    test('should load annotations when available', async () => {
      const mockAnnotations = { annotations: [] };
      AnnotationManager.getAnnotationsFromMetadata = vi.fn().mockResolvedValue(mockAnnotations);
      
      const result = await AnnotationManager.loadAnnotationsForAlert('test-alert');
      
      expect(result).toBe(true);
    });
  });

  describe('clearAnnotations', () => {
    test('should clear annotations from all drawers', () => {
      const mockDrawer = { 
        clearAnnotations: vi.fn(), 
        destroy: vi.fn(), 
        hide: vi.fn(), 
        show: vi.fn() 
      };
      AnnotationManager.drawers.set(mockVideoElement, mockDrawer);
      
      AnnotationManager.clearAnnotations();
      
      expect(mockDrawer.clearAnnotations).toHaveBeenCalled();
    });
  });

  describe('hideAnnotations', () => {
    test('should hide all drawers', () => {
      const mockDrawer = { 
        hide: vi.fn(), 
        destroy: vi.fn(), 
        clearAnnotations: vi.fn(), 
        show: vi.fn() 
      };
      AnnotationManager.drawers.set(mockVideoElement, mockDrawer);
      
      AnnotationManager.hideAnnotations();
      
      expect(mockDrawer.hide).toHaveBeenCalled();
    });
  });

  describe('showAnnotations', () => {
    test('should show all drawers', () => {
      const mockDrawer = { 
        show: vi.fn(), 
        destroy: vi.fn(), 
        hide: vi.fn(), 
        clearAnnotations: vi.fn() 
      };
      AnnotationManager.drawers.set(mockVideoElement, mockDrawer);
      
      AnnotationManager.showAnnotations();
      
      expect(mockDrawer.show).toHaveBeenCalled();
    });
  });

  describe('getDrawerForVideo', () => {
    test('should return correct drawer for video element', () => {
      const mockDrawer = { 
        test: 'drawer', 
        destroy: vi.fn(), 
        hide: vi.fn(), 
        show: vi.fn(), 
        clearAnnotations: vi.fn() 
      };
      AnnotationManager.drawers.set(mockVideoElement, mockDrawer);
      
      const result = AnnotationManager.getDrawerForVideo(mockVideoElement);
      
      expect(result).toBe(mockDrawer);
    });

    test('should return undefined for non-enhanced video', () => {
      const result = AnnotationManager.getDrawerForVideo(mockVideoElement);
      
      expect(result).toBeUndefined();
    });
  });

  describe('destroy', () => {
    test('should destroy all drawers and clear map', () => {
      const mockDrawer = { destroy: vi.fn() };
      AnnotationManager.drawers.set(mockVideoElement, mockDrawer);
      
      AnnotationManager.destroy();
      
      expect(mockDrawer.destroy).toHaveBeenCalled();
      expect(AnnotationManager.drawers.size).toBe(0);
    });
  });
});
