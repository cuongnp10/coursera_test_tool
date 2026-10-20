/**
 * Coursera Video & Timer Bypass
 * Handles automatic unlocking of completion buttons and 2x video playback.
 */

(function() {
  window.CourseraAssistant = window.CourseraAssistant || {};

  let settings = {
    enabled: true,
    autoClick: true
  };

  chrome.storage.local.get({ enabled: true, autoClick: true }, function(result) {
    settings = result;
  });

  chrome.storage.onChanged.addListener(function(changes) {
    for (let key in changes) {
      settings[key] = changes[key].newValue;
    }
  });

  const completeKeywords = [
    'mark as complete',
    'mark as completed',
    'completed',
    'đánh dấu là đã hoàn thành',
    'đánh dấu hoàn thành',
    'hoàn thành',
    'xác nhận hoàn thành'
  ];

  let hasMarkedComplete = false;

  function cleanDisabledState(button) {
    if (!settings.enabled) return;

    if (button.hasAttribute('disabled')) {
      button.removeAttribute('disabled');
    }
    if (button.disabled) {
      button.disabled = false;
    }

    button.classList.forEach(className => {
      if (className.toLowerCase().includes('disabled')) {
        button.classList.remove(className);
      }
    });

    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.style.opacity = '1';

    const textElements = [button, ...button.querySelectorAll('*')];
    textElements.forEach(el => {
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
        const txt = el.textContent;
        if (/\(\d+:\d+\)/.test(txt)) {
          el.textContent = txt.replace(/\(\d+:\d+\)/, '(Unlocked ✨)');
        }
      }
    });

    if (settings.autoClick && !button.hasAttribute('data-bypassed-click')) {
      button.setAttribute('data-bypassed-click', 'true');
      
      setTimeout(() => {
        button.click();
        console.log('Auto clicked completion button.');
        hasMarkedComplete = true;
        
        chrome.storage.local.get({ skipCount: 0 }, function(data) {
          chrome.storage.local.set({ skipCount: data.skipCount + 1 });
        });

        // If this tab was opened as an auto-reading tab, close it after a brief delay
        if (window.location.search.includes('autoCloseReading=1')) {
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'close_tab' });
          }, 1500);
        }
      }, 300);
    }
  }

  function unlockAllButtons() {
    if (!settings.enabled) return;
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      const text = button.textContent.toLowerCase();
      const isCompleteButton = completeKeywords.some(keyword => text.includes(keyword));
      if (isCompleteButton) {
        cleanDisabledState(button);
      }
    });
  }

  function handleAutoWatchVideo() {
    if (window.location.search.includes('autoWatchVideo=1')) {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (!video.hasAttribute('data-auto-watched')) {
          video.setAttribute('data-auto-watched', 'true');
          video.muted = true;
          video.playbackRate = 2.0;
          video.autoplay = true;
          video.playsInline = true;
          video.disablePictureInPicture = true;

          video.addEventListener('pause', () => {
            if (!video.ended && window.location.search.includes('autoWatchVideo=1')) {
              setTimeout(() => playVideo(video), 250);
            }
          });

          console.log('⚡ Coursera Bypass: Video muted, set to 2x speed, and kept alive.');
        }

        playVideo(video);
      });

      selectLowestVideoQuality();
    }
  }

  function playVideo(video) {
    if (!settings.enabled || !video || video.ended) return;

    video.muted = true;
    video.playbackRate = 2.0;

    if (video.paused || video.readyState >= 2) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }

  function isVisibleElement(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }

  function getClickableText(element) {
    return ((element.innerText || element.textContent || '') + ' ' + (element.getAttribute('aria-label') || '') + ' ' + (element.getAttribute('title') || '')).trim();
  }

  function getVisibleClickableElements() {
    return Array.from(document.querySelectorAll('button, [role="button"], [role="menuitem"], li, a'))
      .filter(isVisibleElement);
  }

  function clickFirstMatching(pattern) {
    const match = getVisibleClickableElements().find(element => pattern.test(getClickableText(element)));
    if (match) {
      match.click();
      return true;
    }
    return false;
  }

  function clickPreferredQuality() {
    const qualityItems = getVisibleClickableElements()
      .map(element => ({ element, text: getClickableText(element), match: getClickableText(element).match(/\b(144|240|360|480|540|720|1080)p\b/i) }))
      .filter(item => item.match);

    if (qualityItems.length === 0) return false;

    const preferred = qualityItems.find(item => /\b240p\b/i.test(item.text)) ||
      qualityItems.find(item => /\b360p\b/i.test(item.text)) ||
      qualityItems.sort((a, b) => Number(a.match[1]) - Number(b.match[1]))[0];

    preferred.element.click();
    console.log(`⚡ Coursera Bypass: Selected video quality ${preferred.match[0]}.`);
    return true;
  }

  function selectLowestVideoQuality() {
    if (document.body.hasAttribute('data-lowest-quality-selected')) return;

    if (clickPreferredQuality()) {
      document.body.setAttribute('data-lowest-quality-selected', 'true');
      return;
    }

    if (!document.body.hasAttribute('data-quality-menu-opened')) {
      document.body.setAttribute('data-quality-menu-opened', 'true');
      const openedSettings = clickFirstMatching(/settings|quality|cài đặt|chất lượng/i);

      if (openedSettings) {
        setTimeout(() => {
          clickFirstMatching(/quality|chất lượng/i);
          setTimeout(() => {
            if (clickPreferredQuality()) {
              document.body.setAttribute('data-lowest-quality-selected', 'true');
            } else {
              document.body.removeAttribute('data-quality-menu-opened');
            }
          }, 350);
        }, 350);
      } else {
        document.body.removeAttribute('data-quality-menu-opened');
      }
    }
  }

  function initVideoTimerBypass() {
    setInterval(() => {
      unlockAllButtons();
      handleAutoWatchVideo();
    }, 1000);

    const observer = new MutationObserver(() => {
      unlockAllButtons();
      handleAutoWatchVideo();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'class'] });
  }

  // Export
  window.CourseraAssistant.initVideoTimerBypass = initVideoTimerBypass;
  window.CourseraAssistant.unlockAllButtons = unlockAllButtons;
  window.CourseraAssistant.cleanDisabledState = cleanDisabledState;
})();
