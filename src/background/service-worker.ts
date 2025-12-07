// Service worker for AI Task Extractor

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
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

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extract-tasks-page' && tab?.id) {
    // Store that we want full page extraction, then open popup
    chrome.storage.local.set({ ate_extract_mode: 'page' }, () => {
      chrome.action.openPopup();
    });
  }

  if (info.menuItemId === 'extract-tasks-selection' && tab?.id && info.selectionText) {
    // Store selected text for extraction, then open popup
    chrome.storage.local.set({
      ate_extract_mode: 'selection',
      ate_selected_text: info.selectionText,
    }, () => {
      chrome.action.openPopup();
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

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'extract-tasks') {
    chrome.storage.local.set({ ate_extract_mode: 'page' }, () => {
      chrome.action.openPopup();
    });
  }

  if (command === 'extract-selection') {
    // Get selected text from the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection()?.toString() || '',
        }).then((results) => {
          const selectedText = results[0]?.result;
          if (selectedText) {
            chrome.storage.local.set({
              ate_extract_mode: 'selection',
              ate_selected_text: selectedText,
            }, () => {
              chrome.action.openPopup();
            });
          } else {
            // No selection, fall back to full page
            chrome.storage.local.set({ ate_extract_mode: 'page' }, () => {
              chrome.action.openPopup();
            });
          }
        }).catch(() => {
          // Script injection failed, just open popup
          chrome.action.openPopup();
        });
      }
    });
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
