import { BaseRenderer } from "./base-renderer.js";

/**
 * @fileoverview GraphRenderer - Renders charts and time-series data overlays
 * 
 * ANNOTATION DATA STRUCTURE:
 * =========================
 * 
 * Expected annotation format:
 * {
 *   id: "graph-1",                   // Unique identifier
 *   category: "graph",               // Must be "graph" 
 *   timeRange: {                     // Time visibility range
 *     startMs: 1000,                 //   Start time in milliseconds
 *     endMs: 8000                    //   End time in milliseconds
 *   },
 *   data: {                          // Graph-specific data
 *     type: "line",                  //   Chart type: "line", "bar", "area", "scatter"
 *     position: {                    //   Graph position (normalized 0-1)
 *       x: 0.05,                     //     Left edge X position  
 *       y: 0.05,                     //     Top edge Y position
 *       width: 0.4,                  //     Graph width as fraction of video
 *       height: 0.3                  //     Graph height as fraction of video
 *     },
 *     datasets: [                    //   Array of data series
 *       {
 *         label: "CPU Usage",         //     Series name
 *         data: [                     //     Data points array
 *           { x: 0, y: 45 },          //       Time-value pairs
 *           { x: 1000, y: 62 },       //       x = time offset (ms), y = value
 *           { x: 2000, y: 58 },
 *           { x: 3000, y: 71 }
 *         ],
 *         color: "#ff6384",           //     Line/bar color
 *         fillColor: "rgba(255,99,132,0.2)", // Optional: area fill color
 *         lineWidth: 2               //     Optional: line thickness
 *       }
 *     ],
 *     axes: {                        //   Optional: axis configuration
 *       x: {                         //     X-axis settings
 *         label: "Time (s)",          //       Axis label
 *         min: 0,                     //       Minimum value
 *         max: 5000,                  //       Maximum value
 *         unit: "ms"                  //       Value unit
 *       },
 *       y: {                         //     Y-axis settings  
 *         label: "Usage %",           //       Axis label
 *         min: 0,                     //       Minimum value
 *         max: 100                    //       Maximum value
 *       }
 *     },
 *     title: "System Metrics",       //   Optional: graph title
 *     showGrid: true,                //   Optional: show grid lines
 *     showLegend: true,              //   Optional: show legend
 *     animated: false                //   Optional: animate data points
 *   },
 *   style: {                         // Optional styling overrides
 *     backgroundColor: "rgba(0,0,0,0.8)", // Background color
 *     gridColor: "rgba(255,255,255,0.2)", // Grid line color
 *     axisColor: "rgba(255,255,255,0.5)", // Axis line color  
 *     textColor: "#ffffff",          //     Text color for labels
 *     fontSize: 10,                  //     Font size for labels
 *     fontFamily: "Arial",           //     Font family
 *     margin: {                      //     Graph margins (pixels)
 *       top: 20, right: 20,          //       Spacing around graph
 *       bottom: 30, left: 40         
 *     }
 *   }
 * }
 * 
 * CHART TYPES:
 * ===========
 * - "line": Connected line chart with optional area fill
 * - "bar": Vertical bar chart 
 * - "area": Filled area chart
 * - "scatter": Individual data points without connecting lines
 * 
 * RENDERING BEHAVIOR:
 * ==================
 * - Draws chart background with optional transparency
 * - Renders axes with labels and tick marks
 * - Plots data points according to chart type
 * - Shows grid lines for easier reading (if showGrid=true)
 * - Displays legend identifying data series (if showLegend=true)
 * - Supports multiple data series on same chart
 * - Automatically scales axes to fit data range
 * - Animates current time indicator for time-series data
 * 
 * @example
 * // Simple line chart showing metrics over time
 * {
 *   id: "cpu-graph",
 *   category: "graph",
 *   timeRange: { startMs: 2000, endMs: 10000 },
 *   data: {
 *     type: "line",
 *     position: { x: 0.02, y: 0.02, width: 0.35, height: 0.25 },
 *     datasets: [{
 *       label: "CPU %",
 *       data: [
 *         { x: 0, y: 20 },
 *         { x: 2000, y: 45 },
 *         { x: 4000, y: 65 },
 *         { x: 6000, y: 40 }
 *       ],
 *       color: "#ff6384"
 *     }],
 *     title: "CPU Usage",
 *     axes: {
 *       x: { label: "Time", unit: "ms" },
 *       y: { label: "Usage %", min: 0, max: 100 }
 *     }
 *   }
 * }
 * 
 * @example
 * // Multi-series bar chart
 * {
 *   id: "comparison-chart",
 *   category: "graph", 
 *   timeRange: { startMs: 3000, endMs: 8000 },
 *   data: {
 *     type: "bar",
 *     position: { x: 0.55, y: 0.1, width: 0.4, height: 0.4 },
 *     datasets: [
 *       {
 *         label: "Before",
 *         data: [{ x: 0, y: 85 }, { x: 1, y: 92 }, { x: 2, y: 78 }],
 *         color: "#36a2eb"
 *       },
 *       {
 *         label: "After", 
 *         data: [{ x: 0, y: 95 }, { x: 1, y: 88 }, { x: 2, y: 94 }],
 *         color: "#4bc0c0"
 *       }
 *     ],
 *     title: "Performance Comparison",
 *     showLegend: true
 *   }
 * }
 */

// ========================================
// GRAPH RENDERER - Charts and time-series data
// ========================================
export class GraphRenderer extends BaseRenderer {
  static category = "graph";

  getDefaultOptions() {
    return {
      defaultBackgroundColor: "rgba(0,0,0,0.7)",
      defaultGridColor: "rgba(255,255,255,0.2)",
      defaultAxisColor: "rgba(255,255,255,0.5)",
      defaultFontSize: 10,
      defaultFontFamily: "Arial",
      defaultTextColor: "#ffffff",
      defaultMargin: { top: 20, right: 20, bottom: 30, left: 40 },
      defaultLineWidth: 2,
      defaultPointRadius: 3,
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    const { data, style = {} } = annotation;

    if (
      !data.series ||
      !Array.isArray(data.series) ||
      data.series.length === 0
    ) {
      console.warn("Graph annotation missing series data");
      return;
    }

    if (!data.position) {
      console.warn("Graph annotation missing position data");
      return;
    }

    // Convert normalized position to pixel coordinates
    const pixelPosition = this.denormalizeBoundingBox(data.position, videoRect);

    // Draw graph background
    this.drawGraphBackground(pixelPosition, style);

    // Calculate drawing area (inside margins)
    const margin = style.margin || this.options.defaultMargin;
    const drawingArea = {
      x: pixelPosition.x + margin.left,
      y: pixelPosition.y + margin.top,
      width: pixelPosition.width - margin.left - margin.right,
      height: pixelPosition.height - margin.top - margin.bottom,
    };

    // Calculate data bounds
    const dataBounds = this.calculateDataBounds(data.series);

    // Draw grid if enabled
    if (style.gridLines !== false) {
      this.drawGrid(drawingArea, style);
    }

    // Draw axes if enabled
    if (style.showAxes !== false) {
      this.drawAxes(drawingArea, dataBounds, style);
    }

    // Draw each series
    data.series.forEach((series, index) => {
      this.drawSeries(
        series,
        drawingArea,
        dataBounds,
        data.graphType || "line",
        style,
      );
    });

    // Draw legend if enabled
    if (style.showLegend) {
      this.drawLegend(data.series, pixelPosition, style);
    }
  }

  drawGraphBackground(position, style) {
    const backgroundColor =
      style.backgroundColor || this.options.defaultBackgroundColor;
    const borderRadius = style.borderRadius || 0;

    this.ctx.save();
    this.ctx.fillStyle = backgroundColor;

    if (borderRadius > 0) {
      this.drawRoundedRect(
        position.x,
        position.y,
        position.width,
        position.height,
        borderRadius,
      );
      this.ctx.fill();
    } else {
      this.ctx.fillRect(
        position.x,
        position.y,
        position.width,
        position.height,
      );
    }

    this.ctx.restore();
  }

  calculateDataBounds(series) {
    let minTime = Infinity;
    let maxTime = -Infinity;
    let minValue = Infinity;
    let maxValue = -Infinity;

    series.forEach((s) => {
      s.points.forEach((point) => {
        minTime = Math.min(minTime, point.timeMs);
        maxTime = Math.max(maxTime, point.timeMs);
        minValue = Math.min(minValue, point.value);
        maxValue = Math.max(maxValue, point.value);
      });
    });

    // Add some padding
    const valueRange = maxValue - minValue;
    const valuePadding = valueRange * 0.1;

    return {
      minTime,
      maxTime,
      minValue: minValue - valuePadding,
      maxValue: maxValue + valuePadding,
    };
  }

  drawGrid(drawingArea, style) {
    const gridColor = style.gridColor || this.options.defaultGridColor;
    const gridLines =
      typeof style.gridLines === "object" ? style.gridLines : { x: 5, y: 5 };

    this.ctx.save();
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([2, 2]);

    // Vertical grid lines
    for (let i = 1; i < gridLines.x; i++) {
      const x = drawingArea.x + (drawingArea.width / gridLines.x) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, drawingArea.y);
      this.ctx.lineTo(x, drawingArea.y + drawingArea.height);
      this.ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 1; i < gridLines.y; i++) {
      const y = drawingArea.y + (drawingArea.height / gridLines.y) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(drawingArea.x, y);
      this.ctx.lineTo(drawingArea.x + drawingArea.width, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawAxes(drawingArea, dataBounds, style) {
    const axisColor = style.axisColor || this.options.defaultAxisColor;
    const fontSize = style.fontSize || this.options.defaultFontSize;
    const fontFamily = style.fontFamily || this.options.defaultFontFamily;
    const textColor = style.textColor || this.options.defaultTextColor;

    this.ctx.save();
    this.ctx.strokeStyle = axisColor;
    this.ctx.lineWidth = 1;

    // Draw axes
    this.ctx.beginPath();
    // X-axis
    this.ctx.moveTo(drawingArea.x, drawingArea.y + drawingArea.height);
    this.ctx.lineTo(
      drawingArea.x + drawingArea.width,
      drawingArea.y + drawingArea.height,
    );
    // Y-axis
    this.ctx.moveTo(drawingArea.x, drawingArea.y);
    this.ctx.lineTo(drawingArea.x, drawingArea.y + drawingArea.height);
    this.ctx.stroke();

    // Draw labels
    this.ctx.fillStyle = textColor;
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";

    // Y-axis labels
    const valueRange = dataBounds.maxValue - dataBounds.minValue;
    for (let i = 0; i <= 4; i++) {
      const value = dataBounds.minValue + (valueRange / 4) * i;
      const y =
        drawingArea.y + drawingArea.height - (drawingArea.height / 4) * i;
      this.ctx.fillText(value.toFixed(1), drawingArea.x - 5, y - fontSize / 2);
    }

    this.ctx.restore();
  }

  drawSeries(series, drawingArea, dataBounds, graphType, style) {
    if (!series.points || series.points.length === 0) return;

    const seriesColor = series.color || "#00ff00";
    const lineWidth = series.lineWidth || this.options.defaultLineWidth;
    const pointRadius = series.pointRadius || this.options.defaultPointRadius;

    this.ctx.save();

    switch (graphType) {
      case "line":
        this.drawLineSeries(
          series,
          drawingArea,
          dataBounds,
          seriesColor,
          lineWidth,
        );
        break;
      case "bar":
        this.drawBarSeries(series, drawingArea, dataBounds, seriesColor);
        break;
      case "scatter":
        this.drawScatterSeries(
          series,
          drawingArea,
          dataBounds,
          seriesColor,
          pointRadius,
        );
        break;
    }

    this.ctx.restore();
  }

  drawLineSeries(series, drawingArea, dataBounds, color, lineWidth) {
    const points = this.convertPointsToPixels(
      series.points,
      drawingArea,
      dataBounds,
    );

    if (points.length < 2) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    this.ctx.stroke();

    // Draw points
    this.ctx.fillStyle = color;
    points.forEach((point) => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  drawBarSeries(series, drawingArea, dataBounds, color) {
    const points = this.convertPointsToPixels(
      series.points,
      drawingArea,
      dataBounds,
    );
    const barWidth = (drawingArea.width / points.length) * 0.8;

    this.ctx.fillStyle = color;

    points.forEach((point) => {
      const barHeight = drawingArea.y + drawingArea.height - point.y;
      this.ctx.fillRect(point.x - barWidth / 2, point.y, barWidth, barHeight);
    });
  }

  drawScatterSeries(series, drawingArea, dataBounds, color, pointRadius) {
    const points = this.convertPointsToPixels(
      series.points,
      drawingArea,
      dataBounds,
    );

    this.ctx.fillStyle = color;

    points.forEach((point) => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, pointRadius, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  convertPointsToPixels(points, drawingArea, dataBounds) {
    const timeRange = dataBounds.maxTime - dataBounds.minTime;
    const valueRange = dataBounds.maxValue - dataBounds.minValue;

    return points.map((point) => ({
      x:
        drawingArea.x +
        ((point.timeMs - dataBounds.minTime) / timeRange) * drawingArea.width,
      y:
        drawingArea.y +
        drawingArea.height -
        ((point.value - dataBounds.minValue) / valueRange) * drawingArea.height,
    }));
  }

  drawLegend(series, position, style) {
    const fontSize = style.fontSize || this.options.defaultFontSize;
    const fontFamily = style.fontFamily || this.options.defaultFontFamily;
    const textColor = style.textColor || this.options.defaultTextColor;

    this.ctx.save();
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = textColor;

    let legendY = position.y + position.height - 10;

    series.forEach((s, index) => {
      const legendX = position.x + 10;

      // Draw color indicator
      this.ctx.fillStyle = s.color || "#00ff00";
      this.ctx.fillRect(legendX, legendY - fontSize, 10, fontSize);

      // Draw series name
      this.ctx.fillStyle = textColor;
      this.ctx.fillText(s.name || `Series ${index + 1}`, legendX + 15, legendY);

      legendY -= fontSize + 5;
    });

    this.ctx.restore();
  }
}
