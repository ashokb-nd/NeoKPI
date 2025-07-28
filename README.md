# NeoKPI - Alert Debug Chrome Extension

A powerful Chrome Extension that enhances the Alert Debug page with comprehensive keyboard shortcuts, note-taking capabilities, bulk processing features, and advanced video controls.

## Rendering Pipeline
![NeoKPI2 drawio](https://github.com/user-attachments/assets/16505659-3b5f-4e66-9199-71c0e05b77c5)

## 🎯 What This Does

Transform your Alert Debug workflow with:
- ⌨️ **Lightning-fast keyboard shortcuts** (Cmd+I/J/B for input, notepad, bulk mode)
- 📝 **Smart note-taking** with auto-save, tags, and video timestamps
- 🔄 **Bulk processing** for handling multiple alerts efficiently  
- 🎥 **Enhanced video controls** with seek, play/pause via keyboard
- 📊 **Data export/import** via CSV for backup and sharing
- 🎯 **Clean page detection** - automatically hides on non-Alert Debug pages

## ⚡ Quick Start

```bash
# 1. Clone & Setup
git clone <repository-url>
cd NeoKPI
npm run setup

# 2. Build Chrome Extension
npm run package:store

# 3. Install in Chrome
# - Go to chrome://extensions/
# - Enable Developer mode
# - Load unpacked from dist/chrome-extension/
# - Or install from dist/neokpi-chrome-extension.zip

# 4. Visit https://analytics-kpis.netradyne.com/alert-debug
```

## 🎯 Key Features

- **`Cmd+I/J/B`** - Input focus, notepad toggle, bulk mode
- **`Space/←/→`** - Video play/pause, seek controls  
- **`Cmd+↓/↑`** - Navigate bulk alerts
- **Smart Notes** - Auto-save with tags and timestamps
- **CSV Export/Import** - Backup your work
## 🛠 Development

```bash
npm run dev              # Development with watch
npm test                 # Run tests
npm run build            # Build both Chrome extension & Tampermonkey
npm run build:extension  # Build Chrome extension only
npm run package:store    # Package for distribution/Chrome Web Store
```

## 📦 Distribution Options

### Chrome Extension (Recommended)
- **File:** `dist/neokpi-chrome-extension.zip`
- **Install:** Load unpacked or share ZIP file
- **Benefits:** No Tampermonkey dependency, better security, auto-updates

### Tampermonkey UserScript (Legacy)
- **File:** `dist/tampermonkey-script.js`
- **Install:** Copy/paste into Tampermonkey
- **Benefits:** Works on any Tampermonkey-supported browser

## 📚 Documentation

- **[Build Guide](BUILD_GUIDE.md)** - Complete Chrome extension build instructions
- **[Install Instructions](INSTALL_INSTRUCTIONS.md)** - How to install for end users
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

**Author**: Batakal Ashok 
