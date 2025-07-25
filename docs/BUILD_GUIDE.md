# Chrome Extension Build Guide

## 🏗️ Building the Extension

### Prerequisites
```bash
npm install  # Install dependencies
```

### Build Commands

#### 1. Development Build
```bash
npm run build:extension
```
- Builds extension to `dist/chrome-extension/`
- Load unpacked from this folder for testing

#### 2. Distribution Package
```bash
npm run package:store
```
- Builds extension 
- Creates `dist/neokpi-chrome-extension.zip`
- Ready for sharing or Chrome Web Store submission

#### 3. Build Both Versions
```bash
npm run build
```
- Builds Chrome extension + Tampermonkey script
- Use when you need both formats

### Development Workflow

#### Local Testing
```bash
# 1. Build extension
npm run build:extension

# 2. Load in Chrome
# - Go to chrome://extensions/
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select dist/chrome-extension/ folder

# 3. Test on target page
# - Visit https://analytics-kpis.netradyne.com/alert-debug
# - Try keyboard shortcuts (Cmd+J, Cmd+I, etc.)

# 4. Make changes and rebuild
npm run build:extension  # Rebuilds automatically
# Click extension reload button in chrome://extensions/
```

#### Watch Mode Development
```bash
npm run dev  # Auto-rebuilds on file changes
```

### 📁 Output Structure

After building, you'll have:

```
dist/
├── chrome-extension/           # Unpacked extension
│   ├── manifest.json          # Extension config
│   ├── content-script.js      # Main extension code
│   ├── popup.html            # Extension popup
│   ├── popup.js              # Popup functionality
│   └── icons/                # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── neokpi-chrome-extension.zip # Packaged for distribution
└── tampermonkey-script.js     # Legacy userscript
```

## 🚀 Distribution

### Private Sharing (Friends/Team)
1. Run `npm run package:store`
2. Share `dist/neokpi-chrome-extension.zip`
3. Include `INSTALL_INSTRUCTIONS.md`

### Chrome Web Store Publishing
1. Build: `npm run package:store`
2. Follow `CHROME_WEB_STORE_GUIDE.md`
3. Upload `dist/neokpi-chrome-extension.zip`

## 🔧 Build Configuration

### Key Files
- `manifest.json` - Extension metadata and permissions
- `rollup.config.js` - Build configuration
- `package.json` - Build scripts and dependencies

### Build Process
1. **Rollup** bundles all JS modules into `content-script.js`
2. **Copy step** copies manifest, popup, and icons
3. **Versioning** updates version from `package.json`
4. **ZIP creation** packages everything for distribution

### Customization
- **Icons:** Replace files in `icons/` directory
- **Permissions:** Update `manifest.json`
- **Build targets:** Modify `rollup.config.js`

## 🐛 Troubleshooting

### Common Issues

#### "Extension failed to load"
- Check `manifest.json` syntax
- Ensure all referenced files exist
- Check browser console for errors

#### "Content script not injecting"
- Verify URL matches in `manifest.json`
- Check page is fully loaded
- Look for JavaScript errors

#### "Permission denied"
- Add required permissions to `manifest.json`
- Reload extension after changes

### Debug Tips
```bash
# Check build output
ls -la dist/chrome-extension/

# Verify manifest
cat dist/chrome-extension/manifest.json | jq

# Test locally first
npm run build:extension
# Then load unpacked in Chrome
```

## 📊 File Sizes
- **content-script.js:** ~320KB (includes all features)
- **Total ZIP:** ~95KB (compressed)
- **Icons:** ~3KB total

## 🔄 Version Management

Version is automatically synced between:
- `package.json` (source of truth)
- `manifest.json` (updated during build)
- Build output (stamped in files)

To update version:
1. Update `package.json` version
2. Run build - manifest updates automatically
3. Commit changes
