# NeoKPI - Alert Debug Chrome Extension

A Chrome Extension that enhances the Alert Debug page with comprehensive keyboard shortcuts, note-taking capabilities, bulk processing features, and advanced video controls.

## Rendering Pipeline
![NeoKPI2 drawio](docs/assets/Rendering_pipeline.svg)

## 🎯 What This Does

Transform your Alert Debug workflow with:
- ⌨️ **Quick keyboard shortcuts** (Cmd+I/J/B for input, notepad, bulk mode)
- 📝 **Smart note-taking** with auto-save, tags, and video timestamps
- 🔄 **Bulk processing** for handling multiple alerts efficiently  
- 🎥 **Enhanced video controls** with seek, play/pause via keyboard
- 📊 **Data export/import** via CSV for backup and sharing
- 🎯 **Video Annotations** Add your own custom renderers using data from metadata file

## ⚡ Quick Start

```bash
# 1. Clone & Setup
git clone <repository-url>
cd NeoKPI
npm run setup

# 2. Build Chrome Extension
npm run build

# 3. Install in Chrome
# - Go to chrome://extensions/
# - Enable Developer mode
# - Load unpacked from dist/chrome-extension/

# 4. Visit https://analytics-kpis.netradyne.com/alert-debug
```

## 📚 Documentation

- **[Build Guide](docs/BUILD_GUIDE.md)** - Complete Chrome extension build instructions

- **[Chrome Web Store Guide](CHROME_WEB_STORE_GUIDE.md)** - Publishing to Chrome Web Store
- **[API Reference](docs/API.md)** - Complete API documentation
- **[Setup Guide](docs/ONBOARDING.md)** - New developer walkthrough
- **[Architecture](docs/ARCHITECTURE.md)** - Project structure & design
- **[Configuration](docs/CONFIGURATION.md)** - Keyboard shortcuts & settings
- **[Usage Guide](docs/USAGE.md)** - Detailed feature documentation
- **[Add your own renderer](docs/AddingNewRenderer.md)** - How to create custom annotation renderers
- **[Documentation Guidelines](docs/DOCUMENTATION_GUIDELINES.md)** - JSDoc standards & practices

## 🚀 Upcoming Features

- Automatic caching of alert type
- make it into a 'chrome extension'
- Saved dataset management (named bulk)
  - save to s3
  - should be able to share our observations, along with time stamps with others, easily.
 
- Download the annotated video
- annotation level opacity
  - Option for the user to choose the opacity of individual annotations
- Handle SPA navigation properly.
  - going out from `alert-debug`
  - into `alert-debug`
- video contains white padding like thing on left,right sides. Then, HTML video size != actual video screen size.

---

**Author**: Inward Analytics team
