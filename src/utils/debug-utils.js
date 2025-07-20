/**
 * Debug Utilities for Annotation System
 * 
 * Contains helper functions for creating test data, debugging annotation rendering,
 * and providing console utilities for development and troubleshooting.
 */

import { AnnotationManifest, Annotation } from '../features/annotations/annotation-manifest.js';
import annotationSamples from '../data/annotation-samples.json';

/**
 * Sample annotation data factory
 * Creates various types of test annotations for debugging purposes
 */
export const AnnotationSamples = {
  /**
   * Create a comprehensive sample with different annotation types
   * @returns {AnnotationManifest}
   */
  createFullSample() {
    return AnnotationManifest.fromJSON(annotationSamples.fullSample);
  },

  /**
   * Create detection-only sample for testing bounding boxes
   * @returns {AnnotationManifest}
   */
  createDetectionSample() {
    return AnnotationManifest.fromJSON(annotationSamples.detectionSample);
  },

  /**
   * Create cross-only sample for canvas debugging
   * @returns {AnnotationManifest}
   */
  createCrossSample() {
    return AnnotationManifest.fromJSON(annotationSamples.crossSample);
  },

  /**
   * Create text annotation sample
   * @returns {AnnotationManifest}
   */
  createTextSample() {
    return AnnotationManifest.fromJSON(annotationSamples.textSample);
  },

  /**
   * Create multi-time sample with different visibility windows
   * @returns {AnnotationManifest}
   */
  createTimeBasedSample() {
    return AnnotationManifest.fromJSON(annotationSamples.timeBasedSample);
  }
};

/**
 * Canvas and rendering debug utilities
 */
export const RenderingDebug = {
  /**
   * Draw manual test shapes on canvas for debugging positioning
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} canvasSize - {width, height}
   */
  drawTestShapes(ctx, canvasSize) {
    ctx.save();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Draw corner-to-corner cross (magenta)
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvasSize.width, canvasSize.height);
    ctx.moveTo(canvasSize.width, 0);
    ctx.lineTo(0, canvasSize.height);
    ctx.stroke();
    
    // Draw center cross (cyan)
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvasSize.width / 2, 0);
    ctx.lineTo(canvasSize.width / 2, canvasSize.height);
    ctx.moveTo(0, canvasSize.height / 2);
    ctx.lineTo(canvasSize.width, canvasSize.height / 2);
    ctx.stroke();
    
    // Draw test rectangle (red)
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 50, 200, 100);
    
    // Draw test circle (green)
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(150, 200, 30, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw corner markers (yellow)
    ctx.fillStyle = "#ffff00";
    const markerSize = 10;
    // Top-left
    ctx.fillRect(0, 0, markerSize, markerSize);
    // Top-right
    ctx.fillRect(canvasSize.width - markerSize, 0, markerSize, markerSize);
    // Bottom-left
    ctx.fillRect(0, canvasSize.height - markerSize, markerSize, markerSize);
    // Bottom-right
    ctx.fillRect(canvasSize.width - markerSize, canvasSize.height - markerSize, markerSize, markerSize);
    
    // Draw text
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.fillText("Canvas Debug Test", 20, 30);
    ctx.fillText(`Size: ${canvasSize.width}x${canvasSize.height}`, 20, 280);
    
    ctx.restore();
  },

  /**
   * Manually draw detection boxes to test coordinate conversion
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} canvasSize - {width, height}
   */
  drawTestDetections(ctx, canvasSize) {
    ctx.save();
    
    // Test detection box 1 - normalized coordinates (0.1, 0.1, 0.2, 0.3)
    const box1 = {
      x: 0.1 * canvasSize.width,
      y: 0.1 * canvasSize.height, 
      width: 0.2 * canvasSize.width,
      height: 0.3 * canvasSize.height
    };
    
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.strokeRect(box1.x, box1.y, box1.width, box1.height);
    
    // Label for box 1
    ctx.fillStyle = "#ff0000";
    ctx.font = "14px Arial";
    ctx.fillText("TEST VEHICLE", box1.x, box1.y - 5);
    
    // Test detection box 2 - normalized coordinates (0.5, 0.2, 0.15, 0.25)
    const box2 = {
      x: 0.5 * canvasSize.width,
      y: 0.2 * canvasSize.height,
      width: 0.15 * canvasSize.width, 
      height: 0.25 * canvasSize.height
    };
    
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;
    ctx.strokeRect(box2.x, box2.y, box2.width, box2.height);
    
    // Label for box 2
    ctx.fillStyle = "#00ff00";
    ctx.font = "14px Arial";
    ctx.fillText("TEST PERSON", box2.x, box2.y - 5);
    
    console.log("Manual detection boxes drawn:");
    console.log("Vehicle box:", box1);
    console.log("Person box:", box2);
    
    ctx.restore();
  },

  /**
   * Log detailed canvas and context information
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  logCanvasInfo(canvas, ctx) {
    console.group("🎨 Canvas Debug Information");
    
    console.log("Canvas Element:", canvas);
    console.log("Canvas Context:", ctx);
    console.log("Canvas Size:", `${canvas.width}x${canvas.height}`);
    console.log("Canvas Style:", canvas.style.cssText);
    console.log("Canvas Position:", {
      offsetTop: canvas.offsetTop,
      offsetLeft: canvas.offsetLeft,
      clientTop: canvas.clientTop,
      clientLeft: canvas.clientLeft
    });
    
    const rect = canvas.getBoundingClientRect();
    console.log("Canvas BoundingRect:", rect);
    
    console.log("Context Properties:", {
      fillStyle: ctx.fillStyle,
      strokeStyle: ctx.strokeStyle,
      lineWidth: ctx.lineWidth,
      globalAlpha: ctx.globalAlpha,
      font: ctx.font
    });
    
    console.groupEnd();
  }
};

/**
 * System diagnostic utilities
 */
export const SystemDebug = {
  /**
   * Get comprehensive annotation system status
   * @param {Map} annotators - AnnotationManager.annotators
   * @returns {Object}
   */
  getSystemStatus(annotators) {
    const status = {
      totalVideos: annotators.size,
      videos: [],
      totalAnnotations: 0,
      rendererTypes: new Set()
    };

    annotators.forEach((annotator, video) => {
      const videoInfo = {
        src: video.src || "no src",
        currentTime: video.currentTime,
        currentTimeMs: video.currentTime * 1000,
        paused: video.paused,
        canvasVisible: annotator.isVisible,
        canvasSize: {
          width: annotator.canvas.width,
          height: annotator.canvas.height
        },
        annotationCount: annotator.manifest ? annotator.manifest.count : 0,
        renderers: Array.from(annotator.renderers.keys())
      };

      if (annotator.manifest) {
        status.totalAnnotations += annotator.manifest.count;
        const visibleAnnotations = annotator.getVisibleAnnotations(videoInfo.currentTimeMs);
        videoInfo.visibleAnnotations = visibleAnnotations.length;
        videoInfo.visibleCategories = visibleAnnotations.map(a => a.category);
      } else {
        videoInfo.visibleAnnotations = 0;
        videoInfo.visibleCategories = [];
      }

      // Collect all renderer types
      annotator.renderers.forEach((_, type) => {
        status.rendererTypes.add(type);
      });

      status.videos.push(videoInfo);
    });

    status.rendererTypes = Array.from(status.rendererTypes);
    
    return status;
  },

  /**
   * Log system status in a readable format
   * @param {Map} annotators - AnnotationManager.annotators
   */
  logSystemStatus(annotators) {
    const status = this.getSystemStatus(annotators);
    
    console.group("🔍 Annotation System Status");
    console.log(`📊 Overview: ${status.totalVideos} videos, ${status.totalAnnotations} annotations`);
    console.log(`🎨 Available renderers: ${status.rendererTypes.join(', ')}`);
    
    status.videos.forEach((video, index) => {
      console.group(`📹 Video ${index + 1}`);
      console.log(`Source: ${video.src}`);
      console.log(`Time: ${video.currentTime.toFixed(2)}s (${video.currentTimeMs}ms)`);
      console.log(`Status: ${video.paused ? 'Paused' : 'Playing'}`);
      console.log(`Canvas: ${video.canvasVisible ? 'Visible' : 'Hidden'} (${video.canvasSize.width}x${video.canvasSize.height})`);
      console.log(`Annotations: ${video.annotationCount} total, ${video.visibleAnnotations} visible`);
      if (video.visibleCategories.length > 0) {
        console.log(`Visible categories: ${video.visibleCategories.join(', ')}`);
      }
      console.groupEnd();
    });
    
    console.groupEnd();
    
    return status;
  }
};
