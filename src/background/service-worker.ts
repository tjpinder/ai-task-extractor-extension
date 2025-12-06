// Service worker for AI Task Extractor

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for extracting tasks from selected text
  chrome.contextMenus.create({
    id: 'extract-tasks',
    title: 'Extract Tasks with AI',
    contexts: ['page', 'selection'],
  });

  // Initialize default settings if not exists
  chrome.storage.sync.get('settings', (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({
        settings: {
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
        },
      });
    }
  });

  console.log('[AI Task Extractor] Extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extract-tasks' && tab?.id) {
    // Open popup or trigger extraction
    // For now, we'll open the popup
    chrome.action.openPopup();
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'extract-tasks') {
    chrome.action.openPopup();
  }
});

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
