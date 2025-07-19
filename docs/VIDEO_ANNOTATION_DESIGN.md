# Video Annotation System Design

## 📖 Overview

This document outlines the design for a modular video annotation system that overlays graphs, ML model detections, and other visualizations on video elements using HTML5 Canvas. The system follows NeoKPI's modular architecture and integrates seamlessly with the existing metadata pipeline.

## 🎯 Core Requirements

- **Modular & Extensible**: Easy to add new annotation types
- **Performance**: Smooth rendering at video playback speeds  
- **Metadata Integration**: Leverages existing MetadataManager
- **Standard JSON Format**: Consistent intermediate representation
- **Canvas-based**: Hardware-accelerated rendering
- **Responsive**: Adapts to video dimensions and playback controls

## 🏗 Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Metadata File  │───▶│ Annotation Parser│───▶│ Annotation JSON │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HTML Video    │◀───│ Canvas Drawer    │◀───│ Renderer Engine │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📋 Standard JSON Format

### Core Structure
```json
{
  "version": "1.0",
  "alertId": "12345",
  "videoMetadata": {
    "durationMs": 30500,
    "fps": 30,
    "resolution": { "width": 1920, "height": 1080 },
    "videoStartTimeMs": 1642723200000
  },
  "annotations": [
    {
      "id": "unique-id",
      "type": "detection|graph|text|polygon|trajectory",
      "timeRange": { 
        "startMs": 5200, 
        "endMs": 8700 
      },
      "isStatic": false,
      "data": { /* type-specific data - uses normalized coordinates 0.0-1.0 */ },
      "style": { /* visual styling */ },
      "metadata": { /* additional info */ }
    }
  ]
}
```

### Annotation Types

#### 1. Object Detection
```json
{
  "type": "detection",
  "timeRange": { "startMs": 2000, "endMs": 5000 },
  "isStatic": false,
  "data": {
    "bbox": { 
      "x": 0.052, 
      "y": 0.139, 
      "width": 0.104, 
      "height": 0.167 
    },
    "confidence": 0.87,
    "class": "vehicle",
    "trackId": "track_001"
  },
  "style": {
    "borderColor": "#ff0000",
    "borderWidth": 2,
    "fillOpacity": 0.2,
    "showLabel": true,
    "labelPosition": "top-left"
  }
}
```

#### 2. Time-series Graph
```json
{
  "type": "graph",
  "timeRange": { "startMs": 0, "endMs": 30000 },
  "isStatic": true,
  "data": {
    "graphType": "line|bar|scatter",
    "series": [
      {
        "name": "speed",
        "points": [
          { "timeMs": 0, "value": 25.5 },
          { "timeMs": 1000, "value": 28.2 }
        ],
        "unit": "mph",
        "color": "#00ff00"
      }
    ],
    "position": { "x": 0.026, "y": 0.046, "width": 0.156, "height": 0.139 }
  },
  "style": {
    "backgroundColor": "rgba(0,0,0,0.7)",
    "gridLines": true,
    "showAxes": true,
    "fontSize": 12
  }
}
```

#### 3. Trajectory/Path
```json
{
  "type": "trajectory",
  "timeRange": { "startMs": 1000, "endMs": 10000 },
  "isStatic": false,
  "data": {
    "points": [
      { "timeMs": 1000, "x": 0.052, "y": 0.185 },
      { "timeMs": 2000, "x": 0.063, "y": 0.176 },
      { "timeMs": 3000, "x": 0.078, "y": 0.167 }
    ],
    "interpolation": "linear|spline",
    "showHistory": true,
    "historyLengthMs": 2000
  },
  "style": {
    "lineColor": "#ffff00",
    "lineWidth": 3,
    "pointRadius": 5,
    "showDirection": true
  }
}
```

#### 4. Text/Label Annotation
```json
{
  "type": "text",
  "timeRange": { "startMs": 3000, "endMs": 6000 },
  "isStatic": true,
  "data": {
    "text": "Critical Event Detected",
    "position": { "x": 0.104, "y": 0.093 },
    "anchor": "center|top-left|top-right|bottom-left|bottom-right"
  },
  "style": {
    "fontSize": 16,
    "fontFamily": "Arial",
    "color": "#ffffff",
    "backgroundColor": "rgba(255,0,0,0.8)",
    "padding": { "x": 10, "y": 5 },
    "borderRadius": 4
  }
}
```

## 🎨 Canvas Drawer API Design

### Core Interface
```javascript
class VideoAnnotationDrawer {
  constructor(videoElement, options = {}) {
    this.video = videoElement;
    this.canvas = this.createOverlayCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.annotations = [];
    this.renderers = new Map(); // Type-specific renderers
    this.isPlaying = false;
    this.options = { ...defaultOptions, ...options };
  }

  // Public API
  loadAnnotations(annotationJson) { /* Load and validate annotations */ }
  addAnnotation(annotation) { /* Add single annotation */ }
  removeAnnotation(id) { /* Remove by ID */ }
  setTimeRange(start, end) { /* Filter by time */ }
  show() { /* Show canvas overlay */ }
  hide() { /* Hide canvas overlay */ }
  destroy() { /* Cleanup resources */ }

  // Rendering
  render(currentTime) { /* Main render loop */ }
  resize() { /* Handle video resize */ }
}
```

### Renderer Plugin System
```javascript
// Base renderer interface
class BaseRenderer {
  constructor(drawer, options = {}) {
    this.drawer = drawer;
    this.ctx = drawer.ctx;
    this.options = options;
  }

  canRender(annotation) {
    return annotation.type === this.getType();
  }

  render(annotation, currentTime, videoRect) {
    // Override in subclasses
  }

  isVisible(annotation, currentTime) {
    // Static annotations are always visible within their time range
    if (annotation.isStatic) {
      return currentTime >= annotation.timeRange.startMs && 
             currentTime <= annotation.timeRange.endMs;
    }
    
    // Dynamic annotations may have additional visibility logic
    return currentTime >= annotation.timeRange.startMs && 
           currentTime <= annotation.timeRange.endMs;
  }

  getType() {
    throw new Error('Must implement getType()');
  }
}

// Specific renderers
class DetectionRenderer extends BaseRenderer {
  getType() { return 'detection'; }
  
  render(annotation, currentTime, videoRect) {
    const { bbox } = annotation.data;
    const { borderColor, borderWidth } = annotation.style;
    
    // Scale bbox to current video dimensions
    const scaledBbox = this.scaleCoordinates(bbox, videoRect);
    
    // Draw detection box
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeRect(scaledBbox.x, scaledBbox.y, scaledBbox.width, scaledBbox.height);
    
    // Draw label if enabled
    if (annotation.style.showLabel) {
      this.drawLabel(annotation, scaledBbox);
    }
  }
}
```

## 🔗 Integration Points

### 1. MetadataManager Integration
```javascript
// Extend existing MetadataManager
const AnnotationMetadataManager = {
  async getAnnotations(alertId) {
    const metadata = await MetadataManager.downloadMetadata(alertId);
    return this.parseAnnotationsFromMetadata(metadata);
  },

  parseAnnotationsFromMetadata(rawMetadata) {
    // Transform raw metadata to standard annotation JSON
    // This is where custom parsing logic goes for different formats
  }
};
```

### 2. Video Controls Integration
```javascript
// Extend VideoControlsManager to include annotation controls
const AnnotationControls = {
  createAnnotationPanel() {
    // Toggle buttons for different annotation types
    // Opacity slider, time range selector, etc.
  },

  attachToVideoControls(videoElement) {
    const existingControls = videoElement.parentElement.querySelector('.custom-video-controls');
    const annotationPanel = this.createAnnotationPanel();
    existingControls.appendChild(annotationPanel);
  }
};
```

### 3. Storage Integration
```javascript
// Use existing IndexedDB structure
const AnnotationStorage = {
  async storeAnnotations(alertId, annotations) {
    await MetadataManager.storeMetadataInIndexedDB(
      `${alertId}_annotations`, 
      JSON.stringify(annotations), 
      'processed'
    );
  },

  async getStoredAnnotations(alertId) {
    const stored = await MetadataManager.db.get('metadata', `${alertId}_annotations`);
    return stored ? JSON.parse(stored.content) : null;
  }
};
```

## 📝 Implementation Phases

### Phase 1: Core Framework
1. **Canvas Overlay System** - Basic canvas positioning and video sync
2. **Annotation JSON Parser** - Validation and loading
3. **Base Renderer** - Core rendering interface
4. **Time Synchronization** - Video time to annotation mapping

### Phase 2: Basic Renderers  
1. **Detection Renderer** - Bounding boxes with labels
2. **Text Renderer** - Simple text overlays
3. **Basic Graph Renderer** - Simple line/bar charts

### Phase 3: Advanced Features
1. **Trajectory Renderer** - Path visualization with history
2. **Advanced Graph Types** - Multi-series, real-time updates
3. **Interactive Elements** - Click handlers, hover effects

### Phase 4: Integration & Polish
1. **MetadataManager Integration** - Automatic annotation parsing
2. **UI Controls** - Annotation visibility toggles
3. **Performance Optimization** - Efficient rendering pipeline
4. **Documentation** - Usage examples and API docs

## ⚡ Performance Considerations

### Canvas Optimization
- **Dirty Rectangle Updates** - Only redraw changed regions
- **Layer Separation** - Static vs dynamic content on separate canvases  
- **RAF Throttling** - Use requestAnimationFrame for smooth rendering
- **Object Pooling** - Reuse rendering objects to reduce GC pressure

### Memory Management
- **Annotation Culling** - Only keep visible time range in memory
- **Texture Caching** - Cache rendered elements for reuse
- **Resource Cleanup** - Proper cleanup on video navigation

## 🎛 Pros & Cons Analysis

### Canvas Approach ✅
**Pros:**
- Hardware acceleration via GPU
- Pixel-perfect rendering control  
- Excellent performance for complex graphics
- No DOM manipulation overhead
- Scales well with annotation density

**Cons:**
- More complex hit testing for interactions
- Higher initial development complexity
- Accessibility considerations (screen readers)

### Alternative: SVG Overlay ❌
**Pros:**
- DOM-based, easier debugging
- Built-in interaction handling
- Better accessibility support
- CSS styling integration

**Cons:**
- Performance degradation with many elements
- Browser compatibility issues
- Memory overhead for complex scenes

### Alternative: WebGL ❌  
**Pros:**
- Maximum performance potential
- Advanced shader effects possible
- Excellent for 3D visualizations

**Cons:**
- Significant complexity increase
- Learning curve and maintenance burden  
- Overkill for 2D annotations

## 🔧 Usage Example

```javascript
// Initialize drawer
const drawer = new VideoAnnotationDrawer(videoElement, {
  autoResize: true,
  renderOnVideoTimeUpdate: true,
  debugMode: false
});

// Load annotations from metadata
const annotations = await AnnotationMetadataManager.getAnnotations(alertId);
drawer.loadAnnotations(annotations);

// Show overlay
drawer.show();

// The drawer automatically syncs with video playback
// and renders appropriate annotations based on current time
```

## 📚 File Structure

```
src/
├── features/
│   └── annotations/
│       ├── annotation-manager.js      # Main annotation system
│       ├── canvas-drawer.js           # Core canvas management
│       ├── annotation-parser.js       # JSON validation & parsing
│       └── renderers/
│           ├── base-renderer.js       # Base renderer class
│           ├── detection-renderer.js  # Bounding box rendering
│           ├── graph-renderer.js      # Chart/graph rendering
│           ├── text-renderer.js       # Text overlay rendering
│           └── trajectory-renderer.js # Path/motion rendering
├── services/
│   └── annotation-metadata.js        # Metadata parsing integration
└── ui/
    └── annotation-controls.js         # UI controls for annotations
```

This design provides a solid foundation for video annotation that integrates seamlessly with your existing NeoKPI architecture while remaining modular and extensible for future annotation types.
