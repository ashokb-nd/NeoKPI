import { BaseRenderer } from "./base-renderer.js";

// ========================================
// DETECTION RENDERER - Bounding boxes and labels
// ========================================
export class DetectionRenderer extends BaseRenderer {
  getType() {
    return "detection";
  }

  getDefaultOptions() {
    return {
      defaultBorderColor: "#ff0000",
      defaultBorderWidth: 2,
      defaultFillOpacity: 0.1,
      defaultLabelPosition: "top-left",
      defaultShowLabel: true,
      defaultLabelStyle: {
        fontSize: 12,
        fontFamily: "Arial",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: { x: 4, y: 2 },
        borderRadius: 3,
      },
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    console.log("🔍 DetectionRenderer.render() called:", {
      annotation: annotation,
      currentTimeMs: currentTimeMs,
      videoRect: videoRect,
      isVisible: this.isVisible(annotation, currentTimeMs)
    });

    if (!this.isVisible(annotation, currentTimeMs)) {
      console.log("⚠️ DetectionRenderer: annotation not visible at current time");
      return;
    }

    const { data, style = {} } = annotation;

    if (!data.bbox) {
      console.warn("❌ DetectionRenderer: annotation missing bbox data", data);
      return;
    }

    console.log("🎯 DetectionRenderer: processing bbox", data.bbox);

    // Convert normalized bbox to pixel coordinates
    const pixelBbox = this.denormalizeBoundingBox(data.bbox, videoRect);
    
    console.log("📐 DetectionRenderer: pixel coordinates", {
      normalized: data.bbox,
      pixel: pixelBbox,
      videoRect: videoRect
    });

    // Draw bounding box
    this.drawBoundingBox(pixelBbox, style);

    // Draw label if enabled
    if (style.showLabel !== false && this.options.defaultShowLabel) {
      this.drawLabel(annotation, pixelBbox, style);
    }

    console.log("✅ DetectionRenderer: render complete");

    // Draw confidence bar if present
    if (data.confidence !== undefined && style.showConfidence) {
      this.drawConfidenceBar(data.confidence, pixelBbox, style);
    }
  }

  drawBoundingBox(bbox, style) {
    console.log("🎨 DetectionRenderer.drawBoundingBox() called:", {
      bbox: bbox,
      style: style,
      ctx: this.ctx
    });

    const borderColor = style.borderColor || this.options.defaultBorderColor;
    const borderWidth = style.borderWidth || this.options.defaultBorderWidth;
    const fillOpacity = style.fillOpacity || this.options.defaultFillOpacity;

    console.log("🖌️ DetectionRenderer: drawing with styles", {
      borderColor: borderColor,
      borderWidth: borderWidth,
      fillOpacity: fillOpacity
    });

    // Save context
    this.ctx.save();

    // Set stroke style
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = borderWidth;

    console.log("📦 DetectionRenderer: drawing rectangle", bbox);
    
    // Draw border
    this.ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);

    // Draw fill if opacity > 0
    if (fillOpacity > 0) {
      // Parse color and add alpha
      const fillColor = this.addOpacityToColor(borderColor, fillOpacity);
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
      console.log("🎨 DetectionRenderer: filled rectangle with", fillColor);
    }

    // Restore context
    this.ctx.restore();
    
    console.log("✅ DetectionRenderer.drawBoundingBox() complete");
  }

  drawLabel(annotation, bbox, style) {
    const { data } = annotation;
    const labelStyle = {
      ...this.options.defaultLabelStyle,
      ...style.labelStyle,
    };
    const labelPosition =
      style.labelPosition || this.options.defaultLabelPosition;

    // Create label text
    let labelText = "";

    if (data.class) {
      labelText = data.class;
    }

    if (data.confidence !== undefined) {
      const confidencePercent = Math.round(data.confidence * 100);
      labelText += labelText
        ? ` ${confidencePercent}%`
        : `${confidencePercent}%`;
    }

    if (data.trackId && style.showTrackId) {
      labelText += labelText ? ` [${data.trackId}]` : `[${data.trackId}]`;
    }

    if (!labelText) return;

    // Calculate label position
    const labelPos = this.getLabelPosition(bbox, labelPosition);

    // Draw text with background
    this.drawTextWithBackground(labelText, labelPos.x, labelPos.y, labelStyle);
  }

  drawConfidenceBar(confidence, bbox, style) {
    const barHeight = style.confidenceBarHeight || 4;
    const barColor = style.confidenceBarColor || "#00ff00";

    const barWidth = bbox.width * confidence;
    const barY = bbox.y + bbox.height + 2;

    // Background bar
    this.ctx.fillStyle = "rgba(255,255,255,0.3)";
    this.ctx.fillRect(bbox.x, barY, bbox.width, barHeight);

    // Confidence bar
    this.ctx.fillStyle = barColor;
    this.ctx.fillRect(bbox.x, barY, barWidth, barHeight);
  }

  getLabelPosition(bbox, position) {
    const margin = 2;

    switch (position) {
      case "top-left":
        return { x: bbox.x, y: bbox.y - margin };
      case "top-right":
        return { x: bbox.x + bbox.width, y: bbox.y - margin };
      case "bottom-left":
        return { x: bbox.x, y: bbox.y + bbox.height + margin };
      case "bottom-right":
        return { x: bbox.x + bbox.width, y: bbox.y + bbox.height + margin };
      case "center":
        return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
      default:
        return { x: bbox.x, y: bbox.y - margin };
    }
  }

  addOpacityToColor(color, opacity) {
    // Simple color parsing - handles hex colors
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // If already rgba/rgb, return as-is (this is simplified)
    return color;
  }
}
