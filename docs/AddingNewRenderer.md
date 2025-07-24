# Canvas Renderer Development Guide

A comprehensive guide for developers creating new annotation renderers using HTML5 Canvas.

**Canvas API Tutorial:** [MDN Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial) - Refer to this for full Canvas API details and fundamentals.

## Table of Contents
- [Quick Start](#quick-start)
- [Integrating with VideoAnnotator](#integrating-with-videoannotator)
- [Canvas Context Basics](#canvas-context-basics)
- [Essential Good Practices](#essential-good-practices)
- [Common Rendering Patterns](#common-rendering-patterns)
- [Performance Tips](#performance-tips)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Renderer Structure
```javascript
import { BaseRenderer } from "./base-renderer.js";

export class MyRenderer extends BaseRenderer {
   static category = "my-category";

  getDefaultOptions() {
    return {
      defaultColor: "#FF0000",
      defaultLineWidth: 2,
      defaultOpacity: 1.0
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    const { data, style = {} } = annotation;
    
    // Always validate data first
    if (!data || !data.points) return;
    
    // 🔥 ESSENTIAL: Save context before making changes
    this.ctx.save();
    
    // Apply styles
    this.ctx.strokeStyle = style.color || this.options.defaultColor;
    this.ctx.lineWidth = style.lineWidth || this.options.defaultLineWidth;
    this.ctx.globalAlpha = style.opacity || this.options.defaultOpacity;
    
    // Your drawing code here...
    
    // 🔥 ESSENTIAL: Always restore context
    this.ctx.restore();
  }
}
```

---

## Integrating with VideoAnnotator

After creating your renderer, you need to register it with the VideoAnnotator system to make it available for use.

### Step 1: Create Your Renderer
Follow the [Quick Start](#quick-start) section to create your renderer class.

### Step 2: Add to VideoAnnotator Registry
Open `/src/features/annotations/video-annotator.js` and:

1. **Import your renderer** at the top with other imports:
```javascript
import { MyRenderer } from "./renderers/my-renderer.js";
```

2. **Add to the registry** - Find the `AVAILABLE_RENDERER_CLASSES` array and add your renderer:
```javascript
const AVAILABLE_RENDERER_CLASSES = [
  DetectionRenderer,
  TextRenderer,
  GraphRenderer,
  TrajectoryRenderer,
  CrossRenderer,
  HelloRenderer,
  DSFRenderer,
  MyRenderer  // ← Add your renderer here
];
```

### Step 3: Add to Configuration
Add your renderer category to the system configuration:

Open `/src/config/constants.js` and:

1. **Add your category** to the `ANNOTATIONS_CATEGORIES` array:
```javascript
ANNOTATIONS_CATEGORIES: [
  'cross', 
  'dsf',
  'myCategory'  // ← Add your renderer category here
],
```

### Step 4: Create an Extractor Function
To convert metadata into annotations that your renderer can display, create an extractor function:

Open `/src/services/extractors.js` and:

1. **Add your extractor function** to the `Extractors` object:
- implement it in a new file in `extractors-folder`.  then import it into the `extractors.js`.
```javascript
const Extractors = {
  // ... existing extractors ...
  
  // My custom extractor - processes my custom data from metadata
  myCategory(video_metadata, options) {
    const annotations = [];
    
    // Process your metadata format here
    // ...
    
    return annotations;
  }
};
```

2. **Key Points:**
   - Function name must match your renderer's `category` property
   - Return an array of `Annotation` objects
   - Transform metadata into the data structure your renderer expects


### Step 5: That's It! 
The VideoAnnotator will automatically:
- Use your renderer's `.category` property to identify it
- Create instances when annotations with that category are loaded
- Route annotations to your renderer based on the category match

### Example Usage
```javascript
// Your renderer will automatically handle annotations like this:
annotator.addAnnotation({
  id: "my-annotation-1",
  category: "my-category",  // ← Must match your renderer's category
  timeRange: { startMs: 1000, endMs: 5000 },
  data: { 
    points: [{ x: 0.5, y: 0.5 }]  // Your custom data structure
  }
});
```

### ⚠️ Important Notes
- **Category must be unique**: Each renderer's `category` should be unique across all renderers
- **Configuration update required**: Your renderer category must be added to `ANNOTATIONS_CATEGORIES` in `/src/config/constants.js`
- **Extractor-Renderer pairing**: Your extractor function name must exactly match your renderer's `category` property
- **Data transformation**: The extractor transforms raw metadata into the annotation format your renderer expects

### 🔄 Workflow Overview
1. **Metadata arrives** → 2. **Extractor processes it** → 3. **Annotations created** → 4. **Renderer displays them**

When you call `MetadataToAnnotationConverter.convertToManifest(metadata, ['my-category'])`, the system:
1. Checks that `my-category` is listed in `CONFIG.ANNOTATIONS_CATEGORIES`
2. Looks for an extractor function named `my-category` in the `Extractors` object
3. Calls that function with your metadata to create annotations
4. Routes annotations with category `my-category` to your renderer for display


---

## Canvas Context Basics

### What is `ctx`?
`ctx` (Canvas 2D Rendering Context) is your drawing interface. Think of it as a **digital paintbrush** with various settings.

### Core Drawing Methods
```javascript
// PATH OPERATIONS
ctx.beginPath()              // Start a new drawing path
ctx.moveTo(x, y)            // Move to point without drawing
ctx.lineTo(x, y)            // Draw line to point
ctx.arc(x, y, radius, 0, 2*Math.PI)  // Draw circle
ctx.rect(x, y, width, height)        // Draw rectangle
ctx.closePath()             // Close current path

// RENDERING
ctx.stroke()                // Draw the outline
ctx.fill()                  // Fill the shape

// STYLING
ctx.strokeStyle = "#FF0000" // Line color
ctx.fillStyle = "#00FF00"   // Fill color
ctx.lineWidth = 3           // Line thickness
ctx.lineCap = "round"       // Line end style: "butt", "round", "square"
ctx.lineJoin = "round"      // Corner style: "miter", "round", "bevel"
ctx.globalAlpha = 0.5       // Transparency (0-1)
```

---

## Essential Good Practices

### 1. 🔥 ALWAYS Use save()/restore() Pattern
**WHY:** It saves the state/Settings of the canvas like stroke width, color etc. Prevents this particular rendering settings from affecting other annotations.

**Reference:** [MDN - Canvas Drawing State](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/save#the_drawing_state)

```javascript
// ❌ BAD - Changes affect other renderers
render(annotation, currentTimeMs, videoRect) {
  this.ctx.strokeStyle = "red";
  this.ctx.lineWidth = 5;
  // Draw something...
  // Problem: Next renderer still uses red color and thick lines!
}

// ✅ GOOD - Isolated changes
render(annotation, currentTimeMs, videoRect) {
  this.ctx.save();           // Save current state
  this.ctx.strokeStyle = "red";
  this.ctx.lineWidth = 5;
  // Draw something...
  this.ctx.restore();        // Restore original state
}
```

### 2. 🔥 ALWAYS Validate Data
**WHY:** Prevents crashes from malformed annotation data.

```javascript
// ✅ GOOD - Always check data exists and is valid
render(annotation, currentTimeMs, videoRect) {
  const { data, style = {} } = annotation;
  
  // Check required data exists
  if (!data || !data.points) {
    return; // Exit gracefully
  }
  
  // Check data format
  if (!Array.isArray(data.points) || data.points.length < 2) {
    return;
  }
  
  // Continue with rendering...
}
```

### 3. 🔥 Normalize Coordinates
**WHY:** Your annotations work across different video sizes.

Annotations use **normalized coordinates** (0-1 range) to stay independent of canvas size. In your `render()` method, you need to convert these to actual pixel coordinates.

```javascript
// Annotation data uses normalized coordinates (0-1)
const normalizedX = 0.5;  // Center horizontally
const normalizedY = 0.3;  // 30% from top

// Convert to canvas pixels
const canvasX = normalizedX * videoRect.width;
const canvasY = normalizedY * videoRect.height;
```

### 4. 🔥 Use beginPath() for Each Shape
**WHY:** Prevents shapes from connecting unexpectedly.

```javascript
// ✅ GOOD - Each shape is independent
data.points.forEach(point => {
  this.ctx.beginPath();           // Start fresh path
  this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
  this.ctx.fill();
});

// ❌ BAD - Shapes connect to each other
data.points.forEach(point => {
  // Missing beginPath() - shapes will connect!
  this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
  this.ctx.fill();
});
```

---

## Common Rendering Patterns

### Drawing Lines
```javascript
render(annotation, currentTimeMs, videoRect) {
  const { data, style = {} } = annotation;
  if (!data || !data.points || data.points.length < 2) return;
  
  this.ctx.save();
  this.ctx.strokeStyle = style.color || "#00FF00";
  this.ctx.lineWidth = style.width || 2;
  this.ctx.lineCap = "round";
  
  this.ctx.beginPath();
  const firstPoint = data.points[0];
  this.ctx.moveTo(firstPoint[0] * videoRect.width, firstPoint[1] * videoRect.height);
  
  data.points.slice(1).forEach(point => {
    this.ctx.lineTo(point[0] * videoRect.width, point[1] * videoRect.height);
  });
  
  this.ctx.stroke();
  this.ctx.restore();
}
```

---

## Performance Tips

### 1. Minimize Context Changes
```javascript
// ❌ BAD - Too many context switches
data.points.forEach(point => {
  this.ctx.save();
  this.ctx.fillStyle = point.color;
  this.ctx.beginPath();
  this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
  this.ctx.fill();
  this.ctx.restore();
});

// ✅ GOOD - Group by style
const pointsByColor = groupBy(data.points, 'color');
Object.entries(pointsByColor).forEach(([color, points]) => {
  this.ctx.save();
  this.ctx.fillStyle = color;
  points.forEach(point => {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
  });
  this.ctx.restore();
});
```

### 2. Use Efficient Drawing Methods
```javascript
// ✅ GOOD - Single path for multiple lines
this.ctx.beginPath();
data.lines.forEach(line => {
  this.ctx.moveTo(line.start.x, line.start.y);
  this.ctx.lineTo(line.end.x, line.end.y);
});
this.ctx.stroke(); // Single stroke call
```

### 3. Early Exit for Off-Screen Elements
```javascript
render(annotation, currentTimeMs, videoRect) {
  // Check if annotation should be visible at current time
  if (currentTimeMs < annotation.timeRange.startMs || 
      currentTimeMs > annotation.timeRange.endMs) {
    return; // Don't render if outside time range
  }
  
  // Check if annotation is outside visible area
  if (isOutsideViewport(annotation.data, videoRect)) {
    return; // Don't render if outside screen
  }
  
  // Continue with rendering...
}
```

---

## Troubleshooting

### Common Issues

**Problem:** Lines connecting between separate shapes
```javascript
// ❌ Missing beginPath()
this.ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
this.ctx.arc(x2, y2, radius, 0, 2 * Math.PI); // Connects to previous!

// ✅ Fix: Add beginPath() for each shape
this.ctx.beginPath();
this.ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
this.ctx.beginPath();
this.ctx.arc(x2, y2, radius, 0, 2 * Math.PI);
```

**Problem:** Blurry lines
```javascript
// ✅ Use half-pixel offsets for crisp 1px lines
this.ctx.moveTo(x + 0.5, y + 0.5);
this.ctx.lineTo(x2 + 0.5, y2 + 0.5);
```

**Problem:** Colors/styles bleeding between renderers
```javascript
// ✅ Always use save/restore pattern
this.ctx.save();
// ... your rendering code
this.ctx.restore();
```

### Debugging Tips

1. **Log coordinates:** `console.log('Drawing at:', x, y);`
2. **Visual debugging:** Add temporary colored rectangles to see bounds
3. **Check data format:** Ensure normalized coordinates (0-1 range)
4. **Test with simple shapes first:** Start with basic rectangles/circles

---

## Example: Complete Renderer Implementation

```javascript
import { BaseRenderer } from "./base-renderer.js";

export class PolygonRenderer extends BaseRenderer {
  get category() {
    return "polygon";
  }

  getDefaultOptions() {
    return {
      defaultStrokeColor: "#00FF00",
      defaultFillColor: "rgba(0, 255, 0, 0.1)",
      defaultLineWidth: 2,
      defaultOpacity: 1.0
    };
  }

  render(annotation, currentTimeMs, videoRect) {
    const { data, style = {} } = annotation;
    
    // Validate required data
    if (!data || !data.points || !Array.isArray(data.points) || data.points.length < 3) {
      return;
    }

    // Extract styles with defaults
    const strokeColor = style.strokeColor || this.options.defaultStrokeColor;
    const fillColor = style.fillColor || this.options.defaultFillColor;
    const lineWidth = style.lineWidth || this.options.defaultLineWidth;
    const opacity = style.opacity || this.options.defaultOpacity;

    // Save context state
    this.ctx.save();

    // Apply styles
    this.ctx.strokeStyle = strokeColor;
    this.ctx.fillStyle = fillColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.globalAlpha = opacity;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Draw polygon
    this.ctx.beginPath();
    
    // Move to first point
    const firstPoint = data.points[0];
    this.ctx.moveTo(
      firstPoint[0] * videoRect.width,
      firstPoint[1] * videoRect.height
    );
    
    // Draw lines to remaining points
    data.points.slice(1).forEach(point => {
      this.ctx.lineTo(
        point[0] * videoRect.width,
        point[1] * videoRect.height
      );
    });
    
    // Close polygon
    this.ctx.closePath();
    
    // Fill and stroke
    this.ctx.fill();
    this.ctx.stroke();

    // Restore context state
    this.ctx.restore();
  }
}
```

---

## Summary Checklist

Before submitting your renderer:

- [ ] Uses `save()/restore()` pattern
- [ ] Validates input data
- [ ] Handles normalized coordinates (0-1)
- [ ] Uses `beginPath()` for each shape
- [ ] Includes proper error handling
- [ ] Tests with various annotation data formats
- [ ] Follows consistent styling patterns
- [ ] Documents expected data structure

Happy rendering! 🎨
