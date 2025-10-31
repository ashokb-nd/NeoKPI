# markrEdge

A Node.js project for markrEdge application.

## Integration with Main NeoKPI Application

**For New Developers:** This folder serves as both a standalone video annotation demo and a reusable module for the main NeoKPI application.

**Key Integration:**
- The main NeoKPI app imports `VideoAnnotator` from `./annotations/video-annotator.js`
- Used in `/src/features/annotations/annotation-manager-new.js` for video overlay annotations
- Provides Konva.js-based canvas rendering with pluggable visual components
- Can run independently for testing/development or be imported as a module

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
```bash
npm install
```

### Running the Application
```bash
npm start
```

### Development
```bash
npm run dev
```

## Project Structure
```
markrEdge/
├── index.js          # Main application entry point
├── package.json      # Project configuration and dependencies
├── README.md         # This file
├── .gitignore        # Git ignore rules
└── 1/                # Media files directory
    ├── inward.mp4
    ├── outward.mp4
    └── metadata.json
```

## License
ISC
