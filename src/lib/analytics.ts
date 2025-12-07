/**
 * Startvest Extension Analytics
 * Shared analytics library for tracking extension usage and events
 *
 * Privacy: All tracking is opt-in and no PII is collected
 */

import { getSettings, getDeviceId } from './storage';

// Analytics API endpoint
const ANALYTICS_API = 'https://app-tsv-02.azurewebsites.net/api/v1/analytics';

// Extension identifier
const EXTENSION_ID = 'ai-task-extractor';
const EXTENSION_VERSION = chrome.runtime.getManifest().version;

// Storage keys
const ANALYTICS_STORAGE = {
  QUEUE: 'ate_analytics_queue',
  SESSION: 'ate_analytics_session',
  CONSENT: 'ate_analytics_consent',
  LAST_SYNC: 'ate_analytics_last_sync',
} as const;

// Event types that can be tracked
export type AnalyticsEventType =
  // Core extension events
  | 'extension_installed'
  | 'extension_opened'
  | 'extension_uninstalled'
  // Feature usage
  | 'feature_used'
  | 'extraction_started'
  | 'extraction_completed'
  | 'extraction_failed'
  | 'task_edited'
  | 'export_completed'
  // Settings
  | 'settings_changed'
  // Upgrade events
  | 'upgrade_prompt_shown'
  | 'upgrade_prompt_clicked'
  | 'upgrade_prompt_dismissed'
  | 'license_activated'
  // Cross-promo events
  | 'cross_promo_shown'
  | 'cross_promo_clicked'
  | 'cross_promo_dismissed'
  | 'bundle_viewed'
  | 'bundle_purchase_started'
  // A/B test events
  | 'ab_test_assigned'
  | 'ab_test_conversion';

// Event payload structure
export interface AnalyticsEvent {
  id: string;
  eventType: AnalyticsEventType;
  extensionId: string;
  extensionVersion: string;
  deviceId: string;
  sessionId: string;
  timestamp: string;
  properties: Record<string, unknown>;
  userTier: 'free' | 'pro';
}

// Session data
interface SessionData {
  id: string;
  startedAt: string;
  lastActivityAt: string;
}

// Queue for offline events
interface EventQueue {
  events: AnalyticsEvent[];
  lastFlushAttempt?: string;
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a session ID
 */
function generateSessionId(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create session
 */
async function getSession(): Promise<SessionData> {
  const result = await chrome.storage.local.get(ANALYTICS_STORAGE.SESSION);
  const session = result[ANALYTICS_STORAGE.SESSION] as SessionData | undefined;

  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

  // Create new session if none exists or last activity was > 30 minutes ago
  if (!session || new Date(session.lastActivityAt) < thirtyMinutesAgo) {
    const newSession: SessionData = {
      id: generateSessionId(),
      startedAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
    };
    await chrome.storage.local.set({ [ANALYTICS_STORAGE.SESSION]: newSession });
    return newSession;
  }

  // Update last activity
  session.lastActivityAt = now.toISOString();
  await chrome.storage.local.set({ [ANALYTICS_STORAGE.SESSION]: session });
  return session;
}

/**
 * Check if analytics is enabled (opt-in)
 */
export async function isAnalyticsEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(ANALYTICS_STORAGE.CONSENT);
  return result[ANALYTICS_STORAGE.CONSENT] === true;
}

/**
 * Enable analytics tracking
 */
export async function enableAnalytics(): Promise<void> {
  await chrome.storage.local.set({ [ANALYTICS_STORAGE.CONSENT]: true });
}

/**
 * Disable analytics tracking
 */
export async function disableAnalytics(): Promise<void> {
  await chrome.storage.local.set({ [ANALYTICS_STORAGE.CONSENT]: false });
  // Clear any pending events
  await chrome.storage.local.set({ [ANALYTICS_STORAGE.QUEUE]: { events: [] } });
}

/**
 * Get event queue
 */
async function getEventQueue(): Promise<EventQueue> {
  const result = await chrome.storage.local.get(ANALYTICS_STORAGE.QUEUE);
  return result[ANALYTICS_STORAGE.QUEUE] || { events: [] };
}

/**
 * Save event to queue
 */
async function saveToQueue(event: AnalyticsEvent): Promise<void> {
  const queue = await getEventQueue();
  queue.events.push(event);

  // Keep queue manageable (max 500 events)
  if (queue.events.length > 500) {
    queue.events = queue.events.slice(-500);
  }

  await chrome.storage.local.set({ [ANALYTICS_STORAGE.QUEUE]: queue });
}

/**
 * Flush event queue to server
 */
async function flushQueue(): Promise<void> {
  const queue = await getEventQueue();

  if (queue.events.length === 0) return;

  try {
    const response = await fetch(`${ANALYTICS_API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: queue.events }),
    });

    if (response.ok) {
      // Clear successfully sent events
      await chrome.storage.local.set({
        [ANALYTICS_STORAGE.QUEUE]: { events: [] },
        [ANALYTICS_STORAGE.LAST_SYNC]: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Queue will retry on next flush
    console.debug('Analytics flush failed, will retry later:', error);
  }
}

/**
 * Track an analytics event
 */
export async function track(
  eventType: AnalyticsEventType,
  properties: Record<string, unknown> = {}
): Promise<void> {
  // Check if analytics is enabled
  const enabled = await isAnalyticsEnabled();
  if (!enabled) return;

  try {
    const [deviceId, session, settings] = await Promise.all([
      getDeviceId(),
      getSession(),
      getSettings(),
    ]);

    const event: AnalyticsEvent = {
      id: generateEventId(),
      eventType,
      extensionId: EXTENSION_ID,
      extensionVersion: EXTENSION_VERSION,
      deviceId,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      properties: sanitizeProperties(properties),
      userTier: settings.isPro ? 'pro' : 'free',
    };

    // Save to queue
    await saveToQueue(event);

    // Try to flush immediately (non-blocking)
    flushQueue().catch(() => {});
  } catch (error) {
    console.debug('Analytics tracking error:', error);
  }
}

/**
 * Sanitize properties to ensure no PII is sent
 */
function sanitizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  const sensitiveKeys = ['email', 'name', 'password', 'apiKey', 'token', 'secret', 'url', 'content'];

  for (const [key, value] of Object.entries(properties)) {
    // Skip sensitive keys
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      continue;
    }

    // Only include primitive values
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.length; // Just track count
    }
  }

  return sanitized;
}

// ============================================
// Convenience tracking functions
// ============================================

/**
 * Track extension opened
 */
export async function trackExtensionOpened(trigger: 'icon' | 'shortcut' | 'context_menu' = 'icon'): Promise<void> {
  await track('extension_opened', { trigger });
}

/**
 * Track feature usage
 */
export async function trackFeatureUsed(feature: string, details?: Record<string, unknown>): Promise<void> {
  await track('feature_used', { feature, ...details });
}

/**
 * Track extraction started
 */
export async function trackExtractionStarted(pageType: string, contentLength: number): Promise<void> {
  await track('extraction_started', { pageType, contentLength });
}

/**
 * Track extraction completed
 */
export async function trackExtractionCompleted(
  taskCount: number,
  categories: string[],
  durationMs: number
): Promise<void> {
  await track('extraction_completed', {
    taskCount,
    categoryCount: categories.length,
    durationMs,
  });
}

/**
 * Track extraction failed
 */
export async function trackExtractionFailed(error: string): Promise<void> {
  await track('extraction_failed', {
    errorType: error.includes('rate') ? 'rate_limit' :
               error.includes('auth') ? 'auth_error' : 'unknown'
  });
}

/**
 * Track task edited
 */
export async function trackTaskEdited(field: 'title' | 'priority' | 'category' | 'dueDate'): Promise<void> {
  await track('task_edited', { field });
}

/**
 * Track export completed
 */
export async function trackExportCompleted(destination: string, taskCount: number): Promise<void> {
  await track('export_completed', { destination, taskCount });
}

/**
 * Track settings changed
 */
export async function trackSettingsChanged(setting: string): Promise<void> {
  await track('settings_changed', { setting });
}

/**
 * Track upgrade prompt shown
 */
export async function trackUpgradePromptShown(location: string, variant?: string): Promise<void> {
  await track('upgrade_prompt_shown', { location, variant });
}

/**
 * Track upgrade prompt clicked
 */
export async function trackUpgradePromptClicked(location: string, variant?: string): Promise<void> {
  await track('upgrade_prompt_clicked', { location, variant });
}

/**
 * Track cross-promo shown
 */
export async function trackCrossPromoShown(
  bundleId: string,
  variant: string,
  location: string
): Promise<void> {
  await track('cross_promo_shown', { bundleId, variant, location });
}

/**
 * Track cross-promo clicked
 */
export async function trackCrossPromoClicked(
  bundleId: string,
  variant: string,
  location: string
): Promise<void> {
  await track('cross_promo_clicked', { bundleId, variant, location });
}

/**
 * Track A/B test assignment
 */
export async function trackABTestAssigned(testId: string, variantId: string): Promise<void> {
  await track('ab_test_assigned', { testId, variantId });
}

/**
 * Track A/B test conversion
 */
export async function trackABTestConversion(testId: string, variantId: string, value?: number): Promise<void> {
  await track('ab_test_conversion', { testId, variantId, value });
}

// ============================================
// Analytics management
// ============================================

/**
 * Get analytics summary for display
 */
export async function getAnalyticsSummary(): Promise<{
  enabled: boolean;
  pendingEvents: number;
  lastSync: string | null;
}> {
  const [enabled, queue, lastSyncResult] = await Promise.all([
    isAnalyticsEnabled(),
    getEventQueue(),
    chrome.storage.local.get(ANALYTICS_STORAGE.LAST_SYNC),
  ]);

  return {
    enabled,
    pendingEvents: queue.events.length,
    lastSync: lastSyncResult[ANALYTICS_STORAGE.LAST_SYNC] || null,
  };
}

/**
 * Force flush analytics (for uninstall/close)
 */
export async function forceFlush(): Promise<void> {
  await flushQueue();
}

/**
 * Initialize analytics - call on extension install/update
 */
export async function initializeAnalytics(): Promise<void> {
  // Set up periodic flush (every 5 minutes)
  chrome.alarms.create('analytics_flush', { periodInMinutes: 5 });

  // Listen for alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'analytics_flush') {
      flushQueue().catch(() => {});
    }
  });
}
