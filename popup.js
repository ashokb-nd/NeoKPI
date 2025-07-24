// Check if the extension is active on the current tab
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  const currentTab = tabs[0];
  const statusEl = document.getElementById('status');
  
  if (currentTab.url && currentTab.url.includes('analytics-kpis.netradyne.com/alert-debug')) {
    statusEl.textContent = 'Active on Alert Debug page';
    statusEl.className = 'status active';
  } else {
    statusEl.textContent = 'Navigate to Alert Debug page to activate';
    statusEl.className = 'status inactive';
  }
});
