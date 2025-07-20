/**
 * @fileoverview Converts video session metadata to annotation manifests
 * @module MetadataToAnnotationConverter
 * 
 * @example Adding a new detector type:
 * 1. Add detector type to getAnnotationExtractors() map
 * 2. Implement extractXxxAnnotations() method
 * 3. Use detector type in convertToManifest() call
 * 
 * // Step 1: Add to extractor map
 * "weather": this.extractWeatherAnnotations
 * 
 * // Step 2: Implement extractor method
 * static extractWeatherAnnotations(video_session_metadata, options = {}) {
 *   return video_session_metadata.weather?.map(w => ({
 *     id: `weather_${w.id}`, type: "weather", timeRange: {...}, data: w
 *   })) || [];
 * }
 * 
 * // Step 3: Use in conversion
 * convertToManifest(metadata, ["detection", "weather"])
 */

import { AnnotationManifest, Annotation } from '../features/annotations/annotation-manifest.js';
import { Utils } from '../utils/utils.js';

/**
 * Converts video session metadata to annotation manifest
 */
export class MetadataToAnnotationConverter {
  
  static VERSION = '0.9.0';
  
  /**
   * Convert video session metadata to an AnnotationManifest
   * @param {Object} video_session_metadata - The video session metadata
   * @param {Array<string>} [detectors=[]] - List of detection types to process
   * @param {Object} [options={}] - Optional configuration
   * @returns {AnnotationManifest|null} AnnotationManifest or null if conversion fails
   */
  static convertToManifest(video_session_metadata,
                            detectors = [],
                            options = {}) {
    try {
      if (!video_session_metadata) {
        Utils.log(`ERROR: No video session metadata provided`);
        return null;
      }

      // Extract annotations by type using conversion logic
      const annotationsByType = this.extractAnnotations(video_session_metadata, detectors, options);

      if (!annotationsByType || Object.keys(annotationsByType).length === 0) {
        if (options.debugMode) {
          Utils.log(`DEBUG: No annotations found in video session metadata`);
        }
        return null;
      }

      // Create manifest with metadata context
      const manifestData = {
        metadata: {
          source: "metadata-converter",
          version: this.VERSION,
          created: new Date().toISOString()
        },
        items: annotationsByType  // Use map directly instead of flattened array
      };

      // Create and validate the manifest
      const manifest = AnnotationManifest.fromJSON(manifestData);
      
      if (!manifest.validate()) {
        Utils.log(`ERROR: Invalid annotation manifest created`);
        return null;
      }

      if (options.debugMode) {
        const totalAnnotations = Object.values(annotationsByType).reduce((sum, arr) => sum + arr.length, 0);
        Utils.log(`DEBUG: Successfully converted metadata to manifest with ${totalAnnotations} annotations across ${Object.keys(annotationsByType).length} types`);
      }
      
      return manifest;

    } catch (error) {
      Utils.log(`ERROR: Failed to convert metadata to manifest: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract annotations from video session metadata by detection type
   * @private
   * @param {Object} video_session_metadata - Video session metadata
   * @param {Array<string>} detectors - List of detection types to process
   * @param {Object} options - Conversion options
   * @returns {Object} Map of detection types to arrays of annotations
   */
  static extractAnnotations(video_session_metadata, detectors, options = {}) {
    try {
      const annotationsByType = {};

      // Get annotation extractors for each detection type
      const extractorMap = this.getAnnotationExtractors();

      // Process each detector type
      for (const detectorType of detectors) {
        if (extractorMap[detectorType]) {
          const extractor = extractorMap[detectorType];
          const annotations = extractor(video_session_metadata, options);
          
          if (annotations && annotations.length > 0) {
            annotationsByType[detectorType] = annotations;
            
            if (options.debugMode) {
              Utils.log(`DEBUG: Extracted ${annotations.length} annotations for type: ${detectorType}`);
            }
          }
        } else if (options.debugMode) {
          Utils.log(`DEBUG: No extractor found for detection type: ${detectorType}`);
        }
      }
      
      return annotationsByType;

    } catch (error) {
      Utils.log(`ERROR: Failed to extract annotations: ${error.message}`);
      return {};
    }
  }

  /**
   * Get map of detection types to their annotation extractors
   * @private
   * @returns {Object} Map of detection types to extractor functions
   */
  static getAnnotationExtractors() {
    return {
      "detection": this.extractDetectionAnnotations,
      "car_speed": this.extractCarSpeedAnnotations,
      "lane_position": this.extractLanePositionAnnotations,
      "trajectory": this.extractTrajectoryAnnotations,
      "text": this.extractTextAnnotations,
      // Add more extractor mappings as needed
    };
  }

  /**
   * Extract detection annotations
   * @private
   * @param {Object} video_session_metadata - Video session metadata
   * @param {Object} options - Conversion options
   * @returns {Array<Object>} Array of detection annotations
   */
  static extractDetectionAnnotations(video_session_metadata, options = {}) {
    // PLACEHOLDER: Implement detection annotation extraction
    return [];
  }

  /**
   * Extract car speed annotations
   * @private
   * @param {Object} video_session_metadata - Video session metadata
   * @param {Object} options - Conversion options
   * @returns {Array<Object>} Array of car speed annotations
   */
  static extractCarSpeedAnnotations(video_session_metadata, options = {}) {
    // PLACEHOLDER: Implement car speed annotation extraction
    return [];
  }

  /**
   * Extract lane position annotations
   * @private
   * @param {Object} video_session_metadata - Video session metadata
   * @param {Object} options - Conversion options
   * @returns {Array<Object>} Array of lane position annotations
   */
  static extractLanePositionAnnotations(video_session_metadata, options = {}) {
    // PLACEHOLDER: Implement lane position annotation extraction
    return [];
  }

  /**
   * Extract trajectory annotations
   * @private
   * @param {Object} video_session_metadata - Video session metadata
   * @param {Object} options - Conversion options
   * @returns {Array<Object>} Array of trajectory annotations
   */
  static extractTrajectoryAnnotations(video_session_metadata, options = {}) {
    // PLACEHOLDER: Implement trajectory annotation extraction
    return [];
  }

  /**
   * Extract text annotations
   * @private
   * @param {Object} video_session_metadata - Video session metadata
   * @param {Object} options - Conversion options
   * @returns {Array<Object>} Array of text annotations
   */
  static extractTextAnnotations(video_session_metadata, options = {}) {
    // PLACEHOLDER: Implement text annotation extraction
    return [];
  }
}
