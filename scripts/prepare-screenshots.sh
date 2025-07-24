#!/bin/bash

# Screenshot helper for Chrome Web Store submission
# Run this after installing the extension locally

echo "📸 Chrome Web Store Screenshot Guide"
echo "=================================="
echo ""
echo "Required: 1280x800 pixel screenshots"
echo ""
echo "Screenshot Ideas:"
echo "1. Extension popup showing keyboard shortcuts"
echo "2. Alert Debug page with notepad panel open"
echo "3. Bulk processing mode with multiple alerts"
echo "4. Video controls in action"
echo "5. Notes export/CSV functionality"
echo ""
echo "Steps:"
echo "1. Install extension locally (load unpacked from dist/chrome-extension/)"
echo "2. Navigate to https://analytics-kpis.netradyne.com/alert-debug"
echo "3. Open browser dev tools (F12)"
echo "4. Set device emulation to 1280x800"
echo "5. Use extension features and take screenshots"
echo "6. Save as: screenshot-1.png, screenshot-2.png, etc."
echo ""
echo "💡 Tip: Use Cmd+Shift+4 on macOS for precise screenshot cropping"
echo ""

# Create screenshots directory if it doesn't exist
mkdir -p store-assets/screenshots

echo "Screenshots should be saved to: store-assets/screenshots/"
echo ""
echo "After taking screenshots, run: npm run package:store"
echo "Then follow CHROME_WEB_STORE_GUIDE.md for submission!"
