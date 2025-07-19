import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModalManager } from '../src/ui/modal-manager.js';

// Mock dependencies
vi.mock('../src/ui/modals/bulk-dialog.js', () => ({
  BulkDialog: vi.fn().mockImplementation(() => ({
    show: vi.fn()
  }))
}));

vi.mock('../src/ui/modals/import-dialog.js', () => ({
  ImportDialog: vi.fn().mockImplementation(() => ({
    show: vi.fn()
  }))
}));

vi.mock('../src/ui/modals/settings-dialog.js', () => ({
  SettingsDialog: vi.fn().mockImplementation(() => ({
    show: vi.fn()
  }))
}));

describe('ModalManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showBulkDialog', () => {
    it('should create and show bulk dialog', async () => {
      const { BulkDialog } = await import('../src/ui/modals/bulk-dialog.js');
      
      ModalManager.showBulkDialog();
      
      expect(BulkDialog).toHaveBeenCalledTimes(1);
      const mockInstance = vi.mocked(BulkDialog).mock.results[0].value;
      expect(mockInstance.show).toHaveBeenCalledTimes(1);
    });
  });

  describe('showImportDialog', () => {
    it('should create and show import dialog', async () => {
      const { ImportDialog } = await import('../src/ui/modals/import-dialog.js');
      
      ModalManager.showImportDialog();
      
      expect(ImportDialog).toHaveBeenCalledTimes(1);
      const mockInstance = vi.mocked(ImportDialog).mock.results[0].value;
      expect(mockInstance.show).toHaveBeenCalledTimes(1);
    });
  });

  describe('showSettingsDialog', () => {
    it('should create and show settings dialog', async () => {
      const { SettingsDialog } = await import('../src/ui/modals/settings-dialog.js');
      
      ModalManager.showSettingsDialog();
      
      expect(SettingsDialog).toHaveBeenCalledTimes(1);
      const mockInstance = vi.mocked(SettingsDialog).mock.results[0].value;
      expect(mockInstance.show).toHaveBeenCalledTimes(1);
    });
  });
});

// Remove old SettingsModal tests since it's now part of ModalManager
