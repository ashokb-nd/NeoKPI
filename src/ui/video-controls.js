import { CONFIG } from "../config/constants.js";
import { Utils } from "../utils/utils.js";

export const VideoControlsManager = {
init() {
    this.injectStyles();
    this.setupVideoObserver();
    this.enhanceExistingVideos();
    this.delete_video_label_divs();
  },

  delete_video_label_divs() {
    const label1 = document.querySelector("#debug-exp-box-1-video-label");
    const label2 = document.querySelector("#debug-exp-box-2-video-label");
    if (label1) label1.remove();
    if (label2) label2.remove();
  },
  injectStyles() {
    if (document.querySelector("#video-controls-styles")) return;

    const style = document.createElement("style");
    style.id = "video-controls-styles";
    style.textContent = this.getVideoControlsCSS();
    document.head.appendChild(style);
  },

  getVideoControlsCSS() {
    return `
      /* Reset height for specific video element */
      #debug-exp-box-1-video, #debug-exp-box-2-video {
      height: auto !important;
      }
      /* 1px light green border around all canvas elements */
      canvas {
      border: 1px solid #90ee90 !important; /* light green */
      }
      
      /* Enhanced video container styling */
      .video-controls-enhanced {
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      /* Custom controls panel positioned below video */
      .custom-video-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 12px;
        margin-top: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        color: #333;
      }
      
      /* Progress bar container */
      .video-progress-container {
        flex: 1;
        margin: 0 16px;
        position: relative;
      }
      
      /* The actual progress bar track */
      .video-progress-bar {
        width: 100%;
        height: 3px;
        background: #eee;
        border-radius: 2px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      
      /* The filled portion of the progress bar */
      .video-progress-fill {
        height: 100%;
        background: #333;
        border-radius: 2px;
        transition: width 0.1s ease;
      }
    `;

    let not_used = `
      /* Hide native browser video controls completely */
      /* These webkit-specific selectors target the default video player UI */
      /* COMMENTED OUT - Keep native controls visible */
      /*
      video::-webkit-media-controls {
        display: none !important;
      }
      
      video::-webkit-media-controls-panel {
        display: none !important;
      }
      */
      
      /* Enhanced video container styling */
      /* Transforms the video container into a vertical flex layout */
      /* This allows custom controls to be positioned below the video */
      /* COMMENTED OUT - Keep original video container styling */
      /*
      .video-controls-enhanced {
        position: relative !important;  /* Enables absolute positioning for child elements */
        display: flex !important;       /* Creates flex container for vertical layout */
        flex-direction: column !important; /* Stacks video and controls vertically */
      }
      */
      
      /* Video element sizing and display behavior */
      /* Forces responsive sizing while maintaining aspect ratio */
      /* COMMENTED OUT - Keep original video sizing */
      /*
      .video-controls-enhanced video {
        width: 100% !important;         /* Video takes full container width */
        height: auto !important;        /* Height adjusts to maintain aspect ratio */
        object-fit: contain !important; /* Prevents video distortion, adds letterboxing if needed */
      }
      */
      
      /* Custom controls panel positioned below video */
      /* Main container for play/pause, progress bar, and other controls */
      .custom-video-controls {
        display: flex;                    /* Horizontal layout for control elements */
        align-items: center;              /* Vertically centers all control elements */
        justify-content: space-between;   /* Spreads controls across full width */
        background: transparent;          /* No background color */
        border: none;                     /* No border styling */
        border-radius: 6px;               /* Subtle rounded corners */
        padding: 6px 12px;                /* Internal spacing around controls */
        margin-top: 8px;                  /* Space between video and controls */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; /* System font */
        font-size: 12px;                  /* Base font size for controls */
        color: #333;                      /* Dark gray text color */
      }
      
      /* Left section container (play button, time display) */
      .custom-video-controls-left {
        display: flex;        /* Horizontal layout */
        align-items: center;  /* Vertical alignment */
        gap: 12px;           /* Space between play button and time display */
      }
      
      /* Right section container (fullscreen button, volume, etc.) */
      .custom-video-controls-right {
        display: flex;        /* Horizontal layout */
        align-items: center;  /* Vertical alignment */
        gap: 8px;            /* Smaller gap between right-side controls */
      }
      
      /* Styling for all clickable control buttons */
      .video-control-button {
        background: transparent;          /* No background by default */
        border: none;                    /* Remove default button border */
        color: #666;                     /* Medium gray text */
        padding: 4px 8px;                /* Button internal padding */
        border-radius: 4px;              /* Rounded button corners */
        cursor: pointer;                 /* Shows hand cursor on hover */
        font-size: 11px;                 /* Slightly smaller font for buttons */
        font-family: inherit;            /* Use parent font family */
        transition: all 0.2s ease;       /* Smooth transitions for hover effects */
      }
      
      /* Button hover state - provides visual feedback */
      .video-control-button:hover {
        background: rgba(0, 0, 0, 0.05);  /* Light gray background on hover */
        color: #333;                      /* Darker text on hover */
      }
      
      /* Button active/pressed state */
      .video-control-button:active {
        background: rgba(0, 0, 0, 0.1);   /* Darker background when clicked */
        transform: translateY(1px);       /* Slight downward movement for click feedback */
      }
      
      /* Active state for toggle buttons (like play/pause) */
      .video-control-button.active {
        background: transparent;          /* Keep transparent background */
        color: #222;                     /* Darker text to show active state */
      }
      
      /* Progress bar container - takes remaining space between left/right controls */
      .video-progress-container {
        flex: 1;              /* Expands to fill available space */
        margin: 0 16px;       /* Horizontal margins to separate from other controls */
        position: relative;    /* Allows absolute positioning of child elements */
      }
      
      /* The actual progress bar track */
      .video-progress-bar {
        width: 100%;           /* Full width of container */
        height: 3px;           /* Thin progress bar */
        background: #eee;      /* Light gray track background */
        border-radius: 2px;    /* Rounded ends */
        cursor: pointer;       /* Indicates clickable for seeking */
        position: relative;    /* For progress fill positioning */
        overflow: hidden;      /* Ensures fill doesn't extend beyond track */
      }
      
      /* The filled portion of the progress bar */
      .video-progress-fill {
        height: 100%;          /* Full height of track */
        background: #333;      /* Dark fill color */
        border-radius: 2px;    /* Rounded ends to match track */
        transition: width 0.1s ease; /* Smooth width changes during playback */
      }
      
      /* Time display styling (current time / total duration) */
      .video-time-display {
        color: #666;           /* Medium gray text */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; /* Monospace for aligned digits */
        font-size: 10px;       /* Small, readable size */
        min-width: 70px;       /* Prevents layout shifts as time changes */
        text-align: center;    /* Centers the time text */
        font-weight: 500;      /* Slightly bold for better readability */
      }
      
      /* Keyboard shortcuts indicator overlay */
      /* Shows helpful keyboard shortcuts when hovering over video */
      .video-keyboard-hint {
        position: absolute;                /* Positioned relative to video container */
        top: 8px;                         /* Distance from top of video */
        right: 8px;                       /* Distance from right edge */
        background: rgba(0, 0, 0, 0.8);   /* Semi-transparent dark background */
        color: white;                     /* White text for contrast */
        padding: 4px 8px;                 /* Internal spacing */
        border-radius: 4px;               /* Rounded corners */
        font-size: 9px;                   /* Small text size */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; /* Monospace font */
        pointer-events: none;             /* Doesn't interfere with video clicks */
        opacity: 0;                       /* Hidden by default */
        transition: opacity 0.3s ease;    /* Smooth fade in/out */
        z-index: 10;                      /* Appears above other elements */
        backdrop-filter: blur(5px);       /* Blurs content behind the hint */
      }
      
      /* Show keyboard hint on video container hover */
      .video-controls-enhanced:hover .video-keyboard-hint {
        opacity: 1;                       /* Becomes visible on hover */
      }
      
      /* Renderer controls panel */
      /* Panel for toggling different annotation renderers on/off */
      .renderer-controls-panel {
        margin-top: 12px;                 /* Space above renderer controls */
        padding: 8px 12px;                /* Internal spacing */
        background: rgba(0, 0, 0, 0.02);  /* Very light gray background */
        border-radius: 6px;               /* Rounded corners */
        border: 1px solid #eee;           /* Light border */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; /* System font */
        font-size: 11px;                  /* Small text size */
      }
      
      /* Title for the renderer controls section */
      .renderer-controls-title {
        font-weight: 600;                 /* Bold text */
        color: #333;                      /* Dark gray */
        margin-bottom: 8px;               /* Space below title */
        font-size: 10px;                  /* Even smaller text for title */
        text-transform: uppercase;        /* All caps styling */
        letter-spacing: 0.5px;            /* Spaced out letters */
      }
      
      /* Container for all renderer checkboxes */
      .renderer-checkboxes {
        display: flex;                    /* Horizontal layout */
        flex-wrap: wrap;                  /* Allows wrapping to next line if needed */
        gap: 12px;                        /* Space between checkbox items */
        align-items: center;              /* Vertical alignment */
      }
      
      /* Individual checkbox item container */
      .renderer-checkbox-item {
        display: flex;                    /* Horizontal layout for checkbox + label */
        align-items: center;              /* Vertical alignment */
        gap: 4px;                         /* Small space between checkbox and label */
        cursor: pointer;                  /* Entire item is clickable */
        padding: 2px 6px;                 /* Padding around the item */
        border-radius: 4px;               /* Rounded corners */
        transition: background 0.2s ease; /* Smooth background change on hover */
      }
      
      /* Hover effect for checkbox items */
      .renderer-checkbox-item:hover {
        background: rgba(0, 0, 0, 0.05);  /* Light gray background on hover */
      }
      
      /* Styling for the actual checkbox input */
      .renderer-checkbox {
        width: 12px;                      /* Small checkbox size */
        height: 12px;                     /* Square checkbox */
        cursor: pointer;                  /* Clickable cursor */
        accent-color: #333;               /* Dark color for checked state */
      }
      
      /* Label text for each checkbox */
      .renderer-checkbox-label {
        color: #666;                      /* Medium gray text */
        font-size: 10px;                  /* Small text size */
        cursor: pointer;                  /* Clickable cursor */
        user-select: none;                /* Prevents text selection */
        text-transform: capitalize;       /* Capitalizes first letter */
      }
      
      /* Styling for checked checkbox labels */
      .renderer-checkbox:checked + .renderer-checkbox-label {
        color: #333;                      /* Darker text when checked */
        font-weight: 500;                 /* Slightly bold when checked */
      }
    `;
  },

  setupVideoObserver() {
    // Watch for new video elements being added to the page
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const videos =
              node.tagName === "VIDEO"
                ? [node]
                : node.querySelectorAll("video");
            videos.forEach((video) => this.enhanceVideo(video));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },

  enhanceExistingVideos() {
    // Enhance all existing videos on the page
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => this.enhanceVideo(video));
  },

  enhanceVideo(video) {
    if (video.dataset.controlsEnhanced) return;

    const container = video.parentElement;
    if (!container) return;

    // Mark as enhanced
    video.dataset.controlsEnhanced = "true";
    container.classList.add("video-controls-enhanced");

    // Remove native controls
    video.controls = false;

    // Create custom controls
    const controlsPanel = this.createCustomControls(video);
    container.appendChild(controlsPanel);

    // Create renderer controls panel
    const rendererPanel = this.createRendererControlsPanel(video);
    container.appendChild(rendererPanel);

    // Add keyboard shortcuts hint
    // this.addKeyboardHint(container);

    // Setup enhanced keyboard controls
    this.setupKeyboardControls(video);

    // Setup progress and volume updates
    this.setupVideoEvents(video, controlsPanel);

    Utils.log(`Enhanced video controls for video: ${video.src || "unknown"}`);
  },

  createCustomControls(video) {
    const controls = document.createElement("div");
    controls.className = "custom-video-controls";

    const leftSection = this.createLeftSection(video);
    const progressContainer = this.createProgressContainer(video);
    const rightSection = this.createRightSection(video);

    controls.appendChild(leftSection);
    controls.appendChild(progressContainer);
    controls.appendChild(rightSection);

    return controls;
  },

  createLeftSection(video) {
    const leftSection = document.createElement("div");
    leftSection.className = "custom-video-controls-left";

    // Play/Pause button
    const playButton = document.createElement("button");
    playButton.className = "video-control-button";
    playButton.innerHTML = "▶";
    playButton.addEventListener("click", () => {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    });

    // Time display
    const timeDisplay = document.createElement("span");
    timeDisplay.className = "video-time-display";
    timeDisplay.textContent = "0:00 / 0:00";

    leftSection.appendChild(playButton);
    leftSection.appendChild(timeDisplay);

    return leftSection;
  },

  createProgressContainer(video) {
    const progressContainer = document.createElement("div");
    progressContainer.className = "video-progress-container";

    const progressBar = document.createElement("div");
    progressBar.className = "video-progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "video-progress-fill";

    progressBar.appendChild(progressFill);
    progressContainer.appendChild(progressBar);

    // Progress bar interaction
    progressBar.addEventListener("click", (e) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      video.currentTime = percent * video.duration;
    });

    return progressContainer;
  },

  createRightSection(video) {
    const rightSection = document.createElement("div");
    rightSection.className = "custom-video-controls-right";

    // Fullscreen button
    const fullscreenButton = document.createElement("button");
    fullscreenButton.className = "video-control-button";
    fullscreenButton.innerHTML = "⛶";
    fullscreenButton.addEventListener("click", () => {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    });

    rightSection.appendChild(fullscreenButton);

    return rightSection;
  },

  createRendererControlsPanel(video) {
    const panel = document.createElement("div");
    panel.className = "renderer-controls-panel";

    // Get the parent container for reliable video identification
    const container = video.parentElement;
    
    // Use parent container ID for both checkbox ID generation and cache key
    // This is more reliable than video.src or video.id
    const videoKey = container?.id || 
                    video.id || 
                    (video.src ? video.src.split('/').pop().split('.')[0] : null) || 
                    `video-${Date.now()}`;
    
    // Use the same key for checkbox IDs to ensure consistency
    const videoId = videoKey;

    // Title
    const title = document.createElement("div");
    title.className = "renderer-controls-title";
    title.textContent = "Annotation Renderers";

    // Checkbox container
    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "renderer-checkboxes";

    // Load cached renderer preferences for this specific video
    // Use parent container ID for reliable video identification
    const allPrefs = JSON.parse(localStorage.getItem('neo-kpi-video-renderer-prefs') || '{}');
    const rendererPrefs = allPrefs[videoKey] || {};
    
    // Create renderer types from CONFIG with cached preferences or default enabled
    const rendererTypes = CONFIG.ANNOTATIONS_CATEGORIES.map(category => ({
      type: category,
      label: category.charAt(0).toUpperCase() + category.slice(1), // Capitalize first letter
      enabled: rendererPrefs.hasOwnProperty(category) ? rendererPrefs[category] : true // Use cached value or default enabled
    }));

    // Create checkbox for each renderer
    rendererTypes.forEach(renderer => {
      const checkboxItem = document.createElement("div");
      checkboxItem.className = "renderer-checkbox-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "renderer-checkbox";
      checkbox.id = `renderer-${renderer.type}-${videoId}`;
      checkbox.checked = renderer.enabled;
      
      const label = document.createElement("label");
      label.className = "renderer-checkbox-label";
      label.htmlFor = `renderer-${renderer.type}-${videoId}`;
      label.textContent = renderer.label;

      // Add event listener to handle renderer toggling
      checkbox.addEventListener("change", (e) => {
        this.toggleRenderer(renderer.type, e.target.checked, video);
      });

      checkboxItem.appendChild(checkbox);
      checkboxItem.appendChild(label);
      checkboxContainer.appendChild(checkboxItem);
    });

    panel.appendChild(title);
    panel.appendChild(checkboxContainer);

    return panel;
  },

  toggleRenderer(rendererType, enabled, targetVideo) {
    Utils.log(`Renderer ${rendererType} ${enabled ? 'enabled' : 'disabled'} for specific video`);
    
    // Toggle renderer only on the specific video
    if (targetVideo && targetVideo.annotator) {
      targetVideo.annotator.toggleRenderer(rendererType, enabled);
      Utils.log(`Successfully toggled ${rendererType} renderer for video`);
    } else {
      Utils.log(`Video or annotator not found for ${rendererType} toggle`);
    }
    
    // Store preference for this specific video using parent container ID
    const container = targetVideo.parentElement;
    const videoKey = container?.id || 
                    targetVideo.id || 
                    (targetVideo.src ? targetVideo.src.split('/').pop().split('.')[0] : null) || 
                    `video-${Date.now()}`;
    
    const allPrefs = JSON.parse(localStorage.getItem('neo-kpi-video-renderer-prefs') || '{}');
    if (!allPrefs[videoKey]) {
      allPrefs[videoKey] = {};
    }
    allPrefs[videoKey][rendererType] = enabled;
    localStorage.setItem('neo-kpi-video-renderer-prefs', JSON.stringify(allPrefs));
  },

  setupVideoEvents(video, controlsPanel) {
    const playButton = controlsPanel.querySelector(".video-control-button");
    const timeDisplay = controlsPanel.querySelector(".video-time-display");
    const progressFill = controlsPanel.querySelector(".video-progress-fill");

    // Update play button
    const updatePlayButton = () => {
      playButton.innerHTML = video.paused ? "▶" : "⏸";
      playButton.classList.toggle("active", !video.paused);
    };

    // Update time display
    const updateTimeDisplay = () => {
      const current = Utils.formatTime(video.currentTime);
      const duration = Utils.formatTime(video.duration);
      timeDisplay.textContent = `${current} / ${duration}`;
    };

    // Update progress bar
    const updateProgress = () => {
      if (video.duration) {
        const percent = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${percent}%`;
      }
    };

    // Event listeners
    video.addEventListener("play", updatePlayButton);
    video.addEventListener("pause", updatePlayButton);
    video.addEventListener(
      "timeupdate",
      Utils.debounce(() => {
        updateTimeDisplay();
        updateProgress();
      }, 100),
    );
    video.addEventListener("loadedmetadata", updateTimeDisplay);

    // Initial state
    updatePlayButton();
    updateTimeDisplay();
    updateProgress();
  },

  addKeyboardHint(container) {
    if (container.querySelector(".video-keyboard-hint")) return;

    const hint = document.createElement("div");
    hint.className = "video-keyboard-hint";
    hint.textContent = "Space: Play/Pause • ←/→: Seek • F: Fullscreen";
    container.appendChild(hint);
  },

  setupKeyboardControls(video) {
    // Enhanced keyboard controls for individual videos
    video.addEventListener("keydown", (e) => {
      if (e.target !== video) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(
            0,
            video.currentTime - CONFIG.TIMING.VIDEO_SEEK_SECONDS,
          );
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(
            video.duration,
            video.currentTime + CONFIG.TIMING.VIDEO_SEEK_SECONDS,
          );
          break;
        case "f":
          e.preventDefault();
          if (video.requestFullscreen) {
            video.requestFullscreen();
          }
          break;
      }
    });

    // Make video focusable for keyboard controls
    video.setAttribute("tabindex", "0");
  },
};
