// --- CONFIGURATION ---
// IMPORTANT: Replace these placeholders with your actual app details.

// 1. The domain of your web app where authentication cookies are set.
const EIDO_DOMAIN = "dashboard.eido-ai.com"; 

// 2. The name of the Supabase auth token cookie.
//    You can find this in your browser's developer tools (Application > Cookies)
//    when logged into your web app. It usually starts with "sb-".
const SUPABASE_COOKIE_NAME = "uzdtqomtbrccinrkhzme"; 

// --- CORE AUTHENTICATION LOGIC ---

// Checks for the Supabase auth cookie and updates the extension's state.
const updateAuthStatus = async () => {
  try {
    const cookie = await chrome.cookies.get({
      url: `https://${EIDO_DOMAIN}`,
      name: SUPABASE_COOKIE_NAME,
    });

    const isAuthenticated = !!cookie; // true if cookie exists, false otherwise
    const storedData = await chrome.storage.local.get('isAuthenticated');
    
    // If the auth status has changed, update it and notify content scripts.
    if (storedData.isAuthenticated !== isAuthenticated) {
      console.log('Eido AI: Auth status changed to:', isAuthenticated);
      await chrome.storage.local.set({ isAuthenticated });
      broadcastAuthStatus(isAuthenticated);
    }
  } catch (error) {
    console.error("Eido AI: Error checking auth status:", error);
  }
};

// Sends the current authentication status to all active Eido content scripts.
const broadcastAuthStatus = (isAuthenticated) => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "AUTH_STATUS_CHANGED",
          isAuthenticated: isAuthenticated,
        }).catch(err => {
          // This error is expected if the content script isn't injected on a page yet.
          if (err.message.includes("Receiving end does not exist")) {
            return;
          }
          console.error(`Eido AI: Could not send message to tab ${tab.id}:`, err);
        });
      }
    });
  });
};


// --- EVENT LISTENERS ---

// 1. Listen for when the extension is first installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  console.log("Eido AI Extension installed/updated.");
  updateAuthStatus();
});

// 2. Listen for when the browser starts up.
chrome.runtime.onStartup.addListener(() => {
  console.log("Eido AI: Browser startup.");
  updateAuthStatus();
});

// 3. The MOST IMPORTANT listener: triggers when cookies on your domain change.
//    This allows for real-time login/logout detection.
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes(EIDO_DOMAIN)) {
    console.log("Eido AI: Detected cookie change on domain.");
    updateAuthStatus();
  }
});

// --- MODIFIED MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle request for initial auth status
  if (message.type === "REQUEST_AUTH_STATUS") {
    chrome.storage.local.get('isAuthenticated').then(data => {
      sendResponse({ isAuthenticated: !!data.isAuthenticated });
    });
    return true; // Keep the message channel open for async response
  }

  // NEW: Handle request for the auth token itself
  if (message.type === "GET_AUTH_TOKEN") {
    chrome.cookies.get({
      url: `https://${EIDO_DOMAIN}`,
      name: SUPABASE_COOKIE_NAME
    }).then(cookie => {
      if (cookie) {
        sendResponse({ token: cookie.value });
      } else {
        sendResponse({ token: null });
      }
    }).catch(error => {
      console.error("Eido AI: Error retrieving auth cookie:", error);
      sendResponse({ token: null });
    });
    return true; // Keep the message channel open for async response
  }
});