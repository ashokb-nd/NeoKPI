/**
 * ANNOTATION MANAGER
 *
 * Central manager for video annotation overlays that automatically detects and enhances
 * video elements with ML model detection visualization capabilities.
 *
 * OVERVIEW:
 * This manager acts as the coordination layer between video elements and annotation
 * rendering systems. It automatically discovers video elements on the page, creates
 * canvas overlays for each video, and manages the lifecycle of annotation data.
 *
 * CORE FEATURES:
 * • Automatic video detection using MutationObserver
 * • Canvas overlay creation with precise positioning
 * • Annotation data loading and validation
 * • Multiple video support with independent canvases
 * • Real-time rendering synchronized with video playback
 * • Debug visualization tools for development
 *
 * ANNOTATION SYSTEM ARCHITECTURE:
 * ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
 * │AnnotationManager│ -> │ VideoAnnotator  │ -> │ Specialized     │
 * │(Coordination)   │    │(Canvas Overlay) │    │ Renderers       │
 * └─────────────────┘    └─────────────────┘    └─────────────────┘
 *          |                       |                       |
 *          v                       v                       v
 * • Video detection        • Canvas overlay        • DetectionRenderer
 * • Lifecycle management   • Event handling        • TextRenderer
 * • Data validation        • Positioning           • GraphRenderer
 * • Debug utilities        • Rendering loop        • TrajectoryRenderer
 *
 * COORDINATE SYSTEM:
 * All annotations use normalized coordinates (0.0 - 1.0) for resolution independence:
 * • x: 0.0 = left edge, 1.0 = right edge
 * • y: 0.0 = top edge, 1.0 = bottom edge
 * • width/height: proportion of video dimensions
 *
 * TIMING SYSTEM:
 * Annotations use millisecond timestamps for precise ML model synchronization:
 * • startMs: When annotation becomes visible
 * • endMs: When annotation disappears
 * • Synchronized with video.currentTime * 1000
 *
 * USAGE EXAMPLES:
 *
 * Basic initialization:
 * ```javascript
 * await AnnotationManager.init();
 * ```
 *
 * Load sample annotations for testing:
 * ```javascript
 * import { AnnotationManifest } from './annotation-manifest.js';
 *
 * const manifest = AnnotationManifest.fromDetections([
 *   {
 *     bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
 *     confidence: 0.95,
 *     class: "vehicle",
 *     timeRange: { startMs: 1000, endMs: 5000 }
 *   }
 * ]);
 *
 * AnnotationManager.annotators.forEach((annotator, video) => {
 *   annotator.loadManifest(manifest);
 *   annotator.show();
 * });
 * ```
 *
 * Debug visualization:
 * ```javascript
 * AnnotationManager.showDebugBorders();  // Show canvas boundaries
 * AnnotationManager.getDebugInfo();      // Get positioning data
 * ```
 *
 * INTEGRATION WITH ML MODELS:
 * When integrating with ML detection systems, create an AnnotationManifest:
 * ```javascript
 * import { AnnotationManifest, Annotation } from './annotation-manifest.js';
 *
 * const manifest = new AnnotationManifest({
 *   version: "1.0",
 *   metadata: { alertId: "detection-123" },
 *   items: [
 *     new Annotation({
 *       id: "detection-1",
 *       type: "detection",
 *       timeRange: { startMs: 1000, endMs: 5000 },
 *       data: {
 *         bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
 *         confidence: 0.95,
 *         class: "vehicle"
 *       }
 *     })
 *   ]
 * });
 *
 * const annotator = AnnotationManager.enhanceVideo(videoElement);
 * annotator.loadManifest(manifest);
 * ```
 *
 * CONSOLE DEBUGGING:
 * Access via window.AlertDebugAnnotations in browser console:
 * • loadSample() - Load test annotations
 * • showDebugBorders() - Visualize canvas positioning
 * • getVideoCount() - Count enhanced videos
 * • listVideos() - Show video details table
 *
 * @see VideoAnnotator for canvas rendering details
 * @see AnnotationManifest for data models and validation
 * @see BaseRenderer for renderer architecture
 */

import { Utils } from "../../utils/utils.js";
import { VideoAnnotator } from "./video-annotator.js";
import { AnnotationManifest, Annotation } from "./annotation-manifest.js";

// ========================================
// ANNOTATION MANAGER
// ========================================
const AnnotationManager = {
  annotators: new Map(), // video element -> annotator instance

  async init() {
    this.setupVideoObserver();
    Utils.log("Annotation Manager initialized");
  },

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
            videos.forEach((video) => this.enhanceVideo(video));
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
    existingVideos.forEach((video) => this.enhanceVideo(video));
  },

  enhanceVideo(videoElement) {
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

  async loadAnnotationsForAlert(alertId) {
    try {
      // This will be implemented when we integrate with MetadataManager
      const annotationData = await this.getAnnotationsFromMetadata(alertId);

      if (!annotationData) {
        Utils.log(`No annotations found for alert ${alertId}`);
        return false;
      }

      // Convert to AnnotationManifest
      const manifest = AnnotationManifest.fromJSON(annotationData);

      // Apply annotations to all active video elements
      const videoElement = Utils.getVideoElement();
      if (videoElement) {
        const annotator = this.enhanceVideo(videoElement);
        annotator.loadManifest(manifest);
        annotator.show();
        Utils.log(`Loaded annotations for alert ${alertId}`);
        return true;
      }

      return false;
    } catch (error) {
      Utils.log(
        `Error loading annotations for alert ${alertId}: ${error.message}`,
      );
      return false;
    }
  },

  async getAnnotationsFromMetadata(alertId) {
    // Placeholder for metadata integration
    // This will connect to MetadataManager when ready
    try {
      // For now, return null - will be implemented in Phase 4
      return null;
    } catch (error) {
      Utils.log(`Error fetching annotations from metadata: ${error.message}`);
      return null;
    }
  },

  clearAnnotations() {
    this.annotators.forEach((annotator, videoElement) => {
      annotator.clearAnnotations();
    });
    Utils.log("Cleared all annotations");
  },

  hideAnnotations() {
    this.annotators.forEach((annotator) => {
      annotator.hide();
    });
    Utils.log("Hidden all annotations");
  },

  showAnnotations() {
    this.annotators.forEach((annotator) => {
      annotator.show();
    });
    Utils.log("Shown all annotations");
  },

  getAnnotatorForVideo(videoElement) {
    return this.annotators.get(videoElement);
  },

  // Debug helper functions
  showDebugBorders() {
    this.annotators.forEach((annotator) => {
      if (annotator.canvas) {
        annotator.canvas.style.border = "2px solid rgba(0, 255, 0, 0.3)";
        annotator.canvas.style.boxShadow = "0 0 10px rgba(0, 255, 0, 0.2)";
      }
    });
    Utils.log("Debug borders enabled for all annotation canvases");
  },

  hideDebugBorders() {
    this.annotators.forEach((annotator) => {
      if (annotator.canvas) {
        annotator.canvas.style.border = "none";
        annotator.canvas.style.boxShadow = "none";
      }
    });
    Utils.log("Debug borders disabled for all annotation canvases");
  },

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

  // Debug info
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

  destroy() {
    this.annotators.forEach((annotator) => {
      annotator.destroy();
    });
    this.annotators.clear();
    Utils.log("Annotation Manager destroyed");
  },
};

export { AnnotationManager };
