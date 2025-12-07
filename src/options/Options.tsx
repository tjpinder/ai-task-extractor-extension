import React, { useState, useEffect } from 'react';
import type { Settings, HistoryEntry } from '../types';
import { getSettings, saveSettings, getHistory, clearHistory } from '../lib/storage';

type Tab = 'general' | 'integrations' | 'history' | 'license';

const Options: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [loadedSettings, loadedHistory] = await Promise.all([
      getSettings(),
      getHistory(),
    ]);
    setSettings(loadedSettings);
    setHistory(loadedHistory);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    await saveSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateSettings<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleClearHistory() {
    if (confirm('Are you sure you want to clear all extraction history?')) {
      await clearHistory();
      setHistory([]);
    }
  }

  async function handleActivateLicense() {
    if (!licenseKey.trim()) {
      setLicenseError('Please enter a license key');
      return;
    }

    setActivating(true);
    setLicenseError('');

    try {
      const response = await fetch('https://api.startvest.app/licenses/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          product: 'AI_TASK_EXTRACTOR_EXTENSION',
        }),
      });

      const data = await response.json();

      if (data.valid) {
        updateSettings('isPro', true);
        updateSettings('licenseKey', licenseKey.trim());
        await handleSave();
        setLicenseKey('');
      } else {
        setLicenseError(data.message || 'Invalid license key');
      }
    } catch {
      setLicenseError('Failed to validate license. Please try again.');
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivateLicense() {
    if (confirm('Are you sure you want to deactivate your license?')) {
      updateSettings('isPro', false);
      updateSettings('licenseKey', '');
      await handleSave();
    }
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Task Extractor Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure your AI provider, export integrations, and preferences.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {(['general', 'integrations', 'history', 'license'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="card space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Provider</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Provider
                  </label>
                  <select
                    value={settings.aiProvider}
                    onChange={(e) => updateSettings('aiProvider', e.target.value as 'openai' | 'anthropic')}
                    className="input"
                  >
                    <option value="openai">OpenAI (GPT-4)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                  </select>
                </div>

                {settings.aiProvider === 'openai' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={settings.openaiApiKey}
                      onChange={(e) => updateSettings('openaiApiKey', e.target.value)}
                      placeholder="sk-..."
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Get your API key from{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-500 hover:underline"
                      >
                        OpenAI Dashboard
                      </a>
                    </p>
                  </div>
                )}

                {settings.aiProvider === 'anthropic' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anthropic API Key
                    </label>
                    <input
                      type="password"
                      value={settings.anthropicApiKey}
                      onChange={(e) => updateSettings('anthropicApiKey', e.target.value)}
                      placeholder="sk-ant-..."
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Get your API key from{' '}
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-500 hover:underline"
                      >
                        Anthropic Console
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Theme
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => updateSettings('theme', e.target.value as Settings['theme'])}
                    className="input"
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Export Format
                  </label>
                  <select
                    value={settings.defaultExport}
                    onChange={(e) => updateSettings('defaultExport', e.target.value as Settings['defaultExport'])}
                    className="input"
                  >
                    <option value="clipboard">Plain Text (Clipboard)</option>
                    <option value="markdown">Markdown</option>
                    {settings.isPro && <option value="csv">CSV</option>}
                    {settings.isPro && <option value="json">JSON</option>}
                    {settings.isPro && <option value="notion">Notion</option>}
                    {settings.isPro && <option value="todoist">Todoist</option>}
                    {settings.isPro && <option value="clickup">ClickUp</option>}
                    {settings.isPro && <option value="asana">Asana</option>}
                    {settings.isPro && <option value="linear">Linear</option>}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoSelect"
                    checked={settings.autoSelectAll}
                    onChange={(e) => updateSettings('autoSelectAll', e.target.checked)}
                    className="checkbox"
                  />
                  <label htmlFor="autoSelect" className="text-sm text-gray-700">
                    Automatically select all extracted tasks
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showConfidence"
                    checked={settings.showConfidence}
                    onChange={(e) => updateSettings('showConfidence', e.target.checked)}
                    className="checkbox"
                  />
                  <label htmlFor="showConfidence" className="text-sm text-gray-700">
                    Show confidence scores on tasks
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {!settings.isPro && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <h3 className="font-medium text-amber-800">Pro Feature</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Export integrations with Notion, Todoist, ClickUp, Asana, and Linear are available with a Pro license.
                    </p>
                    <button
                      onClick={() => setActiveTab('license')}
                      className="mt-2 text-sm font-medium text-amber-800 hover:underline"
                    >
                      Activate License →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notion */}
            <div className={`card ${!settings.isPro ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📓</span>
                <h2 className="text-lg font-semibold text-gray-900">Notion</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Integration Token
                  </label>
                  <input
                    type="password"
                    value={settings.notionApiKey}
                    onChange={(e) => updateSettings('notionApiKey', e.target.value)}
                    placeholder="secret_..."
                    className="input"
                    disabled={!settings.isPro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create an integration at{' '}
                    <a
                      href="https://www.notion.so/my-integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:underline"
                    >
                      Notion Integrations
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database ID
                  </label>
                  <input
                    type="text"
                    value={settings.notionDatabaseId}
                    onChange={(e) => updateSettings('notionDatabaseId', e.target.value)}
                    placeholder="abc123..."
                    className="input"
                    disabled={!settings.isPro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The ID of the database where tasks will be added
                  </p>
                </div>
              </div>
            </div>

            {/* Todoist */}
            <div className={`card ${!settings.isPro ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✅</span>
                <h2 className="text-lg font-semibold text-gray-900">Todoist</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={settings.todoistApiKey}
                    onChange={(e) => updateSettings('todoistApiKey', e.target.value)}
                    placeholder="Your Todoist API token"
                    className="input"
                    disabled={!settings.isPro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find your token in{' '}
                    <a
                      href="https://todoist.com/app/settings/integrations/developer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:underline"
                    >
                      Todoist Settings → Integrations
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.todoistProjectId}
                    onChange={(e) => updateSettings('todoistProjectId', e.target.value)}
                    placeholder="Leave empty for Inbox"
                    className="input"
                    disabled={!settings.isPro}
                  />
                </div>
              </div>
            </div>

            {/* ClickUp */}
            <div className={`card ${!settings.isPro ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📋</span>
                <h2 className="text-lg font-semibold text-gray-900">ClickUp</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={settings.clickupApiKey}
                    onChange={(e) => updateSettings('clickupApiKey', e.target.value)}
                    placeholder="pk_..."
                    className="input"
                    disabled={!settings.isPro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your token from{' '}
                    <a
                      href="https://app.clickup.com/settings/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:underline"
                    >
                      ClickUp Settings → Apps
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    List ID
                  </label>
                  <input
                    type="text"
                    value={settings.clickupListId}
                    onChange={(e) => updateSettings('clickupListId', e.target.value)}
                    placeholder="The list where tasks will be added"
                    className="input"
                    disabled={!settings.isPro}
                  />
                </div>
              </div>
            </div>

            {/* Asana */}
            <div className={`card ${!settings.isPro ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                <h2 className="text-lg font-semibold text-gray-900">Asana</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={settings.asanaApiKey}
                    onChange={(e) => updateSettings('asanaApiKey', e.target.value)}
                    placeholder="Your Asana access token"
                    className="input"
                    disabled={!settings.isPro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create a token in{' '}
                    <a
                      href="https://app.asana.com/0/my-apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:underline"
                    >
                      Asana Developer Console
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project ID
                  </label>
                  <input
                    type="text"
                    value={settings.asanaProjectId}
                    onChange={(e) => updateSettings('asanaProjectId', e.target.value)}
                    placeholder="The project where tasks will be added"
                    className="input"
                    disabled={!settings.isPro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find the project ID in the URL: app.asana.com/0/<strong>PROJECT_ID</strong>/...
                  </p>
                </div>
              </div>
            </div>

            {/* Linear */}
            <div className={`card ${!settings.isPro ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⚡</span>
                <h2 className="text-lg font-semibold text-gray-900">Linear</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={settings.linearApiKey}
                    onChange={(e) => updateSettings('linearApiKey', e.target.value)}
                    placeholder="lin_api_..."
                    className="input"
                    disabled={!settings.isPro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create an API key in{' '}
                    <a
                      href="https://linear.app/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:underline"
                    >
                      Linear Settings → API
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team ID
                  </label>
                  <input
                    type="text"
                    value={settings.linearTeamId}
                    onChange={(e) => updateSettings('linearTeamId', e.target.value)}
                    placeholder="The team where issues will be created"
                    className="input"
                    disabled={!settings.isPro}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find your team ID in Linear → Settings → Team → General
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Extraction History</h2>
              {history.length > 0 && (
                <button onClick={handleClearHistory} className="text-sm text-red-500 hover:underline">
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No extractions yet</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{entry.sourceTitle}</p>
                        <p className="text-sm text-gray-500 truncate">{entry.sourceUrl}</p>
                      </div>
                      <span className="ml-2 badge bg-primary-100 text-primary-700">
                        {entry.taskCount} task{entry.taskCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(entry.extractedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* License Tab */}
        {activeTab === 'license' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">License</h2>

            {settings.isPro ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-medium text-green-800">Pro License Active</p>
                    <p className="text-sm text-green-600">
                      You have access to all features including unlimited extractions and export integrations.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDeactivateLicense}
                  className="text-sm text-red-500 hover:underline"
                >
                  Deactivate License
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Free Plan</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 5 extractions per day</li>
                    <li>• Copy to clipboard</li>
                    <li>• Export as Markdown</li>
                  </ul>
                </div>

                <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <h3 className="font-medium text-primary-900 mb-2">Pro Plan - $19 (One-time)</h3>
                  <ul className="text-sm text-primary-700 space-y-1">
                    <li>• Unlimited extractions</li>
                    <li>• Export to Notion, Todoist, ClickUp</li>
                    <li>• Export to Asana & Linear</li>
                    <li>• CSV & JSON export</li>
                    <li>• Search & filter tasks</li>
                    <li>• Confidence scores</li>
                    <li>• Priority support</li>
                  </ul>
                  <a
                    href="https://startvest.app/tools/ai-task-extractor"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary mt-4 inline-block text-center"
                  >
                    Get Pro License
                  </a>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Have a license key?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      placeholder="ATE-XXXX-XXXX-XXXX"
                      className="input flex-1"
                    />
                    <button
                      onClick={handleActivateLicense}
                      disabled={activating}
                      className="btn-primary"
                    >
                      {activating ? 'Activating...' : 'Activate'}
                    </button>
                  </div>
                  {licenseError && (
                    <p className="text-sm text-red-500 mt-1">{licenseError}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        {(activeTab === 'general' || activeTab === 'integrations') && (
          <div className="mt-6 flex items-center justify-end gap-4">
            {saved && <span className="text-green-600 text-sm">Settings saved!</span>}
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Options;
