// extension/background.js

// This script runs in the background of the browser.

// Log when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  console.log('Eido AI Oracle extension installed/updated.');
});

// Listener to handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // This is a basic listener to prevent "Unchecked runtime.lastError"
  // You can expand this later to handle specific commands from your content script
  if (message.type === 'EIDO_AI_ACTION') {
    console.log('Received action from tab:', sender.tab.url, message);
    // To send a response back asynchronously, you must return true.
    // sendResponse({ status: "received" });
    // return true; 
  }
  // Return true to indicate you wish to send a response asynchronously
  // For now, we can just return false or undefined as we don't send a response.
});