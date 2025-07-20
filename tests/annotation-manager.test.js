import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { AnnotationManager } from "../src/features/annotations/annotation-manager.js";
import { VideoAnnotator } from "../src/features/annotations/video-annotator.js";
import { MetadataManager } from "../src/services/metadata.js";
import { MetadataToAnnotationConverter } from "../src/services/metadata-to-annotation-converter.js";
import { Utils } from "../src/utils/utils.js";

// Mock Utils
vi.mock("../src/utils/utils.js", () => ({
  Utils: {
    log: vi.fn(),
    getVideoElement: vi.fn(),
  },
}));

// Mock MetadataManager
vi.mock("../src/services/metadata.js", () => ({
  MetadataManager: {
    getMetadata: vi.fn(),
  },
}));

// Mock MetadataToAnnotationConverter
vi.mock("../src/services/metadata-to-annotation-converter.js", () => ({
  MetadataToAnnotationConverter: {
    convertToManifest: vi.fn(),
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
    canvas: { 
      style: {},
      getBoundingClientRect: vi.fn(() => ({
        x: 0,
        y: 0,
        width: 640,
        height: 480,
      }))
    },
  });

  return {
    VideoAnnotator: vi.fn().mockImplementation(createMockAnnotator),
  };
});

describe("AnnotationManager Public API", () => {
  let mockVideoElement;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Clear internal state
    AnnotationManager.annotators.clear();

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
      tagName: "VIDEO",
      nodeType: 1,
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
    };

    global.MutationObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }));

    global.Node = {
      ELEMENT_NODE: 1,
    };
  });

  afterEach(() => {
    AnnotationManager.destroy();
  });

  describe("init", () => {
    test("should initialize successfully", async () => {
      await AnnotationManager.init();

      expect(Utils.log).toHaveBeenCalledWith("Annotation Manager initialized");
      expect(global.MutationObserver).toHaveBeenCalled();
    });

    test("should enhance existing video elements on initialization", async () => {
      await AnnotationManager.init();

      expect(global.document.querySelectorAll).toHaveBeenCalledWith("video");
      // Since init creates annotators for existing videos, we should have one
      expect(AnnotationManager.annotators.size).toBe(1);
    });
  });

  describe("loadAnnotationsForAlert", () => {
    beforeEach(async () => {
      await AnnotationManager.init();
    });

    test("should handle missing metadata gracefully", async () => {
      MetadataManager.getMetadata.mockResolvedValue(null);

      const result = await AnnotationManager.loadAnnotationsForAlert("test-alert");

      expect(result).toBe(false);
      expect(Utils.log).toHaveBeenCalledWith("No metadata found for alert test-alert");
    });

    test("should handle conversion failure gracefully", async () => {
      const mockMetadata = { test: "data" };
      MetadataManager.getMetadata.mockResolvedValue(mockMetadata);
      MetadataToAnnotationConverter.convertToManifest.mockReturnValue(null);

      const result = await AnnotationManager.loadAnnotationsForAlert("test-alert");

      expect(result).toBe(false);
      expect(Utils.log).toHaveBeenCalledWith("Failed to convert metadata to annotation manifest for alert test-alert");
    });

    test("should load annotations successfully when all data is available", async () => {
      const mockMetadata = { test: "data" };
      const mockManifest = {
        getCountsByCategory: vi.fn().mockReturnValue({ detection: 2 }),
        count: 2,
      };
      
      MetadataManager.getMetadata.mockResolvedValue(mockMetadata);
      MetadataToAnnotationConverter.convertToManifest.mockReturnValue(mockManifest);

      const result = await AnnotationManager.loadAnnotationsForAlert("test-alert");

      expect(result).toBe(true);
      expect(MetadataToAnnotationConverter.convertToManifest).toHaveBeenCalledWith(
        mockMetadata,
        ['detection'],
        { debugMode: false }
      );
      // Should call show on the annotator
      const annotator = AnnotationManager.annotators.get(mockVideoElement);
      expect(annotator.loadManifest).toHaveBeenCalledWith(mockManifest);
      expect(annotator.show).toHaveBeenCalled();
    });

    test("should handle custom detectors", async () => {
      const mockMetadata = { test: "data" };
      const mockManifest = {
        getCountsByCategory: vi.fn().mockReturnValue({ weather: 1, speed: 3 }),
        count: 4,
      };
      
      MetadataManager.getMetadata.mockResolvedValue(mockMetadata);
      MetadataToAnnotationConverter.convertToManifest.mockReturnValue(mockManifest);

      const result = await AnnotationManager.loadAnnotationsForAlert("test-alert", ["weather", "speed"]);

      expect(result).toBe(true);
      expect(MetadataToAnnotationConverter.convertToManifest).toHaveBeenCalledWith(
        mockMetadata,
        ["weather", "speed"],
        { debugMode: false }
      );
    });

    test("should handle no video element available", async () => {
      const mockMetadata = { test: "data" };
      const mockManifest = { getCountsByCategory: vi.fn(), count: 1 };
      
      Utils.getVideoElement.mockReturnValue(null);
      MetadataManager.getMetadata.mockResolvedValue(mockMetadata);
      MetadataToAnnotationConverter.convertToManifest.mockReturnValue(mockManifest);

      const result = await AnnotationManager.loadAnnotationsForAlert("test-alert");

      expect(result).toBe(false);
      expect(Utils.log).toHaveBeenCalledWith("No video element found to load annotations for alert test-alert");
    });
  });

  describe("clearAllAnnotations", () => {
    test("should clear annotations from all annotators", async () => {
      await AnnotationManager.init();
      
      AnnotationManager.clearAllAnnotations();

      const annotator = AnnotationManager.annotators.get(mockVideoElement);
      expect(annotator.clearAnnotations).toHaveBeenCalled();
      expect(Utils.log).toHaveBeenCalledWith("Cleared all annotations");
    });
  });

  describe("hideAllAnnotations", () => {
    test("should hide all annotators", async () => {
      await AnnotationManager.init();

      AnnotationManager.hideAllAnnotations();

      const annotator = AnnotationManager.annotators.get(mockVideoElement);
      expect(annotator.hide).toHaveBeenCalled();
      expect(Utils.log).toHaveBeenCalledWith("Hidden all annotations");
    });
  });

  describe("showAllAnnotations", () => {
    test("should show all annotators", async () => {
      await AnnotationManager.init();

      AnnotationManager.showAllAnnotations();

      const annotator = AnnotationManager.annotators.get(mockVideoElement);
      expect(annotator.show).toHaveBeenCalled();
      expect(Utils.log).toHaveBeenCalledWith("Shown all annotations");
    });
  });

  describe("getAnnotatorForVideo", () => {
    test("should return correct annotator for video element", async () => {
      await AnnotationManager.init();

      const annotator = AnnotationManager.getAnnotatorForVideo(mockVideoElement);

      expect(annotator).toBeDefined();
      expect(annotator).toBe(AnnotationManager.annotators.get(mockVideoElement));
    });

    test("should return undefined for non-enhanced video", () => {
      const otherVideo = { src: "other.mp4" };
      
      const annotator = AnnotationManager.getAnnotatorForVideo(otherVideo);
      
      expect(annotator).toBeUndefined();
    });
  });

  describe("showDebugBorders", () => {
    test("should enable debug borders on all canvases", async () => {
      await AnnotationManager.init();

      AnnotationManager.showDebugBorders();

      const annotator = AnnotationManager.annotators.get(mockVideoElement);
      expect(annotator.canvas.style.border).toBe("2px solid rgba(0, 255, 0, 0.3)");
      expect(annotator.canvas.style.boxShadow).toBe("0 0 10px rgba(0, 255, 0, 0.2)");
      expect(Utils.log).toHaveBeenCalledWith("Debug borders enabled for all annotation canvases");
    });
  });

  describe("hideDebugBorders", () => {
    test("should disable debug borders on all canvases", async () => {
      await AnnotationManager.init();

      AnnotationManager.hideDebugBorders();

      const annotator = AnnotationManager.annotators.get(mockVideoElement);
      expect(annotator.canvas.style.border).toBe("none");
      expect(annotator.canvas.style.boxShadow).toBe("none");
      expect(Utils.log).toHaveBeenCalledWith("Debug borders disabled for all annotation canvases");
    });
  });

  describe("toggleDebugBorders", () => {
    test("should toggle debug borders from off to on", async () => {
      await AnnotationManager.init();
      const annotator = AnnotationManager.annotators.get(mockVideoElement);
      annotator.canvas.style.border = "none";

      AnnotationManager.toggleDebugBorders();

      expect(annotator.canvas.style.border).toBe("2px solid rgba(0, 255, 0, 0.3)");
    });

    test("should toggle debug borders from on to off", async () => {
      await AnnotationManager.init();
      const annotator = AnnotationManager.annotators.get(mockVideoElement);
      annotator.canvas.style.border = "2px solid rgba(0, 255, 0, 0.3)";

      AnnotationManager.toggleDebugBorders();

      expect(annotator.canvas.style.border).toBe("none");
    });
  });

  describe("getDebugInfo", () => {
    test("should return debug information about annotators", async () => {
      await AnnotationManager.init();

      const debugInfo = AnnotationManager.getDebugInfo();

      expect(debugInfo).toEqual({
        totalAnnotators: 1,
        visibleCanvases: 1,
        canvasPositions: [{
          videoSrc: "test-video.mp4",
          position: {
            x: 0,
            y: 0,
            width: 640,
            height: 480,
          },
        }],
      });
      expect(Utils.log).toHaveBeenCalledWith("Annotation Debug Info:", debugInfo);
    });
  });

  describe("destroy", () => {
    test("should destroy all annotators and clear map", async () => {
      await AnnotationManager.init();
      
      // Get reference to annotator before destroy
      const annotator = AnnotationManager.annotators.get(mockVideoElement);

      AnnotationManager.destroy();

      expect(annotator.destroy).toHaveBeenCalled();
      expect(AnnotationManager.annotators.size).toBe(0);
      expect(Utils.log).toHaveBeenCalledWith("Annotation Manager destroyed");
    });
  });
});
