// This script is injected into every webpage to create the floating button and the popup iframe.

let isPopupOpen = false;

// --- Create the main container for our UI ---
const eidoContainer = document.createElement('div');
eidoContainer.id = 'eido-ai-container';
eidoContainer.style.position = 'fixed';
eidoContainer.style.zIndex = '9998';
document.body.appendChild(eidoContainer);

// --- Set fixed position for the FAB ---
eidoContainer.style.bottom = '30px';
eidoContainer.style.right = '30px';


// --- Create the floating action button (FAB) ---
const fab = document.createElement('button');
fab.id = 'eido-ai-fab';
fab.style.width = '60px';
fab.style.height = '60px';
fab.style.borderRadius = '8px';
fab.style.backgroundColor = '#75909C';
fab.style.border = 'none';
fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
fab.style.cursor = 'pointer';
fab.style.zIndex = '10000';
fab.style.display = 'flex';
fab.style.alignItems = 'center';
fab.style.justifyContent = 'center';
fab.style.transition = 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, opacity 0.2s ease-in-out';
fab.setAttribute('aria-label', 'Open Eido AI Oracle');
eidoContainer.appendChild(fab);

const icon = document.createElement('img');
icon.src = chrome.runtime.getURL('images/icon128.png');
icon.style.width = '36px';
icon.style.height = '36px';
fab.appendChild(icon);

// --- Create the popup iframe ---
const popupFrame = document.createElement('iframe');
popupFrame.id = 'eido-ai-popup-frame';
popupFrame.src = chrome.runtime.getURL('extension/popup.html');
popupFrame.style.backgroundColor = '#fff';
popupFrame.style.width = '400px';
popupFrame.style.height = '600px';
popupFrame.style.border = '1px solid #e5e7eb';
popupFrame.style.borderRadius = '8px';
popupFrame.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
popupFrame.style.position = 'absolute';
popupFrame.style.bottom = '0px';
popupFrame.style.right = '0px';
popupFrame.style.display = 'none';
popupFrame.style.zIndex = '9999';
eidoContainer.appendChild(popupFrame);

// --- Toggle popup visibility ---
function togglePopup(show) {
  isPopupOpen = show;
  popupFrame.style.display = show ? 'block' : 'none';
  fab.style.display = show ? 'none' : 'flex';
}

// --- Listen for close message from the iframe ---
window.addEventListener('message', (event) => {
  if (event.source !== popupFrame.contentWindow) return;

  if (event.data.type === 'closeEidoPopup') {
    togglePopup(false);
  }
});

// --- FAB Click Listener ---
fab.addEventListener('click', (event) => {
  event.stopPropagation();
  togglePopup(true);
});