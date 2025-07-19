import { Utils } from '../../utils/utils.js';

// ========================================
// ANNOTATION PARSER & VALIDATOR
// ========================================
export const AnnotationParser = {
  
  /**
   * Validate and parse annotation JSON data
   */
  parse(rawData) {
    try {
      if (typeof rawData === 'string') {
        rawData = JSON.parse(rawData);
      }

      this.validateStructure(rawData);
      this.validateAnnotations(rawData.annotations);
      
      return rawData;
    } catch (error) {
      Utils.log(`Annotation parsing error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Validate top-level structure
   */
  validateStructure(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid annotation data: must be an object');
    }

    if (!data.version) {
      throw new Error('Missing required field: version');
    }

    if (!data.annotations || !Array.isArray(data.annotations)) {
      throw new Error('Invalid or missing annotations array');
    }

    // Validate video metadata if present
    if (data.videoMetadata) {
      this.validateVideoMetadata(data.videoMetadata);
    }
  },

  /**
   * Validate video metadata structure
   */
  validateVideoMetadata(metadata) {
    const requiredFields = ['durationMs', 'resolution'];
    
    for (const field of requiredFields) {
      if (!(field in metadata)) {
        throw new Error(`Missing required videoMetadata field: ${field}`);
      }
    }

    if (!metadata.resolution.width || !metadata.resolution.height) {
      throw new Error('Invalid resolution: width and height required');
    }

    if (metadata.durationMs <= 0) {
      throw new Error('Invalid duration: must be positive');
    }
  },

  /**
   * Validate all annotations
   */
  validateAnnotations(annotations) {
    for (let i = 0; i < annotations.length; i++) {
      try {
        this.validateAnnotation(annotations[i]);
      } catch (error) {
        throw new Error(`Annotation ${i}: ${error.message}`);
      }
    }
  },

  /**
   * Validate individual annotation
   */
  validateAnnotation(annotation) {
    // Required fields
    const requiredFields = ['id', 'type', 'timeRange', 'data'];
    
    for (const field of requiredFields) {
      if (!(field in annotation)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate time range
    this.validateTimeRange(annotation.timeRange);

    // Validate by annotation type
    switch (annotation.type) {
      case 'detection':
        this.validateDetectionAnnotation(annotation);
        break;
      case 'text':
        this.validateTextAnnotation(annotation);
        break;
      case 'graph':
        this.validateGraphAnnotation(annotation);
        break;
      case 'trajectory':
        this.validateTrajectoryAnnotation(annotation);
        break;
      default:
        // Allow unknown types for extensibility
        Utils.log(`Warning: Unknown annotation type: ${annotation.type}`);
    }
  },

  /**
   * Validate time range
   */
  validateTimeRange(timeRange) {
    if (!timeRange.startMs && timeRange.startMs !== 0) {
      throw new Error('Missing timeRange.startMs');
    }

    if (!timeRange.endMs && timeRange.endMs !== 0) {
      throw new Error('Missing timeRange.endMs');
    }

    if (timeRange.startMs < 0 || timeRange.endMs < 0) {
      throw new Error('Time values must be non-negative');
    }

    if (timeRange.startMs >= timeRange.endMs) {
      throw new Error('startMs must be less than endMs');
    }
  },

  /**
   * Validate detection annotation
   */
  validateDetectionAnnotation(annotation) {
    const { data } = annotation;
    
    if (!data.bbox) {
      throw new Error('Detection annotation missing bbox');
    }

    this.validateNormalizedBbox(data.bbox);

    // Optional fields validation
    if (data.confidence !== undefined && (data.confidence < 0 || data.confidence > 1)) {
      throw new Error('Confidence must be between 0 and 1');
    }
  },

  /**
   * Validate text annotation
   */
  validateTextAnnotation(annotation) {
    const { data } = annotation;
    
    if (!data.text) {
      throw new Error('Text annotation missing text field');
    }

    if (!data.position) {
      throw new Error('Text annotation missing position');
    }

    this.validateNormalizedPosition(data.position);
  },

  /**
   * Validate graph annotation
   */
  validateGraphAnnotation(annotation) {
    const { data } = annotation;
    
    if (!data.series || !Array.isArray(data.series)) {
      throw new Error('Graph annotation missing series array');
    }

    if (!data.position) {
      throw new Error('Graph annotation missing position');
    }

    this.validateNormalizedRect(data.position);

    // Validate series
    for (let i = 0; i < data.series.length; i++) {
      const series = data.series[i];
      
      if (!series.points || !Array.isArray(series.points)) {
        throw new Error(`Series ${i}: missing points array`);
      }

      // Validate points
      for (let j = 0; j < series.points.length; j++) {
        const point = series.points[j];
        if (typeof point.timeMs !== 'number' || typeof point.value !== 'number') {
          throw new Error(`Series ${i}, Point ${j}: timeMs and value must be numbers`);
        }
      }
    }
  },

  /**
   * Validate trajectory annotation
   */
  validateTrajectoryAnnotation(annotation) {
    const { data } = annotation;
    
    if (!data.points || !Array.isArray(data.points)) {
      throw new Error('Trajectory annotation missing points array');
    }

    // Validate trajectory points
    for (let i = 0; i < data.points.length; i++) {
      const point = data.points[i];
      
      if (typeof point.timeMs !== 'number') {
        throw new Error(`Point ${i}: timeMs must be a number`);
      }

      if (typeof point.x !== 'number' || typeof point.y !== 'number') {
        throw new Error(`Point ${i}: x and y must be numbers`);
      }

      this.validateNormalizedCoordinate(point.x);
      this.validateNormalizedCoordinate(point.y);
    }
  },

  /**
   * Validate normalized bounding box (0.0 - 1.0)
   */
  validateNormalizedBbox(bbox) {
    const requiredFields = ['x', 'y', 'width', 'height'];
    
    for (const field of requiredFields) {
      if (typeof bbox[field] !== 'number') {
        throw new Error(`bbox.${field} must be a number`);
      }
      this.validateNormalizedCoordinate(bbox[field]);
    }

    // Additional validation
    if (bbox.x + bbox.width > 1.0) {
      throw new Error('bbox extends beyond normalized bounds (x + width > 1.0)');
    }

    if (bbox.y + bbox.height > 1.0) {
      throw new Error('bbox extends beyond normalized bounds (y + height > 1.0)');
    }
  },

  /**
   * Validate normalized position
   */
  validateNormalizedPosition(position) {
    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
      throw new Error('Position x and y must be numbers');
    }

    this.validateNormalizedCoordinate(position.x);
    this.validateNormalizedCoordinate(position.y);
  },

  /**
   * Validate normalized rectangle
   */
  validateNormalizedRect(rect) {
    const requiredFields = ['x', 'y', 'width', 'height'];
    
    for (const field of requiredFields) {
      if (typeof rect[field] !== 'number') {
        throw new Error(`${field} must be a number`);
      }
      this.validateNormalizedCoordinate(rect[field]);
    }
  },

  /**
   * Validate single normalized coordinate (0.0 - 1.0)
   */
  validateNormalizedCoordinate(value) {
    if (value < 0.0 || value > 1.0) {
      throw new Error(`Coordinate ${value} out of normalized bounds (0.0 - 1.0)`);
    }
  },

  /**
   * Create a sample annotation for testing
   */
  createSampleAnnotation() {
    return {
      version: "1.0",
      alertId: "test-alert",
      videoMetadata: {
        durationMs: 10000,
        fps: 30,
        resolution: { width: 1920, height: 1080 },
        videoStartTimeMs: Date.now()
      },
      annotations: [
        {
          id: "test-detection-1",
          type: "detection",
          timeRange: { startMs: 1000, endMs: 5000 },
          isStatic: false,
          data: {
            bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
            confidence: 0.95,
            class: "vehicle",
            trackId: "track_001"
          },
          style: {
            borderColor: "#ff0000",
            borderWidth: 2,
            showLabel: true
          }
        }
      ]
    };
  }
};
