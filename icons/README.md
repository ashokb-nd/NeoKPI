# Icon Files Needed

For a complete Chrome extension, you need icon files in the `icons/` directory:

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management page)  
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Temporary Solution
For development, you can:
1. Create simple colored squares as placeholder icons
2. Use online tools like https://www.favicon-generator.org/
3. Design proper icons later

## Quick Icon Creation (macOS)
```bash
# Create simple colored squares for testing
sips -s format png -Z 16 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ToolbarCustomizeIcon.icns --out icons/icon16.png
sips -s format png -Z 48 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ToolbarCustomizeIcon.icns --out icons/icon48.png  
sips -s format png -Z 128 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ToolbarCustomizeIcon.icns --out icons/icon128.png
```
