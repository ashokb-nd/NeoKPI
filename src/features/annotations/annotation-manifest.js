/**
 * Video Annotation Data Structures
 * 
 * Provides core classes for managing video annotations:
 * - AnnotationManifest: Container for annotation collections with metadata
 * - Annotation: Individual annotation items with timing and category-specific data
 *
 * @module AnnotationManifest
 * 
 * @example
 * const manifest = new AnnotationManifest({
 *   metadata: { videoId: "abc123" },
 *   items: {
 *     "detection": [
 *       new Annotation({
 *         id: "detection-1",
 *         category: "detection",
 *         timeRange: { startMs: 1000, endMs: 5000 },
 *         data: { bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 }, confidence: 0.95 }
 *       })
 *     ]
 *   }
 * });
 */

/**
 * Individual annotation item with timing and category-specific data
 * 
 * @class Annotation
 * @property {string} id - Unique identifier
 * @property {string} category - Annotation category ('detection', 'text', 'graph', 'trajectory', 'cross')
 * @property {object} timeRange - Visibility window {startMs, endMs}
 * @property {object} data - Category-specific data
 * 
 * @example
 * const detection = new Annotation({
 *   id: 'det_001',
 *   category: 'detection',
 *   timeRange: { startMs: 1000, endMs: 5000 },
 *   data: { bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 }, confidence: 0.95, class: 'vehicle' }
 * });
 */
export class Annotation {
  /**
   * Creates a new annotation instance
   * 
   * @param {object} data - Annotation configuration
   * @param {string} data.id - Unique identifier
   * @param {string} data.category - Annotation category
   * @param {object} [data.timeRange={}] - Visibility range {startMs, endMs}
   * @param {object} [data.data={}] - Category-specific data
   * @throws {Error} When required fields are missing
   */
  constructor(data) {
    // Required fields
    this.id = data.id;
    this.category = data.category;
    this.timeRange = data.timeRange || {};
    this.data = data.data || {};

    // Validate required fields
    if (!this.id) {
      throw new Error("Annotation must have an id");
    }
    if (!this.category) {
      throw new Error("Annotation must have a category");
    }
  }

  /**
   * Check if annotation is visible at given time
   * 
   * @public
   * @param {number} timeMs - Current video time in milliseconds
   * @returns {boolean} True if annotation is visible
   * @example
   * const annotation = new Annotation({...});
   * const isVisible = annotation.isVisibleAt(5000); // Check at 5 seconds
   */
  isVisibleAt(timeMs) {
    if (!this.timeRange) return false;

    const { startMs = 0, endMs = Infinity } = this.timeRange;
    return timeMs >= startMs && timeMs <= endMs;
  }

  /**
   * Validate annotation structure and data integrity
   * 
   * @public
   * @returns {boolean} True if annotation is valid
   * @example
   * const annotation = new Annotation({...});
   * if (!annotation.validate()) {
   *   console.error('Invalid annotation');
   * }
   */
  validate() {
    try {
      if (!this.id || typeof this.id !== "string") {
        throw new Error("Invalid annotation id");
      }

      if (!this.category || typeof this.category !== "string") {
        throw new Error("Invalid annotation category");
      }

      if (this.timeRange) {
        const { startMs, endMs } = this.timeRange;
        if (
          typeof startMs === "number" &&
          typeof endMs === "number" &&
          startMs > endMs
        ) {
          throw new Error("Invalid time range: startMs must be <= endMs");
        }
      }

      return true;
    } catch (error) {
      console.warn(
        `Annotation validation failed for ${this.id}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Convert annotation to JSON-serializable object
   * 
   * @returns {object} Serializable annotation data
   */
  toJSON() {
    return {
      id: this.id,
      category: this.category,
      timeRange: this.timeRange,
      data: this.data,
    };
  }

  /**
   * Create annotation from ML detection result
   * 
   * @param {object} detection - ML detection data
   * @param {string} id - Unique identifier
   * @param {object} timeRange - Visibility range
   * @returns {Annotation} Detection annotation
   */
  static fromDetection(detection, id, timeRange) {
    return new Annotation({
      id,
      category: "detection",
      timeRange,
      data: {
        bbox: detection.bbox,
        confidence: detection.confidence,
        class: detection.class,
        score: detection.score,
      },
    });
  }

  /**
   * Create text annotation
   * 
   * @param {string} text - Text content
   * @param {string} id - Unique identifier
   * @param {object} position - Position data
   * @param {object} timeRange - Visibility range
   * @returns {Annotation} Text annotation
   */
  static fromText(text, id, position, timeRange) {
    return new Annotation({
      id,
      category: "text",
      timeRange,
      data: {
        text,
        position,
        style: {
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        },
      },
    });
  }
}

/**
 * Container for annotation collections with metadata and versioning
 * 
 * @class AnnotationManifest
 * @property {string} version - Schema version
 * @property {object} metadata - Document metadata
 * @property {Object<string, Annotation[]>} items - Annotation collection organized by category
 * 
 * @example
 * const manifest = new AnnotationManifest({
 *   version: "1.0",
 *   metadata: { videoId: "abc123" },
 *   items: {
 *     "detection": [annotation1, annotation2],
 *     "car_speed": [speedAnnotation1]
 *   }
 * });
 */
export class AnnotationManifest {
  /**
   * Creates annotation manifest with items and metadata
   * 
   * @param {object} [data={}] - Manifest configuration
   * @param {string} [data.version="1.0"] - Schema version
   * @param {object} [data.metadata={}] - Document metadata
   * @param {Object<string, Annotation[]>} [data.items={}] - Annotations map by category
   */
  constructor(data = {}) {
    this.version = data.version || "1.0";
    this.metadata = data.metadata || {};
    this.items = {};

    // Process items map
    if (data.items && typeof data.items === 'object') {
      this.items = this._processItemsMap(data.items);
    }
  }

  /**
   * Process items map to ensure proper Annotation instances
   * @private
   * @param {Object<string, Annotation[]>} itemsMap - Map of annotation arrays by category
   * @returns {Object<string, Annotation[]>} Processed map
   */
  _processItemsMap(itemsMap) {
    const processedMap = {};
    
    for (const [category, annotations] of Object.entries(itemsMap)) {
      processedMap[category] = annotations.map(item =>
        item instanceof Annotation ? item : new Annotation(item)
      );
    }
    
    return processedMap;
  }

  /**
   * Add annotation item to manifest
   * @param {Annotation|object} annotation - Annotation to add
   */
  addItem(annotation) {
    const annotationObj =
      annotation instanceof Annotation
        ? annotation
        : new Annotation(annotation);

    const category = annotationObj.category;
    if (!this.items[category]) {
      this.items[category] = [];
    }
    this.items[category].push(annotationObj);
  }

  /**
   * Remove annotation by ID
   * @param {string} id - Annotation ID to remove
   * @returns {boolean} - True if removed, false if not found
   */
  removeItem(id) {
    let found = false;
    
    for (const [category, annotations] of Object.entries(this.items)) {
      const initialLength = annotations.length;
      this.items[category] = annotations.filter((item) => item.id !== id);
      
      if (this.items[category].length < initialLength) {
        found = true;
        // Remove empty category arrays
        if (this.items[category].length === 0) {
          delete this.items[category];
        }
        break;
      }
    }
    
    return found;
  }

  /**
   * Get all annotations visible at given time
   * @param {number} timeMs - Current video time in milliseconds
   * @returns {Annotation[]}
   */
  getItemsAtTime(timeMs) {
    const visibleItems = [];
    
    for (const annotations of Object.values(this.items)) {
      visibleItems.push(...annotations.filter(item => item.isVisibleAt(timeMs)));
    }
    
    return visibleItems;
  }

  /**
   * Find annotation by ID
   * @param {string} id - Annotation ID
   * @returns {Annotation|null}
   */
  findById(id) {
    for (const annotations of Object.values(this.items)) {
      const found = annotations.find(item => item.id === id);
      if (found) return found;
    }
    return null;
  }

  /**
   * Get all annotations of specific category
   * @param {string} category - Annotation category
   * @returns {Annotation[]}
   */
  getItemsByCategory(category) {
    return this.items[category] || [];
  }

  /**
   * Get all annotation categories in manifest
   * @returns {string[]} Array of annotation categories
   */
  getCategories() {
    return Object.keys(this.items);
  }

  /**
   * Clear all annotations
   */
  clear() {
    this.items = {};
  }

  /**
   * Get count of annotations
   * @returns {number}
   */
  get count() {
    return Object.values(this.items).reduce((sum, annotations) => sum + annotations.length, 0);
  }

  /**
   * Get count of annotations by category
   * @returns {Object<string, number>} Map of category to count
   */
  getCountsByCategory() {
    const counts = {};
    for (const [category, annotations] of Object.entries(this.items)) {
      counts[category] = annotations.length;
    }
    return counts;
  }

  /**
   * Validate entire manifest
   * @returns {boolean}
   */
  validate() {
    try {
      if (!this.version || typeof this.version !== "string") {
        throw new Error("Invalid manifest version");
      }

      if (typeof this.items !== 'object' || this.items === null) {
        throw new Error("Items must be an object");
      }

      // Validate each annotation in each category
      for (const [category, annotations] of Object.entries(this.items)) {
        if (!Array.isArray(annotations)) {
          throw new Error(`Annotations for category '${category}' must be an array`);
        }
        
        for (const item of annotations) {
          if (!item.validate()) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.warn("Manifest validation failed:", error.message);
      return false;
    }
  }

  /**
   * Convert to JSON-serializable object
   * @returns {object}
   */
  toJSON() {
    const itemsJson = {};
    
    for (const [category, annotations] of Object.entries(this.items)) {
      itemsJson[category] = annotations.map(item => item.toJSON());
    }
    
    return {
      version: this.version,
      metadata: this.metadata,
      items: itemsJson,
    };
  }

  /**
   * Create manifest from JSON data
   * @param {object} jsonData - JSON data
   * @returns {AnnotationManifest}
   */
  static fromJSON(jsonData) {
    return new AnnotationManifest(jsonData);
  }

  /**
   * Create empty manifest with metadata
   * @param {object} metadata - Metadata object
   * @returns {AnnotationManifest}
   */
  static create(metadata = {}) {
    return new AnnotationManifest({
      version: "1.0",
      metadata,
      items: {},
    });
  }

  /**
   * Create manifest from ML detection results
   * @param {object[]} detections - Array of ML detection results
   * @param {object} metadata - Metadata object
   * @returns {AnnotationManifest}
   */
  static fromDetections(detections, metadata = {}) {
    const manifest = AnnotationManifest.create(metadata);

    detections.forEach((detection, index) => {
      const annotation = Annotation.fromDetection(
        detection,
        `detection-${index}`,
        detection.timeRange || { startMs: 0, endMs: 5000 },
      );
      manifest.addItem(annotation);
    });

    return manifest;
  }
}
