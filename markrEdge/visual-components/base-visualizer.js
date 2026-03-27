/**
 * Base Visualizer class - defines the public API for all visualizers
 */
class BaseVisualizer {
  constructor(staticLayer, dynamicLayer, metadata = {}) {
    this.staticLayer = staticLayer;
    this.dynamicLayer = dynamicLayer;

    this.data = this.processMetadata(metadata);
  }

  processMetadata(metadata) {
    // process metadata, Extract relevant information
    throw new Error("processMetadata method must be implemented by subclass");
  }
  display(epochTime, H, W) {
    throw new Error("display method must be implemented by subclass");
  }

}

export { BaseVisualizer };

//=============================
// Template for new visualizers
//=============================

// import { BaseVisualizer } from './base-visualizer.js';

// export class NewVisualizer extends BaseVisualizer {
//   constructor(staticLayer, dynamicLayer, metadata) {
//     super(staticLayer, dynamicLayer, metadata);
//     // Additional initialization if needed
//   }

//   processMetadata(metadata) {
//     // Process metadata specific to this visualizer
//     return extractedData;
//   }

//   display(epochTime, H, W) {
//     // Implement visualization logic here
//   }
// }

