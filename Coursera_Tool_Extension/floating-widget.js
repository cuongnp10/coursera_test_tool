/**
 * Coursera In-Page Floating Widget (Nút Nổi ⚡)
 * Provides convenient floating UI on Coursera pages to trigger AI quiz solving,
 * practice suggestions, and timer bypass actions without needing the popup.
 */

(function() {
  window.CourseraAssistant = window.CourseraAssistant || {};

  function initCourseraFloatingWidget() {
    if (document.getElementById('coursera-floating-widget-root')) return;

    // Inject styles
    const style = document.createElement('style');
    style.id = 'coursera-floating-widget-styles';
    style.textContent = `
      #coursera-floating-widget-root {
        position: fixed;
        bottom: 25px;
        right: 25px;
        z-index: 2147483640;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        user-select: none;
      }
      #coursera-floating-btn {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: linear-gradient(135deg, #793ae4 0%, #301366 100%);
        border: 2px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 8px 24px rgba(121, 58, 228, 0.5), 0 0 12px rgba(250, 175, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      #coursera-floating-btn:hover {
        transform: scale(1.08);
        box-shadow: 0 10px 30px rgba(121, 58, 228, 0.7);
      }
      #coursera-floating-btn:active {
        cursor: grabbing;
        transform: scale(0.95);
      }
      .floating-icon {
        font-size: 24px;
        filter: drop-shadow(0 2px 6px rgba(222, 96, 0, 0.6));
      }
      #coursera-floating-panel {
        position: fixed;
        bottom: 90px;
        right: 25px;
        width: 330px;
        max-height: 85vh;
        overflow-y: auto;
        background: radial-gradient(circle at 10% 20%, #171233 0%, #0c0919 95%);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 20px rgba(121, 58, 228, 0.3);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding: 16px;
        color: #ffffff;
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: opacity 0.25s ease, transform 0.25s ease;
        box-sizing: border-box;
      }
      #coursera-floating-panel.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(12px) scale(0.96);
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .panel-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .panel-title {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
      }
      .panel-close-btn {
        background: transparent;
        border: none;
        color: #a7b4c9;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
      }
      .panel-close-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }
      .panel-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .panel-btn {
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #ffffff;
        transition: all 0.2s ease;
      }
      .panel-btn:hover {
        transform: translateY(-1px);
      }
      .panel-btn:active {
        transform: scale(0.98);
      }
      .btn-suggest {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #9333ea 100%);
        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);
        font-weight: 700;
        padding: 12px 14px;
        color: #ffffff;
      }
      .btn-readings {
        background: linear-gradient(135deg, #0b408b 0%, #136ef0 100%);
      }
      .btn-videos {
        background: linear-gradient(135deg, #a54e0c 0%, #de6000 100%);
      }
      .panel-status-banner {
        font-size: 11px;
        padding: 8px 10px;
        border-radius: 6px;
        background: rgba(121, 58, 228, 0.15);
        border: 1px solid rgba(121, 58, 228, 0.3);
        color: #c4b5fd;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .panel-status-banner.success {
        background: rgba(16, 185, 129, 0.15);
        border-color: rgba(16, 185, 129, 0.3);
        color: #34d399;
      }
      .panel-status-banner.error {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.3);
        color: #f87171;
      }
      .coursera-ai-suggestion-box {
        margin: 16px 0 14px 0;
        padding: 14px 16px;
        background: rgba(19, 14, 41, 0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(168, 85, 247, 0.4);
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45), 0 0 16px rgba(139, 92, 246, 0.2);
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        box-sizing: border-box;
        position: relative;
        z-index: 100;
        transition: all 0.25s ease;
      }
      .coursera-ai-suggestion-box:hover {
        border-color: rgba(168, 85, 247, 0.65);
        box-shadow: 0 10px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(139, 92, 246, 0.3);
      }
      .ai-box-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .ai-box-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ai-box-icon {
        font-size: 16px;
      }
      .ai-box-title {
        font-size: 14px;
        font-weight: 700;
        color: #f3e8ff;
      }
      .ai-token-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 4px;
        background: rgba(168, 85, 247, 0.2);
        border: 1px solid rgba(168, 85, 247, 0.4);
        color: #d8b4fe;
      }
      .ai-box-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ai-btn-close {
        background: transparent;
        color: #94a3b8;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        transition: all 0.15s ease;
      }
      .ai-btn-close:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.15);
      }
      .ai-box-alert {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(16, 185, 129, 0.2);
        border: 1px solid rgba(16, 185, 129, 0.5);
        color: #34d399;
        font-size: 12px;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
      }
      .ai-box-alert.ai-alert-pulse {
        animation: aiBoxPulse 0.3s ease-out;
      }
      @keyframes aiBoxPulse {
        0% { transform: scale(0.97); opacity: 0.6; }
        100% { transform: scale(1); opacity: 1; }
      }
      .ai-box-body {
        margin-bottom: 8px;
      }
      .ai-box-text {
        background: rgba(10, 7, 24, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 12px 14px;
        font-size: 13px;
        line-height: 1.6;
        color: #f1f5f9;
        white-space: pre-wrap;
        user-select: all;
        -webkit-user-select: all;
        cursor: pointer;
        max-height: 380px;
        overflow-y: auto;
        transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
      }
      .ai-box-text:hover {
        border-color: rgba(168, 85, 247, 0.6);
        background: rgba(10, 7, 24, 0.9);
        box-shadow: 0 0 14px rgba(168, 85, 247, 0.2);
      }
      .ai-box-text:active {
        background: rgba(139, 92, 246, 0.15);
      }
      .ai-box-text.loading {
        cursor: wait;
        color: #cbd5e1;
        font-style: italic;
      }
      .ai-box-footer {
        display: flex;
        align-items: center;
      }
      .ai-box-hint {
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.4;
      }
      .coursera-quiz-ai-selected {
        outline: 2px solid #10b981 !important;
        background: rgba(16, 185, 129, 0.14) !important;
        border-radius: 8px !important;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.35) !important;
        position: relative !important;
        transition: all 0.25s ease-in-out !important;
      }
      .coursera-quiz-ai-selected::after {
        content: '✓ AI Chọn';
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 11px;
        font-weight: 700;
        color: #10b981;
        background: rgba(16, 185, 129, 0.2);
        padding: 2px 8px;
        border-radius: 12px;
        border: 1px solid rgba(16, 185, 129, 0.4);
        pointer-events: none;
        z-index: 10;
      }
      .panel-btn.btn-solve-quiz {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      }
      .panel-btn.btn-solve-quiz:hover {
        box-shadow: 0 6px 18px rgba(16, 185, 129, 0.5);
      }
      .panel-footer-links {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        padding-top: 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .panel-footer-links a {
        color: #a78bfa;
        text-decoration: none;
      }
      .panel-footer-links a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);

    // Create Root
    const root = document.createElement('div');
    root.id = 'coursera-floating-widget-root';

    // Create Floating Button
    const btn = document.createElement('div');
    btn.id = 'coursera-floating-btn';
    btn.title = 'Coursera Automation & AI Assistant';
    btn.innerHTML = `<span class="floating-icon">⚡</span>`;

    // Create Floating Panel
    const panel = document.createElement('div');
    panel.id = 'coursera-floating-panel';
    panel.className = 'hidden';
    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title-group">
          <span style="font-size: 18px;">⚡</span>
          <div>
            <div class="panel-title">Coursera Bypass</div>
            <div style="font-size: 10px; color: #a7b4c9;">Tester & AI Assistant</div>
          </div>
        </div>
        <button class="panel-close-btn" id="floating-panel-close-btn" title="Đóng">✕</button>
      </div>

      <div id="floating-panel-status" class="panel-status-banner" style="display: none;"></div>

      <div class="panel-actions">
        <button class="panel-btn btn-suggest" id="floating-suggest-btn">
          <span>💡 Tạo gợi ý AI</span>
        </button>
        <button class="panel-btn btn-solve-quiz" id="floating-solve-quiz-btn">
          <span>🤖 Giải Quiz AI</span>
        </button>
        <button class="panel-btn btn-readings" id="floating-readings-btn">
          <span>📖 Auto-Complete All Readings</span>
        </button>
        <button class="panel-btn btn-videos" id="floating-videos-btn">
          <span>🎥 Auto-Watch All Videos</span>
        </button>
      </div>

      <div class="panel-footer-links">
        <span style="color: #6b7280; font-size: 10px;">Coursera Suite v1.0.2</span>
        <a href="#" id="floating-open-options-link">⚙️ Cài đặt API Key ↗</a>
      </div>
    `;

    root.appendChild(btn);
    root.appendChild(panel);
    document.body.appendChild(root);

    // Dragging Logic
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let dragDistance = 0;

    btn.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragDistance = 0;
      startX = e.clientX;
      startY = e.clientY;
      const rect = root.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      dragDistance = Math.hypot(dx, dy);

      if (dragDistance > 3) {
        root.style.bottom = 'auto';
        root.style.right = 'auto';
        root.style.left = `${initialLeft + dx}px`;
        root.style.top = `${initialTop + dy}px`;

        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        panel.style.left = `${initialLeft + dx - 270}px`;
        panel.style.top = `${initialTop + dy - 340}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Toggle Panel on Click (only if not dragged)
    btn.addEventListener('click', () => {
      if (dragDistance < 4) {
        panel.classList.toggle('hidden');
      }
    });

    // Close Button
    const closeBtn = panel.querySelector('#floating-panel-close-btn');
    closeBtn.addEventListener('click', () => {
      panel.classList.add('hidden');
    });

    // Status Banner in Floating Panel
    const statusBox = panel.querySelector('#floating-panel-status');
    function showFloatingStatus(type, msg) {
      statusBox.className = `panel-status-banner ${type}`;
      statusBox.textContent = msg;
      statusBox.style.display = 'flex';
    }

    // AI Suggestion Button in Floating Panel
    const suggestBtn = panel.querySelector('#floating-suggest-btn');
    suggestBtn.addEventListener('click', async () => {
      const origText = suggestBtn.innerText;
      suggestBtn.disabled = true;
      suggestBtn.innerText = '⏳ Đang quét câu hỏi...';
      showFloatingStatus('', 'Đang quét đề bài & ô nhập liệu...');

      try {
        const generateInPageSuggestions = window.CourseraAssistant.generateInPageSuggestions;
        const res = await generateInPageSuggestions((status) => {
          showFloatingStatus('', status);
          suggestBtn.innerText = status.length > 22 ? status.substring(0, 20) + '...' : status;
        });
        showFloatingStatus('success', res.message || '🎉 Đã tạo gợi ý trên trang!');
        suggestBtn.innerText = '💡 Đã tạo gợi ý!';
      } catch (err) {
        showFloatingStatus('error', '❌ ' + (err.message || 'Lỗi'));
        suggestBtn.innerText = '❌ Thất bại';
      } finally {
        setTimeout(() => {
          suggestBtn.disabled = false;
          suggestBtn.innerText = origText;
        }, 3500);
      }
    });

    // Readings Button
    const readingsBtn = panel.querySelector('#floating-readings-btn');
    readingsBtn.addEventListener('click', () => {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        if (a.innerHTML.includes('>Reading<') || (a.innerText && a.innerText.startsWith('Reading'))) {
          links.push(a.href);
        }
      });
      const unique = [...new Set(links)];
      if (unique.length > 0) {
        const fullUrls = unique.map(link => {
          const url = new URL(link, window.location.origin);
          url.searchParams.set('autoCloseReading', '1');
          return url.toString();
        });
        chrome.runtime.sendMessage({
          action: 'open_and_group_tabs',
          urls: fullUrls,
          title: 'Readings',
          color: 'blue'
        });
        showFloatingStatus('success', `Đang mở so le và gom nhóm ${unique.length} bài đọc...`);
      } else {
        showFloatingStatus('error', 'Không tìm thấy bài đọc nào trên trang!');
      }
    });

    // Videos Button
    const videosBtn = panel.querySelector('#floating-videos-btn');
    videosBtn.addEventListener('click', () => {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        if (a.innerHTML.includes('>Video<') || (a.innerText && a.innerText.startsWith('Video'))) {
          links.push(a.href);
        }
      });
      const unique = [...new Set(links)];
      if (unique.length > 0) {
        const fullUrls = unique.map(link => {
          const url = new URL(link, window.location.origin);
          url.searchParams.set('autoWatchVideo', '1');
          return url.toString();
        });
        chrome.runtime.sendMessage({
          action: 'open_and_group_tabs',
          urls: fullUrls,
          title: 'Videos',
          color: 'orange'
        });
        showFloatingStatus('success', `Đang mở so le và gom nhóm ${unique.length} video...`);
      } else {
        showFloatingStatus('error', 'Không tìm thấy video nào trên trang!');
      }
    });

    // Solve Quiz Button in Floating Panel
    const solveQuizBtn = panel.querySelector('#floating-solve-quiz-btn');
    if (solveQuizBtn) {
      solveQuizBtn.addEventListener('click', async () => {
        const origText = solveQuizBtn.innerText;
        solveQuizBtn.disabled = true;
        solveQuizBtn.innerText = '⏳ Đang quét đề thi...';
        showFloatingStatus('', 'Đang phân tích các câu hỏi Quiz...');

        try {
          const executeSolveQuizWithAi = window.CourseraAssistant.executeSolveQuizWithAi;
          const res = await executeSolveQuizWithAi((status) => {
            showFloatingStatus('', status);
            solveQuizBtn.innerText = status.length > 22 ? status.substring(0, 20) + '...' : status;
          });
          showFloatingStatus('success', res.message || '🎉 Đã giải xong toàn bộ Quiz!');
          solveQuizBtn.innerText = '🤖 Đã tích đáp án!';
        } catch (err) {
          showFloatingStatus('error', '❌ ' + (err.message || 'Lỗi'));
          solveQuizBtn.innerText = '❌ Thất bại';
        } finally {
          setTimeout(() => {
            solveQuizBtn.disabled = false;
            solveQuizBtn.innerText = origText;
          }, 3500);
        }
      });
    }

    // Options Link
    const optLink = panel.querySelector('#floating-open-options-link');
    optLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    });
  }

  // Exports
  window.CourseraAssistant.initCourseraFloatingWidget = initCourseraFloatingWidget;
})();
