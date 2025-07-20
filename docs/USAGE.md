# Usage Guide

## 🎯 Basic Workflow

1. **Navigate** to `https://analytics-kpis.netradyne.com/alert-debug`
2. **Notepad opens automatically** with a beautiful fireworks animation
3. **Focus input**: `Cmd+I` to focus the alert debug input field
4. **Load alert**: Type alert ID and press `Enter`
5. **Take notes**: Notes are saved automatically per alert ID
6. **Video timestamps**: Type `@` to insert current video timestamp
7. **Tags**: Use `#hashtag` syntax or manual tagging

## 📋 Keyboard Shortcuts Reference

### Input Management

- **`Cmd+I`** - Focus the alert debug input field
- **`Enter`** - Submit form (when input focused) and blur input

### Smart Notepad

- **`Cmd+J`** - Smart notepad toggle behavior
- **`@`** - Insert current video timestamp (mm:ss format)

### Bulk Processing

- **`Cmd+B`** - Toggle bulk processing mode (shows paste dialog)
- **`Cmd+↓`** - Navigate to next alert ID in bulk mode
- **`Cmd+↑`** - Navigate to previous alert ID in bulk mode

### Video Controls

- **`Space`** - Toggle play/pause video (autoplay-safe with muting)
- **`←`** - Rewind video by 5 seconds
- **`→`** - Fast-forward video by 5 seconds

### General

- **`Esc`** - Remove focus from any input field

## 🔄 Bulk Processing Workflow

### Step 1: Enter Bulk Mode

1. Press `Cmd+B` to open the bulk dialog
2. Paste multiple alert IDs (space, comma, or newline separated)
3. Click "Start Bulk Processing"

### Step 2: Navigate Alerts

- **`Cmd+↓`** - Move to next alert
- **`Cmd+↑`** - Move to previous alert
- Progress indicator shows current position

### Step 3: Use Tag Filtering (Optional)

1. Add tags to alerts using `#tag` syntax
2. Select tags in the right panel
3. Press `Enter` to filter bulk processing to matching alerts only

### Step 4: Export Work

- **Export CSV** - Download all notes with metadata
- **Clear bulk** - Reset bulk processing mode

## 🏷 Tagging System

### Manual Tags

- Use the tag interface in the right panel
- Click "+" to add tags to current alert
- Remove tags by clicking the "×" on tag chips

### Hashtag Tags (Automatic)

- Type `#important` in your notes
- Hashtags are automatically extracted and added as tags
- Hashtags appear in blue in your notes

### Tag Filtering

- Select multiple tags in the right panel
- Choose AND/OR logic for filtering
- Press `Enter` to apply filters to bulk processing
- Recent filter combinations are saved for quick access

## 📊 CSV Export/Import

### Export Format

CSV includes these columns:

- Alert ID (required)
- Alert Type
- Notes
- Tags (comma-separated)
- Timestamp

### Import Process

1. Click "Import CSV" in notepad panel
2. Select CSV file with notes
3. System creates bulk mode automatically if not active
4. Navigate through imported alerts with `Cmd+↓/↑`

## 🎥 Video Features

### Enhanced Controls

- Custom progress bar with click-to-seek
- Time display (current/total)
- Play/pause button
- Fullscreen button

### Keyboard Shortcuts

- **`Space`** - Play/pause (with auto-muting for autoplay compliance)
- **`←/→`** - Seek backward/forward 5 seconds
- **`F`** - Fullscreen (when video focused)

### Timestamp Insertion

1. Position video at desired time
2. Click in notepad textarea
3. Type `@` - current timestamp is inserted automatically

## ⚙️ Settings Panel

Access via the gear icon (⚙️) in the notepad header:

- **S3 Presigner URL** - Configure metadata download service
- **Auto-save Notes** - Toggle automatic note saving
- **Keyboard Hints** - Show/hide shortcut indicators
- **Fireworks** - Enable/disable celebration animations
- **Keyboard Shortcuts Help** - Reference guide

## 🔍 Advanced Features

### Smart Panel Behavior

- Notepad remembers size and position
- Auto-focus when opening
- Smart toggle behavior (focus vs close)

### Progress Persistence

- Bulk processing state saved between sessions
- Current position and alert list restored
- Notes and tags persist across browser restarts

### Metadata Integration

- Download current alert metadata as JSON
- Includes video URLs, timestamps, and alert details
- Useful for external processing or backup

## 🆘 Troubleshooting

### Video Not Working

- Ensure video element is loaded
- Check browser autoplay policies
- Try clicking video first, then use keyboard shortcuts

### Notes Not Saving

- Check browser local storage permissions
- Verify alert ID is entered correctly
- Look for error messages in browser console

### Bulk Mode Issues

- Ensure alert IDs are properly formatted
- Check network connectivity for loading alerts
- Verify bulk processing is active (status indicator top-left)

### Keyboard Shortcuts Not Working

- Ensure no input fields are focused (press `Esc`)
- Check for browser extension conflicts
- Verify UserScript is active in Tampermonkey
