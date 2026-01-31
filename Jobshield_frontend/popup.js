/**
 * JobShield Popup Script - Enhanced
 * - Tab switching for three analysis modes (job post, link, email)
 * - Requests visible job text from content script (job post mode)
 * - Sends text/URL/email to backend API for analysis
 * - Displays risk level, score, patterns, explanation, advice
 * - Highlights scam phrases on the page (job post mode only)
 */

(function () {
  'use strict';

  // Configure Django backend base URL
  const API_BASE_URL = 'http://127.0.0.1:8000';
  const ENDPOINTS = {
    message: API_BASE_URL + '/api/analyze-message',
    link: API_BASE_URL + '/api/analyze-link',
    email: API_BASE_URL + '/api/analyze-email'
  };

  // Tab elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Job Post tab elements
  const analyzeJobBtn = document.getElementById('analyzeJobBtn');
  const analyzeJobBtnText = document.getElementById('analyzeJobBtnText');
  const analyzeJobSpinner = document.getElementById('analyzeJobSpinner');

  // Link tab elements
  const analyzeLinkBtn = document.getElementById('analyzeLinkBtn');
  const analyzeLinkBtnText = document.getElementById('analyzeLinkBtnText');
  const analyzeLinkSpinner = document.getElementById('analyzeLinkSpinner');
  const linkInput = document.getElementById('linkInput');

  // Email tab elements
  const analyzeEmailBtn = document.getElementById('analyzeEmailBtn');
  const analyzeEmailBtnText = document.getElementById('analyzeEmailBtnText');
  const analyzeEmailSpinner = document.getElementById('analyzeEmailSpinner');
  const emailTextInput = document.getElementById('emailTextInput');
  const senderEmailInput = document.getElementById('senderEmailInput');

  // Shared elements
  const errorMessage = document.getElementById('errorMessage');
  const resultsPanel = document.getElementById('resultsPanel');
  const riskBanner = document.getElementById('riskBanner');
  const riskScoreEl = document.getElementById('riskScore');
  const detectedPatternsEl = document.getElementById('detectedPatterns');
  const explanationEl = document.getElementById('explanation');
  const adviceEl = document.getElementById('advice');

  let currentTab = 'job-post';

  /**
   * Tab Switching
   */
  function switchTab(tabName) {
    currentTab = tabName;

    // Update tab buttons
    tabBtns.forEach(function (btn) {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab panels
    tabPanels.forEach(function (panel) {
      if (panel.id === 'tab-' + tabName) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Clear results and errors when switching tabs
    hideError();
    resultsPanel.classList.remove('visible');
  }

  // Add click listeners to tab buttons
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      switchTab(btn.dataset.tab);
    });
  });

  /**
   * Loading state management
   */
  function setLoading(button, textEl, spinnerEl, loading) {
    button.disabled = loading;
    textEl.classList.toggle('hidden', loading);
    spinnerEl.classList.toggle('hidden', !loading);
  }

  /**
   * Show error and hide results
   */
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('visible');
    resultsPanel.classList.remove('visible');
  }

  /**
   * Hide error message
   */
  function hideError() {
    errorMessage.classList.remove('visible');
    errorMessage.textContent = '';
  }

  /**
   * Get the active tab (current window)
   */
  function getActiveTab() {
    return chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      return tabs[0] || null;
    });
  }

  /**
   * Ask content script to extract visible job text from the page
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
   * POST to analyze-message endpoint (via background script)
   */
  function analyzeMessage(messageText) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({
        action: 'analyzeMessage',
        text: messageText
      }, function (response) {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * POST to analyze-link endpoint (via background script)
   */
  function analyzeLink(url) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({
        action: 'analyzeLink',
        url: url
      }, function (response) {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * POST to analyze-email endpoint (via background script)
   */
  function analyzeEmail(emailText, senderEmail) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({
        action: 'analyzeEmail',
        emailText: emailText,
        senderEmail: senderEmail
      }, function (response) {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Handle fetch response - generic error handling
   */
  function handleResponse(res) {
    if (!res.ok) {
      return res.text().then(function (t) {
        throw new Error('API error: ' + (t || res.statusText));
      });
    }
    return res.json();
  }

  /**
   * Ask content script to highlight phrases for the given detected_patterns
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
   * Map API risk_level to banner class
   */
  function getRiskBannerClass(riskLevel) {
    var level = (riskLevel || '').toUpperCase();
    if (level === 'LOW') return 'low';
    if (level === 'MEDIUM') return 'medium';
    return 'high';
  }

  /**
   * Render results from API response and show results panel
   */
  function displayResults(data, tabId) {
    hideError();
    var level = (data.risk_level || 'HIGH').toUpperCase();
    riskBanner.textContent = '🚨 ' + level + ' RISK';
    riskBanner.className = 'risk-banner ' + getRiskBannerClass(data.risk_level);

    riskScoreEl.textContent = (data.risk_score != null ? data.risk_score : '—') + ' / 100';

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

    // Trigger on-page highlighting only for job post analysis
    if (tabId && currentTab === 'job-post') {
      highlightOnPage(tabId, data.detected_patterns);
    }
  }

  /**
   * Main flow: Job Post Analysis
   * Supports both manual text input and automatic page extraction
   */
  function runJobPostAnalysis() {
    hideError();
    setLoading(analyzeJobBtn, analyzeJobBtnText, analyzeJobSpinner, true);
    resultsPanel.classList.remove('visible');

    // Check if user pasted text in the textarea
    var jobMessageInput = document.getElementById('jobMessageInput');
    var manualText = jobMessageInput ? jobMessageInput.value.trim() : '';

    if (manualText) {
      // User provided text manually - analyze directly
      analyzeMessage(manualText)
        .then(function (data) {
          displayResults(data, null); // No tabId since not extracting from page
        })
        .catch(function (err) {
          showError(err && err.message ? err.message : 'Failed to analyze the message. Please try again.');
        })
        .finally(function () {
          setLoading(analyzeJobBtn, analyzeJobBtnText, analyzeJobSpinner, false);
        });
    } else {
      // No manual text - extract from current page
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
            throw new Error('No visible job text found on this page. Please paste the job message in the text area or scroll to the job description and try again.');
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
          setLoading(analyzeJobBtn, analyzeJobBtnText, analyzeJobSpinner, false);
        });
    }
  }

  /**
   * Main flow: Link Analysis
   */
  function runLinkAnalysis() {
    var url = linkInput.value.trim();

    if (!url) {
      showError('Please enter a URL to analyze.');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      showError('Please enter a valid URL (e.g., https://example.com).');
      return;
    }

    hideError();
    setLoading(analyzeLinkBtn, analyzeLinkBtnText, analyzeLinkSpinner, true);
    resultsPanel.classList.remove('visible');

    analyzeLink(url)
      .then(function (data) {
        displayResults(data, null);
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : 'Failed to analyze the link. Please try again.');
      })
      .finally(function () {
        setLoading(analyzeLinkBtn, analyzeLinkBtnText, analyzeLinkSpinner, false);
      });
  }

  /**
   * Main flow: Email Analysis
   */
  function runEmailAnalysis() {
    var emailText = emailTextInput.value.trim();
    var senderEmail = senderEmailInput.value.trim();

    if (!emailText) {
      showError('Please enter the email content.');
      return;
    }

    if (!senderEmail) {
      showError('Please enter the sender email address.');
      return;
    }

    // Basic email validation - just check for @ symbol to allow complex formats
    if (!senderEmail.includes('@')) {
      showError('Please enter a valid email address (must contain @).');
      return;
    }

    hideError();
    setLoading(analyzeEmailBtn, analyzeEmailBtnText, analyzeEmailSpinner, true);
    resultsPanel.classList.remove('visible');

    analyzeEmail(emailText, senderEmail)
      .then(function (data) {
        displayResults(data, null);
      })
      .catch(function (err) {
        showError(err && err.message ? err.message : 'Failed to analyze the email. Please try again.');
      })
      .finally(function () {
        setLoading(analyzeEmailBtn, analyzeEmailBtnText, analyzeEmailSpinner, false);
      });
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const autoHighlightToggle = document.getElementById('autoHighlightToggle');
  const showTooltipsToggle = document.getElementById('showTooltipsToggle');

  /**
   * Toggle settings panel visibility
   */
  function toggleSettings() {
    settingsPanel.classList.toggle('hidden');
  }

  /**
   * Load settings from background and apply to UI
   */
  function loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, function (settings) {
      if (settings) {
        autoHighlightToggle.checked = settings.autoHighlight !== false;
        showTooltipsToggle.checked = settings.showTooltips !== false;
      }
    });
  }

  /**
   * Save settings to background
   */
  function saveSettings() {
    const settings = {
      autoHighlight: autoHighlightToggle.checked,
      showTooltips: showTooltipsToggle.checked,
      ignoredPhrases: [] // Can be expanded later
    };

    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    }, function (response) {
      if (response && response.success) {
        console.log('Settings saved successfully');
      }
    });
  }

  // Add event listeners
  if (settingsBtn) {
    settingsBtn.addEventListener('click', toggleSettings);
  }

  if (autoHighlightToggle) {
    autoHighlightToggle.addEventListener('change', saveSettings);
  }

  if (showTooltipsToggle) {
    showTooltipsToggle.addEventListener('change', saveSettings);
  }

  // Load settings on popup open
  loadSettings();

  // Add analysis button event listeners
  analyzeJobBtn.addEventListener('click', runJobPostAnalysis);
  analyzeLinkBtn.addEventListener('click', runLinkAnalysis);
  analyzeEmailBtn.addEventListener('click', runEmailAnalysis);
})();
