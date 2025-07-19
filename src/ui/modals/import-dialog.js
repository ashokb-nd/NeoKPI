/**
 * used to import notes from a CSV file
 */
import { ModalStyles, ModalUtils } from './modal-utils.js';
import { NotesManager } from '../../features/notes.js';
import { BulkProcessor } from '../../features/bulk-processor.js';
import { UIManager, NotepadUI } from '../ui-manager.js';
import { AppState } from '../../core/app-state.js';

class ImportDialog {
  constructor() {
    this.selectedFile = null;
    this.statusDiv = null;
  }

  // Status div management methods
  createStatusDiv() {
    this.statusDiv = ModalUtils.createElement('div', ModalStyles.statusDiv);
    return this.statusDiv;
  }

  showStatus(message, type = 'info') {
    if (!this.statusDiv) return;
    
    this.statusDiv.style.display = 'block';
    this.statusDiv.innerHTML = message;
    
    // Set colors based on status type
    switch (type) {
      case 'success':
        this.statusDiv.style.background = '#d4edda';
        this.statusDiv.style.color = '#155724';
        break;
      case 'error':
        this.statusDiv.style.background = '#f8d7da';
        this.statusDiv.style.color = '#721c24';
        break;
      case 'info':
      default:
        this.statusDiv.style.background = '#e3f2fd';
        this.statusDiv.style.color = '#0066cc';
        break;
    }
  }

  hideStatus() {
    if (this.statusDiv) {
      this.statusDiv.style.display = 'none';
    }
  }
    // Creates and shows the import dialog
  show() {
    const modal = ModalUtils.createModal(
      () => this.close(modal),
      () => this.close(modal)
    );
    
    const dialog = ModalUtils.createElement('div', ModalStyles.dialog);
    
    // Title
    const title = ModalUtils.createElement('h3', ModalStyles.title, 'Import Notes from CSV');
    
    // Instructions
    const instruction = this.createInstructions();
    
    // File input
    const fileInput = ModalUtils.createFileInput();
    
    // Status div
    const statusDiv = this.createStatusDiv();
    
    // Buttons
    const buttonRow = ModalUtils.createElement('div', ModalStyles.buttonRow);
    const cancelBtn = ModalUtils.createButton('Cancel');
    const importBtn = ModalUtils.createButton('Import CSV', 'success');
    importBtn.disabled = true;
    importBtn.style.opacity = '0.5';
    
    // Event handlers
    cancelBtn.addEventListener('click', () => this.close(modal));
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e, importBtn));
    importBtn.addEventListener('click', () => this.handleImport());
    
    // Assemble dialog
    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(importBtn);
    
    dialog.appendChild(title);
    dialog.appendChild(instruction);
    dialog.appendChild(fileInput);
    dialog.appendChild(statusDiv);
    dialog.appendChild(buttonRow);
    
    modal.appendChild(dialog);
    ModalUtils.showModal(modal);
  }

  // Creates the instructions inside the import dialog
  createInstructions() {
    const div = ModalUtils.createElement('div');
    div.innerHTML = `
      <p style="margin: 0 0 10px 0; color: #666; font-family: Arial, sans-serif;">
        Select a CSV file with your notes to import. The file should contain columns for:
      </p>
      <ul style="margin: 0 0 15px 20px; color: #666; font-family: Arial, sans-serif;">
        <li><strong>Alert ID</strong> (required)</li>
        <li>Alert Type</li>
        <li>Notes</li>
        <li>Tags (comma-separated)</li>
        <li>Timestamp</li>
      </ul>
      <p style="margin: 0 0 10px 0; color: #888; font-size: 12px; font-family: Arial, sans-serif;">
        <strong>Note:</strong> If not already in bulk mode, a bulk processing mode will be automatically created.
      </p>
      <p style="margin: 0 0 15px 0; color: #888; font-size: 12px; font-family: Arial, sans-serif;">
        <strong>Warning:</strong> Existing notes with the same Alert ID will be overwritten.
      </p>
    `;
    return div;
  }
  
  // runs when a file is selected
  handleFileSelect(event, importBtn) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      importBtn.disabled = false;
      importBtn.style.opacity = '1';
      this.showStatus(`Selected: ${file.name} (${Math.round(file.size / 1024)}KB)`, 'info');
    } else {
      this.selectedFile = null;
      importBtn.disabled = true;
      importBtn.style.opacity = '0.5';
      this.hideStatus();
    }
  }
//   runs when the import button is clicked
  // Reads the selected file and imports notes
  handleImport() {
    if (!this.selectedFile) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target.result;
      const result = NotesManager.importFromCsv(csvContent);
      this.showImportResult(result);
    };
    
    reader.onerror = () => {
      this.showStatus('<strong>Error!</strong><br>Could not read the file. Please try again.', 'error');
    };
    
    reader.readAsText(this.selectedFile);
  }
  
  // Displays the result of the import operation
  showImportResult(result) {
    if (result.success) {
      this.showStatus(`<strong>Import Successful!</strong><br>${result.message}`, 'success');
      
      // Create bulk mode if needed
      if (!BulkProcessor.state.isProcessing && result.alertIds?.length > 0) {
        const count = BulkProcessor.loadAlertIds(result.alertIds.join(' '));
        if (count > 0) {
          setTimeout(() => {
            UIManager.showBulkStatus(`Bulk mode: ${count} imported alerts loaded. Press Cmd+↓ to start`);
          }, 1000);
        }
      }
      
      // Update notepad if open
      if (AppState.notepad.isOpen) {
        NotepadUI.updateContent();
      }
    } else {
      this.showStatus(`<strong>Import Failed!</strong><br>${result.message}`, 'error');
    }
  }
  
  close(modal) {
    ModalUtils.closeModal(modal);
  }
}

export { ImportDialog };