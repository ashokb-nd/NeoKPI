/**
 * @fileoverview VideoAnnotator - Core canvas overlay system for rendering ML model
 * detections and annotations over a HTML5 video elements.
 * @module VideoAnnotator
 */

/**
 * @example
 * const annotator = new VideoAnnotator(videoElement, { debugMode: true });
 * annotator.loadManifest(manifest);
 * annotator.show();
 */

import { Utils } from "../../utils/utils.js";
import { BaseRenderer } from "./renderers/base-renderer.js";
import { DetectionRenderer } from "./renderers/detection-renderer.js";
import { TextRenderer } from "./renderers/text-renderer.js";
import { GraphRenderer } from "./renderers/graph-renderer.js";
import { TrajectoryRenderer } from "./renderers/trajectory-renderer.js";
import { CrossRenderer } from "./renderers/cross-renderer.js";
import { HelloRenderer } from "./renderers/hello-renderer.js";
import { AnnotationManifest, Annotation } from "./annotation-manifest.js";

// ========================================
// VIDEO ANNOTATOR
// ========================================
class VideoAnnotator {
  /**
   * Creates a new VideoAnnotator instance for a specific video element.
   * 
   * @constructor
   * @param {HTMLVideoElement} videoElement - The HTML5 video element to annotate
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.autoResize=true] - Automatically resize canvas when video resizes
   * @param {boolean} [options.renderOnVideoTimeUpdate=true] - Render annotations on video time updates
   * @param {boolean} [options.debugMode=false] - Enable debug logging and visual indicators
   * @param {number} [options.canvasZIndex=10] - Z-index for the canvas overlay
   * @param {number} [options.opacity=1.0] - Opacity of the annotation overlay (0.0-1.0)
   * @param {boolean} [options.showDebugBorder=false] - Show debug border around canvas
   * 
   * @example
   * // Basic usage
   * const video = document.getElementById('myVideo');
   * const annotator = new VideoAnnotator(video);
   * 
   * @example
   * // With custom options
   * const annotator = new VideoAnnotator(video, {
   *   debugMode: true,
   *   canvasZIndex: 15,
   *   opacity: 0.8
   * });
   */
  constructor(videoElement, options = {}) {
    /**
     * @type {HTMLVideoElement}
     * @readonly
     * @description The target video element for this annotator
     */
    this.video = videoElement;
    
    /**
     * @type {HTMLCanvasElement|null}
     * @readonly
     * @description The canvas overlay element
     */
    this.canvas = null;
    
    /**
     * @type {CanvasRenderingContext2D|null}
     * @private
     * @description The 2D rendering context for the canvas
     */
    this.ctx = null;
    
    /**
     * @type {AnnotationManifest|null}
     * @readonly
     * @description Current annotation manifest containing all annotations
     */
    this.manifest = null;
    
    /**
     * @type {Map<string, BaseRenderer>}
     * @private
     * @description Map of registered renderers by annotation category
     */
    this.renderers = new Map();
    
    /**
     * @type {boolean}
     * @readonly
     * @description Current visibility state of the annotation overlay
     */
    this.isVisible = false;
    
    /**
     * @type {number}
     * @private
     * @description Last render time in milliseconds for optimization
     */
    this.lastRenderTime = -1;
    
    /**
     * @type {number|null}
     * @private
     * @description Animation frame request ID for cleanup
     */
    this.animationFrameId = null;

    // Default options
    this.options = {
      autoResize: true,
      renderOnVideoTimeUpdate: true,
      debugMode: false,
      canvasZIndex: 10,
      opacity: 1.0,
      ...options,
    };

    this.init();
  }

  /**
   * Get all loaded annotations as a flat array.
   * 
   * @readonly
   * @memberof VideoAnnotator
   * @returns {Annotation[]} Array of all annotations from all categories
   * 
   * @example
   * const annotations = annotator.annotations;
   * console.log(`Found ${annotations.length} annotations`);
   */
  get annotations() {
    if (!this.manifest || !this.manifest.items) {
      return [];
    }

    // Get all annotations from the map structure
    return Object.values(this.manifest.items).flat();
  }  /**
   * Initialize the VideoAnnotator instance.
   * Creates the canvas overlay, sets up renderers, and binds event listeners.
   * 
   * @private
   * @memberof VideoAnnotator
   * @description This method is called automatically by the constructor to set up 
   * the annotator. It creates the canvas, registers default renderers, and 
   * establishes event listeners for video time updates and resize events.
   */
  init() {
    this.createOverlayCanvas();
    this.setupRenderers();
    this.setupEventListeners();

    // Automatically show canvas with debug border for development
    this.isVisible = true;
    this.canvas.style.display = "block";

    // Add debug border by default for development
    if (!this.options.debugMode && !this.options.showDebugBorder) {
      this.canvas.style.border = "2px solid rgba(0, 255, 0, 0.4)";
      this.canvas.style.boxShadow = "0 0 8px rgba(0, 255, 0, 0.3)";
    }

    if (this.options.debugMode) {
      Utils.log("VideoAnnotator initialized and visible");
    }
  }

  /**
   * Creates and positions the canvas overlay element.
   * 
   * @private
   * @memberof VideoAnnotator
   * @description Creates a transparent HTML5 canvas element that overlays the video.
   * The canvas is positioned absolutely over the video with pointer events disabled
   * to allow interaction with the video controls. Applies styling based on options
   * including z-index, opacity, and optional debug borders.
   * 
   * @throws {Error} If canvas 2D context cannot be obtained
   */
  createOverlayCanvas() {
    // Create canvas element
    this.canvas = document.createElement("canvas");
    this.canvas.className = "video-annotation-overlay";

    // Base styles for the canvas
    let canvasStyles = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${this.options.canvasZIndex};
      opacity: ${this.options.opacity};
      display: block;
    `;

    // Add debug border for debugging purposes
    if (this.options.debugMode || this.options.showDebugBorder) {
      canvasStyles += `
        border: 2px solid rgba(0, 255, 0, 0.3);
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
      `;
    }

    this.canvas.style.cssText = canvasStyles;

    // Get 2D context
    this.ctx = this.canvas.getContext("2d");

    // Position canvas overlay on video
    this.positionCanvas();

    // Add to DOM
    const videoContainer = this.video.parentElement;
    if (videoContainer) {
      videoContainer.style.position =
        videoContainer.style.position || "relative";
      videoContainer.appendChild(this.canvas);
    }
  }

  /**
   * Registers all default annotation renderers.
   * 
   * @private
   * @memberof VideoAnnotator
   * @description Sets up the default set of renderers for different annotation categories:
   * - DetectionRenderer: For bounding boxes and object detection results
   * - TextRenderer: For text overlays and labels
   * - GraphRenderer: For charts and data visualizations
   * - TrajectoryRenderer: For motion paths and tracking
   * - CrossRenderer: For crosshair and point annotations
   * - HelloRenderer: For simple message display (testing)
   */
  setupRenderers() {
    // Register default renderers
    this.registerRenderer(new DetectionRenderer(this));
    this.registerRenderer(new TextRenderer(this));
    this.registerRenderer(new GraphRenderer(this));
    this.registerRenderer(new TrajectoryRenderer(this));
    this.registerRenderer(new CrossRenderer(this));
    this.registerRenderer(new HelloRenderer(this));
  }

  /**
   * Registers a custom renderer for a specific annotation category.
   * 
   * @public
   * @memberof VideoAnnotator
   * @param {BaseRenderer} renderer - The renderer instance to register
   * @throws {Error} If renderer doesn't extend BaseRenderer
   * 
   * @description Adds a new renderer to handle a specific annotation category.
   * The renderer must extend BaseRenderer and implement the required methods.
   * If a renderer for the same type already exists, it will be replaced.
   * 
   * @example
   * // Register a custom renderer
   * import { MyCustomRenderer } from './my-custom-renderer.js';
   * const customRenderer = new MyCustomRenderer(annotator);
   * annotator.registerRenderer(customRenderer);
   * 
   * @see {@link BaseRenderer} for implementation details
   */
  registerRenderer(renderer) {
    if (!(renderer instanceof BaseRenderer)) {
      throw new Error("Renderer must extend BaseRenderer");
    }

    this.renderers.set(renderer.getType(), renderer);

    if (this.options.debugMode) {
      Utils.log(`Registered renderer: ${renderer.getType()}`);
    }
  }

  /**
   * Sets up event listeners for video and resize events.
   * 
   * @private
   * @memberof VideoAnnotator
   * @description Binds event listeners for:
   * - Video timeupdate events (if renderOnVideoTimeUpdate is enabled)
   * - Video element resize events (if autoResize is enabled) 
   * - Video loadedmetadata events for initial setup
   * Uses ResizeObserver for efficient resize detection when available.
   */
  setupEventListeners() {
    // Video time update
    if (this.options.renderOnVideoTimeUpdate) {
      this.video.addEventListener("timeupdate", () => {
        if (this.isVisible) {
          this.render();
        }
      });
    }

    // Video resize
    if (this.options.autoResize) {
      const resizeObserver = new ResizeObserver(() => {
        this.resize();
      });

      // Only observe if video is a real DOM element (not a mock object)
      if (this.video instanceof Element) {
        resizeObserver.observe(this.video);
      } else {
        console.log(
          "VideoAnnotator: Video is not a DOM element, skipping ResizeObserver",
        );
      }
    }

    // Video load events
    this.video.addEventListener("loadedmetadata", () => {
      this.resize();
      if (this.isVisible) {
        this.render();
      }
    });
  }

  /**
   * Positions and sizes the canvas overlay to match the video element.
   * 
   * @private
   * @memberof VideoAnnotator
   * @description Calculates the exact position and dimensions of the video element
   * and applies them to the canvas overlay. This ensures pixel-perfect alignment
   * between the video and annotations. Updates both CSS positioning and internal
   * canvas dimensions for proper rendering.
   * 
   * @example
   * // Called automatically on resize, but can be called manually
   * annotator.positionCanvas();
   */
  positionCanvas() {
    const videoRect = this.video.getBoundingClientRect();
    const containerRect = this.video.parentElement.getBoundingClientRect();

    // Position canvas to exactly overlay the video
    this.canvas.style.left = `${videoRect.left - containerRect.left}px`;
    this.canvas.style.top = `${videoRect.top - containerRect.top}px`;
    this.canvas.style.width = `${videoRect.width}px`;
    this.canvas.style.height = `${videoRect.height}px`;

    // Set canvas internal dimensions
    this.canvas.width = videoRect.width;
    this.canvas.height = videoRect.height;
  }

  /**
   * Loads an annotation manifest containing annotation data.
   * 
   * @public
   * @memberof VideoAnnotator
   * @param {AnnotationManifest} manifest - The annotation manifest to load
   * @returns {boolean} True if manifest was successfully loaded
   * @throws {Error} If manifest is not an AnnotationManifest instance
   * @throws {Error} If manifest fails validation
   * 
   * @description Loads a complete set of annotations from an AnnotationManifest.
   * The manifest must be a valid AnnotationManifest instance and pass validation.
   * This replaces any existing annotations. Triggers a render if the overlay is visible.
   * 
   * @example
   * // Load from AnnotationManifest instance
   * const manifest = new AnnotationManifest({
   *   version: "1.0",
   *   items: [annotations...]
   * });
   * const success = annotator.loadManifest(manifest);
   * 
   * @example
   * // Load from JSON data
   * const manifest = AnnotationManifest.fromJSON(jsonData);
   * annotator.loadManifest(manifest);
   * 
   * @see {@link AnnotationManifest} for manifest structure
   */
  loadManifest(manifest) {
    // Check if it's an AnnotationManifest instance or has the right structure
    const isValidManifest = (manifest instanceof AnnotationManifest) || 
                           (manifest && typeof manifest.validate === 'function' && 
                            typeof manifest.getCountsByCategory === 'function' &&
                            manifest.items !== undefined);
    
    if (!isValidManifest) {
      throw new Error(
        "Expected AnnotationManifest instance. Use new AnnotationManifest(data) or AnnotationManifest.fromJSON(data)",
      );
    }

    // Validate the manifest
    if (!manifest.validate()) {
      throw new Error("Invalid annotation manifest structure");
    }

    this.manifest = manifest;

    if (this.options.debugMode) {
      Utils.log(`Loaded ${this.manifest.count} annotations`);
    }

    if (this.isVisible) {
      this.render();
    }

    return true;
  }

  /**
   * Adds a single annotation to the current manifest.
   * 
   * @public
   * @memberof VideoAnnotator
   * @param {Annotation|Object} annotation - The annotation to add (Annotation instance or plain object)
   * 
   * @description Adds a new annotation to the current manifest. If no manifest exists,
   * creates a new one. The annotation can be either an Annotation instance or a plain
   * object that will be converted to an Annotation. Triggers a render if overlay is visible.
   * 
   * @example
   * // Add as plain object
   * annotator.addAnnotation({
   *   id: "detection-1",
   *   type: "detection", 
   *   timeRange: { startMs: 1000, endMs: 5000 },
   *   data: {
   *     bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
   *     confidence: 0.95,
   *     class: "vehicle"
   *   }
   * });
   * 
   * @example
   * // Add as Annotation instance
   * const annotation = new Annotation({...});
   * annotator.addAnnotation(annotation);
   * 
   * @see {@link Annotation} for annotation structure
   */
  addAnnotation(annotation) {
    // Ensure we have a manifest
    if (!this.manifest) {
      this.manifest = AnnotationManifest.create();
    }

    // Convert to Annotation instance if needed
    const annotationObj =
      annotation instanceof Annotation
        ? annotation
        : new Annotation(annotation);

    this.manifest.addItem(annotationObj);

    if (this.options.debugMode) {
      Utils.log(`Added annotation: ${annotationObj.id}`);
    }

    if (this.isVisible) {
      this.render();
    }
  }

  /**
   * Removes an annotation by its ID.
   * 
   * @public
   * @memberof VideoAnnotator
   * @param {string} id - The ID of the annotation to remove
   * @returns {boolean} True if annotation was found and removed, false otherwise
   * 
   * @description Removes a specific annotation from the current manifest by its unique ID.
   * Returns false if no manifest exists or the annotation is not found.
   * Triggers a render if overlay is visible and annotation was removed.
   * 
   * @example
   * // Remove annotation by ID
   * const wasRemoved = annotator.removeAnnotation("detection-1");
   * if (wasRemoved) {
   *   console.log("Annotation removed successfully");
   * }
   */
  removeAnnotation(id) {
    if (!this.manifest) {
      return false;
    }

    const removed = this.manifest.removeItem(id);

    if (removed && this.options.debugMode) {
      Utils.log(`Removed annotation: ${id}`);
    }

    if (this.isVisible) {
      this.render();
    }

    return removed;
  }

  /**
   * Clears all annotations from the current manifest.
   * 
   * @public
   * @memberof VideoAnnotator
   * 
   * @description Removes all annotations from the current manifest, effectively
   * clearing the overlay of all rendered content. The manifest structure remains
   * but all annotation items are removed. Triggers a render to clear the display.
   * 
   * @example
   * // Clear all annotations
   * annotator.clearAnnotations();
   * console.log(annotator.annotations.length); // 0
   */
  clearAnnotations() {
    if (this.manifest) {
      this.manifest.clear();
    }

    if (this.isVisible) {
      this.render();
    }

    if (this.options.debugMode) {
      Utils.log("Cleared all annotations");
    }
  }

  /**
   * Shows the annotation overlay.
   * 
   * @public
   * @memberof VideoAnnotator
   * 
   * @description Makes the annotation overlay visible and triggers an initial render.
   * The canvas element display is set to 'block' and the internal visibility state
   * is updated. All existing annotations will be rendered immediately.
   * 
   * @example
   * // Show the overlay
   * annotator.show();
   * console.log(annotator.isVisible); // true
   */
  show() {
    this.isVisible = true;
    this.canvas.style.display = "block";
    this.render();

    if (this.options.debugMode) {
      Utils.log("Annotation overlay shown");
    }
  }

  /**
   * Hides the annotation overlay.
   * 
   * @public
   * @memberof VideoAnnotator
   * 
   * @description Makes the annotation overlay invisible by setting display to 'none'
   * and updating the internal visibility state. Cancels any pending animation frames
   * to stop rendering while hidden. Annotations remain in memory and will be
   * rendered again when show() is called.
   * 
   * @example
   * // Hide the overlay
   * annotator.hide();
   * console.log(annotator.isVisible); // false
   */
  hide() {
    this.isVisible = false;
    this.canvas.style.display = "none";

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.options.debugMode) {
      Utils.log("Annotation overlay hidden");
    }
  }

  /**
   * Recalculates canvas positioning and dimensions.
   * 
   * @public
   * @memberof VideoAnnotator
   * 
   * @description Recalculates the canvas overlay position and size to match
   * the current video element dimensions. This is automatically called when
   * the video resizes (if autoResize is enabled), but can also be called
   * manually when needed. Triggers a render if overlay is visible.
   * 
   * @example
   * // Manually trigger resize recalculation
   * annotator.resize();
   */
  resize() {
    this.positionCanvas();
    if (this.isVisible) {
      this.render();
    }
  }

  /**
   * Renders all visible annotations to the canvas.
   * 
   * @public
   * @memberof VideoAnnotator
   * @param {boolean} [forceRender=false] - Force rendering even if video time hasn't changed
   * 
   * @description Clears the canvas and renders all annotations that are visible at the
   * current video time. Optimizes performance by skipping renders when the video time
   * hasn't changed (unless forceRender is true). Each annotation is rendered using
   * its corresponding registered renderer.
   * 
   * @example
   * // Trigger manual render
   * annotator.render();
   * 
   * @example
   * // Force render even if time hasn't changed
   * annotator.render(true);
   */
  render(forceRender = false) {
    if (!this.isVisible || !this.ctx) return;

    const currentTimeMs = this.video.currentTime * 1000;

    // Skip render if time hasn't changed (unless forced)
    if (!forceRender && currentTimeMs === this.lastRenderTime) {
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Get current video dimensions for coordinate scaling
    const videoRect = {
      width: this.canvas.width,
      height: this.canvas.height,
    };

    // Render visible annotations
    const visibleAnnotations = this.getVisibleAnnotations(currentTimeMs);

    for (const annotation of visibleAnnotations) {
      const renderer = this.renderers.get(annotation.category);

      if (renderer) {
        try {
          renderer.render(annotation, currentTimeMs, videoRect);
        } catch (error) {
          if (this.options.debugMode) {
            Utils.log(
              `Error rendering annotation ${annotation.id}: ${error.message}`,
            );
          }
        }
      } else if (this.options.debugMode) {
        Utils.log(`No renderer found for annotation category: ${annotation.category}`);
      }
    }

    this.lastRenderTime = currentTimeMs;
  }

  /**
   * Gets annotations that are visible at the specified time.
   * 
   * @private
   * @memberof VideoAnnotator
   * @param {number} currentTimeMs - Current video time in milliseconds
   * @returns {Annotation[]} Array of annotations visible at the given time
   * 
   * @description Filters annotations based on their time ranges to return only
   * those that should be visible at the current video playback time. Returns
   * an empty array if no manifest is loaded.
   */
  getVisibleAnnotations(currentTimeMs) {
    if (!this.manifest) {
      return [];
    }

    return this.manifest.getItemsAtTime(currentTimeMs);
  }

  /**
   * Destroys the VideoAnnotator instance and cleans up resources.
   * 
   * @public
   * @memberof VideoAnnotator
   * 
   * @description Performs complete cleanup of the VideoAnnotator instance:
   * - Cancels any pending animation frames
   * - Removes canvas element from DOM
   * - Clears all references to prevent memory leaks
   * - Clears renderer map
   * After calling destroy(), the VideoAnnotator instance should not be used.
   * 
   * @example
   * // Clean up when done
   * annotator.destroy();
   * annotator = null;
   */
  destroy() {
    // Clean up event listeners
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Remove canvas from DOM
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }

    // Clear references
    this.canvas = null;
    this.ctx = null;
    this.manifest = null;
    this.renderers.clear();

    if (this.options.debugMode) {
      Utils.log("VideoAnnotator destroyed");
    }
  }
}

export { VideoAnnotator }