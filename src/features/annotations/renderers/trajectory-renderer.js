import { BaseRenderer } from "./base-renderer.js";

/**
 * @fileoverview TrajectoryRenderer - Renders motion paths and trajectory trails
 * 
 * ANNOTATION DATA STRUCTURE:
 * =========================
 * 
 * Expected annotation format:
 * {
 *   id: "trajectory-1",              // Unique identifier
 *   category: "trajectory",          // Must be "trajectory"
 *   timeRange: {                     // Time visibility range  
 *     startMs: 1000,                 //   Start time in milliseconds
 *     endMs: 10000                   //   End time in milliseconds
 *   },
 *   data: {                          // Trajectory-specific data
 *     points: [                      //   Array of trajectory points
 *       {
 *         x: 0.1,                    //     X position (normalized 0-1)
 *         y: 0.2,                    //     Y position (normalized 0-1) 
 *         timeMs: 1000               //     Time at this point
 *       },
 *       {
 *         x: 0.3,                    //     Next point X position
 *         y: 0.4,                    //     Next point Y position
 *         timeMs: 3000               //     Time at this point
 *       },
 *       // ... more points
 *     ],
 *     interpolation: "linear",       //   Optional: "linear" or "bezier"
 *     showDirection: true,           //   Optional: show direction arrows
 *     showHistory: true,             //   Optional: show trail history
 *     historyLengthMs: 2000,         //   Optional: how long to show trail (ms)
 *     label: "Object Path"           //   Optional: trajectory label
 *   },
 *   style: {                         // Optional styling overrides
 *     lineColor: "#ffff00",          //   Trail color (default: yellow)
 *     lineWidth: 3,                  //   Trail thickness (default: 3)  
 *     pointRadius: 4,                //   Point marker size (default: 4)
 *     trailOpacity: 0.6,             //   Trail transparency (default: 0.6)
 *     arrowSize: 8,                  //   Direction arrow size (default: 8)
 *     currentPointColor: "#ff0000",  //   Current position color
 *     historyPointColor: "#ffff00",  //   Trail point color
 *     futurePointColor: "#888888"    //   Future point color (dimmed)
 *   }
 * }
 * 
 * INTERPOLATION MODES:
 * ===================
 * - "linear": Straight lines between trajectory points
 * - "bezier": Smooth curved paths using bezier interpolation
 * 
 * RENDERING BEHAVIOR:
 * ==================
 * - Interpolates position based on current time and trajectory points
 * - Draws trail showing recent movement history (if showHistory=true)
 * - Shows direction arrows indicating movement direction (if showDirection=true)
 * - Highlights current position with different color/size
 * - Fades trail opacity based on age of trail points
 * - Supports both linear and bezier curve interpolation
 * 
 * @example
 * // Simple linear trajectory - Person walking across scene
 * {
 *   id: "person-path-1",
 *   category: "trajectory",
 *   timeRange: { startMs: 0, endMs: 12000 },
 *   data: {
 *     points: [
 *       { x: 0.05, y: 0.8, timeMs: 0 },      // Starts bottom-left
 *       { x: 0.15, y: 0.75, timeMs: 1500 },  // Walks slightly up
 *       { x: 0.3, y: 0.6, timeMs: 3000 },    // Moves toward center
 *       { x: 0.45, y: 0.4, timeMs: 5000 },   // Continues diagonally
 *       { x: 0.6, y: 0.3, timeMs: 7000 },    // Near center-right
 *       { x: 0.75, y: 0.25, timeMs: 9000 },  // Moving to top-right
 *       { x: 0.9, y: 0.2, timeMs: 12000 }    // Exits top-right
 *     ],
 *     showDirection: true,
 *     showHistory: true,
 *     historyLengthMs: 2500,
 *     label: "Person Movement"
 *   }
 * }
 * 
 * @example
 * // Smooth curved trajectory - Vehicle following road
 * {
 *   id: "vehicle-path-1", 
 *   category: "trajectory",
 *   timeRange: { startMs: 1000, endMs: 18000 },
 *   data: {
 *     points: [
 *       { x: 0.02, y: 0.9, timeMs: 1000 },   // Enters bottom-left
 *       { x: 0.1, y: 0.85, timeMs: 2500 },   // Slight curve up
 *       { x: 0.25, y: 0.7, timeMs: 4500 },   // Turning right
 *       { x: 0.4, y: 0.55, timeMs: 6500 },   // Continuing curve
 *       { x: 0.6, y: 0.5, timeMs: 8500 },    // Straightening out
 *       { x: 0.75, y: 0.48, timeMs: 11000 }, // Nearly straight
 *       { x: 0.85, y: 0.4, timeMs: 13500 },  // Slight turn up
 *       { x: 0.92, y: 0.3, timeMs: 15500 },  // Final turn
 *       { x: 0.98, y: 0.15, timeMs: 18000 }  // Exits top-right
 *     ],
 *     interpolation: "bezier",
 *     showDirection: true,
 *     historyLengthMs: 4000,
 *     label: "Vehicle Route"
 *   },
 *   style: {
 *     lineColor: "#00ff00",
 *     lineWidth: 4,
 *     currentPointColor: "#ff0000",
 *     showGlow: true
 *   }
 * }
 * 
 * @example
 * // Complex multi-directional trajectory - Drone flight pattern
 * {
 *   id: "drone-surveillance-path",
 *   category: "trajectory", 
 *   timeRange: { startMs: 2000, endMs: 25000 },
 *   data: {
 *     points: [
 *       { x: 0.5, y: 0.9, timeMs: 2000 },    // Take off center-bottom
 *       { x: 0.3, y: 0.7, timeMs: 3500 },    // Move to left
 *       { x: 0.1, y: 0.5, timeMs: 5500 },    // Sweep left side
 *       { x: 0.15, y: 0.2, timeMs: 7500 },   // Up to top-left
 *       { x: 0.4, y: 0.1, timeMs: 9500 },    // Cross to top-center
 *       { x: 0.7, y: 0.15, timeMs: 11500 },  // Continue to top-right
 *       { x: 0.85, y: 0.4, timeMs: 13500 },  // Down right side
 *       { x: 0.9, y: 0.7, timeMs: 15500 },   // Continue down
 *       { x: 0.7, y: 0.85, timeMs: 17500 },  // Move left along bottom
 *       { x: 0.4, y: 0.8, timeMs: 19500 },   // Continue left
 *       { x: 0.2, y: 0.6, timeMs: 21500 },   // Up and left
 *       { x: 0.5, y: 0.5, timeMs: 23500 },   // Return to center
 *       { x: 0.5, y: 0.9, timeMs: 25000 }    // Land at start position
 *     ],
 *     interpolation: "bezier",
 *     showDirection: true,
 *     showHistory: true,
 *     historyLengthMs: 5000,
 *     label: "Drone Patrol Route"
 *   },
 *   style: {
 *     lineColor: "#00aaff",
 *     lineWidth: 3,
 *     currentPointColor: "#ff4400",
 *     arrowSize: 12,
 *     trailOpacity: 0.8,
 *     showFuture: true,
 *     pathOpacity: 0.4
 *   }
 * }
 */

// ========================================
// TRAJECTORY RENDERER - Paths and motion trails
// ========================================
export class TrajectoryRenderer extends BaseRenderer {
  static category = "trajectory";

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
    console.log('🚀 TrajectoryRenderer.render called:', annotation.id, 'at time:', currentTimeMs);
    console.log('✅ Trajectory is visible, rendering...');

    const { data, style = {} } = annotation;

    if (
      !data.points ||
      !Array.isArray(data.points) ||
      data.points.length === 0
    ) {
      console.warn("Trajectory annotation missing points data");
      return;
    }

    console.log('📍 Trajectory has', data.points.length, 'points:', data.points);

    // Get current interpolated position using smooth curve interpolation
    const interpolation =
      data.interpolation || this.options.defaultInterpolation;
    
    let currentPosition;
    if (interpolation === "bezier" && data.points.length >= 3) {
      // Use smooth curve interpolation that matches our drawing method
      currentPosition = this.getInterpolatedPositionOnSmoothCurve(
        data.points,
        currentTimeMs
      );
    } else {
      // Fall back to standard interpolation
      currentPosition = this.getInterpolatedPosition(
        data.points,
        currentTimeMs,
        interpolation,
      );
    }

    console.log('🎯 Current interpolated position:', currentPosition);

    if (!currentPosition) {
      console.log('❌ No current position calculated');
      return;
    }

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

    // Draw smooth bezier curve through all points
    this.drawSmoothCurve(pixelPoints);
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
    this.ctx.strokeStyle = this.addOpacityToColor(lineColor, trailOpacity);
    this.ctx.lineWidth = lineWidth;
    
    // Draw smooth bezier curve for trajectory history
    this.drawSmoothCurve(historyPoints);
    this.ctx.stroke();
    this.ctx.restore();
  }

  // Add smooth curve drawing method using bezier interpolation
  drawSmoothCurve(points) {
    if (points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      // For only two points, draw a straight line
      this.ctx.lineTo(points[1].x, points[1].y);
    } else {
      // For multiple points, use bezier curves for smoothness
      // Use the same control point calculation as getInterpolatedPositionOnSmoothCurve
      for (let i = 0; i < points.length - 1; i++) {
        const controlPoints = this.calculateBezierControlPoints(points, i);
        this.ctx.bezierCurveTo(
          controlPoints.cp1x, controlPoints.cp1y,
          controlPoints.cp2x, controlPoints.cp2y,
          controlPoints.endX, controlPoints.endY
        );
      }
    }
  }

  // Shared control point calculation for both drawing and position interpolation
  calculateBezierControlPoints(points, segmentIndex) {
    const currentPoint = points[segmentIndex];
    const nextPoint = points[segmentIndex + 1];
    const smoothingFactor = 0.2;
    
    let cp1x = currentPoint.x;
    let cp1y = currentPoint.y;
    let cp2x = nextPoint.x;
    let cp2y = nextPoint.y;

    // Add smoothing if we have adjacent points for tangent calculation
    if (segmentIndex > 0) {
      const prevPoint = points[segmentIndex - 1];
      const tangentX = nextPoint.x - prevPoint.x;
      const tangentY = nextPoint.y - prevPoint.y;
      cp1x = currentPoint.x + tangentX * smoothingFactor;
      cp1y = currentPoint.y + tangentY * smoothingFactor;
    }

    if (segmentIndex < points.length - 2) {
      const nextNextPoint = points[segmentIndex + 2];
      const tangentX = nextNextPoint.x - currentPoint.x;
      const tangentY = nextNextPoint.y - currentPoint.y;
      cp2x = nextPoint.x - tangentX * smoothingFactor;
      cp2y = nextPoint.y - tangentY * smoothingFactor;
    }

    return {
      startX: currentPoint.x,
      startY: currentPoint.y,
      cp1x: cp1x,
      cp1y: cp1y,
      cp2x: cp2x,
      cp2y: cp2y,
      endX: nextPoint.x,
      endY: nextPoint.y
    };
  }

  // Get interpolated position that follows the exact smooth curve path
  getInterpolatedPositionOnSmoothCurve(points, currentTimeMs) {
    if (points.length === 0) return null;
    if (points.length === 1) return points[0];
    if (points.length === 2) {
      // For two points, use linear interpolation
      const p1 = points[0];
      const p2 = points[1];
      const timeDiff = p2.timeMs - p1.timeMs;
      if (timeDiff <= 0) return p1;
      const t = Math.max(0, Math.min(1, (currentTimeMs - p1.timeMs) / timeDiff));
      return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
        timeMs: currentTimeMs
      };
    }

    // Find which segment the current time falls into
    let segmentIndex = -1;
    for (let i = 0; i < points.length - 1; i++) {
      if (currentTimeMs >= points[i].timeMs && currentTimeMs <= points[i + 1].timeMs) {
        segmentIndex = i;
        break;
      }
    }

    // Handle edge cases
    if (segmentIndex === -1) {
      if (currentTimeMs <= points[0].timeMs) return points[0];
      if (currentTimeMs >= points[points.length - 1].timeMs) return points[points.length - 1];
      return null;
    }

    // Calculate the local t parameter for this segment
    const currentPoint = points[segmentIndex];
    const nextPoint = points[segmentIndex + 1];
    const segmentDuration = nextPoint.timeMs - currentPoint.timeMs;
    const t = segmentDuration > 0 ? (currentTimeMs - currentPoint.timeMs) / segmentDuration : 0;

    // Use the same control point calculation as drawSmoothCurve
    const controlPoints = this.calculateBezierControlPoints(points, segmentIndex);

    // Calculate bezier curve position using cubic bezier formula
    // B(t) = (1-t)³P₀ + 3(1-t)²tCP₁ + 3(1-t)t²CP₂ + t³P₁
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;

    const x = oneMinusTCubed * controlPoints.startX + 
              3 * oneMinusTSquared * t * controlPoints.cp1x + 
              3 * oneMinusT * tSquared * controlPoints.cp2x + 
              tCubed * controlPoints.endX;

    const y = oneMinusTCubed * controlPoints.startY + 
              3 * oneMinusTSquared * t * controlPoints.cp1y + 
              3 * oneMinusT * tSquared * controlPoints.cp2y + 
              tCubed * controlPoints.endY;

    return {
      x: x,
      y: y,
      timeMs: currentTimeMs
    };
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

    // Draw smooth bezier curve for future path
    this.drawSmoothCurve(futurePoints);
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
