import { BaseRenderer } from "./base-renderer.js";

// ========================================
// CROSS RENDERER - Debug cross patterns
// ========================================
export class CrossRenderer extends BaseRenderer {
  getType() {
    return "cross";
  }

  getDefaultOptions() {
    return {
      defaultStrokeColor: "#ff00ff", // Magenta
      defaultLineWidth: 3,
      defaultOpacity: 0.8,
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    if (!this.isVisible(annotation, currentTimeMs)) return;

    const { data, style = {} } = annotation;
    const strokeColor = style.strokeColor || this.options.defaultStrokeColor;
    const lineWidth = style.lineWidth || this.options.defaultLineWidth;

    // Save context
    this.ctx.save();

    // Set styles
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.globalAlpha = style.opacity || this.options.defaultOpacity;

    // Draw cross from corner to corner
    this.ctx.beginPath();
    
    // Diagonal line from top-left to bottom-right
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(videoRect.width, videoRect.height);
    
    // Diagonal line from top-right to bottom-left
    this.ctx.moveTo(videoRect.width, 0);
    this.ctx.lineTo(0, videoRect.height);
    
    this.ctx.stroke();

    // Optionally draw center lines as well
    if (data.includeCenterLines) {
      this.ctx.beginPath();
      
      // Horizontal center line
      this.ctx.moveTo(0, videoRect.height / 2);
      this.ctx.lineTo(videoRect.width, videoRect.height / 2);
      
      // Vertical center line
      this.ctx.moveTo(videoRect.width / 2, 0);
      this.ctx.lineTo(videoRect.width / 2, videoRect.height);
      
      this.ctx.stroke();
    }

    // Draw debug text if specified
    if (data.debugText) {
      this.ctx.fillStyle = strokeColor;
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(
        data.debugText,
        videoRect.width / 2,
        30
      );
    }

    // Restore context
    this.ctx.restore();
  }
}
