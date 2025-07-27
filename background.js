// background.js
console.log('[Hypeddit Skip] Background script running');

// Handle installation and updates
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Hypeddit Skip] Extension installed');
    // Set default values
    browser.storage.local.set({
      delaySeconds: 1.0,
      hypeddit_auto_trigger: false
    });
  } else if (details.reason === 'update') {
    console.log('[Hypeddit Skip] Extension updated to version', browser.runtime.getManifest().version);
  }
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HYPEDDIT_SKIP_LOG') {
    console.log('[Hypeddit Skip] Content log:', message.text);
  }
  return false;
});

// Add error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  console.error('[Hypeddit Skip] Unhandled promise rejection:', event.reason);
});

