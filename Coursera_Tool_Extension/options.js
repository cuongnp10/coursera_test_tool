document.addEventListener('DOMContentLoaded', async () => {
  let aiConfig = await getAiConfig();
  let currentViewingProvider = aiConfig.activeProvider || 'gemini';

  // DOM Elements
  const providerTabs = document.querySelectorAll('.provider-tab');
  const currentProviderTitle = document.getElementById('current-provider-title');
  const currentIcon = document.getElementById('current-icon');
  const getKeyLink = document.getElementById('get-key-link');
  const apiKeyInput = document.getElementById('api-key-input');
  const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
  const eyeIcon = document.getElementById('eye-icon');
  const modelSelect = document.getElementById('model-select');
  const baseUrlInput = document.getElementById('base-url-input');
  const testStatusBox = document.getElementById('test-status-box');
  const testStatusIcon = document.getElementById('test-status-icon');
  const testStatusText = document.getElementById('test-status-text');
  const testBtn = document.getElementById('test-btn');
  const testBtnText = document.getElementById('test-btn-text');
  const testSpinner = document.getElementById('test-spinner');
  const saveBtn = document.getElementById('save-btn');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // Indicators
  const indicators = {
    gemini: document.getElementById('gemini-active-indicator'),
    openai: document.getElementById('openai-active-indicator'),
    deepseek: document.getElementById('deepseek-active-indicator')
  };

  function updateActiveBadges() {
    Object.keys(indicators).forEach(p => {
      if (indicators[p]) {
        if (p === aiConfig.activeProvider) {
          indicators[p].classList.remove('hidden');
          indicators[p].textContent = 'Đang kích hoạt';
        } else {
          indicators[p].classList.add('hidden');
        }
      }
    });
  }

  function renderFormForProvider(provider) {
    const meta = PROVIDER_METADATA[provider];
    if (!meta) return;

    currentViewingProvider = provider;

    // Header info
    currentIcon.textContent = meta.icon;
    currentProviderTitle.textContent = `Cấu hình ${meta.name}`;
    getKeyLink.href = meta.getKeyUrl;
    apiKeyInput.placeholder = `Ví dụ: ${meta.placeholder}`;

    // Fill existing data
    const providerData = aiConfig.providers[provider] || {};
    apiKeyInput.value = providerData.apiKey || '';
    baseUrlInput.value = providerData.baseUrl || '';

    // Populate models
    modelSelect.innerHTML = '';
    meta.models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === providerData.model) {
        opt.selected = true;
      }
      modelSelect.appendChild(opt);
    });

    // Reset status box
    hideStatusBox();

    // Update active tab UI
    providerTabs.forEach(tab => {
      if (tab.dataset.provider === provider) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  function showStatusBox(type, message) {
    testStatusBox.className = `status-box ${type}`;
    if (type === 'success') {
      testStatusIcon.textContent = '✅';
    } else if (type === 'error') {
      testStatusIcon.textContent = '⚠️';
    } else {
      testStatusIcon.textContent = '⏳';
    }
    testStatusText.textContent = message;
    testStatusBox.classList.remove('hidden');
  }

  function hideStatusBox() {
    testStatusBox.classList.add('hidden');
  }

  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // Provider Tab Clicking
  providerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Save current input temporarily in local state before switching
      const prevProvider = currentViewingProvider;
      if (aiConfig.providers[prevProvider]) {
        aiConfig.providers[prevProvider].apiKey = apiKeyInput.value.trim();
        aiConfig.providers[prevProvider].model = modelSelect.value;
        aiConfig.providers[prevProvider].baseUrl = baseUrlInput.value.trim();
      }

      renderFormForProvider(tab.dataset.provider);
    });
  });

  // Toggle API Key Visibility
  toggleKeyVisibilityBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      eyeIcon.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      eyeIcon.textContent = '👁️';
    }
  });

  // Test Connection
  testBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const baseUrl = baseUrlInput.value.trim();

    if (!key) {
      showStatusBox('error', 'Vui lòng nhập API Key trước khi kiểm tra!');
      apiKeyInput.focus();
      return;
    }

    testBtn.disabled = true;
    testSpinner.classList.remove('hidden');
    testBtnText.textContent = 'Đang kiểm tra...';
    showStatusBox('loading', `Đang gửi test request tới ${PROVIDER_METADATA[currentViewingProvider].name}...`);

    try {
      const result = await testAiConnection(currentViewingProvider, key, model, baseUrl);
      if (result.success) {
        showStatusBox('success', result.message);
      } else {
        showStatusBox('error', result.message);
      }
    } catch (err) {
      showStatusBox('error', `Lỗi: ${err.message || err}`);
    } finally {
      testBtn.disabled = false;
      testSpinner.classList.add('hidden');
      testBtnText.textContent = '🧪 Kiểm tra kết nối (Test)';
    }
  });

  // Save Config
  saveBtn.addEventListener('click', async () => {
    // Commit current form inputs
    aiConfig.providers[currentViewingProvider] = {
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value,
      baseUrl: baseUrlInput.value.trim()
    };
    aiConfig.activeProvider = currentViewingProvider;

    await saveAiConfig(aiConfig);
    updateActiveBadges();
    showToast(`Đã lưu cấu hình AI (${PROVIDER_METADATA[currentViewingProvider].name})!`);
  });

  // Initial render
  updateActiveBadges();
  renderFormForProvider(currentViewingProvider);
});
