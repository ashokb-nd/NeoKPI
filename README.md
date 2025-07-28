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
Follow these steps to generate the 'chrome-extension'
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
> Coming soon...

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
- Copy the video frame and the annotations onto a single canvas.

---

**Author**: Inward Analytics team
