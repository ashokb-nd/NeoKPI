import { BaseRenderer } from './base-renderer.js';

// ========================================
// TEXT RENDERER - Text overlays and labels
// ========================================
export class TextRenderer extends BaseRenderer {
  getType() {
    return 'text';
  }

  getDefaultOptions() {
    return {
      defaultFontSize: 16,
      defaultFontFamily: 'Arial',
      defaultColor: '#ffffff',
      defaultBackgroundColor: 'rgba(0,0,0,0.7)',
      defaultPadding: { x: 8, y: 4 },
      defaultBorderRadius: 4,
      defaultAnchor: 'top-left'
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    if (!this.isVisible(annotation, currentTimeMs)) return;

    const { data, style = {} } = annotation;
    
    if (!data.text) {
      console.warn('Text annotation missing text data');
      return;
    }

    // Convert normalized position to pixel coordinates
    const pixelPosition = this.normalizedToPixels(data.position, videoRect);

    // Merge styles
    const textStyle = {
      fontSize: style.fontSize || this.options.defaultFontSize,
      fontFamily: style.fontFamily || this.options.defaultFontFamily,
      color: style.color || this.options.defaultColor,
      backgroundColor: style.backgroundColor || this.options.defaultBackgroundColor,
      padding: style.padding || this.options.defaultPadding,
      borderRadius: style.borderRadius !== undefined ? style.borderRadius : this.options.defaultBorderRadius
    };

    // Get anchor position
    const anchor = data.anchor || style.anchor || this.options.defaultAnchor;
    const adjustedPosition = this.getAnchoredPosition(
      data.text, 
      pixelPosition, 
      textStyle, 
      anchor
    );

    // Render text with background
    this.drawTextWithBackground(data.text, adjustedPosition.x, adjustedPosition.y, textStyle);

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
      case 'top-left':
        // No adjustment needed
        break;
      case 'top-center':
        x -= textWidth / 2;
        break;
      case 'top-right':
        x -= textWidth;
        break;
      case 'center-left':
        y -= textHeight / 2;
        break;
      case 'center':
        x -= textWidth / 2;
        y -= textHeight / 2;
        break;
      case 'center-right':
        x -= textWidth;
        y -= textHeight / 2;
        break;
      case 'bottom-left':
        y -= textHeight;
        break;
      case 'bottom-center':
        x -= textWidth / 2;
        y -= textHeight;
        break;
      case 'bottom-right':
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
        textStyle.borderRadius
      );
      this.ctx.stroke();
    } else {
      this.ctx.strokeRect(
        position.x - textStyle.padding.x,
        position.y - textHeight + textStyle.padding.y,
        textWidth,
        textHeight
      );
    }

    this.ctx.restore();
  }
}
