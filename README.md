# NeoKPI - Alert Debug UserScript

A powerful Tampermonkey UserScript that enhances the Alert Debug page with comprehensive keyboard shortcuts, note-taking capabilities, bulk processing features, and advanced video controls.

## ⚡ Quick Start

```bash
# 1. Clone & Setup
git clone <repository-url>
cd NeoKPI
npm run setup

# 2. Build & Install
npm run build
# Copy content from dist/tampermonkey-script.js to Tampermonkey

# 3. Visit https://analytics-kpis.netradyne.com/alert-debug
```

## 🎯 Key Features

- **`Cmd+I/J/B`** - Input focus, notepad toggle, bulk mode
- **`Space/←/→`** - Video play/pause, seek controls  
- **`Cmd+↓/↑`** - Navigate bulk alerts
- **Smart Notes** - Auto-save with tags and timestamps
- **CSV Export/Import** - Backup your work
## 🛠 Development

```bash
npm run dev     # Development with watch
npm test        # Run tests
npm run build   # Build UserScript
```

## 📚 Documentation

- **[Setup Guide](docs/ONBOARDING.md)** - New developer walkthrough
- **[Architecture](docs/ARCHITECTURE.md)** - Project structure & design
- **[Configuration](docs/CONFIGURATION.md)** - Keyboard shortcuts & settings
- **[Usage Guide](docs/USAGE.md)** - Detailed feature documentation

## 🚀 Upcoming Features

- Automatic caching of alert type
- Saved dataset management
- Video annotations from metadata (using runtime overlay)

---

**Author**: Batakal Ashok | **Version**: 0.7.1 | **License**: ISC
