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
  }
  return true;
});
