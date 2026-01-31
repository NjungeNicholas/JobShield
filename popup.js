/**
 * JobShield Popup Script
 * - Requests visible job text from content script
 * - Sends text to backend API for analysis
 * - Displays risk level, score, patterns, explanation, advice
 * - Asks content script to highlight scam phrases on the page
 */

(function () {
  'use strict';

  // Configure your Django backend base URL (no trailing slash).
  const API_BASE_URL = 'http://localhost:8000';
  const ANALYZE_ENDPOINT = API_BASE_URL + '/api/analyze-message';

  const analyzeBtn = document.getElementById('analyzeBtn');
  const analyzeBtnText = document.getElementById('analyzeBtnText');
  const analyzeSpinner = document.getElementById('analyzeSpinner');
  const errorMessage = document.getElementById('errorMessage');
  const resultsPanel = document.getElementById('resultsPanel');
  const riskBanner = document.getElementById('riskBanner');
  const riskScoreEl = document.getElementById('riskScore');
  const detectedPatternsEl = document.getElementById('detectedPatterns');
  const explanationEl = document.getElementById('explanation');
  const adviceEl = document.getElementById('advice');

  /**
   * Show loading state: spinner visible, button disabled.
   */
  function setLoading(loading) {
    analyzeBtn.disabled = loading;
    analyzeBtnText.classList.toggle('hidden', loading);
    analyzeSpinner.classList.toggle('hidden', !loading);
  }

  /**
   * Show error and hide results.
   */
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('visible');
    resultsPanel.classList.remove('visible');
  }

  /**
   * Hide error message.
   */
  function hideError() {
    errorMessage.classList.remove('visible');
    errorMessage.textContent = '';
  }

  /**
   * Get the active tab (current window).
   */
  function getActiveTab() {
    return chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      return tabs[0] || null;
    });
  }

  /**
   * Ask content script to extract visible job text from the page.
   */
  function extractPageText(tabId) {
    return new Promise(function (resolve, reject) {
      chrome.tabs.sendMessage(tabId, { action: 'extractText' }, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error('Could not read this page. Try refreshing and open the job post, then click Analyze again.'));
          return;
        }
        if (response && response.success) {
          resolve(response.text || '');
        } else {
          reject(new Error(response && response.error ? response.error : 'Failed to extract text.'));
        }
      });
    });
  }

  /**
   * POST extracted text to backend; returns parsed JSON or throws.
   */
  function analyzeMessage(messageText) {
    return fetch(ANALYZE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_text: messageText })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('API error: ' + (t || res.statusText));
        });
      }
      return res.json();
    });
  }

  /**
   * Ask content script to highlight phrases for the given detected_patterns.
   */
  function highlightOnPage(tabId, detectedPatterns) {
    return new Promise(function (resolve) {
      chrome.tabs.sendMessage(tabId, { action: 'highlight', detected_patterns: detectedPatterns || [] }, function (response) {
        if (chrome.runtime.lastError) {
          // Non-fatal: results still shown
          resolve();
          return;
        }
        resolve(response);
      });
    });
  }

  /**
   * Map API risk_level to banner class and display text.
   */
  function getRiskBannerClass(riskLevel) {
    var level = (riskLevel || '').toUpperCase();
    if (level === 'LOW') return 'low';
    if (level === 'MEDIUM') return 'medium';
    return 'high';
  }

  /**
   * Render results from API response and show results panel.
   */
  function displayResults(data, tabId) {
    hideError();
    var level = (data.risk_level || 'HIGH').toUpperCase();
    riskBanner.textContent = '🚨 ' + level + ' RISK JOB SCAM';
    riskBanner.className = 'risk-banner ' + getRiskBannerClass(data.risk_level);

    riskScoreEl.textContent = 'Risk Score: ' + (data.risk_score != null ? data.risk_score : '—') + ' / 100';

    detectedPatternsEl.innerHTML = '';
    var patterns = data.detected_patterns || [];
    patterns.forEach(function (name) {
      var li = document.createElement('li');
      li.textContent = name;
      detectedPatternsEl.appendChild(li);
    });
    if (patterns.length === 0) {
      var empty = document.createElement('li');
      empty.textContent = 'None detected';
      empty.setAttribute('aria-label', 'No scam patterns detected');
      detectedPatternsEl.appendChild(empty);
    }

    explanationEl.textContent = data.explanation || 'No explanation provided.';
    adviceEl.textContent = data.advice || 'Stay cautious and verify the employer through official channels.';

    resultsPanel.classList.add('visible');

    // Trigger on-page highlighting
    if (tabId) {
      highlightOnPage(tabId, data.detected_patterns);
    }
  }

  /**
   * Main flow: extract text → call API → show results → highlight page.
   */
  function runAnalysis() {
    hideError();
    setLoading(true);
    resultsPanel.classList.remove('visible');

    getActiveTab()
      .then(function (tab) {
        if (!tab || !tab.id) {
          throw new Error('No active tab found.');
        }
        return extractPageText(tab.id).then(function (text) {
          return { tabId: tab.id, text: text };
        });
      })
      .then(function (payload) {
        var text = (payload.text || '').trim();
        if (!text) {
          throw new Error('No visible job text found on this page. Scroll to the job description and try again.');
        }
        return analyzeMessage(text).then(function (data) {
          return { data: data, tabId: payload.tabId };
        });
      })
      .then(function (result) {
        displayResults(result.data, result.tabId);
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(function () {
        setLoading(false);
      });
  }

  analyzeBtn.addEventListener('click', runAnalysis);
})();
