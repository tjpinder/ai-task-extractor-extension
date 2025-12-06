import React, { useState, useEffect } from 'react';
import type {
  ExtractedTask,
  ExtractionResult,
  Settings,
  ExportDestination,
} from '../types';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  EXPORT_LABELS,
} from '../types';
import {
  getSettings,
  canExtract,
  incrementUsage,
  generateId,
  saveExtraction,
  addToHistory,
} from '../lib/storage';
import { extractTasks } from '../lib/ai';
import {
  formatAsPlainText,
  formatAsMarkdown,
  exportToNotion,
  exportToTodoist,
  exportToClickUp,
  copyToClipboard,
} from '../lib/export';

type View = 'idle' | 'extracting' | 'results' | 'exporting' | 'error';

const Popup: React.FC = () => {
  const [view, setView] = useState<View>('idle');
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string>('');
  const [usage, setUsage] = useState<{ allowed: boolean; remaining: number }>({
    allowed: true,
    remaining: 5,
  });
  const [pageInfo, setPageInfo] = useState<{ title: string; url: string } | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    const [loadedSettings, usageStatus] = await Promise.all([
      getSettings(),
      canExtract(),
    ]);
    setSettings(loadedSettings);
    setUsage(usageStatus);

    // Get current page info
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.title && tab.url) {
        setPageInfo({ title: tab.title, url: tab.url });
      }
    } catch {
      // Ignore
    }
  }

  async function handleExtract() {
    if (!settings) return;

    if (!usage.allowed) {
      setError('Daily limit reached. Upgrade to Pro for unlimited extractions.');
      setView('error');
      return;
    }

    const apiKey = settings.aiProvider === 'openai'
      ? settings.openaiApiKey
      : settings.anthropicApiKey;

    if (!apiKey) {
      setError(`Please configure your ${settings.aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API key in settings.`);
      setView('error');
      return;
    }

    setView('extracting');
    setError('');

    try {
      // Get page content from content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
      if (!response?.content) {
        throw new Error('Could not extract page content. Try refreshing the page.');
      }

      const extractedTasks = await extractTasks(response.content, response.title, settings);

      if (extractedTasks.length === 0) {
        setError('No tasks found on this page. Try a different page with action items or meeting notes.');
        setView('error');
        return;
      }

      setTasks(extractedTasks);
      setPageInfo({ title: response.title, url: response.url });

      await incrementUsage();
      const newUsage = await canExtract();
      setUsage(newUsage);

      // Save to history
      const extraction: ExtractionResult = {
        id: generateId(),
        sourceUrl: response.url,
        sourceTitle: response.title,
        tasks: extractedTasks,
        extractedAt: Date.now(),
      };
      await saveExtraction(extraction);
      await addToHistory({
        id: extraction.id,
        sourceUrl: response.url,
        sourceTitle: response.title,
        taskCount: extractedTasks.length,
        extractedAt: Date.now(),
      });

      setView('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
      setView('error');
    }
  }

  function toggleTask(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, selected: !t.selected } : t))
    );
  }

  function selectAll() {
    setTasks((prev) => prev.map((t) => ({ ...t, selected: true })));
  }

  function deselectAll() {
    setTasks((prev) => prev.map((t) => ({ ...t, selected: false })));
  }

  async function handleExport(destination: ExportDestination) {
    if (!settings || !pageInfo) return;

    const selectedTasks = tasks.filter((t) => t.selected);
    if (selectedTasks.length === 0) {
      setError('Please select at least one task to export');
      return;
    }

    setView('exporting');

    try {
      switch (destination) {
        case 'clipboard':
          await copyToClipboard(formatAsPlainText(tasks));
          setExportSuccess('Copied to clipboard!');
          break;
        case 'markdown':
          await copyToClipboard(formatAsMarkdown(tasks, pageInfo.title));
          setExportSuccess('Markdown copied to clipboard!');
          break;
        case 'notion':
          if (!settings.isPro) {
            setError('Notion export is a Pro feature. Upgrade to unlock.');
            setView('error');
            return;
          }
          await exportToNotion(tasks, settings, pageInfo.title);
          setExportSuccess(`Exported ${selectedTasks.length} tasks to Notion!`);
          break;
        case 'todoist':
          if (!settings.isPro) {
            setError('Todoist export is a Pro feature. Upgrade to unlock.');
            setView('error');
            return;
          }
          await exportToTodoist(tasks, settings);
          setExportSuccess(`Exported ${selectedTasks.length} tasks to Todoist!`);
          break;
        case 'clickup':
          if (!settings.isPro) {
            setError('ClickUp export is a Pro feature. Upgrade to unlock.');
            setView('error');
            return;
          }
          await exportToClickUp(tasks, settings);
          setExportSuccess(`Exported ${selectedTasks.length} tasks to ClickUp!`);
          break;
      }
      setView('results');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setView('error');
    }
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  function handleReset() {
    setView('idle');
    setTasks([]);
    setError('');
    setExportSuccess(null);
  }

  const selectedCount = tasks.filter((t) => t.selected).length;

  // Render idle view
  if (view === 'idle') {
    return (
      <div className="w-[400px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900">AI Task Extractor</h1>
          <button
            onClick={openOptions}
            className="text-gray-500 hover:text-gray-700"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {pageInfo && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Current page:</p>
            <p className="text-sm font-medium text-gray-700 truncate">{pageInfo.title}</p>
          </div>
        )}

        <div className="text-center py-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Extract Tasks from This Page
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            AI will analyze the page content and identify actionable tasks, deadlines, and follow-ups.
          </p>
          <button
            onClick={handleExtract}
            className="btn-primary w-full"
          >
            Extract Tasks
          </button>
        </div>

        {!settings?.isPro && (
          <div className="mt-3 text-center text-sm text-gray-500">
            {usage.remaining} of 5 free extractions remaining today
          </div>
        )}
      </div>
    );
  }

  // Render extracting view
  if (view === 'extracting') {
    return (
      <div className="w-[400px] p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-600">Analyzing page content...</p>
          <p className="text-sm text-gray-400 mt-2">Identifying tasks and action items</p>
        </div>
      </div>
    );
  }

  // Render exporting view
  if (view === 'exporting') {
    return (
      <div className="w-[400px] p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-600">Exporting tasks...</p>
        </div>
      </div>
    );
  }

  // Render error view
  if (view === 'error') {
    return (
      <div className="w-[400px] p-4">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={handleReset} className="btn-secondary">
              Try Again
            </button>
            <button onClick={openOptions} className="btn-outline">
              Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render results view
  if (view === 'results') {
    return (
      <div className="w-[400px] max-h-[500px] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-gray-900">
              {tasks.length} Task{tasks.length !== 1 ? 's' : ''} Found
            </h1>
            <button onClick={handleReset} className="text-gray-500 hover:text-gray-700 text-sm">
              ← Back
            </button>
          </div>
          {pageInfo && (
            <p className="text-sm text-gray-500 truncate">{pageInfo.title}</p>
          )}
          {exportSuccess && (
            <div className="mt-2 p-2 bg-green-50 text-green-700 text-sm rounded-lg">
              {exportSuccess}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">
              {selectedCount} of {tasks.length} selected
            </span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-primary-500 hover:underline">
                Select all
              </button>
              <button onClick={deselectAll} className="text-xs text-gray-500 hover:underline">
                Deselect all
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border transition-colors ${
                  task.selected
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.selected}
                    onChange={() => toggleTask(task.id)}
                    className="checkbox mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg" title={CATEGORY_LABELS[task.category]}>
                        {CATEGORY_ICONS[task.category]}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${PRIORITY_COLORS[task.priority]}20`,
                          color: PRIORITY_COLORS[task.priority],
                        }}
                      >
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                      {task.assignee && (
                        <span>👤 {task.assignee}</span>
                      )}
                      {task.dueDate && (
                        <span>📅 {task.dueDate}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Export selected tasks:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleExport('clipboard')}
              className="btn-secondary text-sm py-2"
            >
              📋 Copy
            </button>
            <button
              onClick={() => handleExport('markdown')}
              className="btn-secondary text-sm py-2"
            >
              📝 Markdown
            </button>
            <button
              onClick={() => handleExport('notion')}
              disabled={!settings?.isPro}
              className="btn-outline text-sm py-2 disabled:opacity-50"
              title={!settings?.isPro ? 'Pro feature' : ''}
            >
              📓 Notion {!settings?.isPro && '🔒'}
            </button>
            <button
              onClick={() => handleExport('todoist')}
              disabled={!settings?.isPro}
              className="btn-outline text-sm py-2 disabled:opacity-50"
              title={!settings?.isPro ? 'Pro feature' : ''}
            >
              ✅ Todoist {!settings?.isPro && '🔒'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Popup;
