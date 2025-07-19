# Architecture Documentation

## 🏗 Project Structure

```
src/
├── index.js                 # Main entry point with application bootstrap
├── config/
│   └── constants.js         # Configuration constants and keys
├── core/
│   ├── application.js       # Main Application class and initialization
│   ├── app-state.js        # Application state management
│   ├── global-scope.js     # Global scope utilities
│   └── keyboard-manager.js  # Keyboard event handling
├── features/
│   ├── bulk-processor.js   # Bulk alert processing logic
│   ├── filter.js          # Tag-based filtering system
│   ├── notes.js           # Notes management and CSV operations
│   └── tags.js            # Tag extraction and management
├── services/
│   ├── metadata.js        # Metadata download functionality
│   └── settings.js        # Settings management
├── ui/
│   ├── fireworks.js       # Initialization animation
│   ├── modal-manager.js   # Modal dialogs and settings
│   ├── tags-ui.js         # Tag interface components
│   ├── ui-manager.js      # Main UI components and notepad
│   └── video-controls.js  # Enhanced video controls
└── utils/
    ├── admin.js           # Administrative utilities
    ├── storage.js         # Local storage abstraction
    └── utils.js           # General utility functions

tests/                     # Comprehensive test suite
├── setup.js              # Test environment setup
└── *.test.js            # Individual feature tests
```

## 🧩 Modular Architecture

The project follows a modular architecture with clear separation of concerns:

### Core Layer
- **Application initialization** - Bootstrap process and module coordination
- **State management** - Centralized application state
- **Keyboard handling** - Event management and shortcut processing

### Features Layer  
- **Business logic** - Notes, tags, bulk processing, filtering
- **Domain models** - Data structures and operations
- **Feature coordination** - Inter-feature communication

### Services Layer
- **External integrations** - Metadata services, settings persistence
- **Cross-cutting concerns** - Logging, configuration, utilities

### UI Layer
- **Visual components** - Panels, modals, controls
- **User interactions** - Event handling, state updates
- **Rendering logic** - DOM manipulation, styling

### Utils Layer
- **Shared utilities** - Common functions, helpers
- **Storage abstraction** - Local storage operations
- **Cross-platform compatibility** - Browser-specific handling

## 🔄 Data Flow

1. **User Interaction** → UI Components
2. **UI Components** → Core State Management
3. **State Management** → Features/Services
4. **Features/Services** → Utils/Storage
5. **Storage** → State Updates → UI Updates

## 🧪 Testing Strategy

- **Unit tests** for all major components
- **Mocked dependencies** for isolated testing
- **JSDOM environment** for DOM manipulation testing
- **Coverage reporting** with detailed metrics

## 🔧 Build System

- **Rollup** - Module bundler for creating the final UserScript
- **IIFE Format** - Immediately Invoked Function Expression for UserScript compatibility
- **ES Modules** - Modern JavaScript module system for development
- **JSON Import** - Dynamic version injection from package.json
