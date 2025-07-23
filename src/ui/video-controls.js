import { CONFIG } from "../config/constants.js";
import { Utils } from "../utils/utils.js";

export const VideoControlsManager = {
  init() {
    this.injectStyles();
    this.setupVideoObserver();
    this.enhanceExistingVideos();
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
      /* Hide native video controls */
      video::-webkit-media-controls {
        display: none !important;
      }
      
      video::-webkit-media-controls-panel {
        display: none !important;
      }
      
      /* Enhanced video container styling */
      .video-controls-enhanced {
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      .video-controls-enhanced video {
        width: 100% !important;
        height: auto !important;
        object-fit: contain !important;
      }
      
      /* Custom controls panel positioned below video */
      .custom-video-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: transparent;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        margin-top: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        color: #333;
      }
      
      .custom-video-controls-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .custom-video-controls-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .video-control-button {
        background: transparent;
        border: none;
        color: #666;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
        transition: all 0.2s ease;
      }
      
      .video-control-button:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #333;
      }
      
      .video-control-button:active {
        background: rgba(0, 0, 0, 0.1);
        transform: translateY(1px);
      }
      
      .video-control-button.active {
        background: transparent;
        color: #222;
      }
      
      .video-progress-container {
        flex: 1;
        margin: 0 16px;
        position: relative;
      }
      
      .video-progress-bar {
        width: 100%;
        height: 3px;
        background: #eee;
        border-radius: 2px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      
      .video-progress-fill {
        height: 100%;
        background: #333;
        border-radius: 2px;
        transition: width 0.1s ease;
      }
      
      .video-time-display {
        color: #666;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
        font-size: 10px;
        min-width: 70px;
        text-align: center;
        font-weight: 500;
      }
      
      /* Keyboard shortcuts indicator */
      .video-keyboard-hint {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 9px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 10;
        backdrop-filter: blur(5px);
      }
      
      .video-controls-enhanced:hover .video-keyboard-hint {
        opacity: 1;
      }
      
      /* Renderer controls panel */
      .renderer-controls-panel {
        margin-top: 12px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 6px;
        border: 1px solid #eee;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11px;
      }
      
      .renderer-controls-title {
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .renderer-checkboxes {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
      }
      
      .renderer-checkbox-item {
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: background 0.2s ease;
      }
      
      .renderer-checkbox-item:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      
      .renderer-checkbox {
        width: 12px;
        height: 12px;
        cursor: pointer;
        accent-color: #333;
      }
      
      .renderer-checkbox-label {
        color: #666;
        font-size: 10px;
        cursor: pointer;
        user-select: none;
        text-transform: capitalize;
      }
      
      .renderer-checkbox:checked + .renderer-checkbox-label {
        color: #333;
        font-weight: 500;
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

    // Title
    const title = document.createElement("div");
    title.className = "renderer-controls-title";
    title.textContent = "Annotation Renderers";

    // Checkbox container
    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "renderer-checkboxes";

    // Create renderer types from CONFIG with all enabled by default
    const rendererTypes = CONFIG.ANNOTATIONS_CATEGORIES.map(category => ({
      type: category,
      label: category.charAt(0).toUpperCase() + category.slice(1), // Capitalize first letter
      enabled: true // Enable all by default
    }));

    // Create checkbox for each renderer
    rendererTypes.forEach(renderer => {
      const checkboxItem = document.createElement("div");
      checkboxItem.className = "renderer-checkbox-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "renderer-checkbox";
      checkbox.id = `renderer-${renderer.type}`;
      checkbox.checked = renderer.enabled;
      
      const label = document.createElement("label");
      label.className = "renderer-checkbox-label";
      label.htmlFor = `renderer-${renderer.type}`;
      label.textContent = renderer.label;

      // Add event listener to handle renderer toggling
      checkbox.addEventListener("change", (e) => {
        this.toggleRenderer(renderer.type, e.target.checked);
      });

      checkboxItem.appendChild(checkbox);
      checkboxItem.appendChild(label);
      checkboxContainer.appendChild(checkboxItem);
    });

    panel.appendChild(title);
    panel.appendChild(checkboxContainer);

    return panel;
  },

  toggleRenderer(rendererType, enabled) {
    Utils.log(`Renderer ${rendererType} ${enabled ? 'enabled' : 'disabled'}`);
    
    // Toggle renderer on all videos with annotators
    const videos = document.querySelectorAll('video');
    let toggledAny = false;
    
    videos.forEach(video => {
      if (video.annotator) {
        video.annotator.toggleRenderer(rendererType, enabled);
        toggledAny = true;
      }
    });
    
    // Always store preference for future video loads
    const rendererPrefs = JSON.parse(localStorage.getItem('neo-kpi-renderer-prefs') || '{}');
    rendererPrefs[rendererType] = enabled;
    localStorage.setItem('neo-kpi-renderer-prefs', JSON.stringify(rendererPrefs));
    
    if (!toggledAny) {
      Utils.log(`No videos with annotators found. Preference saved for future loads.`);
    }
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
