// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'close_tab') {
    if (sender.tab && sender.tab.id) {
      chrome.tabs.remove(sender.tab.id);
    }
  } else if (request.action === 'group_tabs') {
    if (request.tabIds && request.tabIds.length > 0) {
      chrome.tabs.group({ tabIds: request.tabIds }, function(groupId) {
        chrome.tabGroups.update(groupId, {
          title: request.title || "Coursera Tabs",
          color: request.color || "blue"
        });
      });
    }
  } else if (request.action === 'open_and_group_tabs') {
    if (request.urls && request.urls.length > 0) {
      const openedTabIds = [];
      let processedCount = 0;
      request.urls.forEach(url => {
        chrome.tabs.create({ url: url, active: false }, function(tab) {
          if (tab && tab.id) openedTabIds.push(tab.id);
          processedCount++;
          if (processedCount === request.urls.length && openedTabIds.length > 0) {
            chrome.tabs.group({ tabIds: openedTabIds }, function(groupId) {
              chrome.tabGroups.update(groupId, {
                title: request.title || "Coursera Tabs",
                color: request.color || "blue"
              });
            });
          }
        });
      });
    }
  } else if (request.action === 'search_questions') {
    if (request.questions && request.questions.length > 0) {
      const openedTabIds = [];
      let processedCount = 0;
      request.questions.forEach(q => {
        const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(q);
        chrome.tabs.create({ url: searchUrl, active: false }, function(tab) {
          if (tab && tab.id) openedTabIds.push(tab.id);
          processedCount++;
          if (processedCount === request.questions.length && openedTabIds.length > 0) {
            chrome.tabs.group({ tabIds: openedTabIds }, function(groupId) {
              chrome.tabGroups.update(groupId, {
                title: 'Quiz Search',
                color: 'blue'
              });
            });
          }
        });
      });
    }
  }
  return true;
});
