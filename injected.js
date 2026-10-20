(function() {
  // 1. Bypass React 30s timers
  const origSetTimeout = window.setTimeout;
  window.setTimeout = function(callback, delay, ...args) {
    // If delay is likely the 30-second reading timer (usually 30000ms), fast forward it
    if (delay >= 29000 && delay <= 31000) {
      console.log('⚡ Coursera Bypass: Fast-forwarding 30s timer!');
      delay = 0;
    }
    return origSetTimeout(callback, delay, ...args);
  };

  // 2. Prevent video pausing when switching tabs
  const isAutoWatchVideo = window.location.search.includes('autoWatchVideo=1');

  function blockVisibility(e) {
    e.stopImmediatePropagation();
  }

  // Intercept events before Coursera's listeners (use capture phase)
  document.addEventListener('visibilitychange', blockVisibility, true);
  window.addEventListener('blur', blockVisibility, true);
  document.addEventListener('webkitvisibilitychange', blockVisibility, true);
  window.addEventListener('pagehide', blockVisibility, true);
  document.addEventListener('freeze', blockVisibility, true);
  
  // Also spoof document properties just in case
  Object.defineProperty(document, 'hidden', { get: () => false });
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
  Object.defineProperty(document, 'webkitHidden', { get: () => false });
  Object.defineProperty(document, 'webkitVisibilityState', { get: () => 'visible' });

  if (isAutoWatchVideo && window.HTMLMediaElement) {
    const originalPause = window.HTMLMediaElement.prototype.pause;
    window.HTMLMediaElement.prototype.pause = function(...args) {
      if (this.tagName === 'VIDEO' && !this.ended && !this.hasAttribute('data-allow-auto-pause')) {
        console.log('⚡ Coursera Bypass: Blocked background video pause.');
        return undefined;
      }
      return originalPause.apply(this, args);
    };
  }

  console.log('⚡ Coursera Bypass: Main world hooks installed.');
})();
