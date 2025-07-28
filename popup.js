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

// Handle S3 presigner download
document.getElementById('downloadPresigner').addEventListener('click', function() {
  // Fetch the s3-presigner.py file content from the extension
  fetch(chrome.runtime.getURL('s3-presigner.py'))
    .then(response => response.text())
    .then(content => {
      // Create a blob with the file content
      const blob = new Blob([content], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 's3-presigner.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the object URL
      URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Error downloading s3-presigner.py:', error);
      alert('Error downloading file. Please check the console for details.');
    });
});
