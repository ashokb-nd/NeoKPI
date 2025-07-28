// Chrome Extension Page Context Injector
// This file handles injecting the main script into page context to bypass CSP

(function() {
  'use strict';
  
  // Check if we're in a Chrome extension context
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    console.log('🔧 Chrome Extension detected, injecting script into page context...');
    
    // Create script element that loads the main script as an external resource
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('tampermonkey-script.js');
    script.onload = function() {
      console.log('✅ NeoKPI script injected into page context');
      this.remove(); // Clean up after loading
    };
    script.onerror = function() {
      console.error('❌ Failed to load NeoKPI script');
      this.remove();
    };
    
    // Inject as external script (not inline) to bypass CSP
    document.documentElement.appendChild(script);
  } else {
    console.error('❌ Not in Chrome extension context');
  }
})();
