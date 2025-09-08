(function() {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = chrome.runtime.getURL('content.js');
  document.head.appendChild(script);

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('styles.css');
  document.head.appendChild(styleLink);
})();