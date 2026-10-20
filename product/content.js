(function() {
  let settings = {
    enabled: true,
    autoClick: true
  };

  // Load status from storage
  chrome.storage.local.get({ enabled: true, autoClick: true }, function(result) {
    settings = result;
  });

  chrome.storage.onChanged.addListener(function(changes, namespace) {
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

  setInterval(() => {
    unlockAllButtons();
    handleAutoWatchVideo();
  }, 1000);

  const observer = new MutationObserver(() => {
    unlockAllButtons();
    handleAutoWatchVideo();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'class'] });

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function getDirectText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('input, label, [role="radio"], [role="checkbox"], .rc-Option, .rc-Option__text').forEach(node => {
      node.remove();
    });
    return normalizeText(clone.innerText || clone.textContent);
  }

  function getInputLabelText(input, container) {
    const labels = [];

    if (input.id) {
      container.querySelectorAll(`label[for="${CSS.escape(input.id)}"]`).forEach(label => {
        labels.push(normalizeText(label.innerText || label.textContent));
      });
    }

    const wrappingLabel = input.closest('label');
    if (wrappingLabel && container.contains(wrappingLabel)) {
      labels.push(normalizeText(wrappingLabel.innerText || wrappingLabel.textContent));
    }

    const optionWrapper = input.closest('.rc-Option, [role="radio"], [role="checkbox"], li, div');
    if (optionWrapper && container.contains(optionWrapper)) {
      const optionText = optionWrapper.querySelector('.rc-Option__text, .rc-CML, label');
      labels.push(normalizeText((optionText || optionWrapper).innerText || (optionText || optionWrapper).textContent));
    }

    return labels.find(text => text && text.length > 0) || '';
  }

  function extractAnswerChoices(container, questionText) {
    const choices = [];
    const seen = new Set();

    function addChoice(text) {
      const normalized = normalizeText(text);
      if (!normalized || normalized === questionText || seen.has(normalized)) return;
      seen.add(normalized);
      choices.push(normalized);
    }

    container.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
      addChoice(getInputLabelText(input, container));
    });

    if (choices.length === 0) {
      container.querySelectorAll('.rc-Option__text, [role="radio"], [role="checkbox"]').forEach(option => {
        addChoice(option.innerText || option.textContent);
      });
    }

    return choices;
  }

  function extractQuestionText(container) {
    const questionNode = container.querySelector('.rc-QuestionText, legend, h3, [role="heading"], .rc-CML');
    if (!questionNode) return getDirectText(container);

    const directQuestionText = getDirectText(questionNode);
    return directQuestionText || normalizeText(questionNode.innerText || questionNode.textContent);
  }

  function buildSearchQuery(questionText, choices) {
    const answerText = choices.length > 0 ? ` ${choices.join(', ')}` : '';
    return `${questionText}${answerText} Đáp án nào là đúng.`;
  }

  function getQuestionKey(questionText) {
    return normalizeText(questionText)
      .toLowerCase()
      .replace(/^\d+\.\s*/, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }

  function textLooksLikeOptionList(text) {
    return !text || text.length < 15 || /^(true|false)$/i.test(text);
  }

  function findQuestionTextBeforeAnswerGroup(group) {
    const candidates = [];
    let current = group;

    for (let depth = 0; current && depth < 8; depth++) {
      let sibling = current.previousElementSibling;
      for (let siblingDepth = 0; sibling && siblingDepth < 5; siblingDepth++) {
        const text = normalizeText(sibling.innerText || sibling.textContent);
        if (!textLooksLikeOptionList(text)) {
          candidates.push(text);
        }
        sibling = sibling.previousElementSibling;
      }
      current = current.parentElement;
    }

    return candidates.find(text => text.length >= 15) || '';
  }

  function extractQuestionTextFromAnswerGroup(group) {
    const labelledBy = group.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelNode = document.getElementById(labelledBy);
      const labelText = labelNode ? normalizeText(labelNode.innerText || labelNode.textContent) : '';
      if (!textLooksLikeOptionList(labelText)) return labelText;
    }

    const nearbyText = findQuestionTextBeforeAnswerGroup(group);
    if (nearbyText) return nearbyText;

    const parentText = getDirectText(group.parentElement || group);
    return textLooksLikeOptionList(parentText) ? '' : parentText;
  }

  function hasAnswerChoices(container) {
    return Boolean(
      container &&
      container.querySelector &&
      container.querySelector('input[type="radio"], input[type="checkbox"], .rc-Option__text, [role="radio"], [role="checkbox"]')
    );
  }

  function isOptionTextNode(node) {
    return Boolean(node.closest && node.closest('.rc-Option, label, [role="radio"], [role="checkbox"]'));
  }

  function isLikelyQuestionText(text, questionBlock) {
    if (!text || text.length < 15) return false;
    if (text.endsWith('?')) return true;
    if (/_{2,}|_{1,}\s*or|blank|choose|select|which|what|where|when|who|why|how/i.test(text)) return true;
    if (hasAnswerChoices(questionBlock) && text.split(/\s+/).length >= 6) return true;
    return false;
  }

  function findNearbyQuestionBlock(node) {
    let current = node;
    for (let depth = 0; current && depth < 8; depth++) {
      if (hasAnswerChoices(current)) {
        return current;
      }

      let sibling = current.nextElementSibling;
      for (let siblingDepth = 0; sibling && siblingDepth < 4; siblingDepth++) {
        if (hasAnswerChoices(sibling)) {
          return sibling;
        }
        sibling = sibling.nextElementSibling;
      }

      current = current.parentElement;
    }
    return node.closest('fieldset, form, .rc-FormPartsQuestion, [role="group"]') || node.parentElement;
  }

  function collectQuizQuestions() {
    const questions = [];
    const seenQueries = new Set();
    const seenQuestionKeys = new Set();

    function addQuestion(questionText, answerChoices, questionBlock) {
      if (!isLikelyQuestionText(questionText, questionBlock)) return;

      const questionKey = getQuestionKey(questionText);
      if (!questionKey || seenQuestionKeys.has(questionKey)) return;

      const query = buildSearchQuery(questionText, answerChoices || []);
      if (!seenQueries.has(query)) {
        seenQuestionKeys.add(questionKey);
        seenQueries.add(query);
        questions.push(query);
      }
    }

    const questionParts = Array.from(document.querySelectorAll('[data-testid^="part-Submission_"][data-testid$="Question"]'))
      .filter(hasAnswerChoices);

    let containers = questionParts.length > 0 ? questionParts : Array.from(document.querySelectorAll('.rc-FormPartsQuestion'));

    if (containers.length === 0) {
      containers = Array.from(document.querySelectorAll('form, fieldset, [role="radiogroup"], [role="group"]'))
        .filter(container => container.querySelector('input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"]'));
    }
    
    if (containers.length > 0) {
      containers.forEach(container => {
        const questionText = extractQuestionText(container);
        const answerChoices = extractAnswerChoices(container, questionText);
        addQuestion(questionText, answerChoices, container);
      });
    }

    if (questions.length === 0) {
      const nodes = document.querySelectorAll('.rc-CML, legend, h3, [role="heading"]');
      nodes.forEach(node => {
        if (isOptionTextNode(node)) return;

        let text = normalizeText(node.innerText || node.textContent);
        const questionBlock = findNearbyQuestionBlock(node);
        if (isLikelyQuestionText(text, questionBlock)) {
          const answerChoices = questionBlock ? extractAnswerChoices(questionBlock, text) : [];
          addQuestion(text, answerChoices, questionBlock);
        }
      });
    }

    const answerGroups = questionParts.length > 0
      ? []
      : Array.from(document.querySelectorAll('[role="group"], [role="radiogroup"], fieldset')).filter(hasAnswerChoices);

    answerGroups.forEach(group => {
      const questionText = extractQuestionTextFromAnswerGroup(group);
      const answerChoices = extractAnswerChoices(group, questionText);
      if (answerChoices.length > 0) {
        addQuestion(questionText, answerChoices, group);
      }
    });

    return questions;
  }

  // Message listeners for extractors
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'extract_questions') {
      sendResponse({ questions: collectQuizQuestions() });
    } else if (request.action === 'extract_reading_links') {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        // The user's tag: <div class="css-1rhvk9j">Reading...</div>
        if (a.innerHTML.includes('>Reading<') || (a.innerText && a.innerText.startsWith('Reading'))) {
          links.push(a.href);
        }
      });
      // Deduplicate
      const uniqueLinks = [...new Set(links)];
      sendResponse({ links: uniqueLinks });
    } else if (request.action === 'extract_video_links') {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        // The user's tag: <div class="css-1rhvk9j">Video...</div>
        if (a.innerHTML.includes('>Video<') || (a.innerText && a.innerText.startsWith('Video'))) {
          links.push(a.href);
        }
      });
      // Deduplicate
      const uniqueLinks = [...new Set(links)];
      sendResponse({ links: uniqueLinks });
    } else if (request.action === 'auto_fill_practice') {
      // Execute practice autofill
      executeAutoFillPractice((status) => {
        console.log('[Coursera AI]', status);
      }).then(res => {
        sendResponse(res);
      }).catch(err => {
        sendResponse({ success: false, message: err.message || 'Lỗi không xác định!' });
      });
      return true; // async sendResponse
    }
    return true; 
  });

  // ==========================================
  // PRACTICE AUTO-FILL IMPLEMENTATION
  // ==========================================
  function extractPracticeData() {
    let title = '';
    const titleEl = document.querySelector('h1, [data-testid="header-left"] h1, .cds-FullscreenDialogHeader-slot2 h1');
    if (titleEl) title = titleEl.innerText.trim();

    // Context / Background
    let context = '';
    const contextNodes = document.querySelectorAll('[data-testid="text-block-form-part"], [id*="accordion-panel"], .rc-CML');
    contextNodes.forEach(node => {
      const txt = node.innerText.trim();
      if (txt && (txt.includes('Context') || txt.includes('Instructions') || txt.includes('projects don’t fail') || txt.includes('Activity'))) {
        context += txt + '\n\n';
      }
    });

    // Prompt & Questions
    let questions = '';
    const promptNodes = document.querySelectorAll('[data-testid="part-Submission_RichTextQuestion"], [id^="prompt-submissionResponseId"], [data-testid="legend"]');
    if (promptNodes.length > 0) {
      promptNodes.forEach(p => {
        questions += p.innerText.trim() + '\n\n';
      });
    }

    // Editor target
    const editor = document.querySelector('[data-slate-editor="true"][contenteditable="true"], [role="textbox"][contenteditable="true"], div.slate-editor [contenteditable="true"], div[contenteditable="true"], textarea');

    return { title, context: context.trim(), questions: questions.trim(), editor };
  }

  function setSlateEditorContent(editor, text) {
    editor.focus();

    // Try Selection + execCommand (Standard way Slate captures input)
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);

      const inserted = document.execCommand('insertText', false, text);
      if (!inserted) throw new Error('execCommand returned false');
    } catch (err) {
      // Fallback: ClipboardEvent simulate paste
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const pasteEvt = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
        editor.dispatchEvent(pasteEvt);
      } catch (pasteErr) {
        // Direct DOM update fallback
        editor.innerText = text;
      }
    }

    // Trigger synthetic React events
    ['input', 'change'].forEach(type => {
      editor.dispatchEvent(new Event(type, { bubbles: true }));
    });
  }

  function tickHonorCodeAgreement() {
    const checkbox = document.querySelector('#agreement-checkbox-base, [data-testid="agreement-checkbox"] input, input[type="checkbox"][id*="agreement"], input[type="checkbox"][required]');
    if (checkbox) {
      if (!checkbox.checked) {
        checkbox.click();
        if (!checkbox.checked) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          checkbox.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      return true;
    }
    return false;
  }

  function triggerSubmitAssignment() {
    const submitBtn = document.querySelector('[data-testid="submit-button"], button[aria-label="Submit"]');
    if (submitBtn) {
      if (submitBtn.hasAttribute('disabled')) {
        submitBtn.removeAttribute('disabled');
      }
      if (submitBtn.disabled) {
        submitBtn.disabled = false;
      }
      submitBtn.classList.remove('cds-button-disabled');
      submitBtn.click();
      return true;
    }
    return false;
  }

  async function executeAutoFillPractice(statusUpdateFn) {
    const notify = (msg) => {
      if (typeof statusUpdateFn === 'function') statusUpdateFn(msg);
    };

    notify('🔍 Đang kiểm tra cấu trúc bài tập...');
    const data = extractPracticeData();

    if (!data.editor) {
      throw new Error('Không tìm thấy khung soạn thảo bài làm (Slate/Text Editor) trên trang này!');
    }

    if (!data.questions && !data.title) {
      throw new Error('Không tìm thấy nội dung câu hỏi/yêu cầu bài tập!');
    }

    notify('🧠 Đang gửi yêu cầu tới AI để giải bài...');
    const prompt = `Course / Assignment Title: ${data.title || 'Practice Assignment'}

Activity Context & Background:
${data.context || 'N/A'}

Assignment Prompt & Detailed Requirements:
${data.questions || 'Answer all questions thoroughly and provide comprehensive recommendations.'}

Instructions:
1. Write a complete, comprehensive, high-scoring, and well-structured report in 100% professional academic English.
2. Address each required section thoroughly with clear headings, detailed analysis, and concrete evidence bullets.
3. Do not include any conversational preamble (such as "Here is your submission" or "Sure, I can help").
4. Output only the ready-to-submit assignment response.`;

    const systemInstruction = 'You are an elite academic project manager and subject-matter expert. You write comprehensive, high-scoring, rigorous assignment submissions in professional English with detailed analysis, clear section headings, and evidence bullets.';

    const answer = await generateAiCompletion(prompt, systemInstruction);

    if (!answer || answer.length < 20) {
      throw new Error('AI không tạo được nội dung trả lời hợp lệ.');
    }

    notify('✍️ Đang điền câu trả lời vào bài tập...');
    setSlateEditorContent(data.editor, answer);

    notify('🛡️ Đang tích cam kết Honor Code...');
    await new Promise(r => setTimeout(r, 600));
    tickHonorCodeAgreement();

    notify('🚀 Đang gửi bài tập (Submit)...');
    await new Promise(r => setTimeout(r, 800));
    const submitted = triggerSubmitAssignment();

    if (submitted) {
      notify('🎉 Đã nộp bài tập thành công!');
      return { success: true, message: 'Đã hoàn thành và nộp bài thành công!' };
    } else {
      notify('💾 Đã điền xong bài làm (Hãy bấm Submit để nộp)!');
      return { success: true, message: 'Đã điền nội dung & tick cam kết thành công!' };
    }
  }

  // ==========================================
  // IN-PAGE FLOATING WIDGET (NÚT NỔI ⚡ TRÊN COURSERA)
  // ==========================================
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
      .btn-autofill {
        background: linear-gradient(135deg, #793ae4 0%, #0056d2 100%);
        box-shadow: 0 4px 14px rgba(121, 58, 228, 0.4);
        font-weight: 700;
        padding: 12px 14px;
      }
      .btn-readings {
        background: linear-gradient(135deg, #0b408b 0%, #136ef0 100%);
      }
      .btn-videos {
        background: linear-gradient(135deg, #a54e0c 0%, #de6000 100%);
      }
      .btn-search {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
      .btn-search:hover {
        background: rgba(255, 255, 255, 0.14);
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
        <button class="panel-btn btn-autofill" id="floating-autofill-btn">
          <span>📝 Auto-Fill Practice (AI)</span>
        </button>
        <button class="panel-btn btn-readings" id="floating-readings-btn">
          <span>📖 Auto-Complete Readings</span>
        </button>
        <button class="panel-btn btn-videos" id="floating-videos-btn">
          <span>🎥 Auto-Watch Videos</span>
        </button>
        <button class="panel-btn btn-search" id="floating-search-btn">
          <span>🔍 Search Quiz Questions</span>
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

        // Also move panel
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
    function hideFloatingStatus() {
      statusBox.style.display = 'none';
    }

    // Auto-Fill Button in Floating Panel
    const autofillBtn = panel.querySelector('#floating-autofill-btn');
    autofillBtn.addEventListener('click', async () => {
      const origText = autofillBtn.innerText;
      autofillBtn.disabled = true;
      autofillBtn.innerText = '⏳ Đang phân tích đề...';
      showFloatingStatus('', 'Đang quét đề bài...');

      try {
        await executeAutoFillPractice((status) => {
          showFloatingStatus('', status);
          autofillBtn.innerText = status.length > 22 ? status.substring(0, 20) + '...' : status;
        });
        showFloatingStatus('success', '🎉 Đã hoàn thành và nộp bài!');
        autofillBtn.innerText = '🎉 Đã hoàn thành!';
      } catch (err) {
        showFloatingStatus('error', '❌ ' + (err.message || 'Lỗi'));
        autofillBtn.innerText = '❌ Thất bại';
      } finally {
        setTimeout(() => {
          autofillBtn.disabled = false;
          autofillBtn.innerText = origText;
        }, 4000);
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
        unique.forEach(link => {
          const url = new URL(link);
          url.searchParams.set('autoCloseReading', '1');
          window.open(url.toString(), '_blank');
        });
        showFloatingStatus('success', `Đã mở ${unique.length} bài đọc!`);
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
        unique.forEach(link => {
          const url = new URL(link);
          url.searchParams.set('autoWatchVideo', '1');
          window.open(url.toString(), '_blank');
        });
        showFloatingStatus('success', `Đã mở ${unique.length} video!`);
      } else {
        showFloatingStatus('error', 'Không tìm thấy video nào trên trang!');
      }
    });

    // Search Quiz Button
    const searchBtn = panel.querySelector('#floating-search-btn');
    searchBtn.addEventListener('click', () => {
      showFloatingStatus('', 'Đang quét câu hỏi quiz...');
      const qs = collectQuizQuestions();
      if (qs.length > 0) {
        showFloatingStatus('success', `Đang mở tìm kiếm cho ${qs.length} câu hỏi...`);
        chrome.runtime.sendMessage({ action: 'search_questions', questions: qs });
      } else {
        showFloatingStatus('error', 'Không tìm thấy câu hỏi quiz nào trên trang!');
      }
    });

    // Options Link
    const optLink = panel.querySelector('#floating-open-options-link');
    optLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    });
  }

  // Initialize floating widget after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCourseraFloatingWidget);
  } else {
    initCourseraFloatingWidget();
  }

  console.log('Coursera Timer Bypass & AI Assistant initialized.');
})();
