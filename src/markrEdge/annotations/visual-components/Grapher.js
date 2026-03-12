// Grapher class encapsulates all graph-related logic and elements
class Grapher {
  constructor(staticLayer, dynamicLayer, options, data, minTime, maxTime, dsf_events, eec_1s_events, startTime,
    pil_offset
  ) {
    this.staticLayer = staticLayer;
    this.dynamicLayer = dynamicLayer;
    this.options = options;
    this.data = data;
    this.minTime = null;
    this.maxTime = null;
    this.dsf_events = dsf_events;
    this.eec_1s_events = eec_1s_events;
    this.startTime = startTime;
    this.pil_offset = pil_offset;

    this.graphBackground = new GraphBackground();
    this.dataCurves = new DataCurves();
    this.timelineIndicator = new TimelineIndicator();
    this.graphLabels = new GraphLabels();
    this.markerManager = new MarkerManager();

    this.inertialBarGroup = null;
    this.graphGroup = null;
  }

  createElements(graphX, graphY, graphWidth, graphHeight, epochTime) {
    this.inertialBarGroup = new Konva.Group();

    // Create a unified graph group
    this.graphGroup = new Konva.Group({
      x: graphX,
      y: graphY,
      width: graphWidth,
      height: graphHeight,
      draggable: true,
      dragBoundFunc: function(pos) {
        const stage = this.getStage();
        const stageWidth = stage.width();
        const stageHeight = stage.height();
        const minX = stageWidth * 0.025;
        const maxX = stageWidth * 0.975 - graphWidth;
        const minY = 0;
        const maxY = stageHeight - graphHeight - (stageHeight * 0.02);
        return {
          x: Math.max(minX, Math.min(pos.x, maxX)),
          y: Math.max(minY, Math.min(pos.y, maxY))
        };
      }
    });

    // Create background and grid
    const backgroundGroup = this.graphBackground.create(
      0, 0, graphWidth, graphHeight
    );
    this.graphGroup.add(backgroundGroup);

    // Create data curves
    // const curvesGroup = this.dataCurves.create(
    //   this.data,
    //   0, 0, graphWidth, graphHeight,
    //   this.options
    // );

    const [curvesGroup, minTime, maxTime] = this.dataCurves.create(
      this.data,
      0, 0, graphWidth, graphHeight,
      this.options
    );

    // const curvesGroup = dataCurvesReturn[0];
    this.minTime = minTime;
    this.maxTime = maxTime;

    this.graphGroup.add(curvesGroup);

    // Create labels
    const labelsGroup = this.graphLabels.create(
      0, 0, graphWidth, graphHeight, this.options
    );
    this.graphGroup.add(labelsGroup);

    // Add marker group
    this.graphGroup.add(this.markerManager.group);

    this.inertialBarGroup.add(this.graphGroup);
    this.staticLayer.add(this.inertialBarGroup);

    // Timeline indicator
    const videoProgress = TimelineIndicator.calculateVideoProgress(epochTime, this.minTime, this.maxTime);
    const timelineLine = this.timelineIndicator.create(
      videoProgress, this.graphGroup.x(), this.graphGroup.y(), graphWidth, graphHeight, this.options
    );
    if (timelineLine) {
      this.dynamicLayer.add(timelineLine);
    }

    this.addDSFBars();
    this.addEEC1SBars();

  }

  addEventBars(events = [], color, dash = [6, 4]) {
    const eventList = Array.isArray(events) ? events : [];
    if (eventList.length === 0) return;

    eventList.forEach(event => {
      if (typeof event?.start_timestamp !== 'number' || typeof this.startTime !== 'number') {
        return;
      }

      const videoProgress = TimelineIndicator.calculateVideoProgress(
        event.start_timestamp + this.startTime,
        this.minTime,
        this.maxTime
      );

      const graphX = this.graphGroup.x();
      const graphY = this.graphGroup.y();
      const graphWidth = this.graphGroup.width();
      const graphHeight = this.graphGroup.height();
      const barX = graphX + (videoProgress * graphWidth);

      const bar = new Konva.Line({
        points: [barX, graphY, barX, graphY + graphHeight],
        stroke: color,
        strokeWidth: 2,
        opacity: 0.7,
        dash
      });
      this.staticLayer.add(bar);
    });
  }

  addDSFBars() {
    this.addEventBars(this.dsf_events, this.options.DSFEventColor || "#b053eeff", [6, 4]);
  }

  addEEC1SBars() {
    this.addEventBars(this.eec_1s_events, this.options.EEC1SEventColor || "rgb(237, 44, 134)", [6, 4]);
  }

  updateTimeline(epochTime, graphWidth, graphHeight) {
    // this.minTime = Math.min(...this.data.epochTimes);
    // this.maxTime = Math.max(...this.data.epochTimes);
    const videoProgress = TimelineIndicator.calculateVideoProgress(epochTime, this.minTime, this.maxTime);
    const currentX = this.graphGroup.x();
    const currentY = this.graphGroup.y();
    this.timelineIndicator.update(videoProgress, currentX, currentY, graphWidth, graphHeight);
    this.dynamicLayer.draw();
  }

  addMarker(markerID, emoji, description, normalizedTime) {
    const graphWidth = this.graphGroup.width();
    const graphHeight = this.graphGroup.height();
    this.markerManager.create(
      markerID,
      emoji,
      description,
      normalizedTime,
      0,
      0,
      graphWidth,
      graphHeight,
      this.options
    );
    this.staticLayer.batchDraw();
  }

  removeMarker(markerID) {
    this.markerManager.removeMarker(markerID);
    this.staticLayer.batchDraw();
  }

  updateMarkers() {
    const graphWidth = this.graphGroup.width();
    const graphHeight = this.graphGroup.height();
    this.markerManager.markers.forEach((marker, markerID) => {
      const time = marker.time;
      this.markerManager.update(
        markerID,
        time,
        0,
        0,
        graphWidth,
        graphHeight
      );
    });
  }
}



class GraphBackground {
  constructor() {
    this.group = new Konva.Group();
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }

  create(x, y, width, height,options={}) {
    //set position and size
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    const defaultOptions = {
      BackgroundColor: "#1a1a1a",
      BackgroundOpacity: 1,
      BorderColor: "rgba(176, 189, 203, 1)",
      BorderWidth: 1
    };
    this.options = { ...defaultOptions, ...options };

    // Create background rectangle with rounded corners
    const background = new Konva.Rect({
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      fill: this.options.BackgroundColor,
      opacity: this.options.BackgroundOpacity,
      stroke: this.options.BorderColor,
      strokeWidth: this.options.BorderWidth,
    });


    this.group.add(background);

    //major grid lines
    // Horizontal lines at 30%, 50%, 70% i.e at 0.2 threshold 
    this._addGridLines(10,[30,50,70],{opacity: 0.8,strokeWidth:1, stroke: "#3273e4ff"});
    //minor grid lines
    return this.group;
  }

  _addGridLines(x_ticks, y_percentages, style = {}) {
    //x_ticks, y_ticks: number of segments horizontally, vertically.
    let defaultStyle = {
        stroke: "#ffffff",
        strokeWidth: 0.5,
        opacity: 0.5,
        perfectDrawEnabled: false,
    };
    style = { ...defaultStyle, ...style };

    //horizontal lines device Horizontal space
    // for(let i=1; i<=y_ticks; i++) {
    for( let i of y_percentages) {
      const gridY = this.y + (this.height * i/100);
      const hLine = new Konva.Line({
        points: [this.x, gridY, this.x + this.width, gridY],
        ...style
      });
      this.group.add(hLine);
    }

    //vertical lines
    for(let i=1; i<x_ticks; i++) {
      const gridX = this.x + (this.width * i / x_ticks);
      const vLine = new Konva.Line({
        points: [gridX, this.y, gridX, this.y + this.height],
        ...style
      });
      this.group.add(vLine);
    }
  }
}

// Modular component for data curves
class DataCurves {
  constructor() {
    this.group = new Konva.Group();
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.options = {};
    this.data = null;
  }

  create(data, x, y, width, height, options = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.options = { ...options };
    this.data = data;

    // Get the epoch time ranges
    const graphEpochsArrays = Object.values(data.graphs)
      .map(graph => Array.isArray(graph.epochTimes) ? graph.epochTimes : []);
    const allEpochs = graphEpochsArrays.flat();
    const MIN_EPOCH = allEpochs.length > 0 ? Math.min(...allEpochs) : 0;
    const MAX_EPOCH = allEpochs.length > 0 ? Math.max(...allEpochs) : 0;

    // Add all graphs dynamically
    Object.entries(data.graphs).forEach(([key, graphData]) => {
      const points = this._makeGraphPoints(graphData, MIN_EPOCH, MAX_EPOCH);
      const curve = new Konva.Line({
        points,
        stroke: graphData.color,
        strokeWidth: 2,
        opacity: 1.0,
        tension: 0.1,
        lineCap: 'round',
        lineJoin: 'round',
        dash: graphData.dash !== undefined ? graphData.dash : [],
      });
      this.group.add(curve);
    //   console.log(`Created curve for ${key}`);
    });
    return [this.group, MIN_EPOCH, MAX_EPOCH];
  }

  // Private method for graph points calculation
  _makeGraphPoints(graphData, minEpoch, maxEpoch) {
    const points = [];
    for (let i = 0; i < graphData.epochTimes.length; i++) {
      const x_normalized = (graphData.epochTimes[i] - minEpoch) / (maxEpoch - minEpoch || 1);
      const y_normalized = (graphData.values[i] - graphData.y_offset) / graphData.y_scale;

      const pointX = this.x + x_normalized * this.width;
      const pointY = (this.y + this.height / 2) - (y_normalized * (this.height / 2)); 
    //   const pointY = (this.y + this.height / 2) + (y_normalized * (this.height / 2)); // inverts the y-axis
      points.push(pointX, pointY);
    }
    return points;
  }

}

// Modular component for timeline indicator
class TimelineIndicator {
  constructor() {
    this.line = null;
  }

  /**
   * Calculate video progress as a value between 0 and 1
   * @param {number} epochTime - Current time
   * @param {number} minTime - Start time
   * @param {number} maxTime - End time
   * @returns {number} Progress value between 0 and 1
   */
  static calculateVideoProgress(epochTime, minTime, maxTime) {
    if (maxTime === minTime) return 0;
    return Math.min(1.0, Math.max(0.0, (epochTime - minTime) / (maxTime - minTime)));
  }
  create(videoProgress, x, y, width, height, options) {
    const timelineX = x + (videoProgress * width);
    
    // Clamp to graph bounds
    if (timelineX < x || timelineX > x + width) return null;
    
    this.line = new Konva.Line({
      points: [timelineX, y, timelineX, y + height],
      stroke: options.TimelineColor,
      strokeWidth: options.TimelineWidth,
      opacity: 1.0
    });

    return this.line;
  }

  update(videoProgress, x, y, width, height) {
    if (!this.line) return;
    
    const timelineX = x + (videoProgress * width);
    
    // Clamp to graph bounds
    if (timelineX < x || timelineX > x + width) {
      this.line.visible(false);
      return;
    }
    
    this.line.visible(true);
    this.line.points([timelineX, y, timelineX, y + height]);

  }
}
class GraphLabels {
  constructor() {
    this.group = new Konva.Group();
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.options = {};
  }

  create(x, y, width, height, options = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.options = { ...options };

    const fontSettings = {
      fontSize: 12,
      fontFamily: 'Arial',
      fontStyle: 'bold'
    };

    const topY = y - 10;
    const bottomY = y + height;
    const rightX = x + width;

    // Helper to create a text object
    const makeText = (txt, fill, align = 'left') =>
      new Konva.Text({
        text: txt,
        fill,
        align,
        ...fontSettings
      });

    // --- Top Row ---
    const bkwdText = makeText('BKWD', this.options.Curve2Color);
    const sep1 = makeText('|', this.options.TextColor);
    const leftText = makeText('LEFT', this.options.Curve1Color);

    // Position from right to left
    let cursorX = rightX;
    [leftText, sep1, bkwdText].forEach(txt => {
      cursorX -= txt.width(); // shift left by its width
      txt.position({ x: cursorX, y: topY });
      cursorX -= 5; // small spacing
    });

    // --- Bottom Row ---
    const fwdText = makeText('FWD', this.options.Curve2Color);
    const sep2 = makeText('|', this.options.TextColor);
    const rightText = makeText('RIGHT', this.options.Curve1Color);

    cursorX = rightX;
    [rightText, sep2, fwdText].forEach(txt => {
      cursorX -= txt.width();
      txt.position({ x: cursorX, y: bottomY });
      cursorX -= 5;
    });

    this.group.add(bkwdText, sep1, leftText, fwdText, sep2, rightText);

    return this.group;
  }
}


// Modular component for emoji markers
class MarkerManager {
  constructor() {
    this.group = new Konva.Group();
    this.markers = new Map(); // Map markerID to marker objects
    this.tooltips = new Map(); // Map markerID to tooltip objects
  }

  create(markerID, emoji, description, time, x, y, width, height, options) {
    // Calculate position based on time (0-1)
    const markerX = x + (time * width);
    const markerY = y - 25; // Position above the graph

    // Create a group for this marker and its tooltip
    const markerGroup = new Konva.Group({
      x: markerX - 10,
      y: markerY
    });

    // Create emoji text
    const emojiText = new Konva.Text({
      text: emoji,
      fontSize: 20,
      align: 'center'
    });

    // Create tooltip (initially hidden)
    const tooltip = new Konva.Label({
      x: 0,
      y: -30,
      visible: false
    });
    // Add tooltip background
    tooltip.add(new Konva.Tag({
      fill: '#222831', // Modern dark background
      stroke: '#63d3d8ff', // Accent border color
      strokeWidth: 1,
      padding: 16, // Increased padding for more space
      cornerRadius: 4, // Slightly more rounded corners
    }));

    // Add tooltip text
    tooltip.add(new Konva.Text({
      text: description,
      fontSize: 11,
      fontFamily: 'Inter, Arial, sans-serif',
      fontStyle: 'normal',
      padding: 4, // Added padding for text
      fill: '#f5f6fa',
      align: 'center',
      lineHeight: 1
    }));

    // Add hover handlers
    emojiText.on('mouseover touchstart', () => {
      tooltip.visible(true);
      this.group.draw();
    });

    emojiText.on('mouseout touchend', () => {
      tooltip.visible(false);
      this.group.draw();
    });

    // Add elements to the marker group
    markerGroup.add(emojiText);
    markerGroup.add(tooltip);

    // Add marker group to main group and store references
    this.group.add(markerGroup);
    this.markers.set(markerID, markerGroup);
    this.tooltips.set(markerID, tooltip);

    return this.group;
  }

  update(markerID, time, x, y, width, height) {
    const markerGroup = this.markers.get(markerID);
    if (markerGroup) {
      const markerX = x + (time * width);
      markerGroup.x(markerX - 10);
      markerGroup.y(y - 25); // Position above the graph
    }
  }

  removeMarker(markerID) {
    const marker = this.markers.get(markerID);
    if (marker) {
      marker.destroy();
      this.markers.delete(markerID);
    }
  }
}



export {Grapher}