// extension/content.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { OracleBubble } from './components/OracleBubble';
import bubbleStyles from './components/OracleBubble.css?inline';

let appContainer: HTMLDivElement | null = null;
let root: any = null;

/**
 * Create the DOM container, attach a ShadowRoot, inject styles and render the React app.
 */
const createAndRenderApp = () => {
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

  console.log('Eido AI: UI Injected.');
};

/**
 * Inject the app safely: wait for document.body if necessary.
 */
const injectApp = () => {
  if (appContainer) return;

  const tryInject = () => {
    try {
      if (!document.body) {
        return false;
      }
      createAndRenderApp();
      return true;
    } catch (err) {
      console.error('Eido AI: inject error', err);
      return false;
    }
  };

  if (document.body) {
    tryInject();
    return;
  }

  // If the document is still loading, wait for DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        tryInject();
      },
      { once: true }
    );

    // fallback: try again after a short delay
    setTimeout(() => {
      if (!appContainer && document.body) {
        tryInject();
      }
    }, 1500);
  } else {
    // Not loading but body not present (rare) — try a short poll
    const poll = setInterval(() => {
      if (document.body) {
        clearInterval(poll);
        tryInject();
      }
    }, 50);
    setTimeout(() => clearInterval(poll), 3000); // stop polling after 3s
  }
};

const unmountApp = () => {
  try {
    if (root) {
      root.unmount();
      root = null;
    }
    if (appContainer) {
      appContainer.remove();
      appContainer = null;
    }
    console.log('Eido AI: UI Unmounted.');
  } catch (err) {
    console.error('Eido AI: Unmount error', err);
  }
};

/**
 * Forward auth status to the injected UI via a CustomEvent so React can pick it up.
 */
const forwardAuthStateToApp = (isAuthenticated: boolean) => {
  try {
    window.dispatchEvent(
      new CustomEvent('EIDO_AUTH_STATUS', { detail: { isAuthenticated } })
    );
  } catch (err) {
    console.warn('Eido AI: Could not dispatch auth event', err);
  }
};

// --- Message Listeners & Initializers ---
// Listen for background broadcasts (e.g., cookie changes)
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'AUTH_STATUS_CHANGED') {
    console.log('Eido AI: Received AUTH_STATUS_CHANGED', message.isAuthenticated);
    forwardAuthStateToApp(Boolean(message.isAuthenticated));
  }
});

// Request initial auth status from background; forward into the app if we get it.
const requestInitialAuthStatus = async () => {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'REQUEST_AUTH_STATUS' });
    if (response && typeof response.isAuthenticated !== 'undefined') {
      forwardAuthStateToApp(Boolean(response.isAuthenticated));
    }
  } catch (error: any) {
    console.warn('Eido AI: Could not get initial auth status.', error);
    // Retry logic if background not ready yet
    if (error?.message?.includes('Could not establish connection')) {
      setTimeout(requestInitialAuthStatus, 500);
    }
  }
};

// Initialize: inject the UI (always) and then ask background for auth status
console.log('Eido AI Content Script loaded and ready.');
injectApp();
requestInitialAuthStatus();

export { injectApp, unmountApp };
