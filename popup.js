document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('bypass-toggle');
  const autoClickToggle = document.getElementById('autoclick-toggle');
  const skipCountEl = document.getElementById('skip-count');
  const resetBtn = document.getElementById('reset-stats-btn');
  const searchQuizBtn = document.getElementById('search-quiz-btn');
  const openReadingsBtn = document.getElementById('open-readings-btn');
  const openVideosBtn = document.getElementById('open-videos-btn');

  // Load current settings
  chrome.storage.local.get({ enabled: true, autoClick: true, skipCount: 0 }, function(data) {
    toggle.checked = data.enabled;
    autoClickToggle.checked = data.autoClick;
    skipCountEl.textContent = data.skipCount;
  });

  // Toggle active state
  toggle.addEventListener('change', function() {
    chrome.storage.local.set({ enabled: toggle.checked });
  });

  // Toggle auto-click state
  autoClickToggle.addEventListener('change', function() {
    chrome.storage.local.set({ autoClick: autoClickToggle.checked });
  });

  // Reset count
  resetBtn.addEventListener('click', function() {
    chrome.storage.local.set({ skipCount: 0 }, function() {
      skipCountEl.textContent = '0';
    });
  });

  // Listen for storage changes to update stats in real-time
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.skipCount) {
      skipCountEl.textContent = changes.skipCount.newValue;
    }
  });

  // Search quiz questions
  searchQuizBtn.addEventListener('click', function() {
    const originalText = searchQuizBtn.textContent;
    searchQuizBtn.textContent = 'Searching...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {action: 'extract_questions'}, function(response) {
        searchQuizBtn.textContent = originalText;
        
        if (response && response.questions && response.questions.length > 0) {
          const openedTabIds = [];
          let processedCount = 0;

          response.questions.forEach(q => {
            const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(q);
            chrome.tabs.create({ url: searchUrl, active: false }, function(tab) {
              if (tab && tab.id) {
                openedTabIds.push(tab.id);
              }

              processedCount++;
              if (processedCount === response.questions.length && openedTabIds.length > 0) {
                chrome.runtime.sendMessage({
                  action: 'group_tabs',
                  tabIds: openedTabIds,
                  title: 'Quiz Search',
                  color: 'blue'
                });
              }
            });
          });
        } else {
          searchQuizBtn.textContent = 'No questions found!';
          setTimeout(() => { searchQuizBtn.textContent = originalText; }, 2000);
        }
      });
    });
  });

  // Open all Readings
  openReadingsBtn.addEventListener('click', function() {
    const originalText = openReadingsBtn.textContent;
    openReadingsBtn.textContent = 'Opening...';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {action: 'extract_reading_links'}, function(response) {
        openReadingsBtn.textContent = originalText;
        if (response && response.links && response.links.length > 0) {
          response.links.forEach(link => {
            // Append parameter
            const url = new URL(link);
            url.searchParams.set('autoCloseReading', '1');
            chrome.tabs.create({ url: url.toString(), active: false });
          });
        } else {
          openReadingsBtn.textContent = 'No readings found!';
          setTimeout(() => { openReadingsBtn.textContent = originalText; }, 2000);
        }
      });
    });
  });

  // Open all Videos
  openVideosBtn.addEventListener('click', function() {
    const originalText = openVideosBtn.textContent;
    openVideosBtn.textContent = 'Opening...';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) return;
      
      chrome.tabs.sendMessage(tabs[0].id, {action: 'extract_video_links'}, function(response) {
        openReadingsBtn.textContent = originalText;
        if (response && response.links && response.links.length > 0) {
          const openedTabIds = [];
          let processedCount = 0;
          
          response.links.forEach(link => {
            const url = new URL(link);
            url.searchParams.set('autoWatchVideo', '1');
            chrome.tabs.create({ url: url.toString(), active: false }, function(tab) {
              if (tab && tab.id) {
                openedTabIds.push(tab.id);
                chrome.tabs.update(tab.id, { autoDiscardable: false, muted: true });
              }
              processedCount++;
              
              // Group them once all are opened
              if (processedCount === response.links.length && openedTabIds.length > 0) {
                chrome.runtime.sendMessage({
                  action: 'group_tabs',
                  tabIds: openedTabIds,
                  title: 'Coursera Videos',
                  color: 'purple'
                });
              }
            });
          });
          openVideosBtn.textContent = originalText;
        } else {
          openVideosBtn.textContent = 'No videos found!';
          setTimeout(() => { openVideosBtn.textContent = originalText; }, 2000);
        }
      });
    });
  });
});
