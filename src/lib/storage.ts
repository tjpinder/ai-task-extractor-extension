import type {
  Settings,
  HistoryEntry,
  ExtractionResult,
  UsageData,
  TierLimits,
} from '../types';

// Device ID for single-user license enforcement
const DEVICE_ID_KEY = 'ate_device_id';

function generateDeviceId(): string {
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(16).substring(2, 6));
  }
  const timestamp = Date.now().toString(16);
  return `${segments.join('-')}-${timestamp}`;
}

export async function getDeviceId(): Promise<string> {
  const result = await chrome.storage.local.get(DEVICE_ID_KEY);
  if (result[DEVICE_ID_KEY]) {
    return result[DEVICE_ID_KEY];
  }
  const deviceId = generateDeviceId();
  await chrome.storage.local.set({ [DEVICE_ID_KEY]: deviceId });
  return deviceId;
}

const STORAGE_KEYS = {
  SETTINGS: 'ate_settings',
  HISTORY: 'ate_history',
  EXTRACTIONS: 'ate_extractions',
  USAGE: 'ate_usage',
} as const;

const DEFAULT_SETTINGS: Settings = {
  aiProvider: 'openai',
  openaiApiKey: '',
  anthropicApiKey: '',
  defaultExport: 'clipboard',
  notionApiKey: '',
  notionDatabaseId: '',
  todoistApiKey: '',
  todoistProjectId: '',
  clickupApiKey: '',
  clickupListId: '',
  licenseKey: '',
  isPro: false,
  theme: 'system',
  autoSelectAll: true,
};

// Settings
export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { ...current, ...settings },
  });
}

// History
export async function getHistory(): Promise<HistoryEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return result[STORAGE_KEYS.HISTORY] || [];
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
  const history = await getHistory();
  history.unshift(entry);

  // Keep only last 500 entries
  const trimmed = history.slice(0, 500);
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: trimmed });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
}

// Extractions (cached results)
export async function getExtractions(): Promise<ExtractionResult[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.EXTRACTIONS);
  return result[STORAGE_KEYS.EXTRACTIONS] || [];
}

export async function saveExtraction(extraction: ExtractionResult): Promise<void> {
  const extractions = await getExtractions();

  // Remove existing extraction for same URL
  const filtered = extractions.filter((e) => e.sourceUrl !== extraction.sourceUrl);
  filtered.unshift(extraction);

  // Keep only last 50 extractions
  const trimmed = filtered.slice(0, 50);
  await chrome.storage.local.set({ [STORAGE_KEYS.EXTRACTIONS]: trimmed });
}

export async function getExtractionByUrl(url: string): Promise<ExtractionResult | null> {
  const extractions = await getExtractions();
  return extractions.find((e) => e.sourceUrl === url) || null;
}

// Usage tracking
export async function getUsage(): Promise<UsageData> {
  const today = new Date().toISOString().split('T')[0];
  const result = await chrome.storage.local.get(STORAGE_KEYS.USAGE);
  const usage = result[STORAGE_KEYS.USAGE] as UsageData | undefined;

  if (!usage || usage.date !== today) {
    return { date: today, extractionsCount: 0 };
  }
  return usage;
}

export async function incrementUsage(): Promise<UsageData> {
  const usage = await getUsage();
  const updated = {
    ...usage,
    extractionsCount: usage.extractionsCount + 1,
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: updated });
  return updated;
}

// Tier limits
export async function getTierLimits(): Promise<TierLimits> {
  const settings = await getSettings();
  if (settings.isPro) {
    return {
      extractionsPerDay: -1,
      historyDays: -1,
      exportIntegrations: true,
    };
  }
  return {
    extractionsPerDay: 5,
    historyDays: 7,
    exportIntegrations: false,
  };
}

export async function canExtract(): Promise<{ allowed: boolean; remaining: number }> {
  const settings = await getSettings();
  if (settings.isPro) {
    return { allowed: true, remaining: -1 };
  }

  const usage = await getUsage();
  const limit = 5;
  const remaining = limit - usage.extractionsCount;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

// License validation with device binding
export async function validateLicense(licenseKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const deviceId = await getDeviceId();
    const response = await fetch(
      'https://app-tsv-02.azurewebsites.net/api/v1/license/validate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey,
          deviceId,
        }),
      }
    );

    const data = await response.json();

    if (data.valid) {
      return { valid: true };
    }

    return { valid: false, error: data.error || 'Invalid license key' };
  } catch {
    return { valid: false, error: 'Failed to validate license. Please check your connection.' };
  }
}

// Utility
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
