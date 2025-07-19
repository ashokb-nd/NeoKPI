/**
 * Modal Manager - Coordinates modal dialogs
 */
import { BulkDialog } from './modals/bulk-dialog.js';
import { ImportDialog } from './modals/import-dialog.js';
import { SettingsDialog } from './modals/settings-dialog.js';

const ModalManager = {
  showBulkDialog() {
    const dialog = new BulkDialog();
    dialog.show();
  },

  showImportDialog() {
    const dialog = new ImportDialog();
    dialog.show();
  },

  showSettingsDialog() {
    const dialog = new SettingsDialog();
    dialog.show();
  }
};

// exports 
export { ModalManager };