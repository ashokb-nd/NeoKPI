/**
 * VideoAnnotator for Konva.js - Manages layers and annotations
 * 1. konvastage resizing, aligning with video element is not the responsibility of this class.
 * 2. That should be handled by the client code that uses this class.
 * 3. only handles annotations.
 */



// Import visualizers
import { Debug } from "./visual-components/debug.js";
import {Dsf} from "./visual-components/dsf.js";
import { Header } from "./visual-components/header.js";
import { InertialBar } from "./visual-components/inertial-bar.js";
import { Multilane } from "./visual-components/multilane.js";
// Add more visualizers here as needed


// Auto-generate visualizer map from classes
const AVAILABLE_VISUALIZERS = [
  Debug,
  Header,
  InertialBar,
  Dsf,
  Multilane
  // Add more visualizers to this array
];

// Create map of : visualizer class name -> class reference
const VISUALIZER_MAP = Object.fromEntries(AVAILABLE_VISUALIZERS.map(cls => [cls.name, cls]));

class VideoAnnotator {
  constructor(videoElement, konvaStage, metadata = {}, visualizerNames = [], options = {}) {
    this.video = videoElement;
    this.stage = konvaStage;
    this.metadata = metadata;
    this.visualizerNames = visualizerNames;
    this.visualizers = [];
    
    // starting epoch time for video to align the annotations with the video playback
    if (metadata.startTime) {
      this._videoStartEpochTimeMS = metadata.startTime;
      console.log("Video start epoch time set to:", this._videoStartEpochTimeMS);
    } else {
      this._videoStartEpochTimeMS = Date.now(); // Fallback to current time if not provided
      console.warn("No startTime provided in metadata, using current time as fallback.");
    }

    this._lastRenderTime = -1;

    // Default options with overrides
    this.options = {
      debugMode: false,
      ...options,
    };
    
    // Create and manage layers internally
    this._initLayers();
    this._initializeVisualizers(this.visualizerNames);
    this._setupEventListeners();
  }

  destroy() {
    // destroy layers
    this.staticLayer.destroy();
    this.dynamicLayer.destroy();

    // Cancel the video frame callback if it exists
    if (this._videoFrameCallbackHandle !== undefined) {
      this.video.cancelVideoFrameCallback(this._videoFrameCallbackHandle);
      this._videoFrameCallbackHandle = undefined;
    }
    // remove event listeners
  }

  _initLayers() {
    // Create static layer for persistent annotations, UI elements
    this.staticLayer = new Konva.Layer();
    
    // Create dynamic layer for real-time overlays, animations
    this.dynamicLayer = new Konva.Layer();
    
    // Add layers to stage
    this.stage.add(this.staticLayer);
    this.stage.add(this.dynamicLayer);
  }

  // intialize visualizers from list of names
  _initializeVisualizers(visualizerNames) {
    
    for (const category of visualizerNames) {
      const VisualizerClass = VISUALIZER_MAP[category];
      if (!VisualizerClass) {
        console.warn(`Visualizer for category "${category}" not found.`);
        console.log('Available visualizers:', Object.keys(VISUALIZER_MAP));
        continue;
      }

      // Pass metadata directly to each visualizer
      // also static and dynamic layers
      const visualizer = new VisualizerClass( this.staticLayer,
                                              this.dynamicLayer,
                                              this.metadata
                                            );
      this.visualizers.push(visualizer);
    }
  }

  _setupEventListeners() {

    // Use requestVideoFrameCallback for frame-accurate rendering
    const renderFrame = () => {
      this._render();
      // Schedule next frame
      this._videoFrameCallbackHandle = this.video.requestVideoFrameCallback(renderFrame);
    };
    // Start the frame callback loop
    this._videoFrameCallbackHandle = this.video.requestVideoFrameCallback(renderFrame);

    // Handle resize
    // window.addEventListener('resize', () => {
    //   this._onResize();
    // });
  }

  // _onResize() {
  //   // Create stage info object
  //   const stageInfo = {
  //     width: this.stage.width(),
  //     height: this.stage.height()
  //   };
  //   
  //   // Notify visualizers of resize events with stage info, not stage object
  //   for (const visualizer of this.visualizers) {
  //     if (visualizer.onResize) {
  //       visualizer.onResize(stageInfo);
  //     }
  //   }
  //   // Redraw both layers
  //   this.staticLayer.batchDraw();
  //   this.dynamicLayer.batchDraw();
  // }

  //this is called for every time the video time changes
  _render() {
    const epochTime = this._videoStartEpochTimeMS + (this.video.currentTime * 1000);

    if (this._lastRenderTime === epochTime){console.log("skipping render as last render time is same as current epoch time"); return;}
    this._lastRenderTime = epochTime;

    // current size of the video in pixels
    const H = this.video.offsetHeight;
    const W = this.video.offsetWidth;

    this.visualizers.forEach(visualizer => {visualizer.display(epochTime, H, W);});
  }


}

export { VideoAnnotator };


