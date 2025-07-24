/**
 * @fileoverview AnnotationManager - Central manager for video annotation overlays
 * @module AnnotationManager
 */

/**
 * Minimal annotation manager that auto-detects videos and loads ML detection overlays.
 *
 * @namespace AnnotationManager
 * @description Auto-discovers video elements and creates VideoAnnotator instances.
 *
 * ## Public API
 * - `init()` - Initialize and start watching for videos
 * - `loadAnnotationsForAlert()` - Load annotations for current alert from state
 * 
 * ### just passes the signal to the VideoAnnotator instances (e.g. tells all video_annotators to hide/show annotations)
 * - `hideAnnotations()` - Hide all annotation overlays
 * - `showAnnotations()` - Show all annotation overlays
 * - `clearAnnotations()` - Remove all annotations
 *
 * @example
 * AnnotationManager.init();
 * await AnnotationManager.loadAnnotationsForAlert();
 */

import { Utils } from "../../utils/utils.js";
import { VideoAnnotator } from "./video-annotator.js";
import { MetadataManager } from "../../services/metadata.js";
import { MetadataToAnnotationConverter } from "../../services/metadata-to-annotation-converter.js";
import { AppState } from "../../core/app-state.js";
import { CONFIG } from "../../config/constants.js";



const AnnotationManager = {
  init() {
    // Auto-enhance existing videos + watch for new ones
    document.querySelectorAll("video").forEach((video) => this._attach_video_annotator(video));
    new MutationObserver((mutations) =>
      mutations.forEach((m) =>
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) {
            // ELEMENT_NODE
            (n.tagName === "VIDEO" ? [n] : n.querySelectorAll("video")).forEach(
              (v) => this._attach_video_annotator(v),
            );
          }
        }),
      ),
    ).observe(document.body, { childList: true, subtree: true });
  },

  _attach_video_annotator(video) {
    if (!video || !(video instanceof HTMLVideoElement)) {
      Utils.log("Warning: Attempted to attach annotator to non-video element", video);
      return null;
    }
    
    if (!video.annotator) {
      video.annotator = new VideoAnnotator(video);
    }
    return video.annotator;
  },

  async loadAnnotationsForAlert() {
    const alertId = AppState.notepad.currentAlertId;
    const detectors = CONFIG.ANNOTATIONS_CATEGORIES;
    
    if (!alertId) {
      Utils.log("No current alert ID found in state");
      return false;
    }
    
    const metadata = await MetadataManager.getMetadata(alertId);
    if (!metadata) return false;

    const manifest = MetadataToAnnotationConverter.convertToManifest(
      metadata,
      detectors,
      { debugMode: false },
    );
    if (!manifest) return false;

    // Load annotations on ALL videos that have annotators
    const videos = document.querySelectorAll("video");
    const videosWithAnnotators = Array.from(videos).filter(video => video.annotator);
    
    if (videosWithAnnotators.length === 0) {
      Utils.log("No video annotators found");
      return false;
    }

    let loadedCount = 0;
    videosWithAnnotators.forEach(video => {
      video.annotator.loadManifest(manifest);
      video.annotator.show();
      loadedCount++;
    });

    Utils.log(`Loaded ${manifest.count} annotations for alert ${alertId} on ${loadedCount} videos`);
    return true;
  },

// =================================
//  ================================


  // Minimal wrapper methods (used by global scope)
  hideAnnotations() {
    document.querySelectorAll("video").forEach(video => {
      if (video.annotator) {
        video.annotator.hide();
      }
    });
  },

  showAnnotations() {
    document.querySelectorAll("video").forEach(video => {
      if (video.annotator) {
        video.annotator.show();
      }
    });
  },

  clearAnnotations() {
    document.querySelectorAll("video").forEach(video => {
      if (video.annotator) {
        video.annotator.clearAnnotations();
      }
    });
  },

  // Get all videos that have annotators attached
  getVideosWithAnnotators() {
    return Array.from(document.querySelectorAll("video")).filter(video => video.annotator);
  },

  // Toggle a specific renderer type for all videos
  toggleRenderer(rendererType, enabled) {
    this.getVideosWithAnnotators().forEach(video => {
      if (video.annotator) {
        video.annotator.toggleRenderer(rendererType, enabled);
      }
    });
    Utils.log(`Renderer ${rendererType} ${enabled ? 'enabled' : 'disabled'} for all videos`);
  },
};

export { AnnotationManager };
