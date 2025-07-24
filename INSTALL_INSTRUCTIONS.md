# Installing NeoKPI Chrome Extension (Private Distribution)

## Quick Install Instructions for Friends

### Step 1: Download the Extension
Download the `neokpi-chrome-extension.zip` file shared with you.

### Step 2: Extract the ZIP
- **Windows:** Right-click → "Extract All"
- **Mac:** Double-click the ZIP file
- **Linux:** Use your file manager or `unzip` command

### Step 3: Install in Chrome
1. Open Chrome and go to: `chrome://extensions/`
2. **Enable "Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the extracted folder (the one containing `manifest.json`)
5. The extension will appear in your extensions list

### Step 4: Start Using
1. Navigate to `https://analytics-kpis.netradyne.com/alert-debug`
2. The extension will automatically activate
3. Click the extension icon to see keyboard shortcuts
4. Try `Cmd+J` to open the notepad!

## ✅ That's it! 
The extension will work exactly like a store-installed extension.

## 🔄 Updates
When there's a new version:
1. Download the new ZIP file
2. Remove the old extension from `chrome://extensions/`
3. Install the new version following steps above

## ⚠️ Security Note
This extension only works on `analytics-kpis.netradyne.com/alert-debug` and stores data locally on your machine. No data is sent anywhere else.

**Smart Page Detection:** The extension automatically detects when you navigate away from the Alert Debug page and forces a page reload to ensure a completely clean state. This prevents any UI interference on other pages like `/home` or `/dashboard`.

---

**Need help?** Contact the developer or check the keyboard shortcuts by clicking the extension icon!


