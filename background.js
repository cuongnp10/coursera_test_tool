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
      (async () => {
        let currentGroupId = null;
        const delayMs = request.delayMs || 1800; // Giãn cách 1.8s mở so le từng tab

        for (let i = 0; i < request.urls.length; i++) {
          const url = request.urls[i];
          const tab = await new Promise(resolve => {
            chrome.tabs.create({ url, active: false }, resolve);
          });

          if (tab && tab.id) {
            if (!currentGroupId) {
              currentGroupId = await new Promise(resolve => {
                chrome.tabs.group({ tabIds: [tab.id] }, resolve);
              });
              chrome.tabGroups.update(currentGroupId, {
                title: request.title || "Coursera Tabs",
                color: request.color || "blue"
              });
            } else {
              chrome.tabs.group({ tabIds: [tab.id], groupId: currentGroupId });
            }

            // Watchdog: Tự động nạp lại nếu tab bị Chrome đóng băng hoặc treo loading sau 15s
            const tabId = tab.id;
            setTimeout(() => {
              chrome.tabs.get(tabId, (freshTab) => {
                if (chrome.runtime.lastError || !freshTab) return;
                if (freshTab.status === 'loading' || freshTab.discarded) {
                  console.log(`[Watchdog] Tab ${tabId} bị treo/chưa nạp, đang tự nạp lại...`);
                  chrome.tabs.reload(tabId);
                }
              });
            }, 15000);
          }

          if (i < request.urls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      })();
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
