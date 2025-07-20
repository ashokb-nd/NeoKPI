import { BaseRenderer } from "./base-renderer.js";

// ========================================
// TRAJECTORY RENDERER - Paths and motion trails
// ========================================
export class TrajectoryRenderer extends BaseRenderer {
  getType() {
    return "trajectory";
  }

  getDefaultOptions() {
    return {
      defaultLineColor: "#ffff00",
      defaultLineWidth: 3,
      defaultPointRadius: 4,
      defaultShowDirection: true,
      defaultShowHistory: true,
      defaultHistoryLengthMs: 2000,
      defaultInterpolation: "linear",
      defaultTrailOpacity: 0.6,
      defaultArrowSize: 8,
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    if (!this.isVisible(annotation, currentTimeMs)) return;

    const { data, style = {} } = annotation;

    if (
      !data.points ||
      !Array.isArray(data.points) ||
      data.points.length === 0
    ) {
      console.warn("Trajectory annotation missing points data");
      return;
    }

    // Get current interpolated position
    const interpolation =
      data.interpolation || this.options.defaultInterpolation;
    const currentPosition = this.getInterpolatedPosition(
      data.points,
      currentTimeMs,
      interpolation,
    );

    if (!currentPosition) return;

    // Convert all points to pixel coordinates
    const pixelPoints = data.points.map((point) => ({
      ...point,
      ...this.denormalizePoint(point, videoRect),
    }));

    const currentPixelPosition = this.denormalizePoint(
      currentPosition,
      videoRect,
    );

    // Draw trajectory history if enabled
    if (data.showHistory !== false && this.options.defaultShowHistory) {
      const historyLengthMs =
        data.historyLengthMs || this.options.defaultHistoryLengthMs;
      this.drawTrajectoryHistory(
        pixelPoints,
        currentTimeMs,
        historyLengthMs,
        style,
      );
    }

    // Draw the full path (faded)
    this.drawFullPath(pixelPoints, style);

    // Draw current position
    this.drawCurrentPosition(currentPixelPosition, style);

    // Draw direction arrow if enabled
    if (data.showDirection !== false && this.options.defaultShowDirection) {
      this.drawDirectionArrow(
        pixelPoints,
        currentTimeMs,
        currentPixelPosition,
        style,
      );
    }

    // Draw future path (dotted) if enabled
    if (style.showFuture) {
      this.drawFuturePath(pixelPoints, currentTimeMs, style);
    }
  }

  drawFullPath(pixelPoints, style) {
    if (pixelPoints.length < 2) return;

    const lineColor = style.lineColor || this.options.defaultLineColor;
    const lineWidth = (style.lineWidth || this.options.defaultLineWidth) * 0.5;
    const opacity = style.pathOpacity || 0.3;

    this.ctx.save();
    this.ctx.strokeStyle = this.addOpacityToColor(lineColor, opacity);
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y);

    for (let i = 1; i < pixelPoints.length; i++) {
      this.ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  drawTrajectoryHistory(pixelPoints, currentTimeMs, historyLengthMs, style) {
    const lineColor = style.lineColor || this.options.defaultLineColor;
    const lineWidth = style.lineWidth || this.options.defaultLineWidth;
    const trailOpacity = style.trailOpacity || this.options.defaultTrailOpacity;

    // Filter points within history window
    const historyStartTime = currentTimeMs - historyLengthMs;
    const historyPoints = pixelPoints.filter(
      (point) =>
        point.timeMs >= historyStartTime && point.timeMs <= currentTimeMs,
    );

    if (historyPoints.length < 2) return;

    this.ctx.save();

    // Draw trail with gradient opacity
    for (let i = 1; i < historyPoints.length; i++) {
      const point1 = historyPoints[i - 1];
      const point2 = historyPoints[i];

      // Calculate opacity based on time distance from current
      const timeFactor = (point2.timeMs - historyStartTime) / historyLengthMs;
      const segmentOpacity = trailOpacity * timeFactor;

      this.ctx.strokeStyle = this.addOpacityToColor(lineColor, segmentOpacity);
      this.ctx.lineWidth = lineWidth * timeFactor;

      this.ctx.beginPath();
      this.ctx.moveTo(point1.x, point1.y);
      this.ctx.lineTo(point2.x, point2.y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawCurrentPosition(currentPosition, style) {
    const pointColor =
      style.pointColor || style.lineColor || this.options.defaultLineColor;
    const pointRadius = style.pointRadius || this.options.defaultPointRadius;
    const glowColor = style.glowColor || pointColor;

    this.ctx.save();

    // Draw glow effect
    if (style.showGlow !== false) {
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = pointRadius * 2;
    }

    // Draw main point
    this.ctx.fillStyle = pointColor;
    this.ctx.beginPath();
    this.ctx.arc(
      currentPosition.x,
      currentPosition.y,
      pointRadius,
      0,
      2 * Math.PI,
    );
    this.ctx.fill();

    // Draw inner highlight
    this.ctx.fillStyle = "#ffffff";
    this.ctx.beginPath();
    this.ctx.arc(
      currentPosition.x,
      currentPosition.y,
      pointRadius * 0.3,
      0,
      2 * Math.PI,
    );
    this.ctx.fill();

    this.ctx.restore();
  }

  drawDirectionArrow(pixelPoints, currentTimeMs, currentPosition, style) {
    // Find direction by looking at nearby points
    const direction = this.calculateDirection(pixelPoints, currentTimeMs);

    if (!direction) return;

    const arrowSize = style.arrowSize || this.options.defaultArrowSize;
    const arrowColor =
      style.arrowColor || style.lineColor || this.options.defaultLineColor;

    this.ctx.save();
    this.ctx.fillStyle = arrowColor;
    this.ctx.strokeStyle = arrowColor;
    this.ctx.lineWidth = 2;

    // Calculate arrow points
    const angle = Math.atan2(direction.y, direction.x);
    const arrowTip = {
      x: currentPosition.x + Math.cos(angle) * arrowSize,
      y: currentPosition.y + Math.sin(angle) * arrowSize,
    };

    const arrowBase1 = {
      x: arrowTip.x - Math.cos(angle - Math.PI * 0.8) * arrowSize * 0.6,
      y: arrowTip.y - Math.sin(angle - Math.PI * 0.8) * arrowSize * 0.6,
    };

    const arrowBase2 = {
      x: arrowTip.x - Math.cos(angle + Math.PI * 0.8) * arrowSize * 0.6,
      y: arrowTip.y - Math.sin(angle + Math.PI * 0.8) * arrowSize * 0.6,
    };

    // Draw arrow
    this.ctx.beginPath();
    this.ctx.moveTo(arrowTip.x, arrowTip.y);
    this.ctx.lineTo(arrowBase1.x, arrowBase1.y);
    this.ctx.lineTo(arrowBase2.x, arrowBase2.y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  drawFuturePath(pixelPoints, currentTimeMs, style) {
    const futurePoints = pixelPoints.filter(
      (point) => point.timeMs > currentTimeMs,
    );

    if (futurePoints.length < 2) return;

    const lineColor = style.lineColor || this.options.defaultLineColor;
    const lineWidth = (style.lineWidth || this.options.defaultLineWidth) * 0.7;

    this.ctx.save();
    this.ctx.strokeStyle = this.addOpacityToColor(lineColor, 0.4);
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(futurePoints[0].x, futurePoints[0].y);

    for (let i = 1; i < futurePoints.length; i++) {
      this.ctx.lineTo(futurePoints[i].x, futurePoints[i].y);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  calculateDirection(pixelPoints, currentTimeMs) {
    // Find two points around current time for direction calculation
    const windowMs = 500; // 500ms window
    const nearbyPoints = pixelPoints.filter(
      (point) => Math.abs(point.timeMs - currentTimeMs) <= windowMs,
    );

    if (nearbyPoints.length < 2) return null;

    // Sort by time and get direction from first to last
    nearbyPoints.sort((a, b) => a.timeMs - b.timeMs);
    const first = nearbyPoints[0];
    const last = nearbyPoints[nearbyPoints.length - 1];

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return null;

    return { x: dx / length, y: dy / length };
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

    // If already rgba/rgb, assume it's correctly formatted
    return color;
  }
}
