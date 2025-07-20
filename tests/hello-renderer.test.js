/**
 * @fileoverview Tests for HelloRenderer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HelloRenderer } from '../src/features/annotations/renderers/hello-renderer.js';
import { Annotation } from '../src/features/annotations/annotation-manifest.js';

describe('HelloRenderer', () => {
  let renderer;
  let mockDrawer;
  let mockCtx;

  beforeEach(() => {
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      beginPath: vi.fn(),
      rect: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: ''
    };

    mockDrawer = {
      ctx: mockCtx
    };

    renderer = new HelloRenderer(mockDrawer);
  });

  describe('getType', () => {
    it('should return "hello"', () => {
      expect(renderer.getType()).toBe('hello');
    });
  });

  describe('render', () => {
    it('should render hello message when annotation is visible', () => {
      const annotation = new Annotation({
        id: 'test-hello',
        category: 'hello',
        timeRange: { startMs: 0, endMs: 5000 },
        data: { message: 'Hello, World!' }
      });

      const currentTimeMs = 2500;
      const videoRect = { width: 800, height: 600 };

      renderer.render(annotation, currentTimeMs, videoRect);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello, World!', 400, 20);
    });

    it('should not render when annotation is not visible', () => {
      const annotation = new Annotation({
        id: 'test-hello',
        category: 'hello',
        timeRange: { startMs: 1000, endMs: 5000 },
        data: { message: 'Hello, World!' }
      });

      const currentTimeMs = 500; // Before annotation time range
      const videoRect = { width: 800, height: 600 };

      renderer.render(annotation, currentTimeMs, videoRect);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.fillText).not.toHaveBeenCalled();
    });

    it('should use default message when no message provided', () => {
      const annotation = new Annotation({
        id: 'test-hello',
        category: 'hello',
        timeRange: { startMs: 0, endMs: 5000 },
        data: {} // No message
      });

      const currentTimeMs = 2500;
      const videoRect = { width: 800, height: 600 };

      renderer.render(annotation, currentTimeMs, videoRect);

      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello!', 400, 20);
    });
  });

  describe('canRender', () => {
    it('should return true for hello category annotations', () => {
      const annotation = new Annotation({
        id: 'test',
        category: 'hello',
        timeRange: { startMs: 0, endMs: 1000 },
        data: {}
      });

      expect(renderer.canRender(annotation)).toBe(true);
    });

    it('should return false for non-hello category annotations', () => {
      const annotation = new Annotation({
        id: 'test',
        category: 'detection',
        timeRange: { startMs: 0, endMs: 1000 },
        data: {}
      });

      expect(renderer.canRender(annotation)).toBe(false);
    });
  });
});
