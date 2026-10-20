/**
 * Coursera Timer Bypass & AI Assistant - Content Script Entry Point
 * Coordinates submodules: Video/Timer Bypass, Quiz Extractor & Solver, Practice Helper, and Floating Widget.
 */

(function() {
  const Assistant = window.CourseraAssistant || {};

  // 1. Initialize Video & Timer Bypass
  if (typeof Assistant.initVideoTimerBypass === 'function') {
    Assistant.initVideoTimerBypass();
  }

  // 2. Initialize Floating Widget
  if (typeof Assistant.initCourseraFloatingWidget === 'function') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', Assistant.initCourseraFloatingWidget);
    } else {
      Assistant.initCourseraFloatingWidget();
    }
  }

  // 3. Message listeners for Chrome runtime messages (Popup / Background)
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'extract_questions') {
      const collectQuizQuestions = Assistant.collectQuizQuestions || (() => []);
      sendResponse({ questions: collectQuizQuestions() });
      return true;
    }

    if (request.action === 'extract_reading_links') {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        if (a.innerHTML.includes('>Reading<') || (a.innerText && a.innerText.startsWith('Reading'))) {
          links.push(a.href);
        }
      });
      sendResponse({ links: [...new Set(links)] });
      return true;
    }

    if (request.action === 'extract_video_links') {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        if (a.innerHTML.includes('>Video<') || (a.innerText && a.innerText.startsWith('Video'))) {
          links.push(a.href);
        }
      });
      sendResponse({ links: [...new Set(links)] });
      return true;
    }

    if (request.action === 'solve_quiz_ai') {
      const executeSolveQuizWithAi = Assistant.executeSolveQuizWithAi;
      if (typeof executeSolveQuizWithAi !== 'function') {
        sendResponse({ success: false, message: 'Module Quiz AI chưa sẵn sàng!' });
        return true;
      }

      executeSolveQuizWithAi((status) => {
        console.log('[Coursera Quiz AI]', status);
      }).then(res => {
        sendResponse(res);
      }).catch(err => {
        sendResponse({ success: false, message: err.message || 'Lỗi không xác định!' });
      });
      return true; // async sendResponse
    }

    if (request.action === 'generate_ai_suggestions' || request.action === 'auto_fill_practice') {
      const generateInPageSuggestions = Assistant.generateInPageSuggestions;
      if (typeof generateInPageSuggestions !== 'function') {
        sendResponse({ success: false, message: 'Module Gợi ý AI chưa sẵn sàng!' });
        return true;
      }

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

  console.log('⚡ Coursera Timer Bypass & AI Assistant ready (Modular architecture).');
})();
