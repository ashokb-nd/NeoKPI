import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoControlsManager } from '../src/ui/video-controls.js';

// Mock CONFIG
vi.mock('../src/config/constants.js', () => ({
  CONFIG: {
    TIMING: {
      VIDEO_SEEK_SECONDS: 10
    }
  }
}));

// Mock Utils
vi.mock('../src/utils/utils.js', () => ({
  Utils: {
    log: vi.fn(),
    formatTime: vi.fn((time) => {
      if (!time || isNaN(time)) return '0:00';
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }),
    debounce: vi.fn((fn) => fn)
  }
}));

// Import the mocked Utils for use in tests
import { Utils } from '../src/utils/utils.js';

// Mock DOM methods and elements
const createMockElement = (tagName = 'div') => ({
  tagName: tagName.toUpperCase(),
  className: '',
  innerHTML: '',
  textContent: '',
  style: {},
  dataset: {},
  parentElement: null,
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    toggle: vi.fn(),
    contains: vi.fn()
  },
  appendChild: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({ left: 0, width: 100, top: 0, height: 50 })),
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  requestFullscreen: vi.fn()
});

const mockVideo = createMockElement('video');
Object.assign(mockVideo, {
  controls: true,
  paused: true,
  currentTime: 0,
  duration: 100,
  src: 'test-video.mp4'
});

const mockContainer = createMockElement('div');
mockVideo.parentElement = mockContainer;

// Define mock elements used throughout tests
const mockButton = createMockElement('button');
const mockDiv = createMockElement('div');
const mockSpan = createMockElement('span');

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tag) => createMockElement(tag)),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    head: {
      appendChild: vi.fn()
    },
    body: {
      appendChild: vi.fn()
    }
  }
});

Object.defineProperty(global, 'Node', {
  value: {
    ELEMENT_NODE: 1
  }
});

Object.defineProperty(global, 'MutationObserver', {
  value: vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    callback
  }))
});

describe('VideoControlsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock video properties
    Object.assign(mockVideo, {
      dataset: {},
      controls: true,
      paused: true,
      currentTime: 0,
      duration: 100,
      src: 'test-video.mp4'
    });
    
    mockVideo.parentElement = mockContainer;
    document.querySelectorAll.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize video controls manager', () => {
      vi.spyOn(VideoControlsManager, 'injectStyles');
      vi.spyOn(VideoControlsManager, 'setupVideoObserver');
      vi.spyOn(VideoControlsManager, 'enhanceExistingVideos');
      
      VideoControlsManager.init();
      
      expect(VideoControlsManager.injectStyles).toHaveBeenCalled();
      expect(VideoControlsManager.setupVideoObserver).toHaveBeenCalled();
      expect(VideoControlsManager.enhanceExistingVideos).toHaveBeenCalled();
    });
  });

  describe('style injection', () => {
    it('should inject styles when not already present', () => {
      document.querySelector.mockReturnValue(null);
      
      VideoControlsManager.injectStyles();
      
      expect(document.createElement).toHaveBeenCalledWith('style');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    it('should not inject styles when already present', () => {
      document.querySelector.mockReturnValue({ id: 'video-controls-styles' });
      
      VideoControlsManager.injectStyles();
      
      expect(document.createElement).not.toHaveBeenCalledWith('style');
    });

    it('should return comprehensive CSS', () => {
      const css = VideoControlsManager.getVideoControlsCSS();
      
      expect(typeof css).toBe('string');
      expect(css.includes('video::-webkit-media-controls')).toBe(true);
      expect(css.includes('.video-controls-enhanced')).toBe(true);
      expect(css.includes('.custom-video-controls')).toBe(true);
      expect(css.includes('.video-control-button')).toBe(true);
      expect(css.includes('.video-progress-bar')).toBe(true);
      expect(css.includes('.video-keyboard-hint')).toBe(true);
    });
  });

  describe('video observer', () => {
    it('should set up mutation observer', () => {
      VideoControlsManager.setupVideoObserver();
      
      expect(MutationObserver).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should enhance videos when new video elements are added', () => {
      vi.spyOn(VideoControlsManager, 'enhanceVideo');
      
      // Get the observer callback
      VideoControlsManager.setupVideoObserver();
      const observerCallback = MutationObserver.mock.calls[0][0];
      
      // Simulate video element being added
      const videoNode = { 
        nodeType: 1, 
        tagName: 'VIDEO',
        dataset: {},
        parentElement: mockContainer
      };
      const mutations = [{
        addedNodes: [videoNode]
      }];
      
      observerCallback(mutations);
      
      expect(VideoControlsManager.enhanceVideo).toHaveBeenCalledWith(videoNode);
    });

    it('should handle non-video elements with video children', () => {
      vi.spyOn(VideoControlsManager, 'enhanceVideo');
      
      VideoControlsManager.setupVideoObserver();
      const observerCallback = MutationObserver.mock.calls[0][0];
      
      const containerNode = {
        nodeType: 1,
        tagName: 'DIV',
        querySelectorAll: vi.fn(() => [mockVideo])
      };
      const mutations = [{
        addedNodes: [containerNode]
      }];
      
      observerCallback(mutations);
      
      expect(containerNode.querySelectorAll).toHaveBeenCalledWith('video');
      expect(VideoControlsManager.enhanceVideo).toHaveBeenCalledWith(mockVideo);
    });
  });

  describe('video enhancement', () => {
    it('should enhance existing videos', () => {
      document.querySelectorAll.mockReturnValue([mockVideo]);
      
      // Mock the control creation methods to return elements with the right structure
      const mockControlsPanel = createMockElement('div');
      mockControlsPanel.querySelector = vi.fn((selector) => {
        if (selector === '.video-control-button') return createMockElement('button');
        if (selector === '.video-time-display') return createMockElement('span');  
        if (selector === '.video-progress-fill') return createMockElement('div');
        return null;
      });
      
      vi.spyOn(VideoControlsManager, 'createCustomControls').mockReturnValue(mockControlsPanel);
      vi.spyOn(VideoControlsManager, 'enhanceVideo').mockImplementation(() => {});
      
      VideoControlsManager.enhanceExistingVideos();
      
      expect(document.querySelectorAll).toHaveBeenCalledWith('video');
      expect(VideoControlsManager.enhanceVideo).toHaveBeenCalledWith(mockVideo);
    });

    it('should not enhance already enhanced videos', () => {
      mockVideo.dataset.controlsEnhanced = 'true';
      
      const result = VideoControlsManager.enhanceVideo(mockVideo);
      
      expect(result).toBeUndefined();
      expect(mockVideo.parentElement.classList.add).not.toHaveBeenCalled();
    });

    it('should not enhance videos without parent container', () => {
      mockVideo.parentElement = null;
      
      const result = VideoControlsManager.enhanceVideo(mockVideo);
      
      expect(result).toBeUndefined();
    });

    it('should enhance video with complete setup', () => {
      // Mock the control creation methods to return proper mock elements
      const mockControlsPanel = createMockElement('div');
      mockControlsPanel.querySelector = vi.fn((selector) => {
        if (selector === '.video-control-button') {
          const btn = createMockElement('button');
          btn.innerHTML = '';
          btn.classList = { toggle: vi.fn() };
          return btn;
        }
        if (selector === '.video-time-display') {
          const span = createMockElement('span');
          span.textContent = '';
          return span;
        }
        if (selector === '.video-progress-fill') {
          const div = createMockElement('div');
          div.style = { width: '' };
          return div;
        }
        return null;
      });
      
      vi.spyOn(VideoControlsManager, 'createCustomControls').mockReturnValue(mockControlsPanel);
      vi.spyOn(VideoControlsManager, 'addKeyboardHint');
      vi.spyOn(VideoControlsManager, 'setupKeyboardControls');
      vi.spyOn(VideoControlsManager, 'setupVideoEvents');
      
      VideoControlsManager.enhanceVideo(mockVideo);
      
      expect(mockVideo.dataset.controlsEnhanced).toBe('true');
      expect(mockContainer.classList.add).toHaveBeenCalledWith('video-controls-enhanced');
      expect(mockVideo.controls).toBe(false);
      expect(VideoControlsManager.createCustomControls).toHaveBeenCalledWith(mockVideo);
      expect(VideoControlsManager.addKeyboardHint).toHaveBeenCalledWith(mockContainer);
      expect(VideoControlsManager.setupKeyboardControls).toHaveBeenCalledWith(mockVideo);
      expect(VideoControlsManager.setupVideoEvents).toHaveBeenCalled();
      expect(Utils.log).toHaveBeenCalledWith('Enhanced video controls for video: test-video.mp4');
    });
  });

  describe('custom controls creation', () => {
    it('should create complete custom controls', () => {
      vi.spyOn(VideoControlsManager, 'createLeftSection');
      vi.spyOn(VideoControlsManager, 'createProgressContainer');
      vi.spyOn(VideoControlsManager, 'createRightSection');
      
      const controls = VideoControlsManager.createCustomControls(mockVideo);
      
      expect(controls.className).toBe('custom-video-controls');
      expect(VideoControlsManager.createLeftSection).toHaveBeenCalledWith(mockVideo);
      expect(VideoControlsManager.createProgressContainer).toHaveBeenCalledWith(mockVideo);
      expect(VideoControlsManager.createRightSection).toHaveBeenCalledWith(mockVideo);
      expect(controls.appendChild).toHaveBeenCalledTimes(3);
    });

    it('should create left section with play button and time display', () => {
      const leftSection = VideoControlsManager.createLeftSection(mockVideo);
      
      expect(leftSection.className).toBe('custom-video-controls-left');
      expect(document.createElement).toHaveBeenCalledWith('button');
      expect(document.createElement).toHaveBeenCalledWith('span');
      expect(leftSection.appendChild).toHaveBeenCalledTimes(2);
    });

    it('should create progress container with interactive bar', () => {
      const progressContainer = VideoControlsManager.createProgressContainer(mockVideo);
      
      expect(progressContainer.className).toBe('video-progress-container');
      expect(document.createElement).toHaveBeenCalledWith('div');
    });

    it('should create right section with fullscreen button', () => {
      const rightSection = VideoControlsManager.createRightSection(mockVideo);
      
      expect(rightSection.className).toBe('custom-video-controls-right');
      expect(document.createElement).toHaveBeenCalledWith('button');
    });
  });

  describe('video events', () => {
    let controlsPanel, playButton, timeDisplay, progressFill;

    beforeEach(() => {
      playButton = createMockElement('button');
      playButton.innerHTML = '';
      playButton.classList = {
        toggle: vi.fn(),
        add: vi.fn(),
        remove: vi.fn()
      };
      
      timeDisplay = createMockElement('span');
      timeDisplay.textContent = '';
      
      progressFill = createMockElement('div');
      progressFill.style = { width: '' };
      
      controlsPanel = {
        querySelector: vi.fn((selector) => {
          if (selector === '.video-control-button') return playButton;
          if (selector === '.video-time-display') return timeDisplay;
          if (selector === '.video-progress-fill') return progressFill;
          return null;
        })
      };
    });

    it('should setup video events with all listeners', () => {
      VideoControlsManager.setupVideoEvents(mockVideo, controlsPanel);
      
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function));
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
    });

    it('should update play button based on video state', () => {
      VideoControlsManager.setupVideoEvents(mockVideo, controlsPanel);
      
      // Get the play event handler
      const playHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'play')[1];
      const pauseHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'pause')[1];
      
      // Test play state
      mockVideo.paused = false;
      playHandler();
      expect(playButton.innerHTML).toBe('⏸');
      expect(playButton.classList.toggle).toHaveBeenCalledWith('active', true);
      
      // Test pause state
      mockVideo.paused = true;
      pauseHandler();
      expect(playButton.innerHTML).toBe('▶');
      expect(playButton.classList.toggle).toHaveBeenCalledWith('active', false);
    });

    it('should update time display correctly', () => {
      mockVideo.currentTime = 65; // 1:05
      mockVideo.duration = 125; // 2:05
      
      VideoControlsManager.setupVideoEvents(mockVideo, controlsPanel);
      
      expect(Utils.formatTime).toHaveBeenCalledWith(65);
      expect(Utils.formatTime).toHaveBeenCalledWith(125);
    });

    it('should update progress bar based on current time', () => {
      mockVideo.currentTime = 25;
      mockVideo.duration = 100;
      
      VideoControlsManager.setupVideoEvents(mockVideo, controlsPanel);
      
      // Get the timeupdate handler and call it
      const timeupdateHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'timeupdate')[1];
      timeupdateHandler();
      
      expect(progressFill.style.width).toBe('25%');
    });
  });

  describe('keyboard controls', () => {
    it('should add keyboard hint to container', () => {
      mockContainer.querySelector.mockReturnValue(null);
      
      VideoControlsManager.addKeyboardHint(mockContainer);
      
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should not add duplicate keyboard hint', () => {
      mockContainer.querySelector.mockReturnValue({ className: 'video-keyboard-hint' });
      
      VideoControlsManager.addKeyboardHint(mockContainer);
      
      expect(mockContainer.appendChild).not.toHaveBeenCalled();
    });

    it('should setup keyboard event listeners', () => {
      VideoControlsManager.setupKeyboardControls(mockVideo);
      
      expect(mockVideo.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(mockVideo.setAttribute).toHaveBeenCalledWith('tabindex', '0');
    });

    it('should handle space key for play/pause', () => {
      VideoControlsManager.setupKeyboardControls(mockVideo);
      const keydownHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'keydown')[1];
      
      const spaceEvent = {
        key: ' ',
        target: mockVideo,
        preventDefault: vi.fn()
      };
      
      // Test play
      mockVideo.paused = true;
      keydownHandler(spaceEvent);
      expect(mockVideo.play).toHaveBeenCalled();
      expect(spaceEvent.preventDefault).toHaveBeenCalled();
      
      // Test pause
      mockVideo.paused = false;
      keydownHandler(spaceEvent);
      expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('should handle arrow keys for seeking', () => {
      VideoControlsManager.setupKeyboardControls(mockVideo);
      const keydownHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'keydown')[1];
      
      // Test left arrow (seek backward)
      const leftEvent = {
        key: 'ArrowLeft',
        target: mockVideo,
        preventDefault: vi.fn()
      };
      
      mockVideo.currentTime = 20;
      keydownHandler(leftEvent);
      expect(mockVideo.currentTime).toBe(10); // 20 - 10 seconds
      expect(leftEvent.preventDefault).toHaveBeenCalled();
      
      // Test right arrow (seek forward)
      const rightEvent = {
        key: 'ArrowRight',
        target: mockVideo,
        preventDefault: vi.fn()
      };
      
      mockVideo.currentTime = 10;
      keydownHandler(rightEvent);
      expect(mockVideo.currentTime).toBe(20); // 10 + 10 seconds
    });

    it('should handle f key for fullscreen', () => {
      VideoControlsManager.setupKeyboardControls(mockVideo);
      const keydownHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'keydown')[1];
      
      const fEvent = {
        key: 'f',
        target: mockVideo,
        preventDefault: vi.fn()
      };
      
      keydownHandler(fEvent);
      expect(mockVideo.requestFullscreen).toHaveBeenCalled();
      expect(fEvent.preventDefault).toHaveBeenCalled();
    });

    it('should ignore events not targeted at the video', () => {
      VideoControlsManager.setupKeyboardControls(mockVideo);
      const keydownHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'keydown')[1];
      
      const event = {
        key: ' ',
        target: { tagName: 'BUTTON' },
        preventDefault: vi.fn()
      };
      
      keydownHandler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockVideo.play).not.toHaveBeenCalled();
    });
  });

  describe('progress bar interaction', () => {
    it('should seek video on progress bar click', () => {
      const progressContainer = VideoControlsManager.createProgressContainer(mockVideo);
      
      // Get the progress bar from the container
      expect(progressContainer.appendChild).toHaveBeenCalled();
      
      // Simulate click event
      const progressBar = createMockElement('div');
      progressBar.getBoundingClientRect = vi.fn(() => ({ left: 10, width: 100 }));
      progressBar.addEventListener = vi.fn();
      
      document.createElement.mockReturnValueOnce(progressBar);
      
      const container = VideoControlsManager.createProgressContainer(mockVideo);
      
      // Get click handler
      const clickHandler = progressBar.addEventListener.mock.calls.find(call => call[0] === 'click')[1];
      
      const clickEvent = {
        clientX: 35 // 35px from left
      };
      
      mockVideo.duration = 100;
      clickHandler(clickEvent);
      
      // Should seek to 25% of duration: (35-10)/100 * 100 = 25
      expect(mockVideo.currentTime).toBe(25);
    });
  });

  describe('button interactions', () => {
    it('should handle play button click', () => {
      const leftSection = VideoControlsManager.createLeftSection(mockVideo);
      
      // Get the play button
      const playButton = createMockElement('button');
      playButton.addEventListener = vi.fn();
      document.createElement.mockReturnValueOnce(playButton);
      
      VideoControlsManager.createLeftSection(mockVideo);
      
      // Get click handler
      const clickHandler = playButton.addEventListener.mock.calls.find(call => call[0] === 'click')[1];
      
      // Test play
      mockVideo.paused = true;
      clickHandler();
      expect(mockVideo.play).toHaveBeenCalled();
      
      // Test pause
      mockVideo.paused = false;
      clickHandler();
      expect(mockVideo.pause).toHaveBeenCalled();
    });

    it('should handle fullscreen button click', () => {
      const rightSection = VideoControlsManager.createRightSection(mockVideo);
      
      // Get the fullscreen button
      const fullscreenButton = createMockElement('button');
      fullscreenButton.addEventListener = vi.fn();
      document.createElement.mockReturnValueOnce(fullscreenButton);
      
      VideoControlsManager.createRightSection(mockVideo);
      
      // Get click handler
      const clickHandler = fullscreenButton.addEventListener.mock.calls.find(call => call[0] === 'click')[1];
      
      clickHandler();
      expect(mockVideo.requestFullscreen).toHaveBeenCalled();
    });
  });

  describe('Utils integration', () => {
    it('should use Utils.formatTime for time display', () => {
      mockVideo.currentTime = 65;
      mockVideo.duration = 3665;
      
      const leftSection = VideoControlsManager.createLeftSection(mockVideo);
      
      expect(Utils.formatTime).toHaveBeenCalledWith(65);
      expect(Utils.formatTime).toHaveBeenCalledWith(3665);
    });

    it('should use Utils.debounce for timeupdate events', () => {
      const controlsPanel = {
        querySelector: vi.fn(() => ({ innerHTML: '', classList: { toggle: vi.fn() } }))
      };
      
      VideoControlsManager.setupVideoEvents(mockVideo, controlsPanel);
      
      expect(Utils.debounce).toHaveBeenCalledWith(expect.any(Function), 100);
    });

    it('should log video enhancement', () => {
      VideoControlsManager.enhanceVideo(mockVideo);
      
      expect(Utils.log).toHaveBeenCalledWith('Enhanced video controls for video: test-video.mp4');
    });
  });

  describe('edge cases', () => {
    it('should handle video without src', () => {
      mockVideo.src = '';
      
      VideoControlsManager.enhanceVideo(mockVideo);
      
      expect(Utils.log).toHaveBeenCalledWith('Enhanced video controls for video: unknown');
    });

    it('should handle progress update with no duration', () => {
      const controlsPanel = {
        querySelector: vi.fn(() => ({ style: {} }))
      };
      mockVideo.duration = 0;
      
      VideoControlsManager.setupVideoEvents(mockVideo, controlsPanel);
      
      // Should not throw error when duration is 0
      expect(() => {
        const timeupdateHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'timeupdate')[1];
        timeupdateHandler();
      }).not.toThrow();
    });

    it('should handle seeking beyond video bounds', () => {
      VideoControlsManager.setupKeyboardControls(mockVideo);
      const keydownHandler = mockVideo.addEventListener.mock.calls.find(call => call[0] === 'keydown')[1];
      
      // Test seeking before start
      mockVideo.currentTime = 5;
      mockVideo.duration = 100;
      const leftEvent = {
        key: 'ArrowLeft',
        target: mockVideo,
        preventDefault: vi.fn()
      };
      keydownHandler(leftEvent);
      expect(mockVideo.currentTime).toBe(0); // Math.max(0, 5-10)
      
      // Test seeking beyond end
      mockVideo.currentTime = 95;
      const rightEvent = {
        key: 'ArrowRight',
        target: mockVideo,
        preventDefault: vi.fn()
      };
      keydownHandler(rightEvent);
      expect(mockVideo.currentTime).toBe(100); // Math.min(100, 95+10)
    });
  });
});
