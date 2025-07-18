import { describe, test, expect } from 'vitest';
import { CONFIG } from '../src/config/constants.js';

describe('CONFIG Module', () => {
  test('should have all required selector configurations', () => {
    expect(CONFIG.SELECTORS).toBeDefined();
    expect(CONFIG.SELECTORS.INPUT).toBe('#alert-debug-user-input');
    expect(CONFIG.SELECTORS.BUTTON).toBe('#debug-alert-id-submit');
    expect(CONFIG.SELECTORS.VIDEO_CONTAINER).toBe('#debug-exp-box-1-video');
    expect(CONFIG.SELECTORS.VIDEO).toBe('video');
    expect(CONFIG.SELECTORS.TYPE_DROPDOWN).toBe('#alert-debug-user-input-type');
  });

  test('should have timing configurations', () => {
    expect(CONFIG.TIMING).toBeDefined();
    expect(CONFIG.TIMING.ELEMENT_CHECK_INTERVAL).toBe(300);
    expect(CONFIG.TIMING.VIDEO_SEEK_SECONDS).toBe(5);
  });

  test('should have keyboard key configurations', () => {
    expect(CONFIG.KEYS).toBeDefined();
    expect(CONFIG.KEYS.FOCUS_INPUT).toBe('i');
    expect(CONFIG.KEYS.SUBMIT).toBe('Enter');
    expect(CONFIG.KEYS.PLAY_PAUSE).toBe('Space');
    expect(CONFIG.KEYS.REWIND).toBe('ArrowLeft');
    expect(CONFIG.KEYS.FAST_FORWARD).toBe('ArrowRight');
    expect(CONFIG.KEYS.NEXT_ALERT).toBe('ArrowDown');
    expect(CONFIG.KEYS.PREV_ALERT).toBe('ArrowUp');
    expect(CONFIG.KEYS.BULK_PROCESS).toBe('b');
    expect(CONFIG.KEYS.TOGGLE_NOTEPAD).toBe('j');
  });

  test('should have storage key configurations', () => {
    expect(CONFIG.STORAGE_KEYS).toBeDefined();
    expect(CONFIG.STORAGE_KEYS.NOTES).toBe('alert-debug-notes');
    expect(CONFIG.STORAGE_KEYS.BULK_ALERTS).toBe('alert-debug-bulk-alerts');
    expect(CONFIG.STORAGE_KEYS.PANEL_HEIGHT).toBe('notepad-panel-height');
    expect(CONFIG.STORAGE_KEYS.PANEL_WIDTH).toBe('notepad-right-panel-width');
    expect(CONFIG.STORAGE_KEYS.SETTINGS).toBe('alert-debug-settings');
  });

  test('should have UI configurations', () => {
    expect(CONFIG.UI).toBeDefined();
    expect(CONFIG.UI.PANEL_DEFAULT_HEIGHT).toBe(400);
    expect(CONFIG.UI.PANEL_MIN_HEIGHT).toBe(200);
    expect(CONFIG.UI.PANEL_MAX_HEIGHT_RATIO).toBe(0.8);
    expect(CONFIG.UI.TAGS_DEFAULT_WIDTH).toBe(300);
    expect(CONFIG.UI.TAGS_MIN_WIDTH).toBe(200);
  });

  test('should have S3 presigner configuration', () => {
    expect(CONFIG.S3_PRESIGNER).toBeDefined();
    expect(CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL).toBe('http://localhost:8080');
  });

  test('CONFIG should be immutable-like (testing object structure)', () => {
    // Test that CONFIG properties exist and are of correct types
    expect(typeof CONFIG).toBe('object');
    expect(typeof CONFIG.SELECTORS).toBe('object');
    expect(typeof CONFIG.TIMING).toBe('object');
    expect(typeof CONFIG.KEYS).toBe('object');
    expect(typeof CONFIG.STORAGE_KEYS).toBe('object');
    expect(typeof CONFIG.UI).toBe('object');
    expect(typeof CONFIG.S3_PRESIGNER).toBe('object');
  });
});
