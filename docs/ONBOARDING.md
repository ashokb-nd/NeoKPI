# 🎯 New Developer Onboarding Checklist

Welcome to NeoKPI! Follow this checklist to get started quickly.

## ✅ Setup (5 minutes)

### 1. Clone & Setup

```bash
git clone <repository-url>
cd NeoKPI
npm run setup
```

**What this does:**

- ✅ Installs dependencies
- ✅ Configures git hooks (auto-updates documentation)
- ✅ Verifies everything works

### 2. Test Your Environment

```bash
# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

If all commands succeed, you're ready to go! 🎉

## 📚 Understanding the Project

### Key Files to Know

- `src/config/constants.js` - **Keyboard shortcuts & settings** (single source of truth)
- `src/index.js` - **Main entry point**
- `dist/tampermonkey-script.js` - **Built UserScript** (copy this to Tampermonkey)

### Development Workflow

1. **Make changes** to source code
2. **Test changes**: `npm run dev` (watch mode)
3. **Run tests**: `npm test`
4. **Build**: `npm run build`
5. **Commit**: Git hooks auto-update docs

### Testing the UserScript

1. Build: `npm run build`
2. Copy content from `dist/tampermonkey-script.js`
3. Paste into Tampermonkey
4. Visit: `https://analytics-kpis.netradyne.com/alert-debug`

## 🎯 Common Tasks

### Adding a New Keyboard Shortcut

1. Edit `src/config/constants.js`:
   ```javascript
   KEYS: {
     MY_NEW_SHORTCUT: "k"; // Add your key
   }
   ```
2. Add handler in `src/core/keyboard-manager.js`
3. Commit (docs update automatically)

### Running Tests

```bash
npm test              # All tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Debugging

- Check browser console for errors
- Use `npm run dev` for development builds
- Tests help verify functionality: `npm test`

## 🆘 Getting Help

**If something doesn't work:**

1. Check you ran `npm run setup`
2. Verify Node.js version: `node --version` (needs v14+)
3. Try fresh install: `rm -rf node_modules && npm install`
4. Check git hooks: `git config --get core.hooksPath` should return `.githooks`

**Questions?** Check the main README.md for detailed information.

---

**Ready to start coding? Run `npm run dev` and start making changes! 🚀**
