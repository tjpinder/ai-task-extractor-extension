/**
 * A/B Testing Client Library
 * Handles variant assignment and conversion tracking for extensions
 */

import { getDeviceId } from './storage';
import { track } from './analytics';

// A/B Test API endpoint
const AB_TEST_API = 'https://app-tsv-02.azurewebsites.net/api/v1/ab-tests';

// Extension ID for this extension
const EXTENSION_ID = 'ai-task-extractor';

// Storage keys
const AB_STORAGE = {
  VARIANTS: 'ate_ab_variants',
  LAST_FETCH: 'ate_ab_last_fetch',
} as const;

// Cache duration (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * A/B Test variant with configuration
 */
export interface ABVariant {
  id: string;
  name: string;
  config: Record<string, any>;
}

/**
 * Stored variant assignments
 */
interface StoredVariants {
  [testId: string]: ABVariant;
}

/**
 * Get cached variants from storage
 */
async function getCachedVariants(): Promise<StoredVariants | null> {
  try {
    const result = await chrome.storage.local.get([AB_STORAGE.VARIANTS, AB_STORAGE.LAST_FETCH]);
    const lastFetch = result[AB_STORAGE.LAST_FETCH];

    // Check if cache is still valid
    if (lastFetch && Date.now() - lastFetch < CACHE_DURATION) {
      return result[AB_STORAGE.VARIANTS] || null;
    }
  } catch (error) {
    console.debug('Failed to get cached variants:', error);
  }
  return null;
}

/**
 * Save variants to cache
 */
async function cacheVariants(variants: StoredVariants): Promise<void> {
  try {
    await chrome.storage.local.set({
      [AB_STORAGE.VARIANTS]: variants,
      [AB_STORAGE.LAST_FETCH]: Date.now(),
    });
  } catch (error) {
    console.debug('Failed to cache variants:', error);
  }
}

/**
 * Fetch variant for a specific test from server
 */
async function fetchVariant(testId: string): Promise<ABVariant | null> {
  try {
    const deviceId = await getDeviceId();

    const response = await fetch(`${AB_TEST_API}/${testId}/variant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, extensionId: EXTENSION_ID }),
    });

    if (!response.ok) {
      // Test might not be running - return null
      if (response.status === 400) {
        return null;
      }
      throw new Error(`Failed to fetch variant: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.variant.id,
      name: data.variant.name,
      config: data.variant.config || {},
    };
  } catch (error) {
    console.debug(`Failed to fetch variant for test ${testId}:`, error);
    return null;
  }
}

/**
 * Get variant for an A/B test
 * Uses cached variant if available, otherwise fetches from server
 */
export async function getVariant(testId: string): Promise<ABVariant | null> {
  // Check cache first
  const cached = await getCachedVariants();
  if (cached && cached[testId]) {
    return cached[testId];
  }

  // Fetch from server
  const variant = await fetchVariant(testId);

  if (variant) {
    // Update cache
    const allVariants = cached || {};
    allVariants[testId] = variant;
    await cacheVariants(allVariants);

    // Track assignment event
    await track('ab_test_assigned', {
      testId,
      variantId: variant.id,
      variantName: variant.name,
    });
  }

  return variant;
}

/**
 * Get config value from a variant with fallback
 */
export async function getTestConfig<T>(
  testId: string,
  configKey: string,
  defaultValue: T
): Promise<T> {
  const variant = await getVariant(testId);
  if (variant && variant.config && configKey in variant.config) {
    return variant.config[configKey] as T;
  }
  return defaultValue;
}

/**
 * Record a conversion for a test
 */
export async function recordConversion(testId: string, value?: number): Promise<void> {
  try {
    const deviceId = await getDeviceId();

    await fetch(`${AB_TEST_API}/${testId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, value }),
    });

    // Track conversion event
    await track('ab_test_converted', {
      testId,
      value,
    });
  } catch (error) {
    console.debug(`Failed to record conversion for test ${testId}:`, error);
  }
}

/**
 * Clear variant cache (useful for testing)
 */
export async function clearVariantCache(): Promise<void> {
  await chrome.storage.local.remove([AB_STORAGE.VARIANTS, AB_STORAGE.LAST_FETCH]);
}

// ============================================
// Pre-defined Test Helpers
// ============================================

/**
 * Get bundle discount configuration from A/B test
 * Falls back to 25% if no test running
 */
export async function getBundleDiscountConfig(): Promise<{
  discountPercent: number;
  discountType: 'percent' | 'fixed';
  discountAmount: number;
}> {
  // Try discount percent test first
  const percentVariant = await getVariant('bundle-discount-001');
  if (percentVariant?.config?.discountPercent) {
    return {
      discountPercent: percentVariant.config.discountPercent,
      discountType: 'percent',
      discountAmount: percentVariant.config.discountPercent,
    };
  }

  // Try fixed vs percent test
  const typeVariant = await getVariant('bundle-price-type-001');
  if (typeVariant?.config?.discountType) {
    return {
      discountPercent: typeVariant.config.discountAmount,
      discountType: typeVariant.config.discountType,
      discountAmount: typeVariant.config.discountAmount,
    };
  }

  // Default fallback
  return {
    discountPercent: 25,
    discountType: 'percent',
    discountAmount: 25,
  };
}

/**
 * Get promo messaging configuration from A/B tests
 */
export async function getPromoMessagingConfig(): Promise<{
  showUrgency: boolean;
  urgencyText: string;
  showSocialProof: boolean;
  socialText: string;
  copyStyle: 'feature' | 'benefit';
  headline: string;
}> {
  const defaults = {
    showUrgency: false,
    urgencyText: '',
    showSocialProof: false,
    socialText: '',
    copyStyle: 'feature' as const,
    headline: 'Get more extensions',
  };

  // Check urgency test
  const urgencyVariant = await getVariant('urgency-messaging-001');
  if (urgencyVariant?.config) {
    defaults.showUrgency = urgencyVariant.config.showUrgency || false;
    defaults.urgencyText = urgencyVariant.config.urgencyText || '';
  }

  // Check social proof test
  const socialVariant = await getVariant('social-proof-001');
  if (socialVariant?.config) {
    defaults.showSocialProof = socialVariant.config.showSocialProof || false;
    defaults.socialText = socialVariant.config.socialText || '';
  }

  // Check copy style test
  const copyVariant = await getVariant('benefit-vs-feature-001');
  if (copyVariant?.config) {
    defaults.copyStyle = copyVariant.config.copyStyle || 'feature';
    defaults.headline = copyVariant.config.headline || defaults.headline;
  }

  return defaults;
}

/**
 * Get promo timing configuration from A/B test
 */
export async function getPromoTimingConfig(): Promise<{
  showAfterDays: number;
  showAfterUses: number;
  displayStyle: 'modal' | 'banner';
}> {
  const defaults = {
    showAfterDays: 0,
    showAfterUses: 3,
    displayStyle: 'banner' as const,
  };

  // Check timing test
  const timingVariant = await getVariant('promo-timing-001');
  if (timingVariant?.config) {
    defaults.showAfterDays = timingVariant.config.showAfterDays ?? defaults.showAfterDays;
    defaults.showAfterUses = timingVariant.config.showAfterUses ?? defaults.showAfterUses;
  }

  // Check display style test
  const styleVariant = await getVariant('promo-style-001');
  if (styleVariant?.config) {
    defaults.displayStyle = styleVariant.config.displayStyle || defaults.displayStyle;
  }

  return defaults;
}
