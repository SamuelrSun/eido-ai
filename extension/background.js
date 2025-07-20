// extension/background.js

// This script runs in the background of the browser.

// Log when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  console.log('Eido AI Oracle extension installed/updated.');
});

// The background script no longer needs to manage the popup window,
// as the content script now handles the in-page iframe.
// The toolbar icon will use the default_popup defined in the manifest.
