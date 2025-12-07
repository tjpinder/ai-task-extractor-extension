/**
 * Extension Bundle System
 * Cross-promotion and bundle discount functionality
 */

import { getSettings, getDeviceId } from './storage';
import { trackCrossPromoShown, trackCrossPromoClicked, track } from './analytics';

// Bundle API endpoint
const BUNDLE_API = 'https://app-tsv-02.azurewebsites.net/api/v1/bundles';

// Storage keys
const BUNDLE_STORAGE = {
  OWNED_EXTENSIONS: 'ate_owned_extensions',
  PROMO_DISMISSED: 'ate_promo_dismissed',
  LAST_PROMO_SHOWN: 'ate_last_promo_shown',
} as const;

// Extension definitions
export const EXTENSIONS = {
  'ai-task-extractor': {
    id: 'ai-task-extractor',
    name: 'AI Task Extractor',
    price: 14,
    description: 'Extract tasks from any webpage with AI',
    icon: '✅',
  },
  'ai-tabs-organizer': {
    id: 'ai-tabs-organizer',
    name: 'AI Tabs Organizer',
    price: 19,
    description: 'Organize your tabs with AI-powered grouping',
    icon: '📑',
  },
  'content-repurposer': {
    id: 'content-repurposer',
    name: 'Content Repurposer',
    price: 79,
    description: 'Transform content for different platforms',
    icon: '♻️',
  },
  'sales-objection-handler': {
    id: 'sales-objection-handler',
    name: 'Sales Objection Handler',
    price: 24,
    description: 'AI responses to sales objections',
    icon: '💬',
  },
  'meeting-prep': {
    id: 'meeting-prep',
    name: 'Meeting Prep AI',
    price: 19,
    description: 'AI-powered meeting preparation briefs',
    icon: '📅',
  },
} as const;

export type ExtensionId = keyof typeof EXTENSIONS;

// Bundle definitions
export interface Bundle {
  id: string;
  name: string;
  description: string;
  extensionIds: ExtensionId[];
  originalPrice: number;
  bundlePrice: number;
  discountPercent: number;
  featured?: boolean;
  validUntil?: string;
}

export const BUNDLES: Bundle[] = [
  {
    id: 'productivity-pack',
    name: 'Productivity Pack',
    description: 'Boost your productivity with task extraction and tab organization',
    extensionIds: ['ai-task-extractor', 'ai-tabs-organizer'],
    originalPrice: 33,
    bundlePrice: 25,
    discountPercent: 24,
    featured: true,
  },
  {
    id: 'creator-pack',
    name: 'Creator Pack',
    description: 'Perfect for content creators - repurpose and organize your content workflow',
    extensionIds: ['content-repurposer', 'ai-task-extractor'],
    originalPrice: 93,
    bundlePrice: 75,
    discountPercent: 19,
  },
  {
    id: 'sales-pack',
    name: 'Sales Pack',
    description: 'Close more deals with objection handling and meeting prep',
    extensionIds: ['sales-objection-handler', 'meeting-prep'],
    originalPrice: 43,
    bundlePrice: 33,
    discountPercent: 23,
  },
  {
    id: 'full-suite',
    name: 'Full Suite',
    description: 'Get all Startvest extensions at the best value',
    extensionIds: ['ai-task-extractor', 'ai-tabs-organizer', 'content-repurposer', 'sales-objection-handler', 'meeting-prep'],
    originalPrice: 155,
    bundlePrice: 99,
    discountPercent: 36,
    featured: true,
  },
];

/**
 * Get extensions owned by user
 */
export async function getOwnedExtensions(): Promise<ExtensionId[]> {
  const result = await chrome.storage.local.get(BUNDLE_STORAGE.OWNED_EXTENSIONS);
  return result[BUNDLE_STORAGE.OWNED_EXTENSIONS] || [];
}

/**
 * Set owned extensions (called after license validation)
 */
export async function setOwnedExtensions(extensions: ExtensionId[]): Promise<void> {
  await chrome.storage.local.set({ [BUNDLE_STORAGE.OWNED_EXTENSIONS]: extensions });
}

/**
 * Check if user owns an extension
 */
export async function ownsExtension(extensionId: ExtensionId): Promise<boolean> {
  const owned = await getOwnedExtensions();
  return owned.includes(extensionId);
}

/**
 * Get bundles relevant to user (that include extensions they don't own)
 */
export async function getRelevantBundles(): Promise<Bundle[]> {
  const owned = await getOwnedExtensions();

  return BUNDLES.filter(bundle => {
    // User should not own all extensions in the bundle
    const unownedCount = bundle.extensionIds.filter(id => !owned.includes(id)).length;
    return unownedCount > 0;
  }).sort((a, b) => {
    // Sort by discount percent descending
    return b.discountPercent - a.discountPercent;
  });
}

/**
 * Get recommended bundle for cross-promotion
 */
export async function getRecommendedBundle(): Promise<Bundle | null> {
  const relevant = await getRelevantBundles();

  if (relevant.length === 0) return null;

  // Prefer featured bundles
  const featured = relevant.find(b => b.featured);
  if (featured) return featured;

  // Otherwise return highest discount
  return relevant[0];
}

/**
 * Check if promo should be shown
 */
export async function shouldShowPromo(): Promise<boolean> {
  const settings = await getSettings();

  // Don't show promo to pro users who own multiple extensions
  const owned = await getOwnedExtensions();
  if (owned.length >= 3) return false;

  // Check if promo was dismissed recently
  const result = await chrome.storage.local.get([
    BUNDLE_STORAGE.PROMO_DISMISSED,
    BUNDLE_STORAGE.LAST_PROMO_SHOWN,
  ]);

  const dismissed = result[BUNDLE_STORAGE.PROMO_DISMISSED];
  const lastShown = result[BUNDLE_STORAGE.LAST_PROMO_SHOWN];

  // If dismissed, don't show for 30 days
  if (dismissed) {
    const dismissedDate = new Date(dismissed);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (dismissedDate > thirtyDaysAgo) return false;
  }

  // Don't show more than once per day
  if (lastShown) {
    const lastShownDate = new Date(lastShown);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (lastShownDate > oneDayAgo) return false;
  }

  // Show promo to free users or users with only one extension
  return !settings.isPro || owned.length <= 1;
}

/**
 * Record that promo was shown
 */
export async function recordPromoShown(bundleId: string): Promise<void> {
  await chrome.storage.local.set({
    [BUNDLE_STORAGE.LAST_PROMO_SHOWN]: new Date().toISOString(),
  });
  await trackCrossPromoShown(bundleId, 'default', 'popup');
}

/**
 * Record that promo was dismissed
 */
export async function recordPromoDismissed(bundleId: string): Promise<void> {
  await chrome.storage.local.set({
    [BUNDLE_STORAGE.PROMO_DISMISSED]: new Date().toISOString(),
  });
  await track('cross_promo_dismissed', { bundleId, variant: 'default', location: 'popup' });
}

/**
 * Record that promo was clicked
 */
export async function recordPromoClicked(bundleId: string): Promise<void> {
  await trackCrossPromoClicked(bundleId, 'default', 'popup');
}

/**
 * Get bundle purchase URL
 */
export function getBundlePurchaseUrl(bundleId: string): string {
  return `https://startvest.com/bundles/${bundleId}?ref=extension`;
}

/**
 * Calculate savings for a bundle based on what user already owns
 */
export async function calculateBundleSavings(bundle: Bundle): Promise<{
  originalTotal: number;
  bundlePrice: number;
  savings: number;
  savingsPercent: number;
  extensionsToGet: typeof EXTENSIONS[ExtensionId][];
}> {
  const owned = await getOwnedExtensions();

  const extensionsToGet = bundle.extensionIds
    .filter(id => !owned.includes(id))
    .map(id => EXTENSIONS[id]);

  const originalTotal = extensionsToGet.reduce((sum, ext) => sum + ext.price, 0);

  // Calculate pro-rated bundle price
  const proRatedPercent = extensionsToGet.length / bundle.extensionIds.length;
  const bundlePrice = Math.round(bundle.bundlePrice * proRatedPercent);

  const savings = originalTotal - bundlePrice;
  const savingsPercent = Math.round((savings / originalTotal) * 100);

  return {
    originalTotal,
    bundlePrice,
    savings,
    savingsPercent,
    extensionsToGet,
  };
}

/**
 * Fetch user's owned extensions from server
 */
export async function syncOwnedExtensions(): Promise<ExtensionId[]> {
  try {
    const deviceId = await getDeviceId();
    const settings = await getSettings();

    if (!settings.licenseKey) {
      return [];
    }

    const response = await fetch(`${BUNDLE_API}/user-extensions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: settings.licenseKey,
        deviceId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const extensions = data.extensions as ExtensionId[];
      await setOwnedExtensions(extensions);
      return extensions;
    }
  } catch (error) {
    console.debug('Failed to sync owned extensions:', error);
  }

  return await getOwnedExtensions();
}
