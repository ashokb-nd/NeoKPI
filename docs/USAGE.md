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

- **`Cmd+Shift+B`** - Toggle bulk processing mode (shows paste dialog)
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

1. Press `Cmd+Shift+B` to open the bulk dialog
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
