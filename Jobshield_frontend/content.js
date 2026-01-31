/**
 * JobShield Content Script
 * - Extracts visible job-related text from the page (privacy: only what user sees)
 * - Highlights scam-related phrases when analysis results are received
 * - No user data collection; runs only in response to user action (popup)
 */

(function () {
  'use strict';

  // Map backend detected_patterns to words/phrases to highlight on the page.
  // Keys should match API response detected_patterns; values are case-insensitive match terms.
  const PATTERN_HIGHLIGHT_WORDS = {
    // Message/Email patterns
    'Payment Request': ['pay', 'fee', 'deposit', 'registration fee', 'application fee', 'processing fee'],
    'Urgency Manipulation': ['urgent', 'immediately', 'limited slots', 'act now', 'limited time'],
    'Urgency': ['urgent', 'immediately', 'limited slots', 'act now', 'limited time'],
    'Off-platform': ['WhatsApp', 'Telegram', 'Signal', 'text me', 'call me'],
    'Off-Platform': ['WhatsApp', 'Telegram', 'Signal', 'text me', 'call me'],
    'Off-Platform Communication': ['WhatsApp', 'Telegram', 'Signal', 'text me', 'call me'],
    'Free email': ['gmail.com', 'yahoo.com', 'hotmail.com'],
    'Free Email': ['gmail.com', 'yahoo.com', 'hotmail.com'],
    'Free Email Domain': ['gmail.com', 'yahoo.com', 'hotmail.com'],
    'Unrealistic Job Promises': ['guaranteed income', 'no experience', 'easy money', 'work from home'],

    // Website-specific patterns
    'New Domain': [],  // Can't highlight on page, but included for completeness
    'No HTTPS': [],
    'No Contact Info': ['no contact', 'no address', 'no phone'],
    'Payment Instructions': ['send money', 'wire transfer', 'MoneyGram', 'Western Union'],
    'Domain Mismatch': [],

    // Email-specific patterns
    'Poor Grammar': ['mistakes', 'errors'],
    'Unusual Formatting': []
  };

  const HIGHLIGHT_CLASS = 'jobshield-highlight';
  const HIGHLIGHT_TOOLTIP = '⚠ Common scam phrase';

  /**
   * Get visible text from the page, focusing on likely job content.
   * Only reads visible DOM text; no form data or personal info.
   */
  function extractVisibleJobText() {
    const body = document.body;
    if (!body) return '';

    // Clone to avoid modifying the live DOM during extraction
    const clone = body.cloneNode(true);

    // Remove script, style, nav, footer to reduce noise
    const removeSelectors = 'script, style, noscript, nav, footer, [role="navigation"], .ad, .ads';
    clone.querySelectorAll(removeSelectors).forEach(function (el) { el.remove(); });

    const text = clone.innerText || clone.textContent || '';
    // Normalize whitespace and trim; limit length for API
    return text.replace(/\s+/g, ' ').trim().slice(0, 15000);
  }

  /**
   * Collect all phrases to highlight from detected_patterns.
   */
  function getPhrasesToHighlight(detectedPatterns) {
    if (!Array.isArray(detectedPatterns)) return [];
    const phrases = [];
    detectedPatterns.forEach(function (name) {
      const words = PATTERN_HIGHLIGHT_WORDS[name];
      if (words) phrases.push.apply(phrases, words);
    });
    return [...new Set(phrases)];
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Remove all JobShield highlights from the page.
   */
  function clearHighlights() {
    document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach(function (el) {
      const parent = el.parentNode;
      if (parent) parent.replaceChild(document.createTextNode(el.textContent), el);
    });
  }

  /**
   * Highlight text nodes that contain any of the given phrases.
   * Uses yellow background, red border, and tooltip.
   */
  function highlightPhrasesV2(phrases) {
    clearHighlights();
    if (!phrases || phrases.length === 0) return;

    const regex = new RegExp(
      '\\b(' + phrases.map(escapeRegex).join('|') + ')\\b',
      'gi'
    );

    const textNodes = [];
    function collect(node) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        textNodes.push(node);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains(HIGHLIGHT_CLASS)) {
        for (let i = 0; i < node.childNodes.length; i++) collect(node.childNodes[i]);
      }
    }
    collect(document.body);

    textNodes.forEach(function (textNode) {
      const text = textNode.textContent;
      if (!regex.test(text)) return;
      const parent = textNode.parentNode;
      if (!parent) return;
      const parts = [];
      let lastIndex = 0;
      const re2 = new RegExp(regex.source, 'gi');
      let match;
      while ((match = re2.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'highlight', value: match[0] });
        lastIndex = re2.lastIndex;
      }
      if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
      if (parts.length === 0) return;

      const frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (p.type === 'text') {
          frag.appendChild(document.createTextNode(p.value));
        } else {
          const span = document.createElement('span');
          span.className = HIGHLIGHT_CLASS;
          span.title = HIGHLIGHT_TOOLTIP;
          span.textContent = p.value;
          frag.appendChild(span);
        }
      });
      parent.replaceChild(frag, textNode);
    });
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener(function (request, _sender, sendResponse) {
    if (request.action === 'extractText') {
      try {
        sendResponse({ success: true, text: extractVisibleJobText() });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    } else if (request.action === 'highlight') {
      try {
        const phrases = getPhrasesToHighlight(request.detected_patterns || []);
        highlightPhrasesV2(phrases);
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    } else {
      sendResponse({ success: false, error: 'Unknown action' });
    }
    return true; // keep channel open for async sendResponse
  });
})();
