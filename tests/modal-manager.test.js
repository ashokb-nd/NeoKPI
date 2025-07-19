import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModalManager, SettingsModal } from '../src/ui/modal-manager.js';

// Mock dependencies
vi.mock('../src/features/bulk-processor.js', () => ({
  BulkProcessor: {
    loadAlertIds: vi.fn(() => 5),
    state: { isProcessing: false }
  }
}));

vi.mock('../src/ui/ui-manager.js', () => ({
  UIManager: {
    showNotification: vi.fn(),
    showBulkStatus: vi.fn()
  },
  NotepadUI: {
    updateContent: vi.fn()
  }
}));

vi.mock('../src/features/notes.js', () => ({
  NotesManager: {
    importFromCsv: vi.fn(() => ({
      success: true,
      message: 'Imported 5 notes successfully',
      alertIds: ['123', '456', '789']
    }))
  }
}));

vi.mock('../src/core/app-state.js', () => ({
  AppState: {
    notepad: { isOpen: false }
  }
}));

vi.mock('../src/services/settings.js', () => ({
  SettingsManager: {
    getSettings: vi.fn(() => ({
      presignerUrl: 'http://localhost:8080',
      autoSaveNotes: true,
      showKeyboardHints: true,
      enableFireworks: false
    })),
    setSettings: vi.fn(() => true),
    resetSettings: vi.fn()
  }
}));

describe('ModalManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('createModal', () => {
    it('should create modal with correct styles and event handlers', () => {
      const modal = ModalManager.createModal();
      
      expect(modal).toBeDefined();
      expect(modal.tagName).toBe('DIV');
      expect(modal.style.position).toBe('fixed');
      expect(modal.style.zIndex).toBe('10001');
    });

    it('should close modal when clicking backdrop', () => {
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
      
      const modal = ModalManager.createModal();
      document.body.appendChild(modal);
      
      // Simulate backdrop click
      const clickEvent = new MouseEvent('click');
      Object.defineProperty(clickEvent, 'target', { value: modal });
      modal.dispatchEvent(clickEvent);
      
      expect(document.body.removeChild).toHaveBeenCalledWith(modal);
    });

    it('should close modal on Escape key', () => {
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
      
      const modal = ModalManager.createModal();
      document.body.appendChild(modal);
      
      // Simulate Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      expect(document.body.removeChild).toHaveBeenCalledWith(modal);
    });
  });

  describe('createBulkDialog', () => {
    it('should create bulk dialog with all required elements', () => {
      const dialog = ModalManager.createBulkDialog();
      
      expect(dialog).toBeDefined();
      expect(dialog.querySelector('h3')).toBeTruthy();
      expect(dialog.querySelector('textarea')).toBeTruthy();
      expect(dialog.querySelector('button')).toBeTruthy();
    });

    it('should have correct placeholder text', () => {
      const dialog = ModalManager.createBulkDialog();
      const textarea = dialog.querySelector('textarea');
      
      expect(textarea.placeholder).toBe('e.g., 679289778 679434984 679443707');
    });

    it('should handle start button click', () => {
      const { BulkProcessor } = require('../src/features/bulk-processor.js');
      const { UIManager } = require('../src/ui/ui-manager.js');
      
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
      
      const dialog = ModalManager.createBulkDialog();
      const textarea = dialog.querySelector('textarea');
      const startButton = dialog.querySelectorAll('button')[1]; // Second button is start
      
      // Set up mock parent element
      Object.defineProperty(dialog, 'parentElement', {
        value: { remove: vi.fn() },
        writable: true
      });
      
      textarea.value = '123 456 789';
      startButton.click();
      
      expect(BulkProcessor.loadAlertIds).toHaveBeenCalledWith('123 456 789');
      expect(UIManager.showBulkStatus).toHaveBeenCalledWith('Bulk mode: 5 alerts loaded. Press cmd + ↓ to start');
    });
  });

  describe('createImportDialog', () => {
    it('should create import dialog with all required elements', () => {
      const dialog = ModalManager.createImportDialog();
      
      expect(dialog).toBeDefined();
      expect(dialog.querySelector('h3')).toBeTruthy();
      expect(dialog.querySelector('input[type="file"]')).toBeTruthy();
      expect(dialog.querySelector('button')).toBeTruthy();
    });

    it('should handle file selection', () => {
      const dialog = ModalManager.createImportDialog();
      const fileInput = dialog.querySelector('input[type="file"]');
      const importBtn = dialog.querySelectorAll('button')[1]; // Second button is import
      
      // Create mock file
      const mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
      
      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });
      
      fileInput.dispatchEvent(new Event('change'));
      
      expect(importBtn.disabled).toBe(false);
    });
  });

  describe('showBulkDialog', () => {
    it('should create and display bulk dialog', () => {
      document.body.appendChild = vi.fn();
      
      ModalManager.showBulkDialog();
      
      expect(document.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('showImportDialog', () => {
    it('should create and display import dialog', () => {
      document.body.appendChild = vi.fn();
      
      ModalManager.showImportDialog();
      
      expect(document.body.appendChild).toHaveBeenCalled();
    });
  });
});

describe('SettingsModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('createSettingsDialog', () => {
    it('should create settings dialog with all sections', () => {
      const dialog = SettingsModal.createSettingsDialog();
      
      expect(dialog).toBeDefined();
      expect(dialog.querySelector('h3')).toBeTruthy();
      expect(dialog.querySelector('input[name="presignerUrl"]')).toBeTruthy();
      expect(dialog.querySelector('input[name="autoSaveNotes"]')).toBeTruthy();
      expect(dialog.querySelector('input[name="showKeyboardHints"]')).toBeTruthy();
      expect(dialog.querySelector('input[name="enableFireworks"]')).toBeTruthy();
    });

    it('should populate current settings values', () => {
      const dialog = SettingsModal.createSettingsDialog();
      const presignerInput = dialog.querySelector('input[name="presignerUrl"]');
      const autoSaveCheckbox = dialog.querySelector('input[name="autoSaveNotes"]');
      
      expect(presignerInput.value).toBe('http://localhost:8080');
      expect(autoSaveCheckbox.checked).toBe(true);
    });
  });

  describe('createSettingsForm', () => {
    it('should create form with all input groups', () => {
      const form = SettingsModal.createSettingsForm();
      
      expect(form).toBeDefined();
      expect(form.querySelectorAll('input').length).toBeGreaterThan(0);
    });
  });

  describe('createInputGroup', () => {
    it('should create input group with label and input', () => {
      const group = SettingsModal.createInputGroup('Test Label', 'testName', 'testValue');
      
      expect(group.querySelector('label')).toBeTruthy();
      expect(group.querySelector('input')).toBeTruthy();
      expect(group.querySelector('input').name).toBe('testName');
      expect(group.querySelector('input').value).toBe('testValue');
    });

    it('should create input group with description', () => {
      const group = SettingsModal.createInputGroup('Test Label', 'testName', 'testValue', 'text', 'Test description');
      
      expect(group.querySelector('small')).toBeTruthy();
      expect(group.querySelector('small').textContent).toBe('Test description');
    });
  });

  describe('createCheckboxGroup', () => {
    it('should create checkbox group with label and checkbox', () => {
      const group = SettingsModal.createCheckboxGroup('Test Label', 'testName', true);
      
      expect(group.querySelector('input[type="checkbox"]')).toBeTruthy();
      expect(group.querySelector('label')).toBeTruthy();
      expect(group.querySelector('input').checked).toBe(true);
    });

    it('should handle label click to toggle checkbox', () => {
      const group = SettingsModal.createCheckboxGroup('Test Label', 'testName', false);
      const checkbox = group.querySelector('input[type="checkbox"]');
      const label = group.querySelector('label');
      
      expect(checkbox.checked).toBe(false);
      label.click();
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('createKeyboardHelp', () => {
    it('should create keyboard help section', () => {
      const help = SettingsModal.createKeyboardHelp();
      
      expect(help).toBeDefined();
      expect(help.querySelector('h4')).toBeTruthy();
      expect(help.innerHTML).toContain('kbd');
    });
  });

  describe('show', () => {
    it('should create and display settings modal', () => {
      document.body.appendChild = vi.fn();
      
      SettingsModal.show();
      
      expect(document.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('saveSettings', () => {
    it('should save settings and show success notification', () => {
      const { SettingsManager } = require('../src/services/settings.js');
      const { UIManager } = require('../src/ui/ui-manager.js');
      
      document.body.removeChild = vi.fn();
      
      const dialog = SettingsModal.createSettingsDialog();
      Object.defineProperty(dialog, 'parentElement', {
        value: { remove: vi.fn() },
        writable: true
      });
      
      SettingsModal.saveSettings(dialog);
      
      expect(SettingsManager.setSettings).toHaveBeenCalled();
      expect(UIManager.showNotification).toHaveBeenCalledWith('Settings saved successfully', 'success');
      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should validate presigner URL', () => {
      const { UIManager } = require('../src/ui/ui-manager.js');
      
      const dialog = SettingsModal.createSettingsDialog();
      const presignerInput = dialog.querySelector('input[name="presignerUrl"]');
      presignerInput.value = 'invalid-url';
      
      SettingsModal.saveSettings(dialog);
      
      expect(UIManager.showNotification).toHaveBeenCalledWith('Presigner URL must start with http:// or https://', 'error');
    });
  });
});
