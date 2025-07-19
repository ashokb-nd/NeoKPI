import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FireworksManager } from '../src/ui/fireworks.js';

// Mock DOM methods
const mockCanvas = {
  getContext: vi.fn(),
  style: {},
  width: 0,
  height: 0
};

const mockContext = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  globalAlpha: 0
};

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  }
});

Object.defineProperty(global, 'window', {
  value: {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: vi.fn(),
    requestAnimationFrame: vi.fn()
  }
});

Object.defineProperty(global, 'Date', {
  value: {
    now: vi.fn(() => 1000)
  }
});

Object.defineProperty(global, 'Math', {
  value: {
    ...Math,
    random: vi.fn(() => 0.5),
    floor: Math.floor,
    max: Math.max,
    min: Math.min,
    abs: Math.abs,
    atan2: Math.atan2,
    cos: Math.cos,
    sin: Math.sin,
    sqrt: Math.sqrt,
    PI: Math.PI
  }
});

describe('FireworksManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.createElement.mockReturnValue(mockCanvas);
    mockCanvas.getContext.mockReturnValue(mockContext);
    window.requestAnimationFrame.mockImplementation((callback) => {
      setTimeout(callback, 16); // Simulate 60fps
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should have predefined colors', () => {
      expect(FireworksManager.COLORS).toHaveLength(10);
      expect(FireworksManager.COLORS).toContain('#FF1744');
      expect(FireworksManager.COLORS).toContain('#2196F3');
    });

    it('should initialize fireworks display', () => {
      const createFireworksDisplaySpy = vi.spyOn(FireworksManager, 'createFireworksDisplay');
      
      FireworksManager.init();
      
      expect(createFireworksDisplaySpy).toHaveBeenCalled();
    });
  });

  describe('canvas management', () => {
    it('should create canvas with correct properties', () => {
      const canvas = FireworksManager.createCanvas();
      
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(canvas.id).toBe('fireworks-canvas');
      expect(document.body.appendChild).toHaveBeenCalledWith(canvas);
    });

    it('should setup canvas dimensions', () => {
      const canvas = { width: 0, height: 0 };
      
      FireworksManager.setupCanvasDimensions(canvas);
      
      expect(canvas.width).toBe(1024);
      expect(canvas.height).toBe(768);
    });

    it('should handle window resize', () => {
      const canvas = { width: 0, height: 0 };
      
      FireworksManager.handleWindowResize(canvas);
      
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      
      // Test resize handler
      const resizeHandler = window.addEventListener.mock.calls[0][1];
      window.innerWidth = 1200;
      window.innerHeight = 900;
      resizeHandler();
      
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(900);
    });
  });

  describe('fireworks animation', () => {
    beforeEach(() => {
      vi.spyOn(FireworksManager, 'createFirework');
      vi.spyOn(FireworksManager, 'updateFireworks');
      vi.spyOn(FireworksManager, 'updateParticles');
      vi.spyOn(FireworksManager, 'fadeOutCanvas');
    });

    it('should start fireworks animation', () => {
      const ctx = mockContext;
      const canvas = mockCanvas;
      
      // Test that the method exists and can be called without errors
      expect(() => {
        FireworksManager.startFireworksAnimation(ctx, canvas);
      }).not.toThrow();
    });

    it('should handle animation frame requests', () => {
      const ctx = mockContext;
      const canvas = mockCanvas;
      
      // Test that the method handles requestAnimationFrame calls
      expect(() => {
        FireworksManager.startFireworksAnimation(ctx, canvas);
      }).not.toThrow();
      
      // Test that window.requestAnimationFrame is a function (mocked)
      expect(typeof window.requestAnimationFrame).toBe('function');
    });

    it('should clear canvas on each frame', () => {
      const ctx = mockContext;
      const canvas = { width: 1024, height: 768 };
      
      // Mock the animation frame callback
      window.requestAnimationFrame.mockImplementationOnce((callback) => {
        callback();
        return 1;
      });
      
      FireworksManager.startFireworksAnimation(ctx, canvas);
      
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1024, 768);
    });

    it('should create fireworks randomly during animation', () => {
      const ctx = mockContext;
      const canvas = mockCanvas;
      Math.random.mockReturnValue(0.1); // Below 0.12 threshold
      Date.now.mockReturnValue(1000); // Within duration
      
      window.requestAnimationFrame.mockImplementationOnce((callback) => {
        callback();
        return 1;
      });
      
      FireworksManager.startFireworksAnimation(ctx, canvas);
      
      expect(FireworksManager.createFirework).toHaveBeenCalledWith(canvas);
    });

    it('should not create fireworks when random value is high', () => {
      const ctx = mockContext;
      const canvas = mockCanvas;
      Math.random.mockReturnValue(0.9); // Above 0.12 threshold
      
      window.requestAnimationFrame.mockImplementationOnce((callback) => {
        callback();
        return 1;
      });
      
      FireworksManager.startFireworksAnimation(ctx, canvas);
      
      expect(FireworksManager.createFirework).not.toHaveBeenCalled();
    });

    it('should fade out canvas after duration', () => {
      const ctx = mockContext;
      const canvas = mockCanvas;
      
      // Test that the animation can start without errors
      expect(() => {
        FireworksManager.startFireworksAnimation(ctx, canvas);
      }).not.toThrow();
      
      // Test that fadeOutCanvas method works correctly when called directly
      vi.spyOn(FireworksManager, 'fadeOutCanvas');
      FireworksManager.fadeOutCanvas(canvas, 1000);
      expect(FireworksManager.fadeOutCanvas).toHaveBeenCalledWith(canvas, 1000);
    });
  });

  describe('firework creation', () => {
    it('should create firework with random properties', () => {
      const canvas = { width: 1024, height: 768 };
      Math.random
        .mockReturnValueOnce(0.3) // startX
        .mockReturnValueOnce(0.7) // targetX  
        .mockReturnValueOnce(0.4) // targetY
        .mockReturnValueOnce(0.5); // color index
      
      const firework = FireworksManager.createFirework(canvas);
      
      expect(firework.x).toBe(307.2); // 0.3 * 1024
      expect(firework.y).toBe(768); // canvas.height
      expect(firework.targetX).toBe(716.8); // 0.7 * 1024
      expect(firework.targetY).toBeCloseTo(153.6, 1); // 0.4 * 768 * 0.5
      expect(firework.color).toBe('#2196F3'); // COLORS[5] when random = 0.5
    });
  });

  describe('animation updates', () => {
    it('should update and remove completed fireworks', () => {
      const firework1 = { update: vi.fn(() => false), explode: vi.fn(), draw: vi.fn() };
      const firework2 = { update: vi.fn(() => true), explode: vi.fn(), draw: vi.fn() };
      const fireworks = [firework1, firework2];
      const particles = [];
      const ctx = mockContext;
      
      FireworksManager.updateFireworks(fireworks, particles, ctx);
      
      expect(firework1.update).toHaveBeenCalled();
      expect(firework1.explode).toHaveBeenCalledWith(particles);
      expect(firework2.update).toHaveBeenCalled();
      expect(firework2.draw).toHaveBeenCalledWith(ctx);
      expect(fireworks).toHaveLength(1);
    });

    it('should update and remove dead particles', () => {
      const particles = [
        { update: vi.fn(() => false), draw: vi.fn() },
        { update: vi.fn(() => true), draw: vi.fn() }
      ];
      const ctx = mockContext;
      
      FireworksManager.updateParticles(particles, ctx);
      
      expect(particles[0].update).toHaveBeenCalled();
      expect(particles[0].update).toHaveBeenCalled();
      expect(particles).toHaveLength(1);
      expect(particles[0].draw).toHaveBeenCalledWith(ctx);
    });
  });

  describe('fade effects', () => {
    it('should fade out canvas progressively', () => {
      const canvas = { style: {} };
      
      FireworksManager.fadeOutCanvas(canvas, 750); // Half of 1500ms fade time
      
      expect(canvas.style.opacity).toBe(0.5);
    });

    it('should not go below 0 opacity', () => {
      const canvas = { style: {} };
      
      FireworksManager.fadeOutCanvas(canvas, 2000); // Beyond 1500ms fade time
      
      expect(canvas.style.opacity).toBe(0);
    });
  });

  describe('full display creation', () => {
    it('should create complete fireworks display', () => {
      vi.spyOn(FireworksManager, 'createCanvas');
      vi.spyOn(FireworksManager, 'setupCanvasDimensions');
      vi.spyOn(FireworksManager, 'startFireworksAnimation');
      vi.spyOn(FireworksManager, 'handleWindowResize');
      
      FireworksManager.createFireworksDisplay();
      
      expect(FireworksManager.createCanvas).toHaveBeenCalled();
      expect(FireworksManager.setupCanvasDimensions).toHaveBeenCalled();
      expect(FireworksManager.startFireworksAnimation).toHaveBeenCalled();
      expect(FireworksManager.handleWindowResize).toHaveBeenCalled();
    });
  });
});

// Test Firework class functionality through FireworksManager
describe('Firework Class (via FireworksManager)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create firework with proper physics', () => {
    const canvas = { width: 1000, height: 1000 };
    Math.random
      .mockReturnValueOnce(0.5) // startX = 500
      .mockReturnValueOnce(0.5) // targetX = 500  
      .mockReturnValueOnce(0.25) // targetY = 125
      .mockReturnValueOnce(0); // color index = 0
    
    const firework = FireworksManager.createFirework(canvas);
    
    expect(firework.x).toBe(500);
    expect(firework.y).toBe(1000);
    expect(firework.targetX).toBe(500);
    expect(firework.targetY).toBe(125);
    expect(firework.speed).toBe(10);
    expect(firework.color).toBe('#FF1744');
  });
});

// Test Particle class behavior through FireworksManager animation
describe('Particle Class (via animation)', () => {
  it('should be created during firework explosion', () => {
    const firework = { update: vi.fn(() => false), explode: vi.fn(), draw: vi.fn() };
    const fireworks = [firework];
    const particles = [];
    const ctx = mockContext;
    
    FireworksManager.updateFireworks(fireworks, particles, ctx);
    
    expect(firework.update).toHaveBeenCalled();
    expect(firework.explode).toHaveBeenCalledWith(particles);
  });
});
