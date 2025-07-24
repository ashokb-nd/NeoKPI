import { BaseRenderer } from "./base-renderer.js";

/**
 * @fileoverview CrossRenderer - Renders debug cross patterns on video canvas
 * 
 * ANNOTATION DATA STRUCTURE:
 * =========================
 * 
 * Expected annotation format:
 * {
 *   id: "cross-1",                    // Unique identifier
 *   category: "cross",                // Must be "cross" 
 *   timeRange: {                      // Time visibility range
 *     startMs: 1000,                  //   Start time in milliseconds
 *     endMs: 5000                     //   End time in milliseconds  
 *   },
 *   data: {                          // Cross-specific data
 *     includeCenterLines: true,       //   Optional: draw horizontal/vertical center lines
 *     debugText: "Debug Info"         //   Optional: text to display at top center
 *   },
 *   style: {                         // Optional styling overrides
 *     strokeColor: "#ff00ff",         //   Line color (default: magenta)
 *     lineWidth: 3,                   //   Line thickness (default: 3)
 *     opacity: 0.8                    //   Transparency (default: 0.8)
 *   }
 * }
 * 
 * RENDERING BEHAVIOR:
 * ==================
 * - Draws diagonal lines from corner to corner across entire video canvas
 * - Optionally includes horizontal and vertical center lines if includeCenterLines=true
 * - Displays debug text at top center if debugText is provided
 * - Useful for debugging video positioning, alignment, and canvas boundaries
 * 
 * @example
 * // Full screen debug cross with center lines
 * {
 *   id: "debug-cross",
 *   category: "cross", 
 *   timeRange: { startMs: 0, endMs: 10000 },
 *   data: {
 *     includeCenterLines: true,
 *     debugText: "Video Alignment Check"
 *   }
 * }
 * 
 * @example
 * // Simple diagonal cross only
 * {
 *   id: "simple-cross",
 *   category: "cross",
 *   timeRange: { startMs: 2000, endMs: 4000 },
 *   data: {},
 *   style: { strokeColor: "#00ff00", lineWidth: 5 }
 * }
 */

// ========================================
// CROSS RENDERER - Debug cross patterns
// ========================================
export class CrossRenderer extends BaseRenderer {
  static category = "cross";

  getDefaultOptions() {
    return {
      defaultStrokeColor: "#ff00ff", // Magenta
      defaultLineWidth: 2,
      defaultOpacity: 0.8,
    };
  }

  render(annotation, currentTimeMs, videoRect) {
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
