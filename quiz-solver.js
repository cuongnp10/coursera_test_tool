/**
 * Coursera Quiz AI Solver
 * Scans multiple-choice and multi-select questions, queries Gemini 3.8 Flash with structured JSON schema,
 * and automatically selects & visually badges correct answers on the page.
 */

(function() {
  window.CourseraAssistant = window.CourseraAssistant || {};

  function getHelper(name) {
    return window.CourseraAssistant[name];
  }

  function extractQuizQuestionsForAi() {
    console.log('[Coursera Quiz AI] === Bắt đầu quét câu hỏi Quiz ===');
    const items = [];
    const seenQuestionKeys = new Set();

    const normalizeText = getHelper('normalizeText');
    const getInputLabelText = getHelper('getInputLabelText');
    const getQuestionKey = getHelper('getQuestionKey');
    const hasAnswerChoices = getHelper('hasAnswerChoices');
    const extractQuestionText = getHelper('extractQuestionText');
    const isOptionTextNode = getHelper('isOptionTextNode');
    const findNearbyQuestionBlock = getHelper('findNearbyQuestionBlock');
    const isLikelyQuestionText = getHelper('isLikelyQuestionText');
    const extractQuestionTextFromAnswerGroup = getHelper('extractQuestionTextFromAnswerGroup');

    function processQuestionBlock(questionText, questionBlock) {
      if (!questionText || questionText.length < 5) return;
      // Filter out Coursera anti-AI prompt injection traps
      if (questionText.includes('uphold academic integrity') || questionText.includes('I understand')) return;

      const questionKey = getQuestionKey(questionText);
      if (!questionKey || seenQuestionKeys.has(questionKey)) return;

      // Extract options with input elements
      const options = [];
      const seenOptionTexts = new Set();

      const inputs = Array.from(questionBlock.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
      inputs.forEach(input => {
        const text = getInputLabelText(input, questionBlock);
        if (text && text.length > 0 && !seenOptionTexts.has(text.toLowerCase())) {
          seenOptionTexts.add(text.toLowerCase());
          const containerEl = input.closest('.rc-Option') || input.closest('.cds-checkboxAndRadio-label') || input.closest('label') || input.parentElement;
          options.push({
            text: text,
            containerEl: containerEl,
            inputEl: input
          });
        }
      });

      // Fallback if inputs not found directly
      if (options.length === 0) {
        const optionEls = Array.from(questionBlock.querySelectorAll('.rc-Option, [role="radio"], [role="checkbox"], .cds-checkboxAndRadio-label'));
        optionEls.forEach(el => {
          const input = el.querySelector('input[type="radio"], input[type="checkbox"]') || (el.matches('input') ? el : null);
          const txt = normalizeText(el.innerText || el.textContent);
          if (txt && txt.length > 0 && !seenOptionTexts.has(txt.toLowerCase())) {
            seenOptionTexts.add(txt.toLowerCase());
            options.push({
              text: txt,
              containerEl: el.closest('.rc-Option') || el,
              inputEl: input
            });
          }
        });
      }

      if (options.length > 0) {
        seenQuestionKeys.add(questionKey);
        items.push({
          index: items.length + 1,
          containerEl: questionBlock,
          questionText: questionText,
          options: options
        });
        console.log(`[Coursera Quiz AI] ✅ Câu #${items.length}: "${questionText.substring(0, 60)}..." [${options.length} lựa chọn]`, options.map(o => o.text));
      }
    }

    // LAYER 1: Standard part-Submission Question parts
    const questionParts = Array.from(document.querySelectorAll('[data-testid^="part-Submission_"]'))
      .filter(hasAnswerChoices);
    console.log(`[Coursera Quiz AI] [Tầng 1] [data-testid^="part-Submission_"]: Tìm thấy ${questionParts.length} blocks.`);

    let containers = questionParts.length > 0 ? questionParts : Array.from(document.querySelectorAll('.rc-FormPartsQuestion')).filter(hasAnswerChoices);
    if (questionParts.length === 0) {
      console.log(`[Coursera Quiz AI] [Tầng 2] .rc-FormPartsQuestion: Tìm thấy ${containers.length} blocks.`);
    }

    if (containers.length === 0) {
      containers = Array.from(document.querySelectorAll('form, fieldset, [role="radiogroup"], [role="group"]'))
        .filter(hasAnswerChoices);
      console.log(`[Coursera Quiz AI] [Tầng 3] form/fieldset/group: Tìm thấy ${containers.length} blocks.`);
    }

    if (containers.length > 0) {
      containers.forEach(container => {
        let qText = '';
        const promptEl = container.querySelector('[id^="prompt-"]') || container.querySelector('[data-testid="legend"]');
        if (promptEl) {
          const clone = promptEl.cloneNode(true);
          clone.querySelectorAll('[data-ai-instructions], [data-testid="content-integrity-instructions"], [data-testid="acknowledgment-checkpoint"], [data-testid="part-points"], [data-testid="visually-hidden"], script, style').forEach(e => e.remove());
          qText = normalizeText(clone.textContent || '');
        }
        if (!qText || qText.length < 5) {
          qText = extractQuestionText(container);
        }
        processQuestionBlock(qText, container);
      });
    }

    // LAYER 4: Scanning headings, legends, .rc-CML and finding nearby question blocks
    if (items.length === 0) {
      console.log('[Coursera Quiz AI] [Tầng 4 Fallback] Đang quét toàn bộ .rc-CML / legend / h3 để dò question blocks...');
      const nodes = document.querySelectorAll('.rc-CML, legend, h3, [role="heading"]');
      nodes.forEach(node => {
        if (isOptionTextNode(node)) return;
        let text = normalizeText(node.innerText || node.textContent);
        const questionBlock = findNearbyQuestionBlock(node);
        if (questionBlock && hasAnswerChoices(questionBlock) && isLikelyQuestionText(text, questionBlock)) {
          processQuestionBlock(text, questionBlock);
        }
      });
    }

    // LAYER 5: Scanning answer groups
    if (items.length === 0) {
      console.log('[Coursera Quiz AI] [Tầng 5 Fallback] Đang quét các answer groups...');
      const answerGroups = Array.from(document.querySelectorAll('[role="group"], [role="radiogroup"], fieldset')).filter(hasAnswerChoices);
      answerGroups.forEach(group => {
        const questionText = extractQuestionTextFromAnswerGroup(group);
        if (questionText) {
          processQuestionBlock(questionText, group);
        }
      });
    }

    console.log(`[Coursera Quiz AI] === Hoàn tất quét: Tổng cộng phát hiện ${items.length} câu hỏi hợp lệ ===`);
    return items;
  }

  async function executeSolveQuizWithAi(statusUpdateFn) {
    const notify = (msg) => {
      if (typeof statusUpdateFn === 'function') statusUpdateFn(msg);
    };

    console.log('[Coursera Quiz AI] Bắt đầu tiến trình Giải Quiz AI...');
    notify('🔍 Đang quét câu hỏi & các lựa chọn trên trang...');
    let questions = extractQuizQuestionsForAi();

    if (questions.length === 0) {
      console.warn('[Coursera Quiz AI] Chưa thấy câu hỏi lần 1, đợi 700ms để DOM render...');
      await new Promise(r => setTimeout(r, 700));
      questions = extractQuizQuestionsForAi();
    }

    if (questions.length === 0) {
      console.error('[Coursera Quiz AI] Thất bại: Không tìm thấy bất kỳ câu hỏi nào trên trang sau 2 lần quét!');
      throw new Error('Không tìm thấy câu hỏi trắc nghiệm (Quiz) nào trên trang! Hãy mở Console (F12) để xem log chi tiết.');
    }

    notify(`🧠 Đang gửi ${questions.length} câu hỏi sang Gemini 3.8 Flash...`);
    console.log(`[Coursera Quiz AI] Đang chuẩn bị prompt cho ${questions.length} câu hỏi...`);

    const promptQuestionsText = questions.map(q => {
      const optsText = q.options.map(o => `  - ${o.text}`).join('\n');
      return `Question ${q.index}: ${q.questionText}\nOptions:\n${optsText}`;
    }).join('\n\n');

    const systemInstruction = `You are an elite academic professor and expert exam solver.
Analyze each multiple-choice or multi-select quiz question carefully.
Select the strictly correct choice(s) for each question from the given options list.
Output strictly a valid JSON array of objects with this schema:
[
  {
    "index": 1,
    "answers": ["Exact text of correct option"]
  }
]
Do not output any markdown code fences, headers, or explanations outside the JSON array. Output ONLY the raw JSON array.`;

    const prompt = `Solve all the following quiz questions. For each question, choose the strictly correct answer(s) from its options list:

${promptQuestionsText}

Return strictly a valid JSON array: [{"index": number, "answers": ["exact option text", ...]}]`;

    console.log('[Coursera Quiz AI] Gửi request tới AI Provider...');
    const rawResponse = await generateAiCompletion(prompt, systemInstruction, { maxTokens: 2500, temperature: 0.1 });
    console.log('[Coursera Quiz AI] Nhận phản hồi thô từ AI:', rawResponse);

    let parsedAnswers = [];
    try {
      let jsonStr = rawResponse.trim();
      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (match) {
        jsonStr = match[0];
      }
      parsedAnswers = JSON.parse(jsonStr);
      console.log('[Coursera Quiz AI] JSON đã parse thành công:', parsedAnswers);
    } catch (e) {
      console.error('[Coursera Quiz AI] Lỗi parse JSON:', rawResponse, e);
      throw new Error('AI trả về phản hồi không đúng định dạng JSON!');
    }

    if (!Array.isArray(parsedAnswers) || parsedAnswers.length === 0) {
      throw new Error('AI không tìm thấy đáp án hợp lệ!');
    }

    let solvedCount = 0;
    let firstSolvedEl = null;

    parsedAnswers.forEach(item => {
      const qIndex = item.index;
      const suggestedAnswers = Array.isArray(item.answers) ? item.answers : [item.answers];
      const q = questions.find(qObj => qObj.index === qIndex);
      if (!q) {
        console.warn(`[Coursera Quiz AI] Không tìm thấy câu hỏi tương ứng index ${qIndex}`);
        return;
      }

      suggestedAnswers.forEach(ansText => {
        if (!ansText) return;
        const cleanAns = ansText.trim().toLowerCase();

        // 1. Exact match
        let matchedOpt = q.options.find(opt => opt.text.trim().toLowerCase() === cleanAns);

        // 2. Substring match fallback
        if (!matchedOpt) {
          matchedOpt = q.options.find(opt => {
            const optClean = opt.text.trim().toLowerCase();
            return optClean.includes(cleanAns) || cleanAns.includes(optClean);
          });
        }

        if (matchedOpt) {
          solvedCount++;
          if (!firstSolvedEl) firstSolvedEl = matchedOpt.containerEl;

          console.log(`[Coursera Quiz AI] Câu #${q.index} -> Chọn đáp án: "${matchedOpt.text}"`);

          // Highlight option with green border & badge
          if (matchedOpt.containerEl) {
            matchedOpt.containerEl.classList.add('coursera-quiz-ai-selected');
          }

          // Auto-check and click
          const input = matchedOpt.inputEl || (matchedOpt.containerEl ? matchedOpt.containerEl.querySelector('input') : null);
          if (input) {
            if (!input.checked) {
              input.click();
              input.checked = true;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else if (matchedOpt.containerEl) {
            matchedOpt.containerEl.click();
          }
        } else {
          console.warn(`[Coursera Quiz AI] Câu #${q.index} -> Không khớp được lựa chọn: "${ansText}" trong danh sách:`, q.options.map(o => o.text));
        }
      });
    });

    if (firstSolvedEl) {
      firstSolvedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    console.log(`[Coursera Quiz AI] Hoàn tất! Đã chọn ${solvedCount} đáp án.`);
    return {
      success: true,
      message: `🎉 Đã giải và tự động tích chọn ${solvedCount} đáp án cho ${questions.length} câu hỏi!`
    };
  }

  // Exports
  window.CourseraAssistant.extractQuizQuestionsForAi = extractQuizQuestionsForAi;
  window.CourseraAssistant.executeSolveQuizWithAi = executeSolveQuizWithAi;
})();
