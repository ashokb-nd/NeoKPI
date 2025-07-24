// ========================================
// BASE RENDERER - Abstract base class
// ========================================

// To implement a new renderer, extend this class and implement the abstract methods
//  1. get category() - return the unique type identifier for this renderer
//  2. getDefaultOptions() - return default options for this renderer
//  3. render(annotation, currentTimeMs, videoRect) - main rendering logic 

// use ctx, canvas through getters
//  - ctx: CanvasRenderingContext2D for drawing
//  - canvas: HTMLCanvasElement for the renderer's canvas





export class BaseRenderer {
  constructor(videoAnnotator, options = {}) {
    if (this.constructor === BaseRenderer) {
      throw new Error("BaseRenderer is abstract and cannot be instantiated");
    }

    this.videoAnnotator = videoAnnotator;
    this.video = videoAnnotator.video;
    this.options = { ...this.getDefaultOptions(), ...options };
    
    // Private state - each renderer gets its own canvas and state
    this._canvas = null;
    this._ctx = null;
    this._annotations = [];
    this._isVisible = false;
    this._lastRenderTime = -1;
    
    this._createCanvas();
  }


  // ========================================
  // PUBLIC API - Methods for external use
  // ========================================

  /**
   * Set the annotations for this renderer
   * @public
   * @param {Annotation[]} annotations - Array of all annotations
   */
  setAnnotations(annotations) {
    this._annotations = annotations.filter(ann => ann.category === this.category);
  }

  /**
   * Render at the specified time
   * @public
   * @param {number} currentTimeMs - Current time in milliseconds
   */
  renderAtTime(currentTimeMs) {
    if (!this._isVisible || !this._ctx) return;
    
    // Skip if time hasn't changed
    if (currentTimeMs === this._lastRenderTime) return;
    
    // Clear the canvas
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    
    // Get visible annotations at current time
    const visibleAnnotations = this._annotations.filter(ann => 
      this._isAnnotationVisible(ann, currentTimeMs)
    );
    
    // Render each visible annotation
    const videoRect = {
      width: this._canvas.width,
      height: this._canvas.height,
    };
    
    for (const annotation of visibleAnnotations) {
      try {
        this.render(annotation, currentTimeMs, videoRect);
      } catch (error) {
        console.error(`Error rendering annotation ${annotation.id}:`, error);
      }
    }
    
    this._lastRenderTime = currentTimeMs;
  }

  /**
   * Show this renderer's canvas
   * @public
   */
  show() {
    this._isVisible = true;
    this._canvas.style.display = "block";
  }

  /**
   * Hide this renderer's canvas  
   * @public
   */
  hide() {
    this._isVisible = false;
    this._canvas.style.display = "none";
  }

  /**
   * Resize the canvas
   * @public
   */
  resize() {
    this._positionCanvas();
  }

  /**
   * Destroy the renderer and cleanup
   * @public
   */
  destroy() {
    if (this._canvas && this._canvas.parentElement) {
      this._canvas.parentElement.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;
    this._annotations = [];
  }

  /**
   * Check if this renderer can render the given annotation
   * @public
   * @param {Annotation} annotation - The annotation to check
   * @returns {boolean} True if this renderer can handle the annotation
   */
  canRender(annotation) {
    return annotation.category === this.category;
  }

  // ========================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ========================================

  /**
   * Main render method - must be implemented by subclasses
   * @abstract
   * @param {Annotation} annotation - The annotation to render (single annotation item, not annotation manifest)
   * @param {number} currentTimeMs - Current time in milliseconds
   * @param {Object} videoRect - Video rectangle dimensions
   */
  render(annotation, currentTimeMs, videoRect) {
    throw new Error("render() method must be implemented by subclasses");
  }

  /**
   * Get renderer category - uses the static category property
   * @returns {string} The type identifier for this renderer
   */
  get category() {
    return this.constructor.category;
  }

  /**
   * Get default options for this renderer - can be overridden by subclasses
   * @protected
   * @returns {Object} Default options object
   */
  getDefaultOptions() {
    return {};
  }

  /**
   * Get z-index offset for this renderer type - can be overridden by subclasses for layering
   * @protected
   * @returns {number} Z-index offset relative to base z-index
   */
  getZIndexOffset() {
    return 0;
  }

  /**
   * Convert normalized bounding box to pixel coordinates
   * @protected
   * @param {object} normalized - Normalized bounding box {x, y, width, height}
   * @param {object} videoRect - Video rectangle dimensions
   * @returns {object} Pixel bounding box
   */
  denormalizeBoundingBox(normalized, videoRect) {
    return {
      x: normalized.x * videoRect.width,
      y: normalized.y * videoRect.height,
      width: normalized.width * videoRect.width,
      height: normalized.height * videoRect.height,
    };
  }

  /**
   * Convert normalized point to pixel coordinates
   * @protected
   * @param {object} normalized - Normalized point {x, y}
   * @param {object} videoRect - Video rectangle dimensions
   * @returns {object} Pixel point
   */
  denormalizePoint(normalized, videoRect) {
    return this._denormalizePoint(normalized, videoRect);
  }

  // ========================================
  // PRIVATE METHODS - Internal implementation details
  // ========================================

  /**
   * Create the renderer's own canvas
   * @private
   */
  _createCanvas() {
    this._canvas = document.createElement("canvas");
    this._canvas.className = `video-annotation-${this.category}-renderer`;
    
    // Get base z-index from video annotator and add renderer-specific offset
    const baseZIndex = this.videoAnnotator.options.canvasZIndex;
    const rendererOffset = this.getZIndexOffset();
    
    const canvasStyles = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${baseZIndex + rendererOffset};
      opacity: ${this.videoAnnotator.options.opacity};
      display: none;
    `;
    
    this._canvas.style.cssText = canvasStyles;
    this._ctx = this._canvas.getContext("2d");
    
    // Add to the same container as the main video
    const videoContainer = this.video.parentElement;
    if (videoContainer) {
      videoContainer.appendChild(this._canvas);
    }
    
    this._positionCanvas();
  }

  /**
   * Position the canvas to match the video
   * @private
   */
  _positionCanvas() {
    const videoRect = this.video.getBoundingClientRect();
    const containerRect = this.video.parentElement.getBoundingClientRect();

    this._canvas.style.left = `${videoRect.left - containerRect.left}px`;
    this._canvas.style.top = `${videoRect.top - containerRect.top}px`;
    this._canvas.style.width = `${videoRect.width}px`;
    this._canvas.style.height = `${videoRect.height}px`;

    this._canvas.width = videoRect.width;
    this._canvas.height = videoRect.height;
  }

  /**
   * Check if annotation is visible at current time
   * @private
   * @param {Annotation} annotation - The annotation to check
   * @param {number} currentTimeMs - Current time in milliseconds
   * @returns {boolean} True if annotation should be visible
   */
  _isAnnotationVisible(annotation, currentTimeMs) {
    if (!annotation.timeRange) return false;

    return (
      currentTimeMs >= annotation.timeRange.startMs &&
      currentTimeMs <= annotation.timeRange.endMs
    );
  }

  // ========================================
  // PROTECTED PROPERTIES - Accessible to subclasses
  // ========================================

  /**
   * Get the canvas context for rendering
   * @protected
   * @returns {CanvasRenderingContext2D} The 2D rendering context
   */
  get ctx() {
    return this._ctx;
  }

  /**
   * Get the canvas element
   * @protected
   * @returns {HTMLCanvasElement} The canvas element
   */
  get canvas() {
    return this._canvas;
  }

  // ========================================
  // UTILITY METHODS - Helper functions for subclasses
  // ========================================

  /**
   * Convert normalized coordinates to pixel coordinates
   * @protected
   * @param {number|object} normalized - Normalized coordinate(s)
   * @param {object} videoRect - Video rectangle dimensions
   * @returns {number|object} Pixel coordinate(s)
   */
  normalizedToPixels(normalized, videoRect) {
    if (typeof normalized === "number") {
      // Single coordinate - this shouldn't happen for positions, only for dimensions
      return normalized;
    }

    // Handle different coordinate types
    if (this._isBoundingBox(normalized)) {
      return this._denormalizeBoundingBox(normalized, videoRect);
    } else if (this._isPoint(normalized)) {
      return this._denormalizePoint(normalized, videoRect);
    }

    return normalized;
  }

  /**
   * Set canvas style properties
   * @protected
   * @param {Object} style - Style properties to apply
   */
  applyStyle(style) {
    if (style.borderColor) this._ctx.strokeStyle = style.borderColor;
    if (style.fillColor) this._ctx.fillStyle = style.fillColor;
    if (style.borderWidth) this._ctx.lineWidth = style.borderWidth;
    if (style.font) this._ctx.font = style.font;
    if (style.textAlign) this._ctx.textAlign = style.textAlign;
    if (style.textBaseline) this._ctx.textBaseline = style.textBaseline;
  }

  /**
   * Draw text with background
   * @protected
   * @param {string} text - Text to draw
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} style - Styling options
   * @returns {Object} Text dimensions {width, height}
   */
  drawTextWithBackground(text, x, y, style = {}) {
    const fontSize = style.fontSize || 12;
    const fontFamily = style.fontFamily || "Arial";
    const padding = style.padding || { x: 4, y: 2 };
    const borderRadius = style.borderRadius || 0;

    // Set font
    this._ctx.font = `${fontSize}px ${fontFamily}`;

    // Measure text
    const metrics = this._ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Background
    if (style.backgroundColor) {
      this._ctx.fillStyle = style.backgroundColor;

      if (borderRadius > 0) {
        this._drawRoundedRect(
          x - padding.x,
          y - textHeight - padding.y,
          textWidth + padding.x * 2,
          textHeight + padding.y * 2,
          borderRadius,
        );
        this._ctx.fill();
      } else {
        this._ctx.fillRect(
          x - padding.x,
          y - textHeight - padding.y,
          textWidth + padding.x * 2,
          textHeight + padding.y * 2,
        );
      }
    }

    // Text
    this._ctx.fillStyle = style.color || "#ffffff";
    this._ctx.textBaseline = "top";
    this._ctx.fillText(text, x, y - textHeight);

    return {
      width: textWidth + padding.x * 2,
      height: textHeight + padding.y * 2,
    };
  }

  /**
   * Interpolate between two values
   * @protected
   * @param {number} start - Start value
   * @param {number} end - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   */
  lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Get interpolated position for trajectory points
   * @protected
   * @param {Array} points - Array of trajectory points
   * @param {number} currentTimeMs - Current time in milliseconds
   * @param {string} interpolation - Interpolation method ("linear" or "bezier")
   * @returns {Object|null} Interpolated position or null
   */
  getInterpolatedPosition(points, currentTimeMs, interpolation = "linear") {
    if (points.length === 0) return null;
    if (points.length === 1) return points[0];

    // Find surrounding points
    let beforePoint = null;
    let afterPoint = null;
    let beforeIndex = -1;
    let afterIndex = -1;

    for (let i = 0; i < points.length - 1; i++) {
      if (
        currentTimeMs >= points[i].timeMs &&
        currentTimeMs <= points[i + 1].timeMs
      ) {
        beforePoint = points[i];
        afterPoint = points[i + 1];
        beforeIndex = i;
        afterIndex = i + 1;
        break;
      }
    }

    // If no surrounding points found, return closest
    if (!beforePoint || !afterPoint) {
      if (currentTimeMs <= points[0].timeMs) return points[0];
      if (currentTimeMs >= points[points.length - 1].timeMs)
        return points[points.length - 1];
      return null;
    }

    // Calculate interpolation factor
    const timeDiff = afterPoint.timeMs - beforePoint.timeMs;
    const t = timeDiff > 0 ? (currentTimeMs - beforePoint.timeMs) / timeDiff : 0;

    // Use bezier interpolation if requested and we have enough control points
    if (interpolation === "bezier" && points.length >= 3) {
      return this._bezierInterpolation(points, beforeIndex, afterIndex, t);
    }

    // Default to linear interpolation
    return {
      x: this.lerp(beforePoint.x, afterPoint.x, t),
      y: this.lerp(beforePoint.y, afterPoint.y, t),
      timeMs: currentTimeMs,
    };
  }

  /**
   * Perform cubic bezier interpolation between trajectory points
   * @private
   * @param {Array} points - All trajectory points
   * @param {number} beforeIndex - Index of point before current time
   * @param {number} afterIndex - Index of point after current time
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} Interpolated position
   */
  _bezierInterpolation(points, beforeIndex, afterIndex, t) {
    const p1 = points[beforeIndex];
    const p2 = points[afterIndex];
    
    // Get control points for cubic bezier curve
    const control1 = this._getControlPoint(points, beforeIndex, true);
    const control2 = this._getControlPoint(points, afterIndex, false);
    
    // Cubic bezier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    
    return {
      x: mt3 * p1.x + 3 * mt2 * t * control1.x + 3 * mt * t2 * control2.x + t3 * p2.x,
      y: mt3 * p1.y + 3 * mt2 * t * control1.y + 3 * mt * t2 * control2.y + t3 * p2.y,
      timeMs: p1.timeMs + t * (p2.timeMs - p1.timeMs)
    };
  }
  
  /**
   * Calculate control point for cubic bezier curve
   * @private
   * @param {Array} points - All trajectory points
   * @param {number} index - Current point index
   * @param {boolean} isFirst - Whether this is the first control point of the segment
   * @returns {Object} Control point {x, y}
   */
  _getControlPoint(points, index, isFirst) {
    const current = points[index];
    
    // Handle edge cases
    if (points.length < 3) return current;
    
    let prev, next;
    
    if (isFirst) {
      // First control point - look backward
      prev = index > 0 ? points[index - 1] : current;
      next = points[index + 1] || current;
    } else {
      // Second control point - look forward
      prev = points[index - 1] || current;
      next = index < points.length - 1 ? points[index + 1] : current;
    }
    
    // Calculate tangent vector
    const tangentX = (next.x - prev.x) * 0.3; // Smoothing factor
    const tangentY = (next.y - prev.y) * 0.3;
    
    // Apply tangent in appropriate direction
    const direction = isFirst ? 1 : -1;
    
    return {
      x: current.x + direction * tangentX,
      y: current.y + direction * tangentY
    };
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Check if object is a bounding box (has width and height)
   * @private
   * @param {Object} obj - Object to check
   * @returns {boolean} True if object is a bounding box
   */
  _isBoundingBox(obj) {
    return obj && obj.width !== undefined && obj.height !== undefined;
  }

  /**
   * Check if object is a point (has x and y but no width/height)
   * @private
   * @param {Object} obj - Object to check
   * @returns {boolean} True if object is a point
   */
  _isPoint(obj) {
    return obj && obj.x !== undefined && obj.y !== undefined && 
           obj.width === undefined && obj.height === undefined;
  }

  /**
   * Convert normalized bounding box to pixel coordinates
   * @private
   * @param {Object} bbox - Normalized bounding box {x, y, width, height}
   * @param {Object} videoRect - Video dimensions {width, height}
   * @returns {Object} Pixel bounding box {x, y, width, height}
   */
  _denormalizeBoundingBox(bbox, videoRect) {
    return {
      x: (bbox.x || 0) * videoRect.width,
      y: (bbox.y || 0) * videoRect.height,
      width: bbox.width * videoRect.width,
      height: bbox.height * videoRect.height,
    };
  }

  /**
   * Convert normalized point to pixel coordinates
   * @private
   * @param {Object} point - Normalized point {x, y}
   * @param {Object} videoRect - Video dimensions {width, height}
   * @returns {Object} Pixel point {x, y}
   */
  _denormalizePoint(point, videoRect) {
    return {
      x: point.x * videoRect.width,
      y: point.y * videoRect.height,
    };
  }

  /**
   * Draw rounded rectangle path
   * @protected
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} radius - Border radius
   */
  drawRoundedRect(x, y, width, height, radius) {
    this._drawRoundedRect(x, y, width, height, radius);
  }

  /**
   * Draw rounded rectangle path
   * @private
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} radius - Border radius
   */
  _drawRoundedRect(x, y, width, height, radius) {
    this._ctx.beginPath();
    this._ctx.moveTo(x + radius, y);
    this._ctx.lineTo(x + width - radius, y);
    this._ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this._ctx.lineTo(x + width, y + height - radius);
    this._ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
    );
    this._ctx.lineTo(x + radius, y + height);
    this._ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this._ctx.lineTo(x, y + radius);
    this._ctx.quadraticCurveTo(x, y, x + radius, y);
    this._ctx.closePath();
  }
}
