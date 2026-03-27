import { Utils } from "../utils/utils.js";

/**
 * URL Monitor - Tracks page navigation and cleans up when leaving alert-debug
 */
export const URLMonitor = {
  isInitialized: false,
  lastUrl: '',
  monitorIntervalId: null,
  originalPushState: null,
  originalReplaceState: null,
  popstateHandler: null,
  hashchangeHandler: null,
  onEnterAlertDebug: null,
  onLeaveAlertDebug: null,

  init({ onEnterAlertDebug = null, onLeaveAlertDebug = null } = {}) {
    if (this.isInitialized) {
      this.onEnterAlertDebug = onEnterAlertDebug;
      this.onLeaveAlertDebug = onLeaveAlertDebug;
      return;
    }
    
    this.lastUrl = window.location.href;
    this.onEnterAlertDebug = onEnterAlertDebug;
    this.onLeaveAlertDebug = onLeaveAlertDebug;
    this.startMonitoring();
    this.isInitialized = true;
    
    Utils.log('URL Monitor initialized');
  },

  startMonitoring() {
    // Monitor URL changes via history API
    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      this.originalPushState.apply(history, args);
      this.checkURLChange();
    };
    
    history.replaceState = (...args) => {
      this.originalReplaceState.apply(history, args);
      this.checkURLChange();
    };
    
    // Monitor popstate events (back/forward buttons)
    this.popstateHandler = () => {
      this.checkURLChange();
    };
    window.addEventListener('popstate', this.popstateHandler);
    
    // Monitor hash changes
    this.hashchangeHandler = () => {
      this.checkURLChange();
    };
    window.addEventListener('hashchange', this.hashchangeHandler);
    
    // Periodic check as fallback (every 2 seconds)
    this.monitorIntervalId = setInterval(() => {
      this.checkURLChange();
    }, 2000);
  },

  checkURLChange() {
    const currentUrl = window.location.href;
    
    if (currentUrl !== this.lastUrl) {
      Utils.log(`URL changed: ${this.lastUrl} -> ${currentUrl}`);
      
      const wasOnAlertDebug = this.isAlertDebugPage(this.lastUrl);
      const isOnAlertDebug = this.isAlertDebugPage(currentUrl);
      
      if (wasOnAlertDebug && !isOnAlertDebug) {
        Utils.log('Left alert-debug page, cleaning up extension state');
        this.onLeaveAlertDebug?.();
      }

      if (!wasOnAlertDebug && isOnAlertDebug) {
        Utils.log('Entered alert-debug page, initializing extension state');
        this.onEnterAlertDebug?.();
      }
      
      this.lastUrl = currentUrl;
    }
  },

  isAlertDebugPage(url) {
    return url.includes('/alert-debug');
  },

  cleanup() {
    const elementsToRemove = [
      "#notepad-panel",
      "#bulk-status", 
      "#fireworks-canvas",
      "#bulk-status-keyframes",
      "#spinner-animation"
    ];

    elementsToRemove.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.remove();
        Utils.log(`Removed element: ${selector}`);
      }
    });

    Utils.log('Extension cleanup completed');
  }
};
