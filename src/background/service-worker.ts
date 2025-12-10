// Service worker for AI Task Extractor

const SETTINGS_KEY = 'ate_settings';

// Handle external messages from website (for license activation)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('[AI Task Extractor SW] External message from:', sender.origin, message);

  const allowedOrigins = ['https://startvest.ai', 'https://www.startvest.ai'];
  if (!sender.origin || !allowedOrigins.some(origin => sender.origin?.startsWith(origin))) {
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return;
  }

  if (message.type === 'LICENSE_ACTIVATED') {
    const { email, licenseKey } = message.payload as { email: string; licenseKey: string };

    chrome.storage.local.get(SETTINGS_KEY, (result) => {
      const settings = result[SETTINGS_KEY] || {};
      const updatedSettings = {
        ...settings,
        isPro: true,
        licenseKey,
        licenseEmail: email,
      };

      chrome.storage.local.set({ [SETTINGS_KEY]: updatedSettings }, () => {
        console.log('[AI Task Extractor SW] License activated:', email);
        sendResponse({ success: true });
      });
    });

    return true;
  }

  sendResponse({ success: false, error: 'Unknown message type' });
});

// Function to create context menus
function setupContextMenus() {
  // Remove existing menus first to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create context menu for extracting tasks from full page
    chrome.contextMenus.create({
      id: 'extract-tasks-page',
      title: 'Extract Tasks from Page',
      contexts: ['page'],
    });

    // Create context menu for extracting tasks from selected text
    chrome.contextMenus.create({
      id: 'extract-tasks-selection',
      title: 'Extract Tasks from Selection',
      contexts: ['selection'],
    });

    console.log('[AI Task Extractor] Context menus registered');
  });
}

// Create context menus on install AND on service worker startup
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();

  // Initialize default settings if not exists
  chrome.storage.local.get('ate_settings', (result) => {
    if (!result.ate_settings) {
      chrome.storage.local.set({
        ate_settings: {
          aiProvider: 'openai',
          openaiApiKey: '',
          anthropicApiKey: '',
          notionApiKey: '',
          notionDatabaseId: '',
          todoistApiKey: '',
          todoistProjectId: '',
          clickupApiKey: '',
          clickupListId: '',
          defaultExport: 'clipboard',
          autoSelectAll: true,
          isPro: false,
          licenseKey: '',
          theme: 'system',
        },
      });
    }
  });

  console.log('[AI Task Extractor] Extension installed');
});

// Also register context menus on service worker startup (after refresh/restart)
chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

// Register immediately when service worker loads
setupContextMenus();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extract-tasks-page' && tab?.id) {
    // Store that we want full page extraction
    chrome.storage.local.set({ ate_extract_mode: 'page' }, () => {
      // Show badge to prompt user to click extension icon
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
      // Clear badge after 5 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 5000);
    });
  }

  if (info.menuItemId === 'extract-tasks-selection' && tab?.id && info.selectionText) {
    // Store selected text for extraction
    chrome.storage.local.set({
      ate_extract_mode: 'selection',
      ate_selected_text: info.selectionText,
    }, () => {
      // Show badge to prompt user to click extension icon
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
      // Clear badge after 5 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 5000);
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        sendResponse({
          title: tab.title,
          url: tab.url,
          id: tab.id,
        });
      } else {
        sendResponse({ error: 'No active tab' });
      }
    });
    return true;
  }

  if (message.type === 'INJECT_CONTENT_SCRIPT') {
    const tabId = message.tabId;
    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-script.js'],
      }).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ error: error.message });
      });
    }
    return true;
  }
});

// Note: Keyboard shortcut Alt+Shift+E uses _execute_action which directly opens the popup
// No handler needed - Chrome handles it automatically

// Reset daily usage at midnight
function scheduleDailyReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  chrome.alarms.create('daily-reset', {
    when: Date.now() + msUntilMidnight,
    periodInMinutes: 24 * 60, // Repeat every 24 hours
  });
}

chrome.runtime.onStartup.addListener(() => {
  scheduleDailyReset();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'daily-reset') {
    // Reset daily usage count
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.set({
      usage: { date: today, count: 0 },
    });
    console.log('[AI Task Extractor] Daily usage reset');
  }
});

console.log('[AI Task Extractor] Service worker started');
