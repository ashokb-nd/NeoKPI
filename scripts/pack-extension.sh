#!/bin/bash

# Pack Chrome Extension Script
# Creates a .crx file from the unpacked extension

echo "📦 Packing Chrome Extension..."

# Ensure extension is built
npm run build

# Create packed extension using Chrome
echo "To create a packed (.crx) extension:"
echo ""
echo "Method 1 - Chrome UI:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Pack extension'"
echo "4. Extension root directory: $(pwd)/dist/chrome-extension"
echo "5. Private key file: Leave blank (Chrome will generate)"
echo "6. Click 'Pack Extension'"
echo ""
echo "Method 2 - Command Line (if you have Chrome CLI):"
echo "google-chrome --pack-extension=$(pwd)/dist/chrome-extension"
echo ""
echo "Output will be: neokpi-chrome-extension.crx"
echo ""
echo "💡 Note: For friends, the ZIP method is usually easier!"
echo "   Packed extensions require users to drag-and-drop to install."
