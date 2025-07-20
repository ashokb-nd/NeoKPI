/**
 * Alert Debug UserScript
 *
 * This UserScript provides keyboard shortcuts for the Alert Debug page:
 *
 * Input Management:
 *   - "Cmd+i" key: Focus the alert debug input field
 *   - Enter key: Submit the form (when input is focused) and blur input
 *   - Multiple alert IDs: Paste space/comma/newline separated IDs and press Enter
 *
 * Bulk Processing:
 *   - "Cmd+b" key: Toggle bulk processing mode (shows paste dialog)
 *   - Cmd+Down arrow (↓): Load next alert ID in bulk mode
 *   - Cmd+Up arrow (↑): Load previous alert ID in bulk mode
 *   - Bulk alerts and alert type are automatically saved and restored between sessions
 *   - Clear bulk alerts option available in notepad panel
 *
 * Video Controls:
 *   - Space bar: Toggle play/pause video (autoplay-safe with muting)
 *   - Left arrow (←): Rewind video by 5 seconds
 *   - Right arrow (→): Fast-forward video by 5 seconds
 *
 * Notepad Feature:
 *   - "Cmd+j" key: Smart notepad toggle behavior
 *   - Notes are automatically saved per alert ID using local storage
 *   - Export notes as CSV with columns: [alert id, alert type, notes, timestamp]
 *   - Type "@" in notes to insert current video timestamp (mm:ss format)
 *
 * Notes:
 *   - Video controls only work when no input field is focused
 *   - Bulk processing shows progress in top-right corner
 *   - Bulk alerts are persisted across browser sessions
 *   - The script waits for required elements to load before activating shortcuts
 *   - All shortcuts include proper event prevention to avoid conflicts
 *   - Video is automatically muted when played via spacebar for autoplay compliance
 *   - Notepad automatically shows notes for the current alert ID
 */

// Core modules - used directly in bootstrap
import { Application } from "./core/application.js";
import { GlobalScope } from "./core/global-scope.js";
import { CONFIG } from "./config/constants.js";

// Application Bootstrap
(() => {
  "use strict";

  // change the title of the page to "NeoKPI - <version> 🎉"
  document.title = `NeoKPI - ${CONFIG.VERSION} 🎉`;

  // Create and initialize the application
  const app = new Application();
  app.init();

  // Expose utilities to global scope for development
  GlobalScope.expose(app);
})();
