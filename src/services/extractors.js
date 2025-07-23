/**
 * @fileoverview collection of extractor functions for processing video session metadata
 * @module Extractors
 * 
 * 
 * write about public api of the extractor functions
 * params : video_metadata, options
 * return : list of annotations
 * @example Usage:
 * const annotations = Extractors.hello(metadata, options);
 */

import { AnnotationManifest, Annotation } from '../features/annotations/annotation-manifest.js';
import { dsf_extractor } from './extractors-folder/DSF_extractor.js';


//  * const detection = new Annotation({
//  *   id: 'det_001',
//  *   category: 'detection',
//  *   timeRange: { startMs: 1000, endMs: 5000 },
//  *   data: { bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 }, confidence: 0.95, class: 'vehicle' }
//  * });
//  * 

const Extractors = {
  hello(video_metadata, options) {
    return [
      new Annotation({
        id: 'hello-world',
        category: 'hello',
        timeRange: { startMs: 0, endMs: Infinity },
        data: { message: 'Hello, world!' }
      })
    ];
  },

  // Detection extractor - processes detection data from metadata
  detection(video_metadata, options) {
    const annotations = [];
    
    // Placeholder logic - this would be replaced with actual metadata parsing
    if (video_metadata && video_metadata.detections) {
      video_metadata.detections.forEach((detection, index) => {
        annotations.push(new Annotation({
          id: `detection-${index}`,
          category: 'detection',
          timeRange: { 
            startMs: detection.timestamp || 0, 
            endMs: (detection.timestamp || 0) + 5000 
          },
          data: {
            bbox: detection.bbox || { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
            confidence: detection.confidence || 0.95,
            class: detection.class || 'vehicle'
          }
        }));
      });
    }
    
    return annotations;
  },

  // Cross extractor for debugging - creates debug crosses
  cross(video_metadata, options) {
    return [
      new Annotation({
        id: 'debug-cross',
        category: 'cross',
        timeRange: { startMs: 0, endMs: 30000 },
        data: {
          debugText: 'Debug Cross from Metadata',
          includeCenterLines: true
        }
      })
    ];
  },

  // Text extractor - creates text overlays from metadata
  text(video_metadata, options) {
    const annotations = [];
    
    // Example: create text annotation from metadata
    if (video_metadata) {
      annotations.push(new Annotation({
        id: 'metadata-text',
        category: 'text',
        timeRange: { startMs: 1000, endMs: 5000 },
        data: {
          text: `Alert ID: ${video_metadata.alertId || 'Unknown'}`,
          position: { x: 0.02, y: 0.02 },
          anchor: 'top-left'
        }
      }));
    }
    
    return annotations;
  },

  // DSF extractor - processes DSF lane calibration data from metadata
  dsf(video_metadata, options) {
    return dsf_extractor(video_metadata);
  },

  // Add more extractor functions as needed
};

export {Extractors};