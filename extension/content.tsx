import React from 'react';
import { createRoot } from 'react-dom/client';
import { OracleBubble } from './components/OracleBubble';
import bubbleStyles from './components/OracleBubble.css?inline';

let appContainer = null;
let root = null;

const injectApp = () => {
  // Prevent injecting the app multiple times
  if (document.getElementById('eido-ai-root')) {
    return;
  }

  appContainer = document.createElement('div');
  appContainer.id = 'eido-ai-root';
  document.body.appendChild(appContainer);

  const shadowRoot = appContainer.attachShadow({ mode: 'open' });

  // Inject the CSS into the Shadow DOM
  const styleElement = document.createElement('style');
  styleElement.textContent = bubbleStyles;
  shadowRoot.appendChild(styleElement);
  
  // Create a root inside the shadow DOM for React
  const reactRootContainer = document.createElement('div');
  shadowRoot.appendChild(reactRootContainer);

  root = createRoot(reactRootContainer);
  root.render(
    <React.StrictMode>
      <OracleBubble />
    </React.StrictMode>
  );

  console.log("Eido AI: UI Injected.");
};

const unmountApp = () => {
  if (root) {
    root.unmount();
    root = null;
  }
  if (appContainer) {
    appContainer.remove();
    appContainer = null;
  }
  console.log("Eido AI: UI Unmounted.");
};

// --- Authentication State Handling ---
const handleAuthState = (isAuthenticated) => {
  console.log(`Eido AI: Received auth state: ${isAuthenticated}`);
  if (isAuthenticated) {
    injectApp();
  } else {
    unmountApp();
  }
};

// --- Message Listeners & Initializers ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "AUTH_STATUS_CHANGED") {
    handleAuthState(message.isAuthenticated);
  }
});

const requestInitialAuthStatus = async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: "REQUEST_AUTH_STATUS" });
    if (response) {
      handleAuthState(response.isAuthenticated);
    }
  } catch (error) {
    console.warn("Eido AI: Could not get initial auth status.", error);
    // Retry if background isn't ready
    if (error.message.includes("Could not establish connection")) {
      setTimeout(requestInitialAuthStatus, 500);
    }
  }
};

// Initialize the script
console.log("Eido AI Content Script loaded and ready.");
requestInitialAuthStatus();