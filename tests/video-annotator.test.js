import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { VideoAnnotator } from "../src/features/annotations/video-annotator.js";
import { AnnotationManifest, Annotation } from "../src/features/annotations/annotation-manifest.js";

// Mock Utils
vi.mock("../src/utils/utils.js", () => ({
  Utils: {
    log: vi.fn(),
  },
}));

// Mock all renderer modules with simple implementations
vi.mock("../src/features/annotations/renderers/base-renderer.js", () => ({
  BaseRenderer: class BaseRenderer {
    constructor() {}
  },
}));

vi.mock("../src/features/annotations/renderers/detection-renderer.js", () => ({
  DetectionRenderer: class DetectionRenderer {
    constructor() {}
  },
}));

vi.mock("../src/features/annotations/renderers/text-renderer.js", () => ({
  TextRenderer: class TextRenderer {
    constructor() {}
  },
}));

vi.mock("../src/features/annotations/renderers/graph-renderer.js", () => ({
  GraphRenderer: class GraphRenderer {
    constructor() {}
  },
}));

vi.mock("../src/features/annotations/renderers/trajectory-renderer.js", () => ({
  TrajectoryRenderer: class TrajectoryRenderer {
    constructor() {}
  },
}));

describe("VideoAnnotator", () => {
  let mockVideoElement;
  let mockCanvas;
  let mockContext;
  let drawer;

  beforeEach(() => {
    // Mock Canvas Context
    mockContext = {
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      fillText: vi.fn(),
    };

    // Mock Canvas Element
    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      style: {},
      width: 640,
      height: 480,
      className: "",
      parentElement: null,
      addEventListener: vi.fn(),
    };

    // Mock Video Element
    mockVideoElement = {
      src: "test-video.mp4",
      currentTime: 5.0,
      duration: 100,
      addEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 10,
        top: 20,
        width: 640,
        height: 480,
      })),
      parentElement: {
        style: {},
        appendChild: vi.fn(),
        getBoundingClientRect: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        })),
      },
    };

    // Mock Document
    global.document = {
      createElement: vi.fn(() => mockCanvas),
    };

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
    global.cancelAnimationFrame = vi.fn();

    // Mock setupRenderers to avoid renderer initialization issues
    vi.spyOn(VideoAnnotator.prototype, "setupRenderers").mockImplementation(
      function () {
        this.renderers = new Map();
        // Add mock renderers
        this.renderers.set("detection", {
          getType: () => "detection",
          render: vi.fn(),
        });
        this.renderers.set("text", { getType: () => "text", render: vi.fn() });
        this.renderers.set("graph", {
          getType: () => "graph",
          render: vi.fn(),
        });
        this.renderers.set("trajectory", {
          getType: () => "trajectory",
          render: vi.fn(),
        });
      },
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    if (drawer) {
      drawer.destroy();
    }
  });

  describe("constructor", () => {
    test("should initialize with default options", () => {
      drawer = new VideoAnnotator(mockVideoElement);

      expect(drawer.video).toBe(mockVideoElement);
      expect(drawer.options.autoResize).toBe(true);
      expect(drawer.options.renderOnVideoTimeUpdate).toBe(true);
      expect(drawer.options.debugMode).toBe(false);
    });

    test("should merge custom options", () => {
      const customOptions = {
        debugMode: true,
        opacity: 0.5,
      };

      drawer = new VideoAnnotator(mockVideoElement, customOptions);

      expect(drawer.options.debugMode).toBe(true);
      expect(drawer.options.opacity).toBe(0.5);
      expect(drawer.options.autoResize).toBe(true); // Should keep defaults
    });

    test("should create canvas element", () => {
      drawer = new VideoAnnotator(mockVideoElement);

      expect(global.document.createElement).toHaveBeenCalledWith("canvas");
      expect(mockCanvas.getContext).toHaveBeenCalledWith("2d");
      expect(mockVideoElement.parentElement.appendChild).toHaveBeenCalledWith(
        mockCanvas,
      );
    });

    test("should setup event listeners", () => {
      drawer = new VideoAnnotator(mockVideoElement);

      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith(
        "timeupdate",
        expect.any(Function),
      );
      expect(mockVideoElement.addEventListener).toHaveBeenCalledWith(
        "loadedmetadata",
        expect.any(Function),
      );
      expect(global.ResizeObserver).toHaveBeenCalled();
    });
  });

  describe("loadManifest", () => {
    beforeEach(() => {
      drawer = new VideoAnnotator(mockVideoElement);
    });

    test("should load valid annotation manifest", () => {
      const manifest = new AnnotationManifest({
        version: "1.0",
        metadata: { test: "data" },
        items: {
          detection: [
            new Annotation({
              id: "test-1",
              type: "detection",
              timeRange: { startMs: 1000, endMs: 5000 },
              data: {}
            })
          ]
        }
      });

      const result = drawer.loadManifest(manifest);

      expect(result).toBe(true);
      expect(drawer.annotations).toHaveLength(1);
      expect(drawer.annotations[0].id).toBe("test-1");
    });

    test("should reject invalid annotation manifest", () => {
      const invalidData = { invalid: "data" };

      expect(() => drawer.loadManifest(invalidData)).toThrow();
    });

    test("should handle null data", () => {
      expect(() => drawer.loadManifest(null)).toThrow();
    });
  });

  describe("addAnnotation", () => {
    beforeEach(() => {
      drawer = new VideoAnnotator(mockVideoElement);
    });

    test("should add valid annotation", () => {
      const annotation = new Annotation({
        id: "test-annotation",
        type: "detection",
        timeRange: { startMs: 1000, endMs: 5000 },
        data: {}
      });

      drawer.addAnnotation(annotation);

      expect(drawer.annotations).toHaveLength(1);
      expect(drawer.annotations[0]).toEqual(annotation);
    });

    test("should throw error for annotation without id", () => {
      const annotation = {
        type: "detection",
        timeRange: { startMs: 1000, endMs: 5000 },
      };

      expect(() => {
        drawer.addAnnotation(annotation);
      }).toThrow("Annotation must have an id");
    });

    test("should throw error for annotation without type", () => {
      const annotation = {
        id: "test-annotation",
        timeRange: { startMs: 1000, endMs: 5000 },
      };

      expect(() => {
        drawer.addAnnotation(annotation);
      }).toThrow("Annotation must have a type");
    });
  });

  describe("removeAnnotation", () => {
    beforeEach(() => {
      drawer = new VideoAnnotator(mockVideoElement);
      drawer.addAnnotation(new Annotation({
        id: "test-1",
        type: "detection",
        timeRange: { startMs: 1000, endMs: 5000 },
        data: {}
      }));
      drawer.addAnnotation(new Annotation({
        id: "test-2",
        type: "text",
        timeRange: { startMs: 2000, endMs: 6000 },
        data: {}
      }));
    });

    test("should remove existing annotation", () => {
      const result = drawer.removeAnnotation("test-1");

      expect(result).toBe(true);
      expect(drawer.annotations).toHaveLength(1);
      expect(drawer.annotations[0].id).toBe("test-2");
    });

    test("should return false for non-existent annotation", () => {
      const result = drawer.removeAnnotation("non-existent");

      expect(result).toBe(false);
      expect(drawer.annotations).toHaveLength(2);
    });
  });

  describe("clearAnnotations", () => {
    beforeEach(() => {
      drawer = new VideoAnnotator(mockVideoElement);
      drawer.addAnnotation({
        id: "test-1",
        type: "detection",
        timeRange: { startMs: 1000, endMs: 5000 },
      });
    });

    test("should clear all annotations", () => {
      drawer.clearAnnotations();

      expect(drawer.annotations).toHaveLength(0);
    });
  });

  describe("show and hide", () => {
    beforeEach(() => {
      drawer = new VideoAnnotator(mockVideoElement);
    });

    test("should show canvas overlay", () => {
      drawer.show();

      expect(drawer.isVisible).toBe(true);
      expect(mockCanvas.style.display).toBe("block");
    });

    test("should hide canvas overlay", () => {
      drawer.show();
      drawer.hide();

      expect(drawer.isVisible).toBe(false);
      expect(mockCanvas.style.display).toBe("none");
    });
  });

  describe("getVisibleAnnotations", () => {
    beforeEach(() => {
      drawer = new VideoAnnotator(mockVideoElement);
      drawer.addAnnotation({
        id: "visible-1",
        type: "detection",
        timeRange: { startMs: 1000, endMs: 6000 }, // Should be visible at 5000ms
      });
      drawer.addAnnotation({
        id: "not-visible",
        type: "text",
        timeRange: { startMs: 7000, endMs: 10000 }, // Should not be visible at 5000ms
      });
      drawer.addAnnotation({
        id: "visible-2",
        type: "graph",
        timeRange: { startMs: 4000, endMs: 8000 }, // Should be visible at 5000ms
      });
    });

    test("should return only visible annotations", () => {
      const visible = drawer.getVisibleAnnotations(5000);

      expect(visible).toHaveLength(2);
      expect(visible.map((a) => a.id)).toEqual(["visible-1", "visible-2"]);
    });

    test("should return empty array when no annotations visible", () => {
      const visible = drawer.getVisibleAnnotations(15000);

      expect(visible).toHaveLength(0);
    });
  });

  describe("render", () => {
    beforeEach(() => {
      drawer = new VideoAnnotator(mockVideoElement);
      drawer.show();
      // Clear any calls from show() to reset for individual tests
      vi.clearAllMocks();
    });

    test("should not render when not visible", () => {
      drawer.hide();
      drawer.render();

      expect(mockContext.clearRect).not.toHaveBeenCalled();
    });

    test("should clear canvas when rendering", () => {
      drawer.render(true); // Force render

      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
    });

    test("should call renderer for visible annotations", () => {
      const mockRenderer = {
        getType: () => "detection",
        render: vi.fn(),
      };
      drawer.renderers.set("detection", mockRenderer);

      drawer.addAnnotation({
        id: "test",
        type: "detection",
        timeRange: { startMs: 4000, endMs: 6000 },
      });

      drawer.render(true);

      expect(mockRenderer.render).toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    beforeEach(() => {
      drawer = new VideoAnnotator(mockVideoElement);
    });

    test("should cleanup resources", () => {
      drawer.destroy();

      expect(drawer.canvas).toBeNull();
      expect(drawer.ctx).toBeNull();
      expect(drawer.annotations).toEqual([]);
      expect(drawer.renderers.size).toBe(0);
    });

    test("should remove canvas from DOM", () => {
      const mockParent = {
        removeChild: vi.fn(),
      };
      mockCanvas.parentElement = mockParent;

      drawer.destroy();

      expect(mockParent.removeChild).toHaveBeenCalledWith(mockCanvas);
    });
  });
});
