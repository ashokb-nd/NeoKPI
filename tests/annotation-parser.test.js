import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AnnotationParser } from '../src/features/annotations/annotation-parser.js';

// Mock Utils
vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    log: vi.fn()
  }
}));

describe('AnnotationParser', () => {
  describe('parse', () => {
    test('should parse valid JSON string', () => {
      const validData = {
        version: "1.0",
        alertId: "test-alert",
        annotations: []
      };
      
      const result = AnnotationParser.parse(JSON.stringify(validData));
      
      expect(result).toEqual(validData);
    });

    test('should parse valid object directly', () => {
      const validData = {
        version: "1.0",
        alertId: "test-alert",
        annotations: []
      };
      
      const result = AnnotationParser.parse(validData);
      
      expect(result).toEqual(validData);
    });

    test('should throw error for invalid JSON string', () => {
      expect(() => {
        AnnotationParser.parse('{ invalid json }');
      }).toThrow();
    });

    test('should throw error for missing version', () => {
      const invalidData = {
        alertId: "test-alert",
        annotations: []
      };
      
      expect(() => {
        AnnotationParser.parse(invalidData);
      }).toThrow('Missing required field: version');
    });

    test('should throw error for missing annotations array', () => {
      const invalidData = {
        version: "1.0",
        alertId: "test-alert"
      };
      
      expect(() => {
        AnnotationParser.parse(invalidData);
      }).toThrow('Invalid or missing annotations array');
    });
  });

  describe('validateVideoMetadata', () => {
    test('should validate correct metadata', () => {
      const metadata = {
        durationMs: 30000,
        fps: 30,
        resolution: { width: 1920, height: 1080 }
      };
      
      expect(() => {
        AnnotationParser.validateVideoMetadata(metadata);
      }).not.toThrow();
    });

    test('should throw error for missing durationMs', () => {
      const metadata = {
        fps: 30,
        resolution: { width: 1920, height: 1080 }
      };
      
      expect(() => {
        AnnotationParser.validateVideoMetadata(metadata);
      }).toThrow('Missing required videoMetadata field: durationMs');
    });

    test('should throw error for invalid resolution', () => {
      const metadata = {
        durationMs: 30000,
        fps: 30,
        resolution: { width: 1920 } // missing height
      };
      
      expect(() => {
        AnnotationParser.validateVideoMetadata(metadata);
      }).toThrow('Invalid resolution: width and height required');
    });

    test('should throw error for negative duration', () => {
      const metadata = {
        durationMs: -1000,
        fps: 30,
        resolution: { width: 1920, height: 1080 }
      };
      
      expect(() => {
        AnnotationParser.validateVideoMetadata(metadata);
      }).toThrow('Invalid duration: must be positive');
    });
  });

  describe('validateAnnotation', () => {
    test('should validate complete detection annotation', () => {
      const annotation = {
        id: "test-detection",
        type: "detection",
        timeRange: { startMs: 1000, endMs: 5000 },
        data: {
          bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
          confidence: 0.95,
          class: "vehicle"
        },
        style: {
          borderColor: "#ff0000"
        }
      };
      
      expect(() => {
        AnnotationParser.validateAnnotation(annotation);
      }).not.toThrow();
    });

    test('should throw error for missing required fields', () => {
      const annotation = {
        type: "detection",
        timeRange: { startMs: 1000, endMs: 5000 },
        data: {}
      };
      
      expect(() => {
        AnnotationParser.validateAnnotation(annotation);
      }).toThrow('Missing required field: id');
    });

    test('should validate text annotation', () => {
      const annotation = {
        id: "test-text",
        type: "text",
        timeRange: { startMs: 1000, endMs: 5000 },
        data: {
          text: "Test Text",
          position: { x: 0.5, y: 0.5 }
        }
      };
      
      expect(() => {
        AnnotationParser.validateAnnotation(annotation);
      }).not.toThrow();
    });

    test('should handle unknown annotation types', () => {
      const annotation = {
        id: "test-unknown",
        type: "unknown-type",
        timeRange: { startMs: 1000, endMs: 5000 },
        data: {}
      };
      
      expect(() => {
        AnnotationParser.validateAnnotation(annotation);
      }).not.toThrow(); // Should not throw for unknown types
    });
  });

  describe('validateTimeRange', () => {
    test('should validate correct time range', () => {
      const timeRange = { startMs: 1000, endMs: 5000 };
      
      expect(() => {
        AnnotationParser.validateTimeRange(timeRange);
      }).not.toThrow();
    });

    test('should throw error for missing startMs', () => {
      const timeRange = { endMs: 5000 };
      
      expect(() => {
        AnnotationParser.validateTimeRange(timeRange);
      }).toThrow('Missing timeRange.startMs');
    });

    test('should throw error for negative times', () => {
      const timeRange = { startMs: -1000, endMs: 5000 };
      
      expect(() => {
        AnnotationParser.validateTimeRange(timeRange);
      }).toThrow('Time values must be non-negative');
    });

    test('should throw error when startMs >= endMs', () => {
      const timeRange = { startMs: 5000, endMs: 1000 };
      
      expect(() => {
        AnnotationParser.validateTimeRange(timeRange);
      }).toThrow('startMs must be less than endMs');
    });

    test('should allow zero start time', () => {
      const timeRange = { startMs: 0, endMs: 5000 };
      
      expect(() => {
        AnnotationParser.validateTimeRange(timeRange);
      }).not.toThrow();
    });
  });

  describe('validateDetectionAnnotation', () => {
    test('should validate detection with all fields', () => {
      const annotation = {
        data: {
          bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
          confidence: 0.95,
          class: "vehicle",
          trackId: "track_001"
        }
      };
      
      expect(() => {
        AnnotationParser.validateDetectionAnnotation(annotation);
      }).not.toThrow();
    });

    test('should throw error for missing bbox', () => {
      const annotation = {
        data: {
          confidence: 0.95,
          class: "vehicle"
        }
      };
      
      expect(() => {
        AnnotationParser.validateDetectionAnnotation(annotation);
      }).toThrow('Detection annotation missing bbox');
    });

    test('should throw error for invalid confidence', () => {
      const annotation = {
        data: {
          bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
          confidence: 1.5 // Invalid: > 1.0
        }
      };
      
      expect(() => {
        AnnotationParser.validateDetectionAnnotation(annotation);
      }).toThrow('Confidence must be between 0 and 1');
    });
  });

  describe('validateNormalizedBbox', () => {
    test('should validate correct normalized bbox', () => {
      const bbox = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
      
      expect(() => {
        AnnotationParser.validateNormalizedBbox(bbox);
      }).not.toThrow();
    });

    test('should throw error for coordinates outside bounds', () => {
      const bbox = { x: -0.1, y: 0.2, width: 0.3, height: 0.4 };
      
      expect(() => {
        AnnotationParser.validateNormalizedBbox(bbox);
      }).toThrow('Coordinate -0.1 out of normalized bounds');
    });

    test('should throw error when bbox extends beyond bounds', () => {
      const bbox = { x: 0.8, y: 0.2, width: 0.3, height: 0.4 }; // 0.8 + 0.3 = 1.1 > 1.0
      
      expect(() => {
        AnnotationParser.validateNormalizedBbox(bbox);
      }).toThrow('bbox extends beyond normalized bounds (x + width > 1.0)');
    });

    test('should throw error for non-numeric values', () => {
      const bbox = { x: 'invalid', y: 0.2, width: 0.3, height: 0.4 };
      
      expect(() => {
        AnnotationParser.validateNormalizedBbox(bbox);
      }).toThrow('bbox.x must be a number');
    });
  });

  describe('validateGraphAnnotation', () => {
    test('should validate complete graph annotation', () => {
      const annotation = {
        data: {
          series: [
            {
              name: "speed",
              points: [
                { timeMs: 1000, value: 25.5 },
                { timeMs: 2000, value: 28.2 }
              ]
            }
          ],
          position: { x: 0.1, y: 0.1, width: 0.5, height: 0.3 }
        }
      };
      
      expect(() => {
        AnnotationParser.validateGraphAnnotation(annotation);
      }).not.toThrow();
    });

    test('should throw error for missing series', () => {
      const annotation = {
        data: {
          position: { x: 0.1, y: 0.1, width: 0.5, height: 0.3 }
        }
      };
      
      expect(() => {
        AnnotationParser.validateGraphAnnotation(annotation);
      }).toThrow('Graph annotation missing series array');
    });

    test('should throw error for invalid point data', () => {
      const annotation = {
        data: {
          series: [
            {
              points: [
                { timeMs: 'invalid', value: 25.5 } // Invalid timeMs
              ]
            }
          ],
          position: { x: 0.1, y: 0.1, width: 0.5, height: 0.3 }
        }
      };
      
      expect(() => {
        AnnotationParser.validateGraphAnnotation(annotation);
      }).toThrow('timeMs and value must be numbers');
    });
  });

  describe('validateTrajectoryAnnotation', () => {
    test('should validate complete trajectory annotation', () => {
      const annotation = {
        data: {
          points: [
            { timeMs: 1000, x: 0.1, y: 0.2 },
            { timeMs: 2000, x: 0.2, y: 0.3 }
          ]
        }
      };
      
      expect(() => {
        AnnotationParser.validateTrajectoryAnnotation(annotation);
      }).not.toThrow();
    });

    test('should throw error for missing points', () => {
      const annotation = {
        data: {}
      };
      
      expect(() => {
        AnnotationParser.validateTrajectoryAnnotation(annotation);
      }).toThrow('Trajectory annotation missing points array');
    });

    test('should throw error for invalid point coordinates', () => {
      const annotation = {
        data: {
          points: [
            { timeMs: 1000, x: 1.5, y: 0.2 } // x > 1.0
          ]
        }
      };
      
      expect(() => {
        AnnotationParser.validateTrajectoryAnnotation(annotation);
      }).toThrow('Coordinate 1.5 out of normalized bounds');
    });
  });

  describe('createSampleAnnotation', () => {
    test('should create valid sample annotation', () => {
      const sample = AnnotationParser.createSampleAnnotation();
      
      expect(() => {
        AnnotationParser.parse(sample);
      }).not.toThrow();
      
      expect(sample.annotations).toHaveLength(1);
      expect(sample.annotations[0].type).toBe('detection');
    });
  });
});
