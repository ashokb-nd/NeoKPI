# NeoKPI - Alert Debug UserScript

A powerful Tampermonkey UserScript that enhances the Alert Debug page with comprehensive keyboard shortcuts, note-taking capabilities, bulk processing features, and advanced video controls.

## 🚀 Features

### Input Management
- **`Cmd+i`** - Focus input field
- **`Enter`** - Submit form

### Smart Notepad System
- **`Cmd+j`** - Toggle notepad

### Bulk Processing
- **`Cmd+b`** - Bulk process mode
- **`Cmd+↓`** - Next alert
- **`Cmd+↑`** - Previous alert

### Video Controls
- **`Space`** - Video play/pause
- **`←`** - Video rewind
- **`→`** - Video forward


### Additional Features
- **Settings Management** - Customizable preferences and configurations
- **Metadata Download** - Export current alert metadata
- **Fireworks Animation** - Beautiful initialization animation
- **Responsive UI** - Resizable panels with saved dimensions
- **Dark Theme** - Consistent dark UI design
- **Keyboard Shortcuts Help** - Built-in help system
- **Multiple Alert IDs** - Paste space/comma/newline separated IDs and press Enter for bulk processing
- **Advanced Tagging System** - Manual tags and hashtag support with filtering
- **CSV Export/Import** - Backup and restore notes and tags
- **Auto-save Notes** - Notes saved automatically per alert ID
- **Video Timestamp Insertion** - Type @ to insert current video timestamp

## 📦 Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Build the project (see Development section)
3. Copy the content from `dist/tampermonkey-script.js`
4. Create a new UserScript in Tampermonkey and paste the code
5. Navigate to `https://analytics-kpis.netradyne.com/alert-debug`

## 🛠 Development

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd NeoKPI

# Install dependencies
npm install
```

### Build Commands
```bash
# Build for production
npm run build

# Development build with watch mode
npm run dev

# Run tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Project Structure
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

### Architecture

The project follows a modular architecture with clear separation of concerns:

- **Core** - Application initialization, state management, and keyboard handling
- **Features** - Business logic for notes, tags, bulk processing, and filtering
- **Services** - External integrations and settings management  
- **UI** - User interface components and visual elements
- **Utils** - Shared utilities and storage abstraction

### Testing

The project uses Vitest for testing with comprehensive coverage:

- Unit tests for all major components
- Mocked dependencies for isolated testing
- JSDOM environment for DOM manipulation testing
- Coverage reporting with detailed metrics

### Build System

- **Rollup** - Module bundler for creating the final UserScript
- **IIFE Format** - Immediately Invoked Function Expression for UserScript compatibility
- **ES Modules** - Modern JavaScript module system for development
- **JSON Import** - Dynamic version injection from package.json

## 🎯 Usage Guide

### Basic Workflow
1. Navigate to the Alert Debug page
2. The notepad opens automatically with a beautiful fireworks animation
3. Use `Cmd+I` to focus the input field
4. Type an alert ID and press `Enter` to load
5. Take notes in the notepad - they're saved automatically
6. Use `@` to insert video timestamps
7. Add tags using #hashtag syntax or manual tagging

### Bulk Processing Workflow
1. Press `Cmd+B` to open the bulk dialog
2. Paste multiple alert IDs (space, comma, or newline separated)
3. Use `Cmd+↓/↑` to navigate through alerts
4. Use tag filtering to focus on specific alerts
5. Progress is shown in the top-left corner
6. All progress is automatically saved and restored

### Advanced Features
- **Tag Filtering**: Select tags and use `Enter` to filter bulk processing
- **CSV Export/Import**: Backup and restore your notes and tags
- **Settings Panel**: Customize behavior and preferences
- **Metadata Download**: Export current alert metadata
- **Keyboard Shortcuts**: Press `?` in settings for full shortcut reference

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Interactive test UI
npm run test:ui
```

Test coverage includes:
- Keyboard event handling
- Bulk processing logic
- Note and tag management
- UI component interactions
- Storage operations
- Video controls functionality

## 📈 Version History

- **v0.7.1** - Current version with full feature set
- Enhanced video controls with custom UI
- Advanced tagging and filtering system  
- Comprehensive test coverage
- Modular architecture refactoring

## 🔧 Configuration

Key configuration options in `src/config/constants.js`:

- **Element Selectors** - DOM element targeting
- **Keyboard Shortcuts** - Customizable key bindings
- **Timing Settings** - Debounce and interval configurations
- **Storage Keys** - Local storage key definitions
- **UI Defaults** - Panel sizes and behaviors

### Keyboard Shortcuts Configuration

Keyboard shortcuts are centrally managed in `src/config/constants.js`. When you change a shortcut:

1. **Automatic Documentation Update**: Run `npm run docs:update` to regenerate README
2. **Runtime Help**: Settings panel automatically reflects changes
3. **Validation**: Tests ensure documentation stays in sync

**Example**: To change the notepad toggle from `j` to `n`:

```javascript
// src/config/constants.js
KEYS: {
  TOGGLE_NOTEPAD: 'n'  // Changed from 'j'
}
```

Then run:
```bash
npm run docs:update  # Updates README automatically
npm run build       # Rebuilds with new shortcuts
```

The system prevents documentation drift by:
- ✅ Generating docs from source of truth (config)
- ✅ Pre-commit hooks for automatic updates
- ✅ Runtime help always reflects current config
- ✅ Tests validate documentation sync

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

ISC License - see package.json for details

## 🙋 Support

For issues or questions:
1. Check the keyboard shortcuts help (in settings)
2. Review the test files for usage examples
3. Check browser console for error messages
4. Create an issue with detailed reproduction steps

---

**Author**: Batakal Ashok  
**Target**: Alert Debug Page Enhancement  
**Environment**: Tampermonkey UserScript for Chrome/Firefox
# Test change
