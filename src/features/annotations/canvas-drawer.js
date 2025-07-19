import { Utils } from '../../utils/utils.js';
import { BaseRenderer } from './renderers/base-renderer.js';
import { DetectionRenderer } from './renderers/detection-renderer.js';
import { TextRenderer } from './renderers/text-renderer.js';
import { GraphRenderer } from './renderers/graph-renderer.js';
import { TrajectoryRenderer } from './renderers/trajectory-renderer.js';

// ========================================
// VIDEO ANNOTATION DRAWER
// ========================================
export class VideoAnnotationDrawer {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.canvas = null;
    this.ctx = null;
    this.annotations = [];
    this.renderers = new Map();
    this.isVisible = false;
    this.lastRenderTime = -1;
    this.animationFrameId = null;
    
    // Default options
    this.options = {
      autoResize: true,
      renderOnVideoTimeUpdate: true,
      debugMode: false,
      canvasZIndex: 10,
      opacity: 1.0,
      ...options
    };

    this.init();
  }

  init() {
    this.createOverlayCanvas();
    this.setupRenderers();
    this.setupEventListeners();
    
    if (this.options.debugMode) {
      Utils.log('VideoAnnotationDrawer initialized');
    }
  }

  createOverlayCanvas() {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'video-annotation-overlay';
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${this.options.canvasZIndex};
      opacity: ${this.options.opacity};
      display: none;
    `;

    // Get 2D context
    this.ctx = this.canvas.getContext('2d');
    
    // Position canvas overlay on video
    this.positionCanvas();
    
    // Add to DOM
    const videoContainer = this.video.parentElement;
    if (videoContainer) {
      videoContainer.style.position = videoContainer.style.position || 'relative';
      videoContainer.appendChild(this.canvas);
    }
  }

  setupRenderers() {
    // Register default renderers
    this.registerRenderer(new DetectionRenderer(this));
    this.registerRenderer(new TextRenderer(this));
    this.registerRenderer(new GraphRenderer(this));
    this.registerRenderer(new TrajectoryRenderer(this));
  }

  registerRenderer(renderer) {
    if (!(renderer instanceof BaseRenderer)) {
      throw new Error('Renderer must extend BaseRenderer');
    }
    
    this.renderers.set(renderer.getType(), renderer);
    
    if (this.options.debugMode) {
      Utils.log(`Registered renderer: ${renderer.getType()}`);
    }
  }

  setupEventListeners() {
    // Video time update
    if (this.options.renderOnVideoTimeUpdate) {
      this.video.addEventListener('timeupdate', () => {
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
      resizeObserver.observe(this.video);
    }

    // Video load events
    this.video.addEventListener('loadedmetadata', () => {
      this.resize();
      if (this.isVisible) {
        this.render();
      }
    });
  }

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

  loadAnnotations(annotationData) {
    try {
      // Validate annotation data structure
      if (!annotationData || !annotationData.annotations) {
        throw new Error('Invalid annotation data structure');
      }

      this.annotations = annotationData.annotations;
      
      if (this.options.debugMode) {
        Utils.log(`Loaded ${this.annotations.length} annotations`);
      }

      if (this.isVisible) {
        this.render();
      }

      return true;
    } catch (error) {
      Utils.log(`Error loading annotations: ${error.message}`);
      return false;
    }
  }

  addAnnotation(annotation) {
    // Validate annotation
    if (!annotation.type || !annotation.id) {
      throw new Error('Annotation must have type and id');
    }

    this.annotations.push(annotation);
    
    if (this.options.debugMode) {
      Utils.log(`Added annotation: ${annotation.id}`);
    }

    if (this.isVisible) {
      this.render();
    }
  }

  removeAnnotation(id) {
    const initialLength = this.annotations.length;
    this.annotations = this.annotations.filter(annotation => annotation.id !== id);
    
    const removed = initialLength - this.annotations.length;
    if (removed > 0 && this.options.debugMode) {
      Utils.log(`Removed annotation: ${id}`);
    }

    if (this.isVisible) {
      this.render();
    }
    
    return removed > 0;
  }

  clearAnnotations() {
    this.annotations = [];
    if (this.isVisible) {
      this.render();
    }
    
    if (this.options.debugMode) {
      Utils.log('Cleared all annotations');
    }
  }

  show() {
    this.isVisible = true;
    this.canvas.style.display = 'block';
    this.render();
    
    if (this.options.debugMode) {
      Utils.log('Annotation overlay shown');
    }
  }

  hide() {
    this.isVisible = false;
    this.canvas.style.display = 'none';
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.options.debugMode) {
      Utils.log('Annotation overlay hidden');
    }
  }

  resize() {
    this.positionCanvas();
    if (this.isVisible) {
      this.render();
    }
  }

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
      height: this.canvas.height
    };

    // Render visible annotations
    const visibleAnnotations = this.getVisibleAnnotations(currentTimeMs);
    
    for (const annotation of visibleAnnotations) {
      const renderer = this.renderers.get(annotation.type);
      
      if (renderer) {
        try {
          renderer.render(annotation, currentTimeMs, videoRect);
        } catch (error) {
          if (this.options.debugMode) {
            Utils.log(`Error rendering annotation ${annotation.id}: ${error.message}`);
          }
        }
      } else if (this.options.debugMode) {
        Utils.log(`No renderer found for annotation type: ${annotation.type}`);
      }
    }

    this.lastRenderTime = currentTimeMs;
  }

  getVisibleAnnotations(currentTimeMs) {
    return this.annotations.filter(annotation => {
      if (!annotation.timeRange) return false;
      
      return currentTimeMs >= annotation.timeRange.startMs && 
             currentTimeMs <= annotation.timeRange.endMs;
    });
  }

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
    this.annotations = [];
    this.renderers.clear();
    
    if (this.options.debugMode) {
      Utils.log('VideoAnnotationDrawer destroyed');
    }
  }
}
