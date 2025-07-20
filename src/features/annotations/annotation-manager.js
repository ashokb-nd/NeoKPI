/**
 * @fileoverview AnnotationManager - Central manager for video annotation overlays 
 * that automatically detects and enhances video elements with ML model detection 
 * visualization capabilities.
 * @module AnnotationManager
 */

/**
 * Central manager for video annotation overlays. Automatically detects videos
 * and creates annotation layers for ML detection visualization.
 *
 * @namespace AnnotationManager
 * @description Auto-discovers video elements and creates VideoAnnotator instances
 * for each one. Manages annotation data lifecycle and rendering coordination.
 *
 * ## High-Level Flow
 * 1. **init()** - Sets up MutationObserver to watch for video elements
 * 2. **createAnnotatorForVideo()** - Creates VideoAnnotator for each video found
 * 3. **VideoAnnotator** - Creates canvas overlay and listens to video timeupdate events
 * 4. **loadManifest()** - Loads annotation data into specific annotators
 * 5. **Automatic Rendering** - Annotations appear/disappear based on video playback time
 *
 * @example
 * await AnnotationManager.init();  // Auto-detects all videos
 * const annotator = AnnotationManager.getAnnotatorForVideo(video);
 * annotator.loadManifest(manifest);
 * annotator.show();
 *
 * @see {@link VideoAnnotator}
 * @see {@link AnnotationManifest}
 */

import { Utils } from "../../utils/utils.js";
import { VideoAnnotator } from "./video-annotator.js";
import { AnnotationManifest, Annotation } from "./annotation-manifest.js";
import { MetadataManager } from "../../services/metadata.js";
import { MetadataToAnnotationConverter } from "../../services/metadata-to-annotation-converter.js";

// ========================================
// ANNOTATION MANAGER
// ========================================
const AnnotationManager = {
  /**
   * @type {Map<HTMLVideoElement, VideoAnnotator>}
   * @description Map of video elements to their VideoAnnotator instances
   */
  annotators: new Map(),

  /**
   * Initialize the annotation manager and start watching for videos.
   * 
   * @async
   * @memberof AnnotationManager
   */
  async init() {
    this.setupVideoObserver();
    Utils.log("Annotation Manager initialized");
  },

  /**
   * Set up MutationObserver to detect video elements.
   * 
   * @private
   * @memberof AnnotationManager
   */
  setupVideoObserver() {
    // Watch for video elements and enhance them with annotation support
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const videos =
              node.tagName === "VIDEO"
                ? [node]
                : node.querySelectorAll("video");
            videos.forEach((video) => this.createAnnotatorForVideo(video));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Enhance existing videos
    const existingVideos = document.querySelectorAll("video");
    existingVideos.forEach((video) => this.createAnnotatorForVideo(video));
  },

  /**
   * Create a VideoAnnotator instance for a video element.
   * 
   * @memberof AnnotationManager
   * @param {HTMLVideoElement} videoElement - Video to create annotator for
   * @returns {VideoAnnotator} The annotator instance for this video
   */
  createAnnotatorForVideo(videoElement) {
    if (this.annotators.has(videoElement)) {
      return this.annotators.get(videoElement);
    }

    const annotator = new VideoAnnotator(videoElement, {
      autoResize: true,
      renderOnVideoTimeUpdate: true,
      debugMode: false,
      showDebugBorder: true, // Enable debug borders for all canvases
    });

    this.annotators.set(videoElement, annotator);
    Utils.log(
      `Enhanced video with annotation support: ${videoElement.src || "unknown"}`,
    );

    return annotator;
  },

  /**
   * Load annotations for a specific alert ID.
   * 
   * @async
   * @memberof AnnotationManager
   * @param {string} alertId - Alert identifier to load annotations for
   * @param {Array<string>} [detectors=['detection']] - List of detection types to process
   * @returns {Promise<boolean>} True if annotations were loaded successfully
   */
  async loadAnnotationsForAlert(alertId, detectors = ['detection']) {
    try {
      // Get metadata from MetadataManager
      const metadata = await this.getMetadataFromManager(alertId);

      if (!metadata) {
        Utils.log(`No metadata found for alert ${alertId}`);
        return false;
      }

      // Convert metadata to AnnotationManifest using the converter
      const manifest = MetadataToAnnotationConverter.convertToManifest(
        metadata, 
        detectors,
        { debugMode: false }
      );

      if (!manifest) {
        Utils.log(`Failed to convert metadata to annotation manifest for alert ${alertId}`);
        return false;
      }

      // Apply annotations to all active video elements
      const videoElement = Utils.getVideoElement();
      if (videoElement) {
        const annotator = this.createAnnotatorForVideo(videoElement);
        annotator.loadManifest(manifest);
        annotator.show();
        
        const typeCount = manifest.getCountsByType();
        const totalCount = manifest.count;
        Utils.log(`Loaded ${totalCount} annotations for alert ${alertId}:`, typeCount);
        return true;
      }

      Utils.log(`No video element found to load annotations for alert ${alertId}`);
      return false;
    } catch (error) {
      Utils.log(
        `Error loading annotations for alert ${alertId}: ${error.message}`,
      );
      return false;
    }
  },

  /**
   * Get metadata from MetadataManager.
   * 
   * @async
   * @private
   * @memberof AnnotationManager
   * @param {string} alertId - Alert identifier
   * @returns {Promise<Object|null>} Metadata object or null
   */
  async getMetadataFromManager(alertId) {
    try {
      // Get metadata from MetadataManager
      const metadata = await MetadataManager.getMetadata(alertId);

      if (!metadata) {
        Utils.log(`No metadata found for alert ${alertId}`);
        return null;
      }

      Utils.log(`Successfully retrieved metadata for alert ${alertId}`);
      return metadata;

    } catch (error) {
      Utils.log(`Error fetching metadata from MetadataManager: ${error.message}`);
      return null;
    }
  },

  /**
   * Clear annotations from all videos.
   * @memberof AnnotationManager
   */
  clearAllAnnotations() {
    this.annotators.forEach((annotator, videoElement) => {
      annotator.clearAnnotations();
    });
    Utils.log("Cleared all annotations");
  },

  /**
   * Hide annotation overlays on all videos.
   * @memberof AnnotationManager
   */
  hideAllAnnotations() {
    this.annotators.forEach((annotator) => {
      annotator.hide();
    });
    Utils.log("Hidden all annotations");
  },

  /**
   * Show annotation overlays on all videos.
   * @memberof AnnotationManager
   */
  showAllAnnotations() {
    this.annotators.forEach((annotator) => {
      annotator.show();
    });
    Utils.log("Shown all annotations");
  },

  /**
   * Get the VideoAnnotator instance for a specific video element.
   * @memberof AnnotationManager
   * @param {HTMLVideoElement} videoElement - The video element
   * @returns {VideoAnnotator|undefined} The annotator instance or undefined
   */
  getAnnotatorForVideo(videoElement) {
    return this.annotators.get(videoElement);
  },

  /**
   * Show debug borders on all annotation canvases.
   * @memberof AnnotationManager
   */
  showDebugBorders() {
    this.annotators.forEach((annotator) => {
      if (annotator.canvas) {
        annotator.canvas.style.border = "2px solid rgba(0, 255, 0, 0.3)";
        annotator.canvas.style.boxShadow = "0 0 10px rgba(0, 255, 0, 0.2)";
      }
    });
    Utils.log("Debug borders enabled for all annotation canvases");
  },

  /**
   * Hide debug borders on all annotation canvases.
   * @memberof AnnotationManager
   */
  hideDebugBorders() {
    this.annotators.forEach((annotator) => {
      if (annotator.canvas) {
        annotator.canvas.style.border = "none";
        annotator.canvas.style.boxShadow = "none";
      }
    });
    Utils.log("Debug borders disabled for all annotation canvases");
  },

  /**
   * Toggle debug borders on all annotation canvases.
   * @memberof AnnotationManager
   */
  toggleDebugBorders() {
    const firstCanvas = Array.from(this.annotators.values())[0]?.canvas;
    if (
      firstCanvas &&
      firstCanvas.style.border !== "none" &&
      firstCanvas.style.border !== ""
    ) {
      this.hideDebugBorders();
    } else {
      this.showDebugBorders();
    }
  },

  /**
   * Get debug information about all annotators.
   * @memberof AnnotationManager
   * @returns {Object} Debug information object
   */
  getDebugInfo() {
    const info = {
      totalAnnotators: this.annotators.size,
      visibleCanvases: 0,
      canvasPositions: [],
    };

    this.annotators.forEach((annotator, video) => {
      if (annotator.canvas && annotator.isVisible) {
        info.visibleCanvases++;
        const rect = annotator.canvas.getBoundingClientRect();
        info.canvasPositions.push({
          videoSrc: video.src || "unknown",
          position: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    });

    Utils.log("Annotation Debug Info:", info);
    return info;
  },

  /**
   * Destroy all annotators and clean up resources.
   * @memberof AnnotationManager
   */
  destroy() {
    this.annotators.forEach((annotator) => {
      annotator.destroy();
    });
    this.annotators.clear();
    Utils.log("Annotation Manager destroyed");
  },
};

export { AnnotationManager };
