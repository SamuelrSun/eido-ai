chrome.runtime.onInstalled.addListener(() => {
    console.log("Eido AI Oracle extension installed/updated.");
  });
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "EIDO_AI_ACTION") {
      console.log("Received action from tab:", sender.tab.url, message);
    }
  });
