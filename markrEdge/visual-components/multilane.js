
import { BaseVisualizer } from './base-visualizer.js';

export class Multilane extends BaseVisualizer {
  constructor(staticLayer, dynamicLayer, metadata) {
    super(staticLayer, dynamicLayer, metadata);
    // Additional initialization if needed
    this.lane_frame_markings = [];
    this.debug_points = [];
  }

  processMetadata(metadata) {

    const CANONICAL_OUTWARD_IMAGE_WIDTH = 1920;
    const CANONICAL_OUTWARD_IMAGE_HEIGHT = 1080;

    this.CANONICAL_OUTWARD_IMAGE_HEIGHT = CANONICAL_OUTWARD_IMAGE_HEIGHT
    this.CANONICAL_OUTWARD_IMAGE_WIDTH = CANONICAL_OUTWARD_IMAGE_WIDTH

    let multiLaneData = metadata.inference_data.observations_data.multiLane;
    return multiLaneData;
  }

  _format_bazier_points(points,H,W,debug=true) {
    // points are expected as a list of 8 numbers
    // console.log("unnormalized", points);
    // BezPoints (list) - 6 element list representing
    //  [p1x, p1y, p2x, p2y, c1x, c1y, c2x, c2y]

    let p1, p2, c1, c2; 

    p1 = [points[0], points[1]];
    p2 = [points[2], points[3]];
    c1 = [points[4], points[5]];
    c2 = [points[6], points[7]];

    // rescale them 
    p1 = [p1[0] / this.CANONICAL_OUTWARD_IMAGE_WIDTH * W, p1[1] / this.CANONICAL_OUTWARD_IMAGE_HEIGHT * H];
    p2 = [p2[0] / this.CANONICAL_OUTWARD_IMAGE_WIDTH * W, p2[1] / this.CANONICAL_OUTWARD_IMAGE_HEIGHT * H];
    c1 = [c1[0] / this.CANONICAL_OUTWARD_IMAGE_WIDTH * W, c1[1] / this.CANONICAL_OUTWARD_IMAGE_HEIGHT * H];
    c2 = [c2[0] / this.CANONICAL_OUTWARD_IMAGE_WIDTH * W, c2[1] / this.CANONICAL_OUTWARD_IMAGE_HEIGHT * H];

    let scaled_points = [...p1, ...c1, ...c2, ...p2];

    if (debug) {
        // plot the points for debug
        const colors = ['red', 'green', 'blue', 'yellow'];
        for(let i=0; i<4; i++){
            const x = scaled_points[i*2];
            const y = scaled_points[i*2+1];
        // Draw the point on the canvas
        const circle = new Konva.Circle({
            x: x,
            y: y,
            radius: 1,
            fill: colors[i],
            // stroke: 'black',
            // strokeWidth: 1
        });
        this.dynamicLayer.add(circle);
        this.debug_points.push(circle);
    }
}
    return scaled_points;

  }
  _draw_track(track_id,track_content,H,W,epochTime){

    // console.log(`track_content: ${track_content}`);
    for(let track_frame of track_content){
    // console.log(track_frame);
    let track_epoch = track_frame[0];

    // don't draw  future frames
    if(track_epoch > epochTime){
        continue
    }

    // check if recent enough
    const time_diff = epochTime - track_epoch;
    if(time_diff > 200){
        continue;
    }

    let lane = track_frame.slice(2, 10);
    const scaledPoints = this._format_bazier_points(lane, H, W);

    // track bezier curve
    const bezierCurve = new Konva.Line({
        points : scaledPoints,
        stroke: 'rgba(32, 103, 246, 0.90)',
        strokeWidth: 1.5,
        bezier: true
      });
        this.staticLayer.add(bezierCurve);
        this.lane_frame_markings.push(bezierCurve);

    // Add a Rect behind your Text
    const background = new Konva.Rect({
        x: scaledPoints[0],
        y: scaledPoints[1] - 18,
        width: 30, // Can be dynamic
        height: 16,
      fill: '#0f2a5f',
        opacity: 0.6, // Dark enough to see text, transparent enough to see the road
        cornerRadius: 3
    });
    this.staticLayer.add(background);
    this.lane_frame_markings.push(background);

    // add track id label
    const trackLabel = new Konva.Text({
        x: scaledPoints[0] + 4,
        y: scaledPoints[1] - 14,
        text: `${track_id}`,
        fontSize: 13,
        fill: '#EAF2FF',
        listening: false,
      });
        this.staticLayer.add(trackLabel);
        this.lane_frame_markings.push(trackLabel);

    }
  }
  display(epochTime, H, W) {
    // Implement visualization logic here

    // bazier value : BezPoints (list) - 6 element list representing [p1x, p1y, p2x, p2y, c1x, c1y, c2x, c2y]

    //clear all tracks
    for(let lane_frame of this.lane_frame_markings){
        lane_frame.destroy();
    }
    //clear all dots
    for(let dot of this.debug_points){
        dot.destroy();
    }


    for(let track of this.data){
        let track_id = track[0];
        let track_content = track[1];
        this._draw_track(track_id, track_content,H,W,epochTime);
    }

  
  }
}

