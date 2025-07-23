

import { Annotation } from "../../features/annotations/annotation-manifest.js";

function _getLaneCalMessage(metadata) {

    // FILTER_SHORT_TRACKS = true
    const MIN_TRACK_LENGTH = 3;
    const CANONICAL_OUTWARD_IMAGE_WIDTH = 1920;
    const CANONICAL_OUTWARD_IMAGE_HEIGHT = 1080;
    const CANONICAL_INWARD_IMAGE_WIDTH = 1280;
    const CANONICAL_INWARD_IMAGE_HEIGHT = 720;
    const CANONICAL_DMS_IMAGE_WIDTH = 1296;
    const CANONICAL_DMS_IMAGE_HEIGHT = 1296;
  // Extract lane calibration parameters
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

  // Create triangle: bottom corners to vanishing point
  // Triangle vertices: 
  // 1. Bottom left (xInt[0], imageHeight)
  // 2. Bottom right (xInt[1], imageHeight) 
  // 3. Vanishing point (vanishingPointEstimate[0], vanishingPointEstimate[1])

  // Return normalized coordinates (0-1 range) for the triangle
  const laneCalMessage = [
    // Left edge: bottom-left to vanishing point
    [[xInt[0] / CANONICAL_OUTWARD_IMAGE_WIDTH, 1.0], [vanishingPointEstimate[0] / CANONICAL_OUTWARD_IMAGE_WIDTH, vanishingPointEstimate[1] / imageHeight]],
    // Right edge: bottom-right to vanishing point
    [[xInt[1] / CANONICAL_OUTWARD_IMAGE_WIDTH, 1.0], [vanishingPointEstimate[0] / CANONICAL_OUTWARD_IMAGE_WIDTH, vanishingPointEstimate[1] / imageHeight]]
  ];

  return laneCalMessage;
}

//  the annotations structure as follows
// {
//   id: '#randomId',
//   category: 'dsf',
//   timeRange: { startMs: 0, endMs: 999999999 },
//   data: {
//     laneCalMessage: _getLaneCalMessage()
//   }
// }

function dsf_extractor(video_metadata) {
  const annotations = [];
  
  // Create lane calibration annotation using Annotation class
  const laneCalMessage = _getLaneCalMessage(video_metadata);
  if (laneCalMessage) {
    const laneAnnotation = new Annotation({
      id: '#dsf_001', // Unique ID for this annotation
      category: 'dsf',
      timeRange: { startMs: 0, endMs: 999999999 },
      data: {
        "vanishing_triangle": laneCalMessage
      }
    });
    
    annotations.push(laneAnnotation);
  }

  return annotations;
}

export { dsf_extractor };