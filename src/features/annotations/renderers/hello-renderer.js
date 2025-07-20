import { BaseRenderer } from "./base-renderer.js";

// ========================================
// HELLO RENDERER - Simple message display
// ========================================
export class HelloRenderer extends BaseRenderer {
  getType() {
    return "hello";
  }

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
    if (!this.isVisible(annotation, currentTimeMs)) return;

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
