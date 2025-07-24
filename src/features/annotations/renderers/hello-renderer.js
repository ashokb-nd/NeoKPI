import { BaseRenderer } from "./base-renderer.js";

/**
 * @fileoverview HelloRenderer - Simple message display for demos and debugging
 * 
 * ANNOTATION DATA STRUCTURE:
 * =========================
 * 
 * Expected annotation format:
 * {
 *   id: "hello-1",                   // Unique identifier
 *   category: "hello",               // Must be "hello"
 *   timeRange: {                     // Time visibility range
 *     startMs: 1000,                 //   Start time in milliseconds  
 *     endMs: 4000                    //   End time in milliseconds
 *   },
 *   data: {                          // Hello-specific data
 *     message: "Hello World!",       //   Message text to display
 *     position: "center"             //   Optional: "center", "top", "bottom", "left", "right"
 *   },
 *   style: {                         // Optional styling overrides
 *     fontSize: "24px",              //   Font size (default: 24px)
 *     fontFamily: "Arial, sans-serif", // Font family (default: Arial)
 *     textColor: "#ffffff",          //   Text color (default: white)
 *     backgroundColor: "rgba(0,0,0,0.7)", // Background color (default: semi-transparent black)
 *     padding: 10,                   //   Background padding in pixels (default: 10)
 *     borderRadius: 5                //   Background border radius (default: 5)
 *   }
 * }
 * 
 * POSITION OPTIONS:
 * ================
 * - "center": Center of video (default)
 * - "top": Top center of video
 * - "bottom": Bottom center of video  
 * - "left": Left center of video
 * - "right": Right center of video
 * 
 * RENDERING BEHAVIOR:
 * ==================
 * - Displays simple text message with background
 * - Centers text at specified position on video canvas
 * - Draws rounded rectangle background for better readability
 * - Automatically measures text to size background appropriately
 * - Useful for simple notifications, debugging, or demo purposes
 * 
 * @example
 * // Simple centered hello message
 * {
 *   id: "welcome-msg",
 *   category: "hello",
 *   timeRange: { startMs: 0, endMs: 3000 },
 *   data: {
 *     message: "Welcome to the Video!",
 *     position: "center"
 *   }
 * }
 * 
 * @example
 * // Custom styled notification at bottom
 * {
 *   id: "debug-info",
 *   category: "hello",
 *   timeRange: { startMs: 5000, endMs: 8000 },
 *   data: {
 *     message: "Debug Mode: ON",
 *     position: "bottom"
 *   },
 *   style: {
 *     fontSize: "16px",
 *     textColor: "#ffff00",
 *     backgroundColor: "rgba(255,0,0,0.8)",
 *     padding: 15
 *   }
 * }
 */

// ========================================
// HELLO RENDERER - Simple message display
// ========================================
export class HelloRenderer extends BaseRenderer {
  static category = "hello";

  getDefaultOptions() {
    return {
      defaultFontSize: "24px",
      defaultFontFamily: "Arial, sans-serif",
      defaultTextColor: "#ffffff",
      defaultBackgroundColor: "rgba(0, 0, 0, 0.7)",
      defaultPadding: 10,
      defaultBorderRadius: 5,
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    const { data, style = {} } = annotation;
    const message = data.message || "Hello!";

    // Save context
    this.ctx.save();

    // Set font and text styles
    const fontSize = style.fontSize || this.options.defaultFontSize;
    const fontFamily = style.fontFamily || this.options.defaultFontFamily;
    const textColor = style.textColor || this.options.defaultTextColor;
    const backgroundColor = style.backgroundColor || this.options.defaultBackgroundColor;
    const padding = style.padding || this.options.defaultPadding;
    const borderRadius = style.borderRadius || this.options.defaultBorderRadius;

    this.ctx.font = `${fontSize} ${fontFamily}`;
    this.ctx.fillStyle = textColor;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";

    // Measure text for background box
    const textMetrics = this.ctx.measureText(message);
    const textWidth = textMetrics.width;
    const textHeight = parseInt(fontSize);

    // Calculate position (centered horizontally, near top)
    const x = videoRect.width / 2;
    const y = 20;

    // Draw background box
    const boxX = x - textWidth / 2 - padding;
    const boxY = y - padding;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = textHeight + padding * 2;

    // Draw background box with rounded corners
    this.ctx.fillStyle = backgroundColor;
    
    // Draw rounded rectangle background (fallback for older browsers)
    this.ctx.beginPath();
    if (this.ctx.roundRect) {
      // Modern browsers with roundRect support
      this.ctx.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    } else {
      // Fallback: simple rectangle for older browsers
      this.ctx.rect(boxX, boxY, boxWidth, boxHeight);
    }
    this.ctx.fill();

    // Draw the text
    this.ctx.fillStyle = textColor;
    this.ctx.fillText(message, x, y);

    // Restore context
    this.ctx.restore();
  }
}
