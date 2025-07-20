/**
 * ANNOTATION DATA MODELS
 *
 * Clean separation between the full annotation document (AnnotationManifest)
 * and individual annotation items (Annotation).
 *
 * TERMINOLOGY:
 * • AnnotationManifest = Full document with version, metadata, and items array
 * • Annotation = Individual annotation item within the manifest
 *
 * USAGE:
 * ```javascript
 * // Create manifest
 * const manifest = new AnnotationManifest({
 *   version: "1.0",
 *   metadata: { videoId: "abc123" },
 *   items: [
 *     new Annotation({
 *       id: "detection-1",
 *       type: "detection",
 *       timeRange: { startMs: 1000, endMs: 5000 },
 *       data: { bbox: {...}, confidence: 0.95 }
 *     })
 *   ]
 * });
 *
 * // Or use factory methods
 * const manifest = AnnotationManifest.fromJSON(jsonData);
 * const manifest = AnnotationManifest.fromDetections(mlResults);
 *
 * // Load into video annotator
 * annotator.loadManifest(manifest);
 * ```
 */

// ========================================
// ANNOTATION ITEM CLASS
// ========================================
export class Annotation {
  constructor(data) {
    // Required fields
    this.id = data.id;
    this.type = data.type;
    this.timeRange = data.timeRange || {};
    this.data = data.data || {};

    // Validate required fields
    if (!this.id) {
      throw new Error("Annotation must have an id");
    }
    if (!this.type) {
      throw new Error("Annotation must have a type");
    }
  }

  /**
   * Check if annotation should be visible at given time
   * @param {number} timeMs - Current video time in milliseconds
   * @returns {boolean}
   */
  isVisibleAt(timeMs) {
    if (!this.timeRange) return false;

    const { startMs = 0, endMs = Infinity } = this.timeRange;
    return timeMs >= startMs && timeMs <= endMs;
  }

  /**
   * Validate annotation structure
   * @returns {boolean}
   */
  validate() {
    try {
      if (!this.id || typeof this.id !== "string") {
        throw new Error("Invalid annotation id");
      }

      if (!this.type || typeof this.type !== "string") {
        throw new Error("Invalid annotation type");
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
   * Convert to JSON-serializable object
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      timeRange: this.timeRange,
      data: this.data,
    };
  }

  /**
   * Create annotation from ML detection result
   * @param {object} detection - ML detection result
   * @param {string} id - Unique identifier
   * @param {object} timeRange - Time visibility range
   * @returns {Annotation}
   */
  static fromDetection(detection, id, timeRange) {
    return new Annotation({
      id,
      type: "detection",
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
   * Create annotation from text overlay data
   * @param {string} text - Text content
   * @param {string} id - Unique identifier
   * @param {object} position - Position data
   * @param {object} timeRange - Time visibility range
   * @returns {Annotation}
   */
  static fromText(text, id, position, timeRange) {
    return new Annotation({
      id,
      type: "text",
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

// ========================================
// ANNOTATION MANIFEST CLASS
// ========================================
export class AnnotationManifest {
  constructor(data = {}) {
    this.version = data.version || "1.0";
    this.metadata = data.metadata || {};
    this.items = [];

    // Process items array
    if (data.items && Array.isArray(data.items)) {
      this.items = data.items.map((item) =>
        item instanceof Annotation ? item : new Annotation(item),
      );
    }
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

    this.items.push(annotationObj);
  }

  /**
   * Remove annotation by ID
   * @param {string} id - Annotation ID to remove
   * @returns {boolean} - True if removed, false if not found
   */
  removeItem(id) {
    const initialLength = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);
    return this.items.length < initialLength;
  }

  /**
   * Get all annotations visible at given time
   * @param {number} timeMs - Current video time in milliseconds
   * @returns {Annotation[]}
   */
  getItemsAtTime(timeMs) {
    return this.items.filter((item) => item.isVisibleAt(timeMs));
  }

  /**
   * Find annotation by ID
   * @param {string} id - Annotation ID
   * @returns {Annotation|null}
   */
  findById(id) {
    return this.items.find((item) => item.id === id) || null;
  }

  /**
   * Get all annotations of specific type
   * @param {string} type - Annotation type
   * @returns {Annotation[]}
   */
  getItemsByType(type) {
    return this.items.filter((item) => item.type === type);
  }

  /**
   * Clear all annotations
   */
  clear() {
    this.items = [];
  }

  /**
   * Get count of annotations
   * @returns {number}
   */
  get count() {
    return this.items.length;
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

      if (!Array.isArray(this.items)) {
        throw new Error("Items must be an array");
      }

      // Validate each annotation
      for (const item of this.items) {
        if (!item.validate()) {
          return false;
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
    return {
      version: this.version,
      metadata: this.metadata,
      items: this.items.map((item) => item.toJSON()),
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
      items: [],
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
