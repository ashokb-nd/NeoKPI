import { BulkProcessor } from '../features/bulk-processor.js';
import { UIManager, NotepadUI } from './ui-manager.js';
import { NotesManager } from '../features/notes.js';
import { AppState } from '../core/app-state.js';
import { SettingsManager } from '../services/settings.js';
import { KeyboardHelpGenerator } from '../utils/keyboard-help.js';

export const ModalManager = {
  showBulkDialog() {
    const modal = this.createModal();
    const dialog = this.createBulkDialog();
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    dialog.querySelector('textarea').focus();
  },

  showImportDialog() {
    const modal = this.createModal();
    const dialog = this.createImportDialog();
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
  },

  createModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10001;
    `;
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    document.addEventListener('keydown', function escapeHandler(e) {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escapeHandler);
      }
    });
    
    return modal;
  },

  createBulkDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Bulk Alert Processing';
    title.style.cssText = 'margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;';
    
    const instruction = document.createElement('p');
    instruction.textContent = 'Paste your alert IDs (space, comma, or newline separated):';
    instruction.style.cssText = 'margin: 0 0 10px 0; color: #666; font-family: Arial, sans-serif;';
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'e.g., 679289778 679434984 679443707';
    textarea.style.cssText = `
      width: 100%;
      height: 120px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
      resize: vertical;
      box-sizing: border-box;
    `;
    
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: #f5f5f5;
      border-radius: 4px;
      cursor: pointer;
      font-family: Arial, sans-serif;
    `;
    
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Bulk Processing';
    startBtn.style.cssText = `
      padding: 8px 16px;
      border: none;
      background: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-family: Arial, sans-serif;
    `;
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog.parentElement);
    });
    
    startBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text) {
        const count = BulkProcessor.loadAlertIds(text);
        if (count > 0) {
          UIManager.showBulkStatus(`Bulk mode: ${count} alerts loaded. Press cmd + ↓ to start`);
        } else {
          UIManager.showBulkStatus('No valid alert IDs found');
        }
      }
      document.body.removeChild(dialog.parentElement);
    });
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(startBtn);
    
    dialog.appendChild(title);
    dialog.appendChild(instruction);
    dialog.appendChild(textarea);
    dialog.appendChild(buttons);
    
    return dialog;
  },

  createImportDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Import Notes from CSV';
    title.style.cssText = 'margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif;';
    
    const instruction = document.createElement('div');
    instruction.innerHTML = `
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
        <strong>Note:</strong> If not already in bulk mode, a bulk processing mode will be automatically created with the imported Alert IDs for easy review.
      </p>
      <p style="margin: 0 0 15px 0; color: #888; font-size: 12px; font-family: Arial, sans-serif;">
        <strong>Warning:</strong> Existing notes with the same Alert ID will be overwritten.
      </p>
    `;
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.cssText = `
      width: 100%;
      padding: 10px;
      border: 2px dashed #ddd;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      cursor: pointer;
      background: #f9f9f9;
    `;
    
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      border-radius: 4px;
      display: none;
      font-family: Arial, sans-serif;
      font-size: 13px;
    `;
    
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: #f5f5f5;
      border-radius: 4px;
      cursor: pointer;
      font-family: Arial, sans-serif;
    `;
    
    const importBtn = document.createElement('button');
    importBtn.textContent = 'Import CSV';
    importBtn.style.cssText = `
      padding: 8px 16px;
      border: none;
      background: #28a745;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-family: Arial, sans-serif;
      opacity: 0.5;
    `;
    importBtn.disabled = true;
    
    let selectedFile = null;
    
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        selectedFile = file;
        importBtn.disabled = false;
        importBtn.style.opacity = '1';
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#e3f2fd';
        statusDiv.style.color = '#0066cc';
        statusDiv.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)}KB)`;
      } else {
        selectedFile = null;
        importBtn.disabled = true;
        importBtn.style.opacity = '0.5';
        statusDiv.style.display = 'none';
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog.parentElement);
    });
    
    importBtn.addEventListener('click', () => {
      if (!selectedFile) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target.result;
        const result = NotesManager.importFromCsv(csvContent);
        
        statusDiv.style.display = 'block';
        if (result.success) {
          statusDiv.style.background = '#d4edda';
          statusDiv.style.color = '#155724';
          
          let statusMessage = `
            <div style="font-weight: bold; margin-bottom: 5px;">Import Successful!</div>
            <div>${result.message}</div>
          `;
          
          // Create bulk mode if not already in bulk mode and we have alert IDs
          if (!BulkProcessor.state.isProcessing && result.alertIds && result.alertIds.length > 0) {
            const bulkInput = result.alertIds.join(' ');
            const bulkCount = BulkProcessor.loadAlertIds(bulkInput);
            
            if (bulkCount > 0) {
              statusMessage += `
                <div style="margin-top: 10px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px;">
                  <strong>Bulk Mode Created:</strong> ${bulkCount} alert IDs loaded for processing.<br>
                  Use Cmd+↓ to start navigating through the imported alerts.
                </div>
              `;
              
              // Show bulk status
              setTimeout(() => {
                UIManager.showBulkStatus(`Bulk mode: ${bulkCount} imported alerts loaded. Press Cmd+↓ to start`);
              }, 1000);
            }
          }
          
          statusDiv.innerHTML = statusMessage;
          
          // Update the notepad if it's open
          if (AppState.notepad.isOpen) {
            NotepadUI.updateContent();
          }
        } else {
          statusDiv.style.background = '#f8d7da';
          statusDiv.style.color = '#721c24';
          statusDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Import Failed!</div>
            <div>${result.message}</div>
          `;
        }
      };
      
      reader.onerror = () => {
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px;">Error!</div>
          <div>Could not read the file. Please try again.</div>
        `;
      };
      
      reader.readAsText(selectedFile);
    });
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(importBtn);
    
    dialog.appendChild(title);
    dialog.appendChild(instruction);
    dialog.appendChild(fileInput);
    dialog.appendChild(statusDiv);
    dialog.appendChild(buttons);
    
    return dialog;
  }
};

export const SettingsModal = {
  show() {
    const modal = this.createModal();
    const dialog = this.createSettingsDialog();
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Focus the first input
    setTimeout(() => {
      const firstInput = dialog.querySelector('input[type="text"]');
      if (firstInput) firstInput.focus();
    }, 100);
  },

  createModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10001;
    `;
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    document.addEventListener('keydown', function escapeHandler(e) {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', escapeHandler);
      }
    });
    
    return modal;
  },

  createSettingsDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: #1e1e1e;
      color: #cccccc;
      padding: 24px;
      border-radius: 8px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '⚙️ Settings';
    title.style.cssText = 'margin: 0 0 20px 0; color: #ffffff; font-size: 18px;';
    
    // Add current status info
    const statusInfo = document.createElement('div');
    statusInfo.style.cssText = `
      background: #2d2d30;
      border: 1px solid #404040;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 20px;
      font-size: 12px;
      color: #cccccc;
    `;
    
    const currentSettings = SettingsManager.getSettings();
    statusInfo.innerHTML = `
      <strong>Current Status:</strong><br>
      📡 Presigner Server: <code>${currentSettings.presignerUrl}</code><br>
      💾 Auto-save: ${currentSettings.autoSaveNotes ? 'Enabled' : 'Disabled'}<br>
      ⌨️ Keyboard Hints: ${currentSettings.showKeyboardHints ? 'Enabled' : 'Disabled'}<br>
      🎆 Fireworks: ${currentSettings.enableFireworks ? 'Enabled' : 'Disabled'}
    `;
    
    const form = this.createSettingsForm();
    const keyboardHelp = this.createKeyboardHelp();
    const buttons = this.createButtons(dialog);
    
    dialog.appendChild(title);
    dialog.appendChild(statusInfo);
    dialog.appendChild(form);
    dialog.appendChild(keyboardHelp);
    dialog.appendChild(buttons);
    
    return dialog;
  },

  createSettingsForm() {
    const form = document.createElement('div');
    form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
    
    const settings = SettingsManager.getSettings();
    
    // Presigner URL Setting
    const presignerGroup = this.createInputGroup(
      'S3 Presigner URL',
      'presignerUrl',
      settings.presignerUrl,
      'text',
      'URL of the local S3 presigner server'
    );
    
    // Auto-save Notes Setting
    const autoSaveGroup = this.createCheckboxGroup(
      'Auto-save Notes',
      'autoSaveNotes',
      settings.autoSaveNotes,
      'Automatically save notes as you type'
    );
    
    // Show Keyboard Hints Setting
    const keyboardHintsGroup = this.createCheckboxGroup(
      'Show Keyboard Hints',
      'showKeyboardHints',
      settings.showKeyboardHints,
      'Display keyboard shortcut hints on hover'
    );
    
    // Enable Fireworks Setting
    const fireworksGroup = this.createCheckboxGroup(
      'Enable Fireworks',
      'enableFireworks',
      settings.enableFireworks,
      'Show celebration fireworks for special events'
    );
    
    form.appendChild(presignerGroup);
    form.appendChild(autoSaveGroup);
    form.appendChild(keyboardHintsGroup);
    form.appendChild(fireworksGroup);
    
    return form;
  },

  createInputGroup(label, name, value, type = 'text', description = '') {
    const group = document.createElement('div');
    group.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-weight: 500; color: #ffffff; font-size: 14px;';
    
    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.value = value;
    input.style.cssText = `
      padding: 8px 12px;
      border: 1px solid #404040;
      background: #2d2d30;
      color: #cccccc;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
    `;
    
    if (description) {
      const desc = document.createElement('small');
      desc.textContent = description;
      desc.style.cssText = 'color: #999999; font-size: 12px;';
      group.appendChild(labelEl);
      group.appendChild(input);
      group.appendChild(desc);
    } else {
      group.appendChild(labelEl);
      group.appendChild(input);
    }
    
    return group;
  },

  createSelectGroup(label, name, value, options, description = '') {
    const group = document.createElement('div');
    group.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-weight: 500; color: #ffffff; font-size: 14px;';
    
    const select = document.createElement('select');
    select.name = name;
    select.style.cssText = `
      padding: 8px 12px;
      border: 1px solid #404040;
      background: #2d2d30;
      color: #cccccc;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
    `;
    
    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      optionEl.selected = option.value === value;
      select.appendChild(optionEl);
    });
    
    group.appendChild(labelEl);
    group.appendChild(select);
    
    if (description) {
      const desc = document.createElement('small');
      desc.textContent = description;
      desc.style.cssText = 'color: #999999; font-size: 12px;';
      group.appendChild(desc);
    }
    
    return group;
  },

  createCheckboxGroup(label, name, checked, description = '') {
    const group = document.createElement('div');
    group.style.cssText = 'display: flex; align-items: flex-start; gap: 8px;';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = name;
    checkbox.checked = checked;
    checkbox.style.cssText = `
      margin-top: 2px;
      accent-color: #0e639c;
    `;
    
    const labelContainer = document.createElement('div');
    labelContainer.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-weight: 500; color: #ffffff; font-size: 14px; cursor: pointer;';
    
    labelEl.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
    });
    
    labelContainer.appendChild(labelEl);
    
    if (description) {
      const desc = document.createElement('small');
      desc.textContent = description;
      desc.style.cssText = 'color: #999999; font-size: 12px;';
      labelContainer.appendChild(desc);
    }
    
    group.appendChild(checkbox);
    group.appendChild(labelContainer);
    
    return group;
  },

  createKeyboardHelp() {
    const help = document.createElement('div');
    help.style.cssText = `
      background: #252526;
      border: 1px solid #404040;
      border-radius: 4px;
      padding: 16px;
      margin-top: 20px;
    `;
    
    const title = document.createElement('h4');
    title.textContent = '⌨️ Keyboard Shortcuts';
    title.style.cssText = 'margin: 0 0 12px 0; color: #ffffff; font-size: 14px;';
    
    const shortcuts = document.createElement('div');
    shortcuts.style.cssText = 'font-size: 12px; color: #cccccc; line-height: 1.4;';
    
    // Generate dynamic keyboard help from config
    const dynamicHelpHTML = KeyboardHelpGenerator.generateKeyboardHelpHTML();
    
    shortcuts.innerHTML = `
      <style>
        kbd {
          background: #1e1e1e;
          border: 1px solid #404040;
          border-radius: 3px;
          padding: 2px 6px;
          font-family: monospace;
          font-size: 11px;
          color: #ffffff;
        }
      </style>
      ${dynamicHelpHTML}
    `;
    
    help.appendChild(title);
    help.appendChild(shortcuts);
    
    return help;
  },

  createButtons(dialog) {
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; justify-content: space-between; gap: 10px; margin-top: 24px;';
    
    const leftButtons = document.createElement('div');
    leftButtons.style.cssText = 'display: flex; gap: 10px;';
    
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset to Defaults';
    resetBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #404040;
      background: #3c3c3c;
      color: #cccccc;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
    `;
    
    const rightButtons = document.createElement('div');
    rightButtons.style.cssText = 'display: flex; gap: 10px;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #404040;
      background: #3c3c3c;
      color: #cccccc;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
    `;
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Settings';
    saveBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #0e639c;
      background: #0e639c;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
    `;
    
    // Event handlers
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all settings to their default values?')) {
        SettingsManager.resetSettings();
        UIManager.showNotification('Settings reset to defaults', 'success');
        document.body.removeChild(dialog.parentElement);
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog.parentElement);
    });
    
    saveBtn.addEventListener('click', () => {
      this.saveSettings(dialog);
    });
    
    leftButtons.appendChild(resetBtn);
    rightButtons.appendChild(cancelBtn);
    rightButtons.appendChild(saveBtn);
    
    buttons.appendChild(leftButtons);
    buttons.appendChild(rightButtons);
    
    return buttons;
  },

  saveSettings(dialog) {
    const form = dialog.querySelector('div[style*="flex-direction: column"]');
    const inputs = form.querySelectorAll('input, select');
    const newSettings = {};
    
    inputs.forEach(input => {
      if (input.type === 'checkbox') {
        newSettings[input.name] = input.checked;
      } else {
        newSettings[input.name] = input.value;
      }
    });
    
    // Validate presigner URL
    if (newSettings.presignerUrl && !newSettings.presignerUrl.startsWith('http')) {
      UIManager.showNotification('Presigner URL must start with http:// or https://', 'error');
      return;
    }
    
    if (SettingsManager.setSettings(newSettings)) {
      UIManager.showNotification('Settings saved successfully', 'success');
      document.body.removeChild(dialog.parentElement);
    } else {
      UIManager.showNotification('Failed to save settings', 'error');
    }
  }
};
