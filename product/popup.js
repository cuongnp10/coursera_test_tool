document.addEventListener('DOMContentLoaded', async function() {
  const toggle = document.getElementById('bypass-toggle');
  const autoClickToggle = document.getElementById('autoclick-toggle');
  const skipCountEl = document.getElementById('skip-count');
  const resetBtn = document.getElementById('reset-stats-btn');
  const searchQuizBtn = document.getElementById('search-quiz-btn');
  const openReadingsBtn = document.getElementById('open-readings-btn');
  const openVideosBtn = document.getElementById('open-videos-btn');
  const autofillPracticeBtn = document.getElementById('autofill-practice-btn');

  // AI Configuration elements
  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const aiSettingsCard = document.getElementById('ai-settings-card');
  const openOptionsLink = document.getElementById('open-options-link');
  const popupProviderSelect = document.getElementById('popup-provider-select');
  const popupProviderIcon = document.getElementById('popup-provider-icon');
  const popupApiKey = document.getElementById('popup-api-key');
  const popupToggleEye = document.getElementById('popup-toggle-eye');
  const popupGetKeyLink = document.getElementById('popup-get-key-link');
  const popupModelSelect = document.getElementById('popup-model-select');
  const popupStatusBadge = document.getElementById('popup-status-badge');
  const popupTestBtn = document.getElementById('popup-test-btn');
  const popupSaveBtn = document.getElementById('popup-save-btn');

  let currentAiConfig = await getAiConfig();
  let currentProvider = currentAiConfig.activeProvider || 'gemini';

  // Toggle AI card visibility
  chrome.storage.local.get({ aiCardCollapsed: false }, function(res) {
    if (res.aiCardCollapsed) {
      aiSettingsCard.classList.add('collapsed');
    }
  });

  settingsToggleBtn.addEventListener('click', function() {
    const isCollapsed = aiSettingsCard.classList.toggle('collapsed');
    chrome.storage.local.set({ aiCardCollapsed: isCollapsed });
  });

  // Open Full Options Page
  openOptionsLink.addEventListener('click', function(e) {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

  function renderPopupAiForm(provider) {
    currentProvider = provider;
    const meta = PROVIDER_METADATA[provider];
    if (!meta) return;

    popupProviderIcon.textContent = meta.icon;
    popupGetKeyLink.href = meta.getKeyUrl;
    popupApiKey.placeholder = `Nhập key (${meta.placeholder})`;

    const providerData = currentAiConfig.providers[provider] || {};
    popupApiKey.value = providerData.apiKey || '';

    // Populate models
    popupModelSelect.innerHTML = '';
    meta.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === providerData.model) {
        opt.selected = true;
      }
      popupModelSelect.appendChild(opt);
    });

    hidePopupStatus();
  }

  function showPopupStatus(type, msg) {
    popupStatusBadge.className = `popup-status-badge ${type}`;
    popupStatusBadge.textContent = msg;
    popupStatusBadge.classList.remove('hidden');
  }

  function hidePopupStatus() {
    popupStatusBadge.classList.add('hidden');
  }

  // Provider change
  popupProviderSelect.value = currentProvider;
  renderPopupAiForm(currentProvider);

  popupProviderSelect.addEventListener('change', function() {
    // Save current field into in-memory config
    if (currentAiConfig.providers[currentProvider]) {
      currentAiConfig.providers[currentProvider].apiKey = popupApiKey.value.trim();
      currentAiConfig.providers[currentProvider].model = popupModelSelect.value;
    }
    renderPopupAiForm(popupProviderSelect.value);
  });

  // Toggle Eye Password
  popupToggleEye.addEventListener('click', function() {
    if (popupApiKey.type === 'password') {
      popupApiKey.type = 'text';
      popupToggleEye.textContent = '🙈';
    } else {
      popupApiKey.type = 'password';
      popupToggleEye.textContent = '👁️';
    }
  });

  // Test Connection
  popupTestBtn.addEventListener('click', async function() {
    const key = popupApiKey.value.trim();
    const model = popupModelSelect.value;
    const providerData = currentAiConfig.providers[currentProvider] || {};
    const baseUrl = providerData.baseUrl || '';

    if (!key) {
      showPopupStatus('error', '⚠️ Vui lòng nhập API Key!');
      popupApiKey.focus();
      return;
    }

    popupTestBtn.disabled = true;
    popupTestBtn.textContent = '⏳...';
    showPopupStatus('loading', 'Đang test kết nối...');

    try {
      const res = await testAiConnection(currentProvider, key, model, baseUrl);
      if (res.success) {
        showPopupStatus('success', '✅ ' + res.message);
      } else {
        showPopupStatus('error', '❌ ' + res.message);
      }
    } catch (err) {
      showPopupStatus('error', '❌ ' + (err.message || err));
    } finally {
      popupTestBtn.disabled = false;
      popupTestBtn.textContent = '🧪 Test';
    }
  });

  // Save Config
  popupSaveBtn.addEventListener('click', async function() {
    currentAiConfig.providers[currentProvider] = {
      apiKey: popupApiKey.value.trim(),
      model: popupModelSelect.value,
      baseUrl: currentAiConfig.providers[currentProvider]?.baseUrl || ''
    };
    currentAiConfig.activeProvider = currentProvider;

    await saveAiConfig(currentAiConfig);
    showPopupStatus('success', '💾 Đã lưu cấu hình thành công!');
    setTimeout(() => {
      hidePopupStatus();
    }, 2500);
  });

  // Load current Coursera settings
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

  // Listen for storage changes
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.skipCount) {
      skipCountEl.textContent = changes.skipCount.newValue;
    }
    if (changes.aiConfig) {
      currentAiConfig = changes.aiConfig.newValue;
      currentProvider = currentAiConfig.activeProvider || 'gemini';
      popupProviderSelect.value = currentProvider;
      renderPopupAiForm(currentProvider);
    }
  // Auto-fill Practice Assignment
  if (autofillPracticeBtn) {
    autofillPracticeBtn.addEventListener('click', function() {
      const originalText = autofillPracticeBtn.textContent;
      autofillPracticeBtn.disabled = true;
      autofillPracticeBtn.textContent = '⏳ Đang phân tích đề...';

      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || tabs.length === 0) {
          autofillPracticeBtn.disabled = false;
          autofillPracticeBtn.textContent = originalText;
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { action: 'auto_fill_practice' }, function(response) {
          autofillPracticeBtn.disabled = false;
          if (response && response.success) {
            autofillPracticeBtn.textContent = '🎉 ' + (response.message || 'Đã nộp bài!');
            setTimeout(() => { autofillPracticeBtn.textContent = originalText; }, 3500);
          } else {
            autofillPracticeBtn.textContent = '❌ ' + (response?.message || 'Không tìm thấy bài tập!');
            setTimeout(() => { autofillPracticeBtn.textContent = originalText; }, 3500);
          }
        });
      });
    });
  }

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
