import React, { useState, useEffect } from 'react';
import type {
  ExtractedTask,
  ExtractionResult,
  Settings,
  ExportDestination,
  TaskCategory,
  TaskPriority,
} from '../types';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
} from '../types';
import {
  getSettings,
  saveSettings,
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
  const [previousTasks, setPreviousTasks] = useState<ExtractedTask[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string>('');
  const [usage, setUsage] = useState<{ allowed: boolean; remaining: number }>({
    allowed: true,
    remaining: 5,
  });
  const [pageInfo, setPageInfo] = useState<{ title: string; url: string } | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);
  const [extractMode, setExtractMode] = useState<'page' | 'selection'>('page');
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');

  useEffect(() => {
    loadInitialData();
    checkExtractMode();
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (settings) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
      setIsDark(shouldBeDark);
      document.body.classList.toggle('dark', shouldBeDark);
    }
  }, [settings]);

  async function checkExtractMode() {
    const result = await chrome.storage.local.get(['ate_extract_mode', 'ate_selected_text']);
    if (result.ate_extract_mode === 'selection' && result.ate_selected_text) {
      setExtractMode('selection');
      setSelectedText(result.ate_selected_text);
      // Clear the stored values
      await chrome.storage.local.remove(['ate_extract_mode', 'ate_selected_text']);
    }
  }

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

  async function toggleDarkMode() {
    if (!settings) return;
    const newTheme = isDark ? 'light' : 'dark';
    const newSettings = { ...settings, theme: newTheme as 'light' | 'dark' };
    setSettings(newSettings);
    await saveSettings(newSettings);
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
      let content: string;
      let title: string;
      let url: string;

      // Get page content from content script or use selected text
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab');

      if (extractMode === 'selection' && selectedText) {
        // Use the selected text
        content = selectedText;
        title = tab.title || 'Selected Text';
        url = tab.url || '';
      } else {
        // Get full page content
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
        if (!response?.content) {
          throw new Error('Could not extract page content. Try refreshing the page.');
        }
        content = response.content;
        title = response.title;
        url = response.url;
      }

      const extractedTasks = await extractTasks(content, title, settings);

      if (extractedTasks.length === 0) {
        setError('No tasks found. Try a different page or selection with action items or meeting notes.');
        setView('error');
        return;
      }

      // Save previous tasks for undo
      if (tasks.length > 0) {
        setPreviousTasks([...tasks]);
      }

      setTasks(extractedTasks);
      setPageInfo({ title, url });

      await incrementUsage();
      const newUsage = await canExtract();
      setUsage(newUsage);

      // Save to history
      const extraction: ExtractionResult = {
        id: generateId(),
        sourceUrl: url,
        sourceTitle: title,
        tasks: extractedTasks,
        extractedAt: Date.now(),
      };
      await saveExtraction(extraction);
      await addToHistory({
        id: extraction.id,
        sourceUrl: url,
        sourceTitle: title,
        taskCount: extractedTasks.length,
        extractedAt: Date.now(),
      });

      // Reset extract mode
      setExtractMode('page');
      setSelectedText(null);

      setView('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
      setView('error');
    }
  }

  function handleUndo() {
    if (previousTasks) {
      setTasks(previousTasks);
      setPreviousTasks(null);
    }
  }

  function handleEditTask(taskId: string, field: 'title' | 'description', value: string) {
    setPreviousTasks([...tasks]); // Save for undo
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t))
    );
    setEditingTaskId(null);
    setEditingField(null);
  }

  function handleChangeTaskPriority(taskId: string, priority: TaskPriority) {
    setPreviousTasks([...tasks]);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, priority } : t))
    );
  }

  function handleChangeTaskCategory(taskId: string, category: TaskCategory) {
    setPreviousTasks([...tasks]);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, category } : t))
    );
  }

  function handleDeleteTask(taskId: string) {
    setPreviousTasks([...tasks]);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function selectByCategory(category: TaskCategory | 'all') {
    if (category === 'all') {
      setTasks((prev) => prev.map((t) => ({ ...t, selected: true })));
    } else {
      setTasks((prev) =>
        prev.map((t) => ({ ...t, selected: t.category === category }))
      );
    }
  }

  function selectByPriority(priority: TaskPriority) {
    setTasks((prev) =>
      prev.map((t) => ({ ...t, selected: t.priority === priority }))
    );
  }

  const filteredTasks = categoryFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.category === categoryFilter);

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
      <div className={`w-[400px] p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>AI Task Extractor</h1>
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {/* Settings button */}
            <button
              onClick={openOptions}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {pageInfo && (
          <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current page:</p>
            <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{pageInfo.title}</p>
          </div>
        )}

        {/* Selected text indicator */}
        {extractMode === 'selection' && selectedText && (
          <div className={`mb-4 p-3 rounded-lg border-2 border-dashed ${isDark ? 'bg-primary-900/20 border-primary-700' : 'bg-primary-50 border-primary-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className={`w-4 h-4 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className={`text-xs font-medium ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>Extracting from selection</span>
            </div>
            <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              "{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"
            </p>
            <button
              onClick={() => { setExtractMode('page'); setSelectedText(null); }}
              className={`mt-2 text-xs ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}
            >
              Use full page instead
            </button>
          </div>
        )}

        <div className="text-center py-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-primary-900/30' : 'bg-primary-100'}`}>
            <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {extractMode === 'selection' ? 'Extract Tasks from Selection' : 'Extract Tasks from This Page'}
          </h2>
          <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            AI will analyze the {extractMode === 'selection' ? 'selected text' : 'page content'} and identify actionable tasks, deadlines, and follow-ups.
          </p>
          <button
            onClick={handleExtract}
            className="btn-primary w-full"
          >
            Extract Tasks
          </button>
        </div>

        {!settings?.isPro && (
          <div className={`mt-3 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {usage.remaining} of 5 free extractions remaining today
          </div>
        )}
      </div>
    );
  }

  // Render extracting view
  if (view === 'extracting') {
    return (
      <div className={`w-[400px] p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Analyzing {extractMode === 'selection' ? 'selection' : 'page content'}...</p>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Identifying tasks and action items</p>
        </div>
      </div>
    );
  }

  // Render exporting view
  if (view === 'exporting') {
    return (
      <div className={`w-[400px] p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Exporting tasks...</p>
        </div>
      </div>
    );
  }

  // Render error view
  if (view === 'error') {
    return (
      <div className={`w-[400px] p-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center py-8">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Error</h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
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
      <div className={`w-[400px] max-h-[500px] flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h1 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {tasks.length} Task{tasks.length !== 1 ? 's' : ''} Found
            </h1>
            <div className="flex items-center gap-2">
              {/* Undo button */}
              {previousTasks && (
                <button
                  onClick={handleUndo}
                  className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  title="Undo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              )}
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-yellow-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button onClick={handleReset} className={`text-sm ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                ← Back
              </button>
            </div>
          </div>
          {pageInfo && (
            <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{pageInfo.title}</p>
          )}
          {exportSuccess && (
            <div className={`mt-2 p-2 text-sm rounded-lg ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'}`}>
              {exportSuccess}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Bulk selection controls */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {selectedCount} of {filteredTasks.length} selected
            </span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-primary-500 hover:underline">
                Select all
              </button>
              <button onClick={deselectAll} className={`text-xs hover:underline ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Deselect all
              </button>
            </div>
          </div>

          {/* Quick select by priority/category */}
          <div className={`flex flex-wrap gap-1 mb-3 pb-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <span className={`text-xs mr-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Select:</span>
            <button
              onClick={() => selectByPriority('high')}
              className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
            >
              High
            </button>
            <button
              onClick={() => selectByPriority('medium')}
              className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
            >
              Medium
            </button>
            <button
              onClick={() => selectByPriority('low')}
              className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
            >
              Low
            </button>
            <span className={`text-xs mx-1 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>|</span>
            <button
              onClick={() => selectByCategory('action')}
              className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Actions
            </button>
            <button
              onClick={() => selectByCategory('follow-up')}
              className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Follow-ups
            </button>
          </div>

          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 rounded-lg border transition-colors ${
                  task.selected
                    ? isDark ? 'border-primary-700 bg-primary-900/20' : 'border-primary-200 bg-primary-50'
                    : isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
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
                      {/* Priority dropdown */}
                      <select
                        value={task.priority}
                        onChange={(e) => handleChangeTaskPriority(task.id, e.target.value as TaskPriority)}
                        className="text-xs rounded px-1.5 py-0.5 border-0 cursor-pointer"
                        style={{
                          backgroundColor: `${PRIORITY_COLORS[task.priority]}20`,
                          color: PRIORITY_COLORS[task.priority],
                        }}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className={`ml-auto p-1 rounded opacity-50 hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}
                        title="Delete task"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {/* Editable title */}
                    {editingTaskId === task.id && editingField === 'title' ? (
                      <input
                        type="text"
                        defaultValue={task.title}
                        autoFocus
                        className={`task-edit-input font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
                        onBlur={(e) => handleEditTask(task.id, 'title', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditTask(task.id, 'title', (e.target as HTMLInputElement).value);
                          } else if (e.key === 'Escape') {
                            setEditingTaskId(null);
                            setEditingField(null);
                          }
                        }}
                      />
                    ) : (
                      <p
                        className={`font-medium cursor-pointer hover:underline ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
                        onClick={() => { setEditingTaskId(task.id); setEditingField('title'); }}
                        title="Click to edit"
                      >
                        {task.title}
                      </p>
                    )}
                    {/* Editable description */}
                    {task.description && (
                      editingTaskId === task.id && editingField === 'description' ? (
                        <input
                          type="text"
                          defaultValue={task.description}
                          autoFocus
                          className={`task-edit-input text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                          onBlur={(e) => handleEditTask(task.id, 'description', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEditTask(task.id, 'description', (e.target as HTMLInputElement).value);
                            } else if (e.key === 'Escape') {
                              setEditingTaskId(null);
                              setEditingField(null);
                            }
                          }}
                        />
                      ) : (
                        <p
                          className={`text-sm mt-1 cursor-pointer hover:underline ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                          onClick={() => { setEditingTaskId(task.id); setEditingField('description'); }}
                          title="Click to edit"
                        >
                          {task.description}
                        </p>
                      )
                    )}
                    <div className={`flex flex-wrap gap-2 mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
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

        <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Export selected tasks:</p>
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
