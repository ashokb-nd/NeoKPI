/**
 * @fileoverview VideoAnnotator - Coordinator for multiple canvas renderers
 * Each renderer manages its own canvas and state for better performance and separation.
 * 
 * @example
 * // Basic usage
 * const annotator = new VideoAnnotator(videoElement);
 * annotator.loadManifest(manifest);
 * annotator.show();
 * 
 * @example  
 * // Add individual annotations
 * annotator.addAnnotation({
 *   id: "detection-1",
 *   category: "detection", 
 *   timeRange: { startMs: 1000, endMs: 5000 },
 *   data: { bbox: {x: 0.1, y: 0.1, width: 0.2, height: 0.3} }
 * });
 * 
 * @example
 * // Control visibility 
 * annotator.show();           // Show all annotations
 * annotator.hide();           // Hide all annotations
 * console.log(annotator.isVisible); // Check visibility
 * 
 * @example
 * // Cleanup
 * annotator.clearAnnotations(); // Remove all annotations  
 * annotator.destroy();          // Cleanup resources
 * 
 * =========================
 * ## Minimal Public API
 * =========================
 * 
 * **Constructor:**
 * - `new VideoAnnotator(videoElement, options?)` - Create annotator
 * 
 * **Load Data:**  
 * - `loadManifest(manifest)` - Load annotation manifest
 * - `addAnnotation(annotation)` - Add single annotation
 * - `clearAnnotations()` - Remove all annotations
 * 
 * **Control:**
 * - `show()` - Show annotation overlay
 * - `hide()` - Hide annotation overlay  
 * - `destroy()` - Cleanup and destroy
 * 
 * **Properties:**
 * - `isVisible` - Current visibility state
 * - `annotationsByCategory` - Map of annotations by category
 * 
 * @module VideoAnnotator
 */

import { Utils } from "../../utils/utils.js";
import { AnnotationManifest, Annotation } from "./annotation-manifest.js";
import { BaseRenderer } from "./renderers/base-renderer.js";

import { DetectionRenderer } from "./renderers/detection-renderer.js";
import { TextRenderer } from "./renderers/text-renderer.js";
import { GraphRenderer } from "./renderers/graph-renderer.js";
import { TrajectoryRenderer } from "./renderers/trajectory-renderer.js";
import { CrossRenderer } from "./renderers/cross-renderer.js";
import { HelloRenderer } from "./renderers/hello-renderer.js";
import { DSFRenderer } from "./renderers/dsf-renderer.js";

/**
 * Registry of all available renderer classes.
 * Add new renderer classes here to make them available for automatic discovery.
 * The VideoAnnotator will use each renderer's .category property to build the mapping.
 */
const AVAILABLE_RENDERER_CLASSES = [
  DetectionRenderer,
  TextRenderer,
  GraphRenderer,
  TrajectoryRenderer,
  CrossRenderer,
  HelloRenderer,
  DSFRenderer
];

/**
 * VideoAnnotator - Coordinates multiple canvas renderers for video annotations
 * 
 * @example
 * // Basic setup
 * const annotator = new VideoAnnotator(videoElement);
 * annotator.loadManifest(manifest);
 * annotator.show();
 * 
 * @example
 * // With custom options
 * const annotator = new VideoAnnotator(videoElement, {
 *   debugMode: true,
 *   canvasZIndex: 15,
 *   opacity: 0.8
 * });
 */
class VideoAnnotator {
  // ========================================
  // CONSTRUCTOR
  // ========================================
  
  /**
   * Creates a new VideoAnnotator instance.
   * 
   * @param {HTMLVideoElement} videoElement - The HTML5 video element to annotate
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.debugMode=false] - Enable debug logging
   * @param {number} [options.canvasZIndex=10] - Base z-index for renderer canvases
   * @param {number} [options.opacity=1.0] - Opacity for all renderer canvases
   */
  constructor(videoElement, options = {}) {
    // Store video reference and options
    this.video = videoElement;
    this.options = {
      debugMode: false,
      canvasZIndex: 10,
      opacity: 1.0,
      ...options,
    };

    // State management
    this.manifest = null;
    this.renderers = new Map();
    this.isVisible = false;
    this._lastRenderTime = -1;

    // Initialize event listeners for video element for resizing and rendering(time updates)
    this._setupEventListeners();

    if (this.options.debugMode) {
      Utils.log("VideoAnnotator initialized");
    }
  }

  // ========================================
  // PUBLIC API
  // ========================================

  /**
   * Get loaded annotations organized by category (original manifest structure).
   * 
   * @returns {Object<string, Annotation[]>} Map of category to annotations array
   */
  get annotationsByCategory() {
    if (!this.manifest || !this.manifest.items) {
      return {};
    }
    return this.manifest.items;
  }

  /**
   * Load annotation manifest and distribute annotations to renderers.
   * 
   * @param {AnnotationManifest} manifest - The annotation manifest to load
   * @returns {boolean} True if successfully loaded
   */
  loadManifest(manifest) {
    if (!this._validateManifest(manifest)) {
      throw new Error("Invalid annotation manifest");
    }

    this.manifest = manifest;
    
    // Create renderers based on categories in the manifest
    this._setupRequiredRenderers();
    this._distributeAnnotationsToRenderers();

    if (this.options.debugMode) {
      Utils.log(`Loaded ${this.manifest.count} annotations`);
    }

    return true;
  }

  /**
   * Add a single annotation.
   * 
   * @param {Annotation|Object} annotation - The annotation to add
   */
  addAnnotation(annotation) {
    if (!this.manifest) {
      this.manifest = AnnotationManifest.create();
    }

    const annotationObj = annotation instanceof Annotation 
      ? annotation 
      : new Annotation(annotation);

    this.manifest.addItem(annotationObj);
    
    // Create renderer for this annotation's category if it doesn't exist
    const category = annotationObj.category;
    if (!this.renderers.has(category)) {
      const renderer = this._createRendererForCategory(category);
      if (renderer) {
        this.registerRenderer(renderer);
      }
    }
    
    this._distributeAnnotationsToRenderers();

    if (this.options.debugMode) {
      Utils.log(`Added annotation: ${annotationObj.id}`);
    }
  }

  /**
   * Remove an annotation by ID.
   * 
   * @param {string} id - The annotation ID to remove
   * @returns {boolean} True if removed
   */
  removeAnnotation(id) {
    if (!this.manifest) return false;

    const removed = this.manifest.removeItem(id);
    if (removed) {
      this._distributeAnnotationsToRenderers();
    }

    return removed;
  }

  /**
   * Clear all annotations.
   */
  clearAnnotations() {
    if (this.manifest) {
      this.manifest.clear();
      this._distributeAnnotationsToRenderers();
    }

    if (this.options.debugMode) {
      Utils.log("Cleared all annotations");
    }
  }

  /**
   * Register a custom renderer.
   * 
   * @param {BaseRenderer} renderer - The renderer to register
   */
  registerRenderer(renderer) {
    if (!(renderer instanceof BaseRenderer)) {
      throw new Error("Renderer must extend BaseRenderer");
    }

    const category = renderer.constructor.category;
    if (!category) {
      throw new Error("Renderer class must have a static category property");
    }

    this.renderers.set(category, renderer);

    if (this.options.debugMode) {
      Utils.log(`Registered renderer: ${category}`);
    }
  }

  /**
   * Show all renderer canvases.
   */
  show() {
    this.isVisible = true;
    
    for (const renderer of this.renderers.values()) {
      renderer.show();
    }

    this._startRenderLoop();

    if (this.options.debugMode) {
      Utils.log("VideoAnnotator shown");
    }
  }

  /**
   * Hide all renderer canvases.
   */
  hide() {
    this.isVisible = false;
    
    for (const renderer of this.renderers.values()) {
      renderer.hide();
    }

    this._stopRenderLoop();

    if (this.options.debugMode) {
      Utils.log("VideoAnnotator hidden");
    }
  }

  /**
   * Enable a specific renderer type.
   * 
   * @param {string} rendererType - The renderer type to enable
   * @returns {boolean} True if renderer exists and was enabled
   */
  enableRenderer(rendererType) {
    const renderer = this.renderers.get(rendererType);
    if (renderer) {
      renderer.show();
      if (this.options.debugMode) {
        Utils.log(`Enabled renderer: ${rendererType}`);
      }
      return true;
    }
    return false;
  }

  /**
   * Disable a specific renderer type.
   * 
   * @param {string} rendererType - The renderer type to disable
   * @returns {boolean} True if renderer exists and was disabled
   */
  disableRenderer(rendererType) {
    const renderer = this.renderers.get(rendererType);
    if (renderer) {
      renderer.hide();
      if (this.options.debugMode) {
        Utils.log(`Disabled renderer: ${rendererType}`);
      }
      return true;
    }
    return false;
  }

  /**
   * Toggle a specific renderer type on/off.
   * 
   * @param {string} rendererType - The renderer type to toggle
   * @param {boolean} enabled - True to enable, false to disable
   * @returns {boolean} True if renderer exists and was toggled
   */
  toggleRenderer(rendererType, enabled) {
    return enabled ? this.enableRenderer(rendererType) : this.disableRenderer(rendererType);
  }

  /**
   * Get the current visibility state of a renderer.
   * 
   * @param {string} rendererType - The renderer type to check
   * @returns {boolean} True if renderer is visible, false otherwise
   */
  isRendererVisible(rendererType) {
    const renderer = this.renderers.get(rendererType);
    return renderer ? renderer.isVisible : false;
  }

  /**
   * Notify all renderers to resize their canvases.
   */
  resize() {
    for (const renderer of this.renderers.values()) {
      renderer.resize();
    }
  }

  /**
   * Manually trigger rendering at current time.
   */
  render() {
    if (!this.isVisible) return;

    const currentTimeMs = this.video.currentTime * 1000;
    
    for (const renderer of this.renderers.values()) {
      renderer.renderAtTime(currentTimeMs);
    }

    this._lastRenderTime = currentTimeMs;
  }

  /**
   * Destroy the VideoAnnotator and cleanup all resources.
   */
  destroy() {
    this._stopRenderLoop();
    
    for (const renderer of this.renderers.values()) {
      renderer.destroy();
    }
    
    this.renderers.clear();
    this.manifest = null;

    if (this.options.debugMode) {
      Utils.log("VideoAnnotator destroyed");
    }
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  /**
   * Setup renderers based on categories found in the manifest.
   * 
   * @private
   */
  _setupRequiredRenderers() {
    if (!this.manifest || !this.manifest.items) return;

    // Get categories that have annotations in the manifest
    const categoriesWithAnnotations = Object.keys(this.manifest.items).filter(
      category => this.manifest.items[category] && this.manifest.items[category].length > 0
    );

    // Create renderer for each category that has annotations
    for (const category of categoriesWithAnnotations) {
      // Skip if renderer already exists
      if (this.renderers.has(category)) continue;

      const renderer = this._createRendererForCategory(category);
      if (renderer) {
        this.registerRenderer(renderer);
      }
    }

    if (this.options.debugMode) {
      Utils.log(`Setup renderers for categories: ${categoriesWithAnnotations.join(', ')}`);
    }
  }

  /**
   * Get the mapping of categories to renderer classes.
   * This builds the mapping dynamically using each renderer's static category property.
   * 
   * @private
   * @returns {Object<string, typeof BaseRenderer>} Map of category to renderer class
   */
  _getRendererMap() {
    // Cache the renderer map to avoid rebuilding it on each call
    if (!VideoAnnotator._rendererMap) {
      VideoAnnotator._rendererMap = {};
      
      // Build the map using static category properties (much more efficient!)
      for (const RendererClass of AVAILABLE_RENDERER_CLASSES) {
        if (RendererClass.category) {
          VideoAnnotator._rendererMap[RendererClass.category] = RendererClass;
        } else if (this.options.debugMode) {
          Utils.log(`Warning: Renderer ${RendererClass.name} does not have a static category property`);
        }
      }
    }
    
    return VideoAnnotator._rendererMap; 
  }

  /**
   * Create a renderer instance for the given category.
   * 
   * @private
   * @param {string} category - The annotation category
   * @returns {BaseRenderer|null} Renderer instance or null if category not supported
   */
  _createRendererForCategory(category) {
    const rendererMap = this._getRendererMap();
    const RendererClass = rendererMap[category];
    
    if (RendererClass) {
      return new RendererClass(this);
    }

    if (this.options.debugMode) {
      Utils.log(`Warning: No renderer available for category '${category}'`);
    }
    return null;
  }

  /**
   * Setup event listeners for video events.
   * 
   * @private
   */
  _setupEventListeners() {
    // Time updates - always enabled
    this.video.addEventListener("timeupdate", () => {
      if (this.isVisible) {
        this.render();
      }
    });

    // Resize handling - always enabled
    const resizeObserver = new ResizeObserver(() => {
      this.resize();
    });

    if (this.video instanceof Element) {
      resizeObserver.observe(this.video);
    }

    // Video loaded
    this.video.addEventListener("loadedmetadata", () => {
      this.resize();
    });
  }

  /**
   * Validate annotation manifest.
   * 
   * @private
   * @param {AnnotationManifest} manifest - Manifest to validate
   * @returns {boolean} True if valid
   */
  _validateManifest(manifest) {
    const isValidManifest = (manifest instanceof AnnotationManifest) || 
                           (manifest && typeof manifest.validate === 'function' && 
                            typeof manifest.getCountsByCategory === 'function' &&
                            manifest.items !== undefined);
    
    if (!isValidManifest) {
      return false;
    }

    return manifest.validate();
  }

  /**
   * Distribute annotations to their respective renderers.
   * 
   * @private
   */
  _distributeAnnotationsToRenderers() {
    if (!this.manifest) return;

    // Use the map structure directly instead of flattening
    // Give each renderer its annotations
    for (const [rendererType, renderer] of this.renderers) {
      const annotations = this.annotationsByCategory[rendererType] || [];
      renderer.setAnnotations(annotations);
    }

    if (this.options.debugMode) {
      Utils.log("Distributed annotations to renderers");
    }
  }

  /**
   * Start the render loop if needed.
   * 
   * @private
   */
  _startRenderLoop() {
    // For now, we rely on video timeupdate events
    // Could implement requestAnimationFrame loop here if needed
  }

  /**
   * Stop the render loop.
   * 
   * @private
   */
  _stopRenderLoop() {
    // Cleanup if we had a render loop
  }

}

export { VideoAnnotator };
