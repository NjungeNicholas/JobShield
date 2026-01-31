/**
 * JobShield Background Service Worker (Manifest V3)
 * Handles API communication, context menu, and extension state management
 */

// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Default settings
const DEFAULT_SETTINGS = {
    autoHighlight: true,
    showTooltips: true,
    ignoredPhrases: [],
    highlightIntensity: 'medium'
};

/**
 * Initialize extension on install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
    console.log('JobShield installed/updated:', details.reason);

    // Set default settings on first install
    if (details.reason === 'install') {
        chrome.storage.local.set({ settings: DEFAULT_SETTINGS }, () => {
            console.log('Default settings initialized');
        });
    }

    // Setup context menu
    setupContextMenu();
});

/**
 * Setup right-click context menu
 */
function setupContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'jobshield-analyze',
            title: '🛡️ Analyze with JobShield',
            contexts: ['selection']
        });
    });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('[JobShield Background] Context menu clicked!');
    console.log('[JobShield Background] Menu ID:', info.menuItemId);
    console.log('[JobShield Background] Selected text:', info.selectionText);
    console.log('[JobShield Background] Tab ID:', tab.id);

    if (info.menuItemId === 'jobshield-analyze' && info.selectionText) {
        console.log('[JobShield Background] Starting analysis...');
        // Send selected text for analysis
        analyzeText(info.selectionText, tab.id);
    } else {
        console.log('[JobShield Background] Conditions not met for analysis');
    }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action);

    switch (request.action) {
        case 'analyzeMessage':
            handleAPIRequest('analyze-message', { message_text: request.text })
                .then(sendResponse)
                .catch(error => sendResponse({ error: error.message }));
            return true; // Keep channel open for async response

        case 'analyzeLink':
            handleAPIRequest('analyze-link', { url: request.url })
                .then(sendResponse)
                .catch(error => sendResponse({ error: error.message }));
            return true;

        case 'analyzeEmail':
            handleAPIRequest('analyze-email', {
                email_text: request.emailText,
                sender_email: request.senderEmail
            })
                .then(sendResponse)
                .catch(error => sendResponse({ error: error.message }));
            return true;

        case 'getSettings':
            chrome.storage.local.get(['settings'], (result) => {
                sendResponse(result.settings || DEFAULT_SETTINGS);
            });
            return true;

        case 'updateSettings':
            chrome.storage.local.set({ settings: request.settings }, () => {
                sendResponse({ success: true });
                // Notify all tabs about settings change
                notifyAllTabs('settingsChanged', request.settings);
            });
            return true;

        default:
            sendResponse({ error: 'Unknown action' });
    }
});

/**
 * Centralized API request handler
 */
async function handleAPIRequest(endpoint, data) {
    const url = `${API_BASE_URL}/${endpoint}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

/**
 * Analyze selected text and send results to content script
 */
async function analyzeText(text, tabId) {
    console.log('[JobShield Background] Analyzing text:', text.substring(0, 50) + '...');
    console.log('[JobShield Background] Target tab ID:', tabId);

    try {
        console.log('[JobShield Background] Calling API...');
        const result = await handleAPIRequest('analyze-message', { message_text: text });
        console.log('[JobShield Background] API Response:', result);

        // Send results back to content script for display
        chrome.tabs.sendMessage(tabId, {
            action: 'displayAnalysisResult',
            result: result,
            selectedText: text
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[JobShield Background] Error sending to content script:', chrome.runtime.lastError);
            } else {
                console.log('[JobShield Background] Message sent to content script successfully');
            }
        });

    } catch (error) {
        console.error('[JobShield Background] Text analysis error:', error);

        // Try to send error to content script
        chrome.tabs.sendMessage(tabId, {
            action: 'displayAnalysisError',
            error: error.message || 'Analysis failed. Is the backend server running?'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[JobShield Background] Could not send error to content script');
                // Show browser notification as fallback
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: 'JobShield Analysis Failed',
                    message: error.message || 'Could not analyze text. Make sure the backend server is running at http://127.0.0.1:8000'
                });
            }
        });
    }
}

/**
 * Notify all tabs about a change
 */
function notifyAllTabs(action, data) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action, data }).catch(() => {
                // Tab might not have content script, ignore error
            });
        });
    });
}

/**
 * Get current settings
 */
async function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
            resolve(result.settings || DEFAULT_SETTINGS);
        });
    });
}

/**
 * Update settings
 */
async function updateSettings(newSettings) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ settings: newSettings }, () => {
            resolve();
            notifyAllTabs('settingsChanged', newSettings);
        });
    });
}

console.log('JobShield background service worker initialized');
