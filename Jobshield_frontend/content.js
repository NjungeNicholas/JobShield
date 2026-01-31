/**
 * JobShield Content Script - Enhanced with Auto-Detection
 * - Automatically scans and highlights scam phrases on page load
 * - Monitors dynamic content with MutationObserver
 * - Provides tooltips explaining why phrases are suspicious
 * - Handles text selection for quick analysis
 * - Privacy-focused: no data sent except on explicit user action
 */

(function () {
  'use strict';

  // ============================================================================
  // SCAM PATTERN DEFINITIONS
  // ============================================================================

  const SCAM_PATTERNS = {
    payment: {
      phrases: [
        'pay', 'fee', 'deposit', 'KES', 'USD', '$', '€', '£',
        'registration fee', 'application fee', 'processing fee',
        'wire transfer', 'western union', 'moneygram', 'send money',
        'payment required', 'advance payment'
      ],
      color: '#ff4444',
      tooltip: '💰 Payment requests are common in job scams. Legitimate employers never charge fees.'
    },
    urgency: {
      phrases: [
        'urgent', 'immediately', 'act now', 'limited slots', 'today only',
        'expires soon', 'hurry', 'don\'t miss', 'last chance', 'limited time',
        'apply now', 'only', 'spots left'
      ],
      color: '#ff9944',
      tooltip: '⏰ Urgency tactics pressure you into quick decisions. Take your time to verify.'
    },
    unrealistic: {
      phrases: [
        'guaranteed job', 'guaranteed income', 'no experience', 'no interview',
        'earn $', 'easy money', 'work from home', 'get rich', 'financial freedom',
        'no skills required', 'make money fast', '100% guaranteed'
      ],
      color: '#ffcc44',
      tooltip: '🌟 Too-good-to-be-true promises are red flags. Real jobs have real requirements.'
    },
    offPlatform: {
      phrases: [
        'whatsapp', 'telegram', 'text me', 'call me', 'signal',
        'contact me at', 'reach me on', 'message me'
      ],
      color: '#ff6644',
      tooltip: '📱 Moving communication off-platform is suspicious. Stay on official channels.'
    }
  };

  // Merged list for quick scanning
  const ALL_SCAM_PHRASES = [
    ...SCAM_PATTERNS.payment.phrases,
    ...SCAM_PATTERNS.urgency.phrases,
    ...SCAM_PATTERNS.unrealistic.phrases,
    ...SCAM_PATTERNS.offPlatform.phrases
  ];

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  let settings = {
    autoHighlight: true,
    showTooltips: true,
    ignoredPhrases: []
  };

  let scanTimeout = null;
  let observer = null;
  let floatingButton = null;
  let activeTooltip = null;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the content script
   */
  function init() {
    console.log('[JobShield] Content script initialized');

    // Start with default settings (background will sync later)
    if (settings.autoHighlight) {
      // Scan page immediately
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          console.log('[JobShield] DOM ready, starting scan...');
          scanPage();
        });
      } else {
        console.log('[JobShield] Document already loaded, scanning now...');
        scanPage();
      }

      // Setup MutationObserver for dynamic content
      setupMutationObserver();
    }

    // Setup text selection handler (always enabled)
    setupTextSelection();

    // Listen for messages from background/popup
    setupMessageListener();

    // Load settings from background (async, doesn't block scanning)
    loadSettings();
  }

  /**
   * Load settings from chrome.storage
   */
  async function loadSettings() {
    try {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (chrome.runtime.lastError) {
          // Background script might not be ready yet, use defaults
          console.log('[JobShield] Background not ready, using default settings');
          return;
        }

        if (response) {
          const oldAutoHighlight = settings.autoHighlight;
          settings = { ...settings, ...response };

          // If auto-highlight was just enabled, scan now
          if (!oldAutoHighlight && settings.autoHighlight) {
            scanPage();
            if (!observer) setupMutationObserver();
          }
          // If disabled, remove highlights
          else if (oldAutoHighlight && !settings.autoHighlight) {
            removeAllHighlights();
            if (observer) observer.disconnect();
          }
        }
      });
    } catch (error) {
      console.log('[JobShield] Settings load error:', error);
    }
  }

  // ============================================================================
  // AUTO-DETECTION & HIGHLIGHTING
  // ============================================================================

  /**
   * Scan entire page for scam phrases
   */
  function scanPage() {
    console.log('[JobShield] Scanning page for scam phrases...');
    const startTime = performance.now();

    // Clear any existing highlights
    removeAllHighlights();

    // Scan the document body
    scanElement(document.body);

    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`[JobShield] Page scan complete in ${duration}ms`);
  }

  /**
   * Recursively scan an element and its children
   */
  function scanElement(element) {
    if (!element || !shouldScanElement(element)) {
      return;
    }

    // Process text nodes
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          return shouldScanElement(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const textNodes = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
      textNodes.push(currentNode);
    }

    // Highlight phrases in collected text nodes
    textNodes.forEach(textNode => {
      highlightPhrasesInTextNode(textNode);
    });
  }

  /**
   * Check if element should be scanned for scam phrases
   */
  function shouldScanElement(element) {
    if (!element || !element.tagName) return false;

    // Skip these tag types
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'NAV', 'HEADER', 'FOOTER',
      'PRE', 'CODE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
    if (skipTags.includes(element.tagName)) return false;

    // Skip if element is hidden
    if (element.offsetParent === null && element.tagName !== 'BODY') return false;

    // Skip editable content
    if (element.isContentEditable) return false;

    // Skip navigation/menu classes
    const skipClasses = ['nav', 'navigation', 'menu', 'header', 'footer', 'ad', 'ads', 'advertisement'];
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.toLowerCase();
      if (skipClasses.some(cls => classes.includes(cls))) return false;
    }

    // Skip certain roles
    const skipRoles = ['navigation', 'complementary', 'banner', 'contentinfo'];
    if (skipRoles.includes(element.getAttribute('role'))) return false;

    // Skip if already highlighted
    if (element.classList && element.classList.contains('jobshield-warning')) return false;

    return true;
  }

  /**
   * Highlight scam phrases in a text node
   */
  function highlightPhrasesInTextNode(textNode) {
    const text = textNode.textContent;
    if (!text || text.trim().length === 0) return;

    const parent = textNode.parentElement;
    if (!parent) return;

    // Check for scam phrases
    const matches = findScamPhrasesInText(text);
    if (matches.length === 0) return;

    // Create document fragment with highlighted phrases
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    matches.forEach(match => {
      // Add text before match
      if (match.startIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.startIndex)));
      }

      // Create highlighted span
      const span = createHighlightSpan(match.phrase, match.category);
      fragment.appendChild(span);

      lastIndex = match.endIndex;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    // Replace text node with highlighted version
    parent.replaceChild(fragment, textNode);
  }

  /**
   * Find all scam phrases in text
   */
  function findScamPhrasesInText(text) {
    const matches = [];
    const lowerText = text.toLowerCase();

    // Check each category
    for (const [category, data] of Object.entries(SCAM_PATTERNS)) {
      data.phrases.forEach(phrase => {
        // Skip ignored phrases
        if (settings.ignoredPhrases.includes(phrase)) return;

        const phraseLower = phrase.toLowerCase();
        let index = lowerText.indexOf(phraseLower);

        while (index !== -1) {
          // Check if it's a whole word match (avoid partial matches)
          const isWholeWord = (
            (index === 0 || !/[a-zA-Z0-9]/.test(text[index - 1])) &&
            (index + phrase.length === text.length || !/[a-zA-Z0-9]/.test(text[index + phrase.length]))
          );

          if (isWholeWord) {
            matches.push({
              phrase: text.substring(index, index + phrase.length),
              category,
              startIndex: index,
              endIndex: index + phrase.length
            });
          }

          index = lowerText.indexOf(phraseLower, index + 1);
        }
      });
    }

    // Sort by start index and remove overlaps
    return removeOverlappingMatches(matches);
  }

  /**
   * Remove overlapping matches (keep longer/earlier ones)
   */
  function removeOverlappingMatches(matches) {
    if (matches.length === 0) return matches;

    matches.sort((a, b) => a.startIndex - b.startIndex);

    const filtered = [matches[0]];
    for (let i = 1; i < matches.length; i++) {
      const last = filtered[filtered.length - 1];
      const current = matches[i];

      // If no overlap, add it
      if (current.startIndex >= last.endIndex) {
        filtered.push(current);
      }
    }

    return filtered;
  }

  /**
   * Create a highlighted span element
   */
  function createHighlightSpan(phrase, category) {
    const span = document.createElement('span');
    span.className = 'jobshield-warning';
    span.textContent = phrase;
    span.dataset.category = category;
    span.style.backgroundColor = SCAM_PATTERNS[category].color + '20'; // 20% opacity
    span.style.borderBottom = `2px dashed ${SCAM_PATTERNS[category].color}`;
    span.style.cursor = 'help';
    span.style.borderRadius = '2px';
    span.style.padding = '0 2px';
    span.style.position = 'relative';

    // Add tooltip on hover
    if (settings.showTooltips) {
      span.addEventListener('mouseenter', (e) => showTooltip(e, category));
      span.addEventListener('mouseleave', hideTooltip);
    }

    return span;
  }

  /**
   * Show tooltip near element
   */
  function showTooltip(event, category) {
    hideTooltip(); // Remove any existing tooltip

    const tooltip = document.createElement('div');
    tooltip.className = 'jobshield-tooltip';
    tooltip.textContent = SCAM_PATTERNS[category].tooltip;
    tooltip.style.cssText = `
      position: fixed;
      background: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      max-width: 250px;
      z-index: 999999;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      line-height: 1.4;
    `;

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    // Position tooltip near cursor
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = (rect.bottom + 5) + 'px';
  }

  /**
   * Hide active tooltip
   */
  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }

  /**
   * Remove all highlights from page
   */
  function removeAllHighlights() {
    const highlights = document.querySelectorAll('.jobshield-warning');
    highlights.forEach(span => {
      const parent = span.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize(); // Merge adjacent text nodes
      }
    });
  }

  // ============================================================================
  // MUTATION OBSERVER FOR DYNAMIC CONTENT
  // ============================================================================

  /**
   * Setup MutationObserver to detect dynamic content
   */
  function setupMutationObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      if (!settings.autoHighlight) return;

      // Throttle rescanning to avoid performance issues
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              scanElement(node);
            }
          });
        });
      }, 500); // Wait 500ms after last change
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[JobShield] MutationObserver active');
  }

  // ============================================================================
  // TEXT SELECTION & ANALYSIS
  // ============================================================================

  /**
   * Setup text selection handler
   */
  function setupTextSelection() {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', handleTextSelection);
  }

  /**
   * Handle text selection events
   */
  function handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 10) {
      showFloatingButton(selection);
    } else {
      hideFloatingButton();
    }
  }

  /**
   * Show floating "Analyze" button near selection
   */
  function showFloatingButton(selection) {
    hideFloatingButton();

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    floatingButton = document.createElement('div');
    floatingButton.className = 'jobshield-floating-btn';
    floatingButton.innerHTML = '🛡️ Analyze with JobShield';
    floatingButton.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.bottom + 8}px;
      background: linear-gradient(135deg, #4285F4 0%, #34A853 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      transition: transform 0.2s ease;
      user-select: none;
    `;

    floatingButton.addEventListener('mouseenter', () => {
      floatingButton.style.transform = 'scale(1.05)';
    });

    floatingButton.addEventListener('mouseleave', () => {
      floatingButton.style.transform = 'scale(1)';
    });

    floatingButton.addEventListener('click', () => {
      const text = window.getSelection().toString().trim();
      analyzeSelectedText(text);
      hideFloatingButton();
    });

    document.body.appendChild(floatingButton);

    // Auto-hide after 5 seconds
    setTimeout(hideFloatingButton, 5000);
  }

  /**
   * Hide floating button
   */
  function hideFloatingButton() {
    if (floatingButton) {
      floatingButton.remove();
      floatingButton = null;
    }
  }

  /**
   * Send selected text to background for analysis
   */
  function analyzeSelectedText(text) {
    chrome.runtime.sendMessage({
      action: 'analyzeMessage',
      text: text
    }, (response) => {
      if (response && !response.error) {
        // Display result (could open popup or show inline)
        console.log('[JobShield] Analysis result:', response);
        showAnalysisResult(response, text);
      } else {
        console.error('[JobShield] Analysis error:', response?.error);
      }
    });
  }

  /**
   * Show analysis result inline
   */
  function showAnalysisResult(result, analyzedText) {
    // Create result popup overlay
    const overlay = document.createElement('div');
    overlay.className = 'jobshield-result-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    `;

    const resultBox = document.createElement('div');
    resultBox.className = 'jobshield-result-box';
    resultBox.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    `;

    const riskColor = result.risk_level === 'HIGH' ? '#ff4444' :
      result.risk_level === 'MEDIUM' ? '#ff9944' : '#44ff88';

    resultBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 20px; color: #333;">Analysis Result</h2>
        <button id="closeResult" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
      </div>
      <div style="background: ${riskColor}20; border-left: 4px solid ${riskColor}; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
        <strong style="color: ${riskColor}; font-size: 16px;">Risk Level: ${result.risk_level}</strong>
        <div style="color: #666; font-size: 14px; margin-top: 4px;">Risk Score: ${result.risk_score}/100</div>
      </div>
      ${result.detected_patterns && result.detected_patterns.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <strong style="font-size: 14px; color: #333;">Detected Patterns:</strong>
          <ul style="margin: 8px 0; padding-left: 20px; font-size: 13px; color: #666;">
            ${result.detected_patterns.map(p => `<li>${p}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <div style="font-size: 13px; color: #666; line-height: 1.6;">
        <strong>Explanation:</strong><br>${result.explanation || 'No issues detected.'}
      </div>
      ${result.advice ? `
        <div style="margin-top: 16px; padding: 12px; background: #E8F0FE; border-radius: 6px; font-size: 13px; color: #1a73e8;">
          <strong>💡 Advice:</strong><br>${result.advice}
        </div>
      ` : ''}
    `;

    overlay.appendChild(resultBox);
    document.body.appendChild(overlay);

    // Close button and overlay click
    const closeBtn = resultBox.querySelector('#closeResult');
    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Auto-close after 15 seconds
    setTimeout(() => overlay.remove(), 15000);
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  /**
   * Setup message listener for communication with background/popup
   */
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('[JobShield] Received message:', request.action);

      switch (request.action) {
        case 'extractText':
          // Extract text for popup analysis
          sendResponse({ text: extractVisibleJobText() });
          break;

        case 'highlightPatterns':
          // Highlight specific patterns from analysis results
          if (request.patterns) {
            highlightPatternsFromAnalysis(request.patterns);
          }
          sendResponse({ success: true });
          break;

        case 'settingsChanged':
          // Update settings and re-scan if needed
          settings = { ...settings, ...request.data };
          if (settings.autoHighlight) {
            scanPage();
          } else {
            removeAllHighlights();
          }
          sendResponse({ success: true });
          break;

        case 'displayAnalysisResult':
          // From context menu analysis
          console.log('[JobShield Content] Displaying analysis result');
          showAnalysisResult(request.result, request.selectedText);
          sendResponse({ success: true });
          break;

        case 'displayAnalysisError':
          // From context menu analysis error
          console.error('[JobShield Content] Analysis error:', request.error);
          showAnalysisError(request.error);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }

      return true; // Keep channel open for async
    });
  }

  /**
   * Show analysis error message
   */
  function showAnalysisError(errorMessage) {
    const overlay = document.createElement('div');
    overlay.className = 'jobshield-result-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    `;

    const errorBox = document.createElement('div');
    errorBox.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    `;

    errorBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 20px; color: #ff4444;">⚠️ Analysis Failed</h2>
        <button id="closeError" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
      </div>
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
        ${errorMessage}
      </p>
      <div style="margin-top: 16px; padding: 12px; background: #fff3f3; border-radius: 6px; font-size: 13px; color: #d32f2f;">
        <strong>💡 Tip:</strong> Make sure the backend server is running:<br>
        <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">
          python manage.py runserver
        </code>
      </div>
    `;

    overlay.appendChild(errorBox);
    document.body.appendChild(overlay);

    const closeBtn = errorBox.querySelector('#closeError');
    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    setTimeout(() => overlay.remove(), 10000);
  }

  /**
   * Extract visible text from page (for popup analysis)
   */
  function extractVisibleJobText() {
    const body = document.body;
    if (!body) return '';

    const clone = body.cloneNode(true);

    // Remove unwanted elements
    const unwanted = clone.querySelectorAll('script, style, noscript, nav, header, footer, .ad, .ads');
    unwanted.forEach(el => el.remove());

    return clone.innerText || clone.textContent || '';
  }

  /**
   * Highlight patterns from manual analysis results
   */
  function highlightPatternsFromAnalysis(patterns) {
    // This can be enhanced based on pattern types
    console.log('[JobShield] Would highlight patterns:', patterns);
  }

  // ============================================================================
  // START
  // ============================================================================

  init();

})();
