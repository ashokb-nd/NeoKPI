import { Utils } from '../../utils/utils.js';
import { VideoAnnotationDrawer } from './canvas-drawer.js';
import { AnnotationParser } from './annotation-parser.js';

// ========================================
// ANNOTATION MANAGER
// ========================================
export const AnnotationManager = {
  drawers: new Map(), // video element -> drawer instance
  
  async init() {
    this.setupVideoObserver();
    Utils.log('Annotation Manager initialized');
  },

  setupVideoObserver() {
    // Watch for video elements and enhance them with annotation support
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const videos = node.tagName === 'VIDEO' ? [node] : node.querySelectorAll('video');
            videos.forEach(video => this.enhanceVideo(video));
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Enhance existing videos
    const existingVideos = document.querySelectorAll('video');
    existingVideos.forEach(video => this.enhanceVideo(video));
  },

  enhanceVideo(videoElement) {
    if (this.drawers.has(videoElement)) {
      return this.drawers.get(videoElement);
    }

    const drawer = new VideoAnnotationDrawer(videoElement, {
      autoResize: true,
      renderOnVideoTimeUpdate: true,
      debugMode: false
    });

    this.drawers.set(videoElement, drawer);
    Utils.log(`Enhanced video with annotation support: ${videoElement.src || 'unknown'}`);
    
    return drawer;
  },

  async loadAnnotationsForAlert(alertId) {
    try {
      // This will be implemented when we integrate with MetadataManager
      const annotationData = await this.getAnnotationsFromMetadata(alertId);
      
      if (!annotationData) {
        Utils.log(`No annotations found for alert ${alertId}`);
        return false;
      }

      // Apply annotations to all active video elements
      const videoElement = Utils.getVideoElement();
      if (videoElement) {
        const drawer = this.enhanceVideo(videoElement);
        drawer.loadAnnotations(annotationData);
        drawer.show();
        Utils.log(`Loaded annotations for alert ${alertId}`);
        return true;
      }

      return false;
    } catch (error) {
      Utils.log(`Error loading annotations for alert ${alertId}: ${error.message}`);
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
    this.drawers.forEach((drawer, videoElement) => {
      drawer.clearAnnotations();
    });
    Utils.log('Cleared all annotations');
  },

  hideAnnotations() {
    this.drawers.forEach((drawer) => {
      drawer.hide();
    });
    Utils.log('Hidden all annotations');
  },

  showAnnotations() {
    this.drawers.forEach((drawer) => {
      drawer.show();
    });
    Utils.log('Shown all annotations');
  },

  getDrawerForVideo(videoElement) {
    return this.drawers.get(videoElement);
  },

  destroy() {
    this.drawers.forEach((drawer) => {
      drawer.destroy();
    });
    this.drawers.clear();
    Utils.log('Annotation Manager destroyed');
  }
};
