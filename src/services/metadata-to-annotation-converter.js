/**
 * @fileoverview Converts video session metadata to annotation manifests
 * @module MetadataToAnnotationConverter
 * 
 * @example Basic usage:
 * const manifest = await MetadataToAnnotationConverter.convertToManifest(
 *   metadata, 
 *   ['detection', 'tracking'],
 *   { debugMode: true }
 * );
 */

import { AnnotationManifest, Annotation } from '../features/annotations/annotation-manifest.js';
import { Utils } from '../utils/utils.js';
import { Extractors } from './extractors.js';

/**
 * Converts video session metadata to annotation manifest
 */
export class MetadataToAnnotationConverter {
  
  static VERSION = '0.9.0';
  
  /**
   * Convert video session metadata to an AnnotationManifest
   * @param {Object} video_session_metadata - The video session metadata
   * @param {Array<string>} [annotationCategories=[]] - List of annotation categories to process
   * @param {Object} [options={}] - Optional configuration
   * @returns {AnnotationManifest|null} AnnotationManifest or null if conversion fails
   */
  static convertToManifest(video_session_metadata, annotationCategories = [], options = {}) {
    try {
      Utils.log(`Converting metadata to manifest with categories: ${annotationCategories.join(', ')}`);
      
      const annotationsByCategory = this.extractAnnotations(video_session_metadata, annotationCategories, options);
      
      Utils.log(`Extracted annotations by category:`, annotationsByCategory);
      
      const manifestData = {
        metadata: {
          source: "metadata-converter",
          version: this.VERSION,
          created: new Date().toISOString(),
          extractors: annotationCategories
        },
        items: annotationsByCategory
      };
      
      Utils.log(`Creating manifest from data:`, manifestData);
      
      const manifest = AnnotationManifest.fromJSON(manifestData);
      
      Utils.log(`Created manifest:`, manifest);
      Utils.log(`Manifest instance check:`, manifest instanceof AnnotationManifest);
      Utils.log(`Manifest count:`, manifest.count);
      
      return manifest;

    } catch (error) {
      Utils.log(`Failed to convert metadata to manifest: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract annotations from video session metadata by annotation category
   * @private
   * @param {Object} video_session_metadata - Video session metadata
   * @param {Array<string>} annotationCategories - List of annotation categories to process
   * @param {Object} options - Conversion options
   * @returns {Object} Map of annotation categories to arrays of annotations
   */
  static extractAnnotations(video_session_metadata, annotationCategories, options = {}) {
    const annotationsByCategory = {};

    for (const category of annotationCategories) {
      try {
        const extractor = Extractors[category];
        if (extractor && typeof extractor === 'function') {
          const annotations = extractor(video_session_metadata, options);
          annotationsByCategory[category] = annotations;
          Utils.log(`Extracted ${annotations.length} annotations for category: ${category}`);
        } else {
          Utils.log(`WARNING: Extractor '${category}' not found`);
        }
      } catch (error) {
        Utils.log(`ERROR: Failed to extract '${category}' annotations: ${error.message}`);
      }
    }
    
    return annotationsByCategory;
  }


}