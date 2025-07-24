import { Utils } from "../utils/utils.js";

/**
 * URL Monitor - Tracks page navigation and cleans up when leaving alert-debug
 */
export const URLMonitor = {
  isInitialized: false,
  lastUrl: '',

  init() {
    if (this.isInitialized) return;
    
    this.lastUrl = window.location.href;
    this.startMonitoring();
    this.isInitialized = true;
    
    Utils.log('URL Monitor initialized');
  },

  startMonitoring() {
    // Monitor URL changes via history API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.checkURLChange();
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.checkURLChange();
    };
    
    // Monitor popstate events (back/forward buttons)
    window.addEventListener('popstate', () => {
      this.checkURLChange();
    });
    
    // Monitor hash changes
    window.addEventListener('hashchange', () => {
      this.checkURLChange();
    });
    
    // Periodic check as fallback (every 2 seconds)
    setInterval(() => {
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
        Utils.log('Left alert-debug page, forcing page reload to ensure clean state...');
        // Force a full page reload to completely clean up the extension
        setTimeout(() => window.location.reload(), 100);
        return;
      }
      
      this.lastUrl = currentUrl;
    }
  },

  isAlertDebugPage(url) {
    return url.includes('/alert-debug');
  },

  // Legacy cleanup method - kept for compatibility but not used with force reload
  cleanup() {
    const elementsToRemove = [
      "#notepad-panel",
      "#bulk-status", 
      "#fireworks-canvas",
      "#video-controls-styles",
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
