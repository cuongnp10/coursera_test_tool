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

  // Message listeners for extractors
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'extract_questions') {
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

      // Coursera graded quizzes usually wrap each real question in a part-Submission_*Question block.
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
        // Fallback for layouts where Coursera renders the question text separately from the inputs.
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
      
      sendResponse({ questions: questions });
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
    }
    return true; 
  });

  console.log('Coursera Timer Bypass initialized.');
})();
