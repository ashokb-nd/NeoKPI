// ========================================
// BASE RENDERER - Abstract base class
// ========================================
export class BaseRenderer {
  constructor(drawer, options = {}) {
    if (this.constructor === BaseRenderer) {
      throw new Error("BaseRenderer is abstract and cannot be instantiated");
    }

    this.drawer = drawer;
    this.ctx = drawer.ctx;
    this.options = { ...this.getDefaultOptions(), ...options };
  }

  /**
   * Get default options for this renderer
   */
  getDefaultOptions() {
    return {};
  }

  /**
   * Check if this renderer can render the given annotation
   */
  canRender(annotation) {
    return annotation.type === this.getType();
  }

  /**
   * Main render method - must be implemented by subclasses
   */
  render(annotation, currentTimeMs, videoRect) {
    throw new Error("render() method must be implemented by subclasses");
  }

  /**
   * Check if annotation is visible at current time
   */
  isVisible(annotation, currentTimeMs) {
    if (!annotation.timeRange) return false;

    return (
      currentTimeMs >= annotation.timeRange.startMs &&
      currentTimeMs <= annotation.timeRange.endMs
    );
  }

  /**
   * Get renderer type - must be implemented by subclasses
   */
  getType() {
    throw new Error("getType() method must be implemented by subclasses");
  }

  /**
   * Convert normalized coordinates to pixel coordinates
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
    if (this.isBoundingBox(normalized)) {
      return this.denormalizeBoundingBox(normalized, videoRect);
    } else if (this.isPoint(normalized)) {
      return this.denormalizePoint(normalized, videoRect);
    }

    return normalized;
  }

  /**
   * Check if object is a bounding box (has width and height)
   */
  isBoundingBox(obj) {
    return obj && obj.width !== undefined && obj.height !== undefined;
  }

  /**
   * Check if object is a point (has x and y but no width/height)
   */
  isPoint(obj) {
    return obj && obj.x !== undefined && obj.y !== undefined && 
           obj.width === undefined && obj.height === undefined;
  }

  /**
   * Convert normalized bounding box to pixel coordinates
   * @param {object} bbox - Normalized bounding box {x, y, width, height}
   * @param {object} videoRect - Video dimensions {width, height}
   * @returns {object} Pixel bounding box {x, y, width, height}
   */
  denormalizeBoundingBox(bbox, videoRect) {
    return {
      x: (bbox.x || 0) * videoRect.width,
      y: (bbox.y || 0) * videoRect.height,
      width: bbox.width * videoRect.width,
      height: bbox.height * videoRect.height,
    };
  }

  /**
   * Convert normalized point to pixel coordinates
   * @param {object} point - Normalized point {x, y}
   * @param {object} videoRect - Video dimensions {width, height}
   * @returns {object} Pixel point {x, y}
   */
  denormalizePoint(point, videoRect) {
    return {
      x: point.x * videoRect.width,
      y: point.y * videoRect.height,
    };
  }

  /**
   * Set canvas style properties
   */
  applyStyle(style) {
    if (style.borderColor) this.ctx.strokeStyle = style.borderColor;
    if (style.fillColor) this.ctx.fillStyle = style.fillColor;
    if (style.borderWidth) this.ctx.lineWidth = style.borderWidth;
    if (style.font) this.ctx.font = style.font;
    if (style.textAlign) this.ctx.textAlign = style.textAlign;
    if (style.textBaseline) this.ctx.textBaseline = style.textBaseline;
  }

  /**
   * Draw text with background
   */
  drawTextWithBackground(text, x, y, style = {}) {
    const fontSize = style.fontSize || 12;
    const fontFamily = style.fontFamily || "Arial";
    const padding = style.padding || { x: 4, y: 2 };
    const borderRadius = style.borderRadius || 0;

    // Set font
    this.ctx.font = `${fontSize}px ${fontFamily}`;

    // Measure text
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Background
    if (style.backgroundColor) {
      this.ctx.fillStyle = style.backgroundColor;

      if (borderRadius > 0) {
        this.drawRoundedRect(
          x - padding.x,
          y - textHeight - padding.y,
          textWidth + padding.x * 2,
          textHeight + padding.y * 2,
          borderRadius,
        );
        this.ctx.fill();
      } else {
        this.ctx.fillRect(
          x - padding.x,
          y - textHeight - padding.y,
          textWidth + padding.x * 2,
          textHeight + padding.y * 2,
        );
      }
    }

    // Text
    this.ctx.fillStyle = style.color || "#ffffff";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(text, x, y - textHeight);

    return {
      width: textWidth + padding.x * 2,
      height: textHeight + padding.y * 2,
    };
  }

  /**
   * Draw rounded rectangle path
   */
  drawRoundedRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * Interpolate between two values
   */
  lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Get interpolated position for trajectory points
   */
  getInterpolatedPosition(points, currentTimeMs, interpolation = "linear") {
    if (points.length === 0) return null;
    if (points.length === 1) return points[0];

    // Find surrounding points
    let beforePoint = null;
    let afterPoint = null;

    for (let i = 0; i < points.length - 1; i++) {
      if (
        currentTimeMs >= points[i].timeMs &&
        currentTimeMs <= points[i + 1].timeMs
      ) {
        beforePoint = points[i];
        afterPoint = points[i + 1];
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
    const t =
      timeDiff > 0 ? (currentTimeMs - beforePoint.timeMs) / timeDiff : 0;

    // Interpolate position
    return {
      x: this.lerp(beforePoint.x, afterPoint.x, t),
      y: this.lerp(beforePoint.y, afterPoint.y, t),
      timeMs: currentTimeMs,
    };
  }
}
