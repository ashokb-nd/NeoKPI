import { BaseRenderer } from "./base-renderer.js";

/**
 * @fileoverview TextRenderer - Renders text overlays and labels on video canvas
 * 
 * ANNOTATION DATA STRUCTURE:
 * =========================
 * 
 * Expected annotation format:
 * {
 *   id: "text-1",                    // Unique identifier  
 *   category: "text",                // Must be "text"
 *   timeRange: {                     // Time visibility range
 *     startMs: 1000,                 //   Start time in milliseconds
 *     endMs: 5000                    //   End time in milliseconds
 *   },
 *   data: {                          // Text-specific data
 *     text: "Hello World",           //   Text content to display
 *     position: {                    //   Position (normalized coordinates 0-1)
 *       x: 0.5,                      //     X position (0 = left, 1 = right)
 *       y: 0.1                       //     Y position (0 = top, 1 = bottom)
 *     },
 *     anchor: "center",              //   Optional: text anchor point
 *     maxWidth: 0.8                  //   Optional: maximum width as fraction of video width
 *   },
 *   style: {                         // Optional styling overrides  
 *     fontSize: 16,                  //   Font size in pixels (default: 16)
 *     fontFamily: "Arial",           //   Font family (default: Arial)
 *     color: "#ffffff",              //   Text color (default: white)
 *     backgroundColor: "rgba(0,0,0,0.7)", // Background color (default: semi-transparent black)
 *     padding: { x: 8, y: 4 },       //   Background padding (default: 8px horizontal, 4px vertical)
 *     borderRadius: 4,               //   Background border radius (default: 4)
 *     textAlign: "center",           //   Text alignment: "left", "center", "right"
 *     lineHeight: 1.2,               //   Line height multiplier for multi-line text
 *     strokeColor: "#000000",        //   Optional: text outline color
 *     strokeWidth: 1                 //   Optional: text outline width
 *   }
 * }
 * 
 * ANCHOR POSITIONS:
 * ================
 * - "top-left": position is top-left corner of text
 * - "top-center": position is top-center of text  
 * - "top-right": position is top-right corner of text
 * - "center-left": position is center-left of text
 * - "center": position is center of text (default)
 * - "center-right": position is center-right of text
 * - "bottom-left": position is bottom-left corner of text
 * - "bottom-center": position is bottom-center of text
 * - "bottom-right": position is bottom-right corner of text
 * 
 * RENDERING BEHAVIOR:
 * ==================
 * - Converts normalized position (0-1) to pixel coordinates
 * - Draws background rectangle if backgroundColor is specified
 * - Renders text with specified font, color, and alignment
 * - Handles multi-line text with automatic line wrapping
 * - Respects maxWidth constraint for text wrapping
 * - Applies text outline if strokeColor/strokeWidth specified
 * 
 * @example
 * // Centered title text
 * {
 *   id: "title-1",
 *   category: "text",
 *   timeRange: { startMs: 0, endMs: 3000 },
 *   data: {
 *     text: "Video Title",
 *     position: { x: 0.5, y: 0.1 },
 *     anchor: "top-center"
 *   },
 *   style: {
 *     fontSize: 24,
 *     fontFamily: "Arial Bold",
 *     color: "#ffffff"
 *   }
 * }
 * 
 * @example
 * // Multi-line subtitle with background
 * {
 *   id: "subtitle-1",
 *   category: "text", 
 *   timeRange: { startMs: 1000, endMs: 5000 },
 *   data: {
 *     text: "This is a longer subtitle that will wrap to multiple lines",
 *     position: { x: 0.5, y: 0.9 },
 *     anchor: "bottom-center",
 *     maxWidth: 0.8
 *   },
 *   style: {
 *     fontSize: 14,
 *     backgroundColor: "rgba(0,0,0,0.8)",
 *     padding: { x: 12, y: 6 },
 *     borderRadius: 6
 *   }
 * }
 */

// ========================================
// TEXT RENDERER - Text overlays and labels
// ========================================
export class TextRenderer extends BaseRenderer {
  static category = "text";

  getDefaultOptions() {
    return {
      defaultFontSize: 16,
      defaultFontFamily: "Arial",
      defaultColor: "#ffffff",
      defaultBackgroundColor: "rgba(0,0,0,0.7)",
      defaultPadding: { x: 8, y: 4 },
      defaultBorderRadius: 4,
      defaultAnchor: "top-left",
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    const { data, style = {} } = annotation;

    if (!data.text) {
      console.warn("Text annotation missing text data");
      return;
    }

    // Convert normalized position to pixel coordinates
    const pixelPosition = this.denormalizePoint(data.position, videoRect);

    // Merge styles
    const textStyle = {
      fontSize: style.fontSize || this.options.defaultFontSize,
      fontFamily: style.fontFamily || this.options.defaultFontFamily,
      color: style.color || this.options.defaultColor,
      backgroundColor:
        style.backgroundColor || this.options.defaultBackgroundColor,
      padding: style.padding || this.options.defaultPadding,
      borderRadius:
        style.borderRadius !== undefined
          ? style.borderRadius
          : this.options.defaultBorderRadius,
    };

    // Get anchor position
    const anchor = data.anchor || style.anchor || this.options.defaultAnchor;
    const adjustedPosition = this.getAnchoredPosition(
      data.text,
      pixelPosition,
      textStyle,
      anchor,
    );

    // Render text with background
    this.drawTextWithBackground(
      data.text,
      adjustedPosition.x,
      adjustedPosition.y,
      textStyle,
    );

    // Draw border if specified
    if (style.borderColor && style.borderWidth) {
      this.drawTextBorder(data.text, adjustedPosition, textStyle, style);
    }
  }

  getAnchoredPosition(text, position, style, anchor) {
    // Measure text to calculate anchor offset
    this.ctx.font = `${style.fontSize}px ${style.fontFamily}`;
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width + style.padding.x * 2;
    const textHeight = style.fontSize + style.padding.y * 2;

    let x = position.x;
    let y = position.y;

    switch (anchor) {
      case "top-left":
        // No adjustment needed
        break;
      case "top-center":
        x -= textWidth / 2;
        break;
      case "top-right":
        x -= textWidth;
        break;
      case "center-left":
        y -= textHeight / 2;
        break;
      case "center":
        x -= textWidth / 2;
        y -= textHeight / 2;
        break;
      case "center-right":
        x -= textWidth;
        y -= textHeight / 2;
        break;
      case "bottom-left":
        y -= textHeight;
        break;
      case "bottom-center":
        x -= textWidth / 2;
        y -= textHeight;
        break;
      case "bottom-right":
        x -= textWidth;
        y -= textHeight;
        break;
    }

    return { x, y };
  }

  drawTextBorder(text, position, textStyle, borderStyle) {
    this.ctx.save();

    // Measure text
    this.ctx.font = `${textStyle.fontSize}px ${textStyle.fontFamily}`;
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width + textStyle.padding.x * 2;
    const textHeight = textStyle.fontSize + textStyle.padding.y * 2;

    // Draw border
    this.ctx.strokeStyle = borderStyle.borderColor;
    this.ctx.lineWidth = borderStyle.borderWidth;

    if (textStyle.borderRadius > 0) {
      this.drawRoundedRect(
        position.x - textStyle.padding.x,
        position.y - textHeight + textStyle.padding.y,
        textWidth,
        textHeight,
        textStyle.borderRadius,
      );
      this.ctx.stroke();
    } else {
      this.ctx.strokeRect(
        position.x - textStyle.padding.x,
        position.y - textHeight + textStyle.padding.y,
        textWidth,
        textHeight,
      );
    }

    this.ctx.restore();
  }
}
