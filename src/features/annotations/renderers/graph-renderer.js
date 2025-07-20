import { BaseRenderer } from "./base-renderer.js";

// ========================================
// GRAPH RENDERER - Charts and time-series data
// ========================================
export class GraphRenderer extends BaseRenderer {
  getType() {
    return "graph";
  }

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
    if (!this.isVisible(annotation, currentTimeMs)) return;

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
