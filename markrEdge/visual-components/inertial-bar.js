
import {Grapher} from "./grapher.js"
import { BaseVisualizer } from './base-visualizer.js';

class InertialBar extends BaseVisualizer {
  constructor(staticLayer, dynamicLayer, metadata = {}) {
    super(staticLayer, dynamicLayer, metadata);
    // Graph options - Professional color scheme
    this.options = {
      Opacity: 1,
      BackgroundColor: "#1a1a1a", // Dark charcoal
      BackgroundOpacity: 1, // Even more transparent background
      BorderColor: "rgba(74, 144, 226, 0.5)", // Semi-transparent blue border
      BorderWidth: 1,
      GridColor: "#ffffff", // White grid lines
      GridOpacity: 0.07, // Very subtle grid
      Curve1Color: "#2ecc71", // Professional emerald green for lateral
      Curve2Color: "#e74c3c", // Professional crimson red for driving
      TimelineColor: "#f39c12", // Professional orange/amber
      TextColor: "#ecf0f1", // Soft white for better readability
      LabelColor: "#bdc3c7", // Light gray for labels
      CurveLineWidth: 2,
      TimelineWidth: 1,
      DSFEventColor: "#b053eeff",
      EEC1SEventColor: "#00bcd4ff",
      TextStrokeColor: "#2c3e50", // Dark blue-gray stroke
      TextStrokeWidth: 1.5,
    };
    this.grapher = null;
  }

  processMetadata(metadata = {}) {
    // Extract IMU/inertial data from sensorMetaData
    const sensorMetaData = metadata?.sensorMetaData;

    if (!sensorMetaData || !Array.isArray(sensorMetaData)) {
      // Return dummy data for testing
      // return this.generateDummyData(100);
      return {};
    }

    // Initialize arrays for accelerometer data
    const acc1 = [];
    const acc2 = [];
    const acc3 = [];
    const epochTimes = [];

    // Parse accelerometer data from sensorMetaData
    sensorMetaData.forEach(entry => {
        if (entry.accelerometer) {
            // Parse the accelerometer string format: "  9.68  -0.17  -1.2   1751942812933"
            const accelString = entry.accelerometer.trim();
            const values = accelString.split(/\s+/); // Split by whitespace
            
            if (values.length >= 4) {
                const x = parseFloat(values[0]);
                const y = parseFloat(values[1]);
                const z = parseFloat(values[2]);
                const time = parseInt(values[3]);
                
                // Only add if all values are valid numbers
                if (!isNaN(x) && !isNaN(y) && !isNaN(z) && !isNaN(time)) {
                    acc1.push(x);
                    acc2.push(y);
                    acc3.push(z);
                    epochTimes.push(time);
                }
            }
        }
    });




    // Convert epoch times to normalized values (0 to 1)
    this.minTime = Math.min(...epochTimes);
    this.maxTime = Math.max(...epochTimes);
    // const timeRange = this.maxTime - this.minTime;
    // const timeValues = epochTimes.map(time => (time - this.minTime) / timeRange);

    //get positions in lane
    const PIL_data = metadata.inference_data.observations_data.positionsInLane // list of list , [epochtime,value] . eg.  [[1754533660893,0],...]
    // console.log("minTime", this.minTime);
    // console.log("maxTime", this.maxTime);
    // // console.log("PIL_data", PIL_data);
    // let pil_epochs = PIL_data.map(pos => pos[0]);
    // console.log("PIL_min", Math.min(...pil_epochs));
    // console.log("PIL_max", Math.max(...pil_epochs));

    // // differences
    // console.log('PIL max-min', Math.max(...pil_epochs) - Math.min(...pil_epochs));
    // console.log('epochTimes max-min', this.maxTime - this.minTime);

    // window.pil_data = PIL_data;
    // Create inertial bar data structure


    //extract dsf events
    //  metadata->inference_data->events_data->alerts.

    let startTime = metadata.startTime || null;
    let events = metadata?.inference_data?.events_data?.alerts || [];

    let dsf_events = [];
    let eec_1s_events = [];

// event_code
// : 
    const DSF_EVENT_CODE = "900.0.1.0";
    const EEC_1S_EVENT_CODE = "900.0.0.1";
    for (let event of events) {
      if (event.event_code === DSF_EVENT_CODE) {
        dsf_events.push(event);
      } else if (event.event_code === EEC_1S_EVENT_CODE) {
        eec_1s_events.push(event);
      }
    }
    console.log("Extracted events:", dsf_events, eec_1s_events);

    let PIL_offset = this.get_PIL_offset(metadata);
    return {
      //Graphs
      graphs:{
        // lateral:{
        //   epochTimes: epochTimes,
        //   values: acc2, // Lateral acceleration
        //   label: "Lateral Acceleration",
        //   y_offset: 0,
        //   y_scale: 9.8 * 0.75,
        //   color:"#2ecc71"
        // },
        // driving:{
        //   epochTimes: epochTimes,
        //   values: acc3, // Driving acceleration
        //   label: "Driving Acceleration",
        //   y_offset: 0,
        //   y_scale: 9.8 * 0.75,
        //   color:"#e74c3c"
        // },

        // PIL without the offset
        // positionsInLane: {
        //   epochTimes: PIL_data.map(pos => pos[0]),
        //   values: PIL_data.map(pos => pos[1]),
        //   label: "Positions in Lane",
        //   y_offset: 0,
        //   y_scale: 0.5,
        //   color:"#3498db64",
        // },
        positionsInLaneCorrected: {
          epochTimes: PIL_data.map(pos => pos[0]),
          values: PIL_data.map(pos => pos[1] + PIL_offset),
          label: "Positions in Lane-corrected",
          y_offset: 0,
          y_scale: 0.5,
          color:"#d59a7cff",
          // dash : [10, 5]
        },
        
      },
      epochTimes: epochTimes,
      // timeValues: timeValues,
      // lateralValues: acc2,  // Use acc2 for lateral
      // drivingValues: acc3   // Use acc3 for driving
      dsf_events: dsf_events,
      eec_1s_events: eec_1s_events,
      startTime: startTime,
      pil_offset: PIL_offset
    };
  }

  // Add a marker at the specified normalized time (0-1)
  addMarker(markerID, emoji, description, normalizedTime) {
    if (!this.graphGroup) return;
    
    const graphPos = this.graphGroup.position();
    const graphWidth = this.graphGroup.width();
    const graphHeight = this.graphGroup.height();

    this.markerManager.create(
      markerID,
      emoji,
      description,
      normalizedTime,
      0, // Relative to graphGroup
      0,
      graphWidth,
      graphHeight,
      this.options
    );
    this.staticLayer.batchDraw();
  }

  // Remove a marker by its ID
  removeMarker(markerID) {
    this.markerManager.removeMarker(markerID);
    this.staticLayer.batchDraw();
  }

  // Update marker positions when graph is moved
  updateMarkers() {
    if (!this.graphGroup) return;
    
    const graphPos = this.graphGroup.position();
    const graphWidth = this.graphGroup.width();
    const graphHeight = this.graphGroup.height();

    // Update each marker's position
    this.markerManager.markers.forEach((marker, markerID) => {
      const time = marker.time; // Store time when marker is created
      this.markerManager.update(
        markerID,
        time,
        0, // Relative to graphGroup
        0,
        graphWidth,
        graphHeight
      );
    });
  }

  display(epochTime, H, W) {
    if (!this.data) return;
    const graphWidth = W * 0.95;
    const graphHeight = H * 0.13;
    const graphX = W * 0.025;
    const graphY = H - graphHeight - (H * 0.02);
    if (!this.grapher) {
      console.log("metadata:", this.metadata);
      this.grapher = new Grapher(
        this.staticLayer,
        this.dynamicLayer,
        this.options,
        this.data,
        this.minTime,
        this.maxTime,
        this.data.dsf_events,
        this.data.eec_1s_events,
        this.data.startTime,
        this.data.pil_offset
      );
      this.grapher.createElements(graphX, graphY, graphWidth, graphHeight, epochTime);
      const dsfEvents = Array.isArray(this.data?.dsf_events) ? this.data.dsf_events : [];
      dsfEvents.forEach((event, index) => {
        const dsfNormalizedTime = this.getEventNormalizedTime(event);
        if (dsfNormalizedTime !== null) {
          this.grapher.addMarker(`dsf-marker-${index}`, '🚗', 'DSF - incab', dsfNormalizedTime);
        }
      });

      const eec1sEvents = Array.isArray(this.data?.eec_1s_events) ? this.data.eec_1s_events : [];
      eec1sEvents.forEach((event, index) => {
        const eec1sNormalizedTime = this.getEventNormalizedTime(event);
        if (eec1sNormalizedTime !== null) {
          this.grapher.addMarker(`eec1s-marker-${index}`, '😴', 'Drowsy - incab', eec1sNormalizedTime);
        }
      });
    } else {
      this.grapher.updateTimeline(epochTime, graphWidth, graphHeight);
    }
  }

  getEventNormalizedTime(event) {
    if (typeof event?.start_timestamp !== 'number') return null;
    if (typeof this.data?.startTime !== 'number') return null;
    if (typeof this.grapher?.minTime !== 'number' || typeof this.grapher?.maxTime !== 'number') return null;

    const eventEpoch = event.start_timestamp + this.data.startTime;
    const timeRange = this.grapher.maxTime - this.grapher.minTime;
    if (timeRange <= 0) return null;

    return Math.min(1, Math.max(0, (eventEpoch - this.grapher.minTime) / timeRange));
  }

  addMarker(markerID, emoji, description, normalizedTime) {
    if (this.grapher) {
      this.grapher.addMarker(markerID, emoji, description, normalizedTime);
    }
  }

  removeMarker(markerID) {
    if (this.grapher) {
      this.grapher.removeMarker(markerID);
    }
  }

  updateMarkers() {
    if (this.grapher) {
      this.grapher.updateMarkers();
    }
  }

  get_PIL_offset(metadata) {
    // add positionsInLane data
    this.positionsInLaneData = metadata?.inference_data?.observations_data?.positionsInLane || null;
    //  it is list of [epochTime,position] eg.  [1751942810796, -0.07]
    // console.log("Positions in lane data:", this.positionsInLaneData);



   const MIN_TRACK_LENGTH = 3;
    const CANONICAL_OUTWARD_IMAGE_WIDTH = 1920;
    const CANONICAL_OUTWARD_IMAGE_HEIGHT = 1080;
    
    const inferenceData = metadata?.inference_data || {};
    const observationsData = inferenceData?.observations_data || {};
    const laneCalParams = observationsData?.laneCalibrationParams;

    if (!laneCalParams) return null;

    let [vanishingPointEstimate, _, xInt, imageHeight] = laneCalParams;

    // Convert to 1920x1080 resolution scale
    const scale = CANONICAL_OUTWARD_IMAGE_HEIGHT / imageHeight;

    vanishingPointEstimate = vanishingPointEstimate.map(x => x * scale);
    xInt = xInt.map(x => x * scale);
    imageHeight = CANONICAL_OUTWARD_IMAGE_HEIGHT;

    // Create short lane calibration segments: bottom corners to 5% up from bottom
    const calibrationHeight = imageHeight * 0.05; // 5% of image height
    const topY = imageHeight - calibrationHeight; // Y coordinate for top of calibration segment
    
    // Left lane line direction vector from bottom to vanishing point
    const leftDirX = vanishingPointEstimate[0] - xInt[0];
    const leftDirY = vanishingPointEstimate[1] - imageHeight;
    const leftLength = Math.sqrt(leftDirX * leftDirX + leftDirY * leftDirY);
    
    // Right lane line direction vector from bottom to vanishing point  
    const rightDirX = vanishingPointEstimate[0] - xInt[1];
    const rightDirY = vanishingPointEstimate[1] - imageHeight;
    const rightLength = Math.sqrt(rightDirX * rightDirX + rightDirY * rightDirY);
    
    // Calculate end points at 5% height for each lane
    const leftEndX = xInt[0] + (leftDirX / leftLength) * calibrationHeight;
    const leftEndY = topY;
    
    const rightEndX = xInt[1] + (rightDirX / rightLength) * calibrationHeight;  
    const rightEndY = topY;

    // case 1: just 5%
    // -------
    // Return normalized coordinates (0-1 range) for the short calibration segments
    // const vanishingTriangle = [
    //   // Left calibration segment: bottom-left to 5% up
    //   [[xInt[0] / CANONICAL_OUTWARD_IMAGE_WIDTH, 1.0],
    //    [leftEndX / CANONICAL_OUTWARD_IMAGE_WIDTH, leftEndY / imageHeight]],
    //   // Right calibration segment: bottom-right to 5% up
    //   [[xInt[1] / CANONICAL_OUTWARD_IMAGE_WIDTH, 1.0],
    //    [rightEndX / CANONICAL_OUTWARD_IMAGE_WIDTH, rightEndY / imageHeight]]
    // ];


    // case 2: till vanishing point
    // -------
    const VP = [vanishingPointEstimate[0] / CANONICAL_OUTWARD_IMAGE_WIDTH, vanishingPointEstimate[1] / imageHeight];
    this.VP_normalized = VP;
    this.lane_cal_left = xInt[0] / CANONICAL_OUTWARD_IMAGE_WIDTH;
    this.lane_cal_right = xInt[1] / CANONICAL_OUTWARD_IMAGE_WIDTH;

    const vanishingTriangleData = [
      [[this.lane_cal_left, 1.0], [...VP]],
      [[this.lane_cal_right, 1.0], [...VP]]
    ];

    // console.log("Vanishing Triangle Data:", vanishingTriangleData);
    // return vanishingTriangleData;

    let x_mid = (this.lane_cal_left + this.lane_cal_right) / 2;
    let vp_offset = x_mid - this.VP_normalized[0];
    let PIL_offset = vp_offset/(this.lane_cal_right - this.lane_cal_left); // normalize to lane width
    return PIL_offset;
  }
  }


export { InertialBar };
