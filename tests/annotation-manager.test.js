import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { AnnotationManager } from "../src/features/annotations/annotation-manager.js";
import { VideoAnnotator } from "../src/features/annotations/video-annotator.js";
import { Utils } from "../src/utils/utils.js";

// Mock Utils
vi.mock("../src/utils/utils.js", () => ({
  Utils: {
    log: vi.fn(),
    getVideoElement: vi.fn(),
  },
}));

// Mock VideoAnnotator
vi.mock("../src/features/annotations/video-annotator.js", () => {
  const createMockAnnotator = () => ({
    loadManifest: vi.fn().mockReturnValue(true),
    show: vi.fn(),
    hide: vi.fn(),
    clearAnnotations: vi.fn(),
    destroy: vi.fn(),
    isVisible: true,
    canvas: { style: {} },
  });

  return {
    VideoAnnotator: vi.fn().mockImplementation(createMockAnnotator),
  };
});

describe("AnnotationManager", () => {
  let mockVideoElement;

  beforeEach(() => {
    // Create mock video element
    mockVideoElement = {
      src: "test-video.mp4",
      currentTime: 0,
      duration: 100,
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 640,
        height: 480,
      })),
      parentElement: {
        style: {},
        appendChild: vi.fn(),
        querySelector: vi.fn(),
      },
    };

    // Setup Utils mock to return the mockVideoElement
    Utils.getVideoElement.mockReturnValue(mockVideoElement);

    // Mock DOM methods
    global.document = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      querySelectorAll: vi.fn(() => [mockVideoElement]),
      querySelector: vi.fn(),
      createElement: vi.fn(() => ({
        style: {},
        getContext: vi.fn(() => ({})),
        addEventListener: vi.fn(),
      })),
    };

    global.MutationObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }));

    global.ResizeObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    AnnotationManager.destroy();
  });

  describe("init", () => {
    test("should initialize successfully", async () => {
      await AnnotationManager.init();

      expect(global.MutationObserver).toHaveBeenCalled();
      expect(global.document.querySelectorAll).toHaveBeenCalledWith("video");
    });

    test("should enhance existing video elements", async () => {
      await AnnotationManager.init();

      expect(VideoAnnotator).toHaveBeenCalledWith(
        mockVideoElement,
        expect.objectContaining({
          autoResize: true,
          renderOnVideoTimeUpdate: true,
          debugMode: false,
        }),
      );
    });
  });

  describe("enhanceVideo", () => {
    test("should create annotator for new video element", () => {
      const drawer = AnnotationManager.enhanceVideo(mockVideoElement);

      expect(VideoAnnotator).toHaveBeenCalledWith(
        mockVideoElement,
        expect.any(Object),
      );
      expect(AnnotationManager.annotators.has(mockVideoElement)).toBe(true);
      expect(drawer).toBeDefined();
    });

    test("should return existing annotator for already enhanced video", () => {
      const drawer1 = AnnotationManager.enhanceVideo(mockVideoElement);
      const drawer2 = AnnotationManager.enhanceVideo(mockVideoElement);

      expect(drawer1).toBe(drawer2);
      expect(VideoAnnotator).toHaveBeenCalledTimes(1);
    });
  });

  describe("loadAnnotationsForAlert", () => {
    test("should handle missing annotations gracefully", async () => {
      // Mock the method directly
      AnnotationManager.getAnnotationsFromMetadata = vi
        .fn()
        .mockResolvedValue(null);

      const result =
        await AnnotationManager.loadAnnotationsForAlert("test-alert");

      expect(result).toBe(false);
    });

    test("should load annotations when available", async () => {
      const mockAnnotations = { 
        version: "1.0",
        metadata: {},
        items: []
      };
      AnnotationManager.getAnnotationsFromMetadata = vi
        .fn()
        .mockResolvedValue(mockAnnotations);

      // Mock Utils.getVideoElement to return our mock video element
      Utils.getVideoElement.mockReturnValue(mockVideoElement);

      const result =
        await AnnotationManager.loadAnnotationsForAlert("test-alert");

      expect(result).toBe(true);
    });
  });

  describe("clearAnnotations", () => {
    test("should clear annotations from all annotators", () => {
      const mockAnnotator = {
        clearAnnotations: vi.fn(),
        destroy: vi.fn(),
        hide: vi.fn(),
        show: vi.fn(),
      };
      AnnotationManager.annotators.set(mockVideoElement, mockAnnotator);

      AnnotationManager.clearAnnotations();

      expect(mockAnnotator.clearAnnotations).toHaveBeenCalled();
    });
  });

  describe("hideAnnotations", () => {
    test("should hide all annotators", () => {
      const mockAnnotator = {
        hide: vi.fn(),
        destroy: vi.fn(),
        clearAnnotations: vi.fn(),
        show: vi.fn(),
      };
      AnnotationManager.annotators.set(mockVideoElement, mockAnnotator);

      AnnotationManager.hideAnnotations();

      expect(mockAnnotator.hide).toHaveBeenCalled();
    });
  });

  describe("showAnnotations", () => {
    test("should show all annotators", () => {
      const mockAnnotator = {
        show: vi.fn(),
        destroy: vi.fn(),
        hide: vi.fn(),
        clearAnnotations: vi.fn(),
      };
      AnnotationManager.annotators.set(mockVideoElement, mockAnnotator);

      AnnotationManager.showAnnotations();

      expect(mockAnnotator.show).toHaveBeenCalled();
    });
  });

  describe("getAnnotatorForVideo", () => {
    test("should return correct annotator for video element", () => {
      const mockAnnotator = {
        test: "annotator",
        destroy: vi.fn(),
        hide: vi.fn(),
        show: vi.fn(),
        clearAnnotations: vi.fn(),
      };
      AnnotationManager.annotators.set(mockVideoElement, mockAnnotator);

      const result = AnnotationManager.getAnnotatorForVideo(mockVideoElement);

      expect(result).toBe(mockAnnotator);
    });

    test("should return undefined for non-enhanced video", () => {
      const result = AnnotationManager.getAnnotatorForVideo(mockVideoElement);

      expect(result).toBeUndefined();
    });
  });

  describe("destroy", () => {
    test("should destroy all annotators and clear map", () => {
      const mockAnnotator = { destroy: vi.fn() };
      AnnotationManager.annotators.set(mockVideoElement, mockAnnotator);

      AnnotationManager.destroy();

      expect(mockAnnotator.destroy).toHaveBeenCalled();
      expect(AnnotationManager.annotators.size).toBe(0);
    });
  });
});
