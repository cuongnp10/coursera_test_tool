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
    } else if (request.action === 'generate_ai_suggestions') {
      generateInPageSuggestions((status) => {
        console.log('[Coursera AI Suggestions]', status);
      }).then(res => {
        sendResponse(res);
      }).catch(err => {
        sendResponse({ success: false, message: err.message || 'Lỗi không xác định!' });
      });
      return true; // async sendResponse
    } else if (request.action === 'auto_fill_practice') {
      generateInPageSuggestions((status) => {
        console.log('[Coursera AI Suggestions]', status);
      }).then(res => {
        sendResponse(res);
      }).catch(err => {
        sendResponse({ success: false, message: err.message || 'Lỗi không xác định!' });
      });
      return true; // async sendResponse
    }
    return true; 
  });

  function cleanPlainTextParagraph(rawText) {
    if (!rawText) return '';
    return rawText
      // Remove code fences
      .replace(/```[\s\S]*?```/g, '')
      // Remove markdown headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markers
      .replace(/(\*\*|\*|__|_)(.*?)\1/g, '$2')
      // Remove bullet points and lists
      .replace(/^[\s*+-]+\s+/gm, '')
      .replace(/^\s*\d+[\.\)]\s+/gm, '')
      // Remove remaining markdown syntax characters
      .replace(/[`#*~>]/g, '')
      // Merge multiple lines into a single coherent paragraph
      .replace(/\r?\n+/g, ' ')
      // Collapse multiple spaces
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

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

    // Editor targets (support single or multiple)
    const editors = Array.from(document.querySelectorAll('[data-slate-editor="true"][contenteditable="true"], [role="textbox"][contenteditable="true"], div.slate-editor [contenteditable="true"], div[contenteditable="true"], textarea'));

    return { title, context: context.trim(), questions: questions.trim(), editors, editor: editors[0] };
  }

  // ==========================================
  // IN-PAGE AI SUGGESTION & 1-CLICK COPY/DRAG
  // ==========================================
  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => {
        fallbackCopyText(text);
      });
    }
    fallbackCopyText(text);
  }

  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      console.warn('execCommand copy fallback failed:', e);
    }
    document.body.removeChild(ta);
  }

  function findPageEditors() {
    const candidates = Array.from(document.querySelectorAll(
      '[data-slate-editor="true"][contenteditable="true"], [role="textbox"][contenteditable="true"], div.slate-editor [contenteditable="true"], div[contenteditable="true"], textarea'
    ));

    return candidates.filter(el => {
      if (el.closest('#coursera-floating-widget-root') || el.closest('.coursera-ai-suggestion-box')) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 10;
    });
  }

  function findEditorOuterWrapper(editor) {
    return editor.closest('.rc-CMLEditor') ||
           editor.closest('[data-testid="resizable-root"]') ||
           editor.closest('[data-testid="resizable-container"]') ||
           editor.closest('.slate-editor') ||
           editor.parentElement;
  }

  function extractQuestionForEditor(editor, fallbackQuestions) {
    // 1. Look for enclosing part/container
    const part = editor.closest('[data-testid^="part-Submission_"], [data-testid^="part-"], .rc-FormPartsQuestion, fieldset, form, [role="group"]');
    if (part) {
      const clone = part.cloneNode(true);
      clone.querySelectorAll('[data-slate-editor], textarea, input, button, [contenteditable], .coursera-ai-suggestion-box, script, style').forEach(el => el.remove());
      const text = normalizeText(clone.innerText || clone.textContent);
      if (text && text.length >= 15) {
        return text;
      }
    }

    // 2. Look for preceding headers/prompts
    let cur = editor.parentElement;
    for (let depth = 0; cur && depth < 6; depth++) {
      let prev = cur.previousElementSibling;
      while (prev) {
        if (!prev.closest('.coursera-ai-suggestion-box') && !prev.querySelector('[data-slate-editor]')) {
          const txt = normalizeText(prev.innerText || prev.textContent);
          if (txt && txt.length > 20 && !txt.includes('I understand')) {
            return txt;
          }
        }
        prev = prev.previousElementSibling;
      }
      cur = cur.parentElement;
    }

    return fallbackQuestions || 'Answer all required prompts thoroughly and concisely.';
  }

  async function generateInPageSuggestions(statusUpdateFn) {
    const notify = (msg) => {
      if (typeof statusUpdateFn === 'function') statusUpdateFn(msg);
    };

    notify('🔍 Đang quét câu hỏi & ô nhập liệu...');

    let editors = findPageEditors();
    if (editors.length === 0) {
      await new Promise(r => setTimeout(r, 600));
      editors = findPageEditors();
    }

    if (editors.length === 0) {
      throw new Error('Không tìm thấy khung soạn thảo bài làm (Slate/Text Editor) trên trang!');
    }

    const practiceData = extractPracticeData();
    const title = practiceData.title || document.title || 'Assignment';
    const context = practiceData.context || '';

    notify(`💡 Tìm thấy ${editors.length} ô soạn thảo, đang tạo gợi ý...`);

    const results = [];
    let firstBox = null;

    for (let i = 0; i < editors.length; i++) {
      const editor = editors[i];
      const wrapper = findEditorOuterWrapper(editor);
      const questionText = extractQuestionForEditor(editor, practiceData.questions);

      // Check if an existing box is right before wrapper
      let box = wrapper.previousElementSibling;
      if (!box || !box.classList.contains('coursera-ai-suggestion-box')) {
        box = document.createElement('div');
        box.className = 'coursera-ai-suggestion-box';
        wrapper.parentNode.insertBefore(box, wrapper);
      }
      if (!firstBox) firstBox = box;

      // Render minimalist Glassmorphism Box
      box.innerHTML = `
        <div class="ai-box-header">
          <div class="ai-box-title-group">
            <span class="ai-box-icon">💡</span>
            <span class="ai-box-title">Gợi ý AI ${editors.length > 1 ? `(#${i + 1})` : ''}</span>
            <span class="ai-token-badge">⚡ Ngắn gọn &amp; Trọng tâm</span>
          </div>
          <div class="ai-box-actions">
            <button type="button" class="ai-btn-close" title="Ẩn khung gợi ý">✕</button>
          </div>
        </div>
        <div class="ai-box-alert" style="display: none;">
          <span>✅</span>
          <span><strong>Đã copy!</strong> Hãy ấn Ctrl+V hoặc kéo thả vào ô dưới.</span>
        </div>
        <div class="ai-box-body">
          <div class="ai-box-text loading" title="Click vào vùng chữ để tự động bôi đen &amp; Copy ngay lập tức" tabindex="0">
            <span>⏳ AI đang phân tích đề và tạo câu trả lời tối ưu token...</span>
          </div>
        </div>
        <div class="ai-box-footer">
          <span class="ai-box-hint">🖱️ <em>Click vào vùng chữ là toàn bộ nội dung được <strong>tô đen &amp; chép vào clipboard</strong> để ấn <strong>Ctrl+V</strong> hoặc kéo chuột trực tiếp vào ô soạn thảo bên dưới.</em></span>
        </div>
      `;

      const closeBtn = box.querySelector('.ai-btn-close');
      closeBtn.addEventListener('click', () => {
        box.remove();
      });

      const alertEl = box.querySelector('.ai-box-alert');
      const textEl = box.querySelector('.ai-box-text');

      // Call AI with token optimization prompt
      const systemInstruction = `You are an elite academic tutor.
RULES:
1. Output in 100% professional academic English.
2. Be strictly concise, direct, and laser-focused on the question.
3. Write ONLY ONE single concise paragraph. DO NOT break into multiple paragraphs or lines.
4. DO NOT use any markdown formatting or symbols (NO headers ###, NO asterisks *, NO bullet points -, NO bold **, NO numbering). Output strictly plain text.
5. NO introductory preamble (no greetings, pleasantries, or filler like "Here is...").
6. NO concluding remarks or summaries.
7. Provide a direct, ready-to-paste answer directly addressing the prompt criteria.`;

      const prompt = `Course / Assignment Title: ${title}

Background & Context:
${context ? context.substring(0, 1500) : 'N/A'}

Specific Question / Prompt:
${questionText}

Task: Provide the direct, most concise answer in EXACTLY ONE single paragraph of plain text. Absolutely NO markdown syntax (no ###, no *, no bullets). Only the essential core points and evidence.`;

      try {
        notify(`🧠 Đang tạo gợi ý câu #${i + 1}...`);
        const rawAnswer = await generateAiCompletion(prompt, systemInstruction, { maxTokens: 600, temperature: 0.2 });
        const answer = cleanPlainTextParagraph(rawAnswer);

        textEl.classList.remove('loading');
        textEl.innerText = answer;

        let alertTimer = null;
        textEl.addEventListener('click', () => {
          // 1. Select All inside textEl
          const range = document.createRange();
          range.selectNodeContents(textEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);

          // 2. Auto Copy to Clipboard
          copyTextToClipboard(textEl.innerText);

          // 3. Show Alert Banner
          alertEl.style.display = 'flex';
          alertEl.classList.remove('ai-alert-pulse');
          void alertEl.offsetWidth;
          alertEl.classList.add('ai-alert-pulse');

          if (alertTimer) clearTimeout(alertTimer);
          alertTimer = setTimeout(() => {
            alertEl.style.display = 'none';
          }, 4500);
        });

        results.push({ success: true });
      } catch (err) {
        console.warn('[Coursera AI]', err);
        textEl.classList.remove('loading');
        textEl.innerHTML = `
          <div style="color: #f87171; font-weight: 500;">
            ⚠️ <strong>Chưa thể tạo gợi ý:</strong> ${err.message || 'Lỗi kết nối AI.'}<br>
            <span style="font-size: 11px; color: #a7b4c9;">Vui lòng mở menu Nút nổi ⚡ hoặc Popup Extension > Bấm ⚙️ Cài đặt để nhập API Key!</span>
          </div>
        `;
        results.push({ success: false, error: err.message });
      }
    }

    if (firstBox) {
      firstBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      notify(`🎉 Đã tạo ${successCount} hộp gợi ý AI trên trang!`);
      return { success: true, message: `Đã tạo ${successCount} hộp gợi ý AI trên trang!` };
    } else {
      const firstErr = results[0]?.error || 'Lỗi tạo gợi ý';
      notify(`❌ ${firstErr}`);
      return { success: false, message: firstErr };
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
        max-height: 360px;
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

    // AI Suggestion Button in Floating Panel
    const suggestBtn = panel.querySelector('#floating-suggest-btn');
    suggestBtn.addEventListener('click', async () => {
      const origText = suggestBtn.innerText;
      suggestBtn.disabled = true;
      suggestBtn.innerText = '⏳ Đang quét câu hỏi...';
      showFloatingStatus('', 'Đang quét đề bài & ô nhập liệu...');

      try {
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
