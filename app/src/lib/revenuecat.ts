/**
 * RevenueCat Integration for PriorAuth Buddy
 * Handles subscription purchases, restore and status checking.
 * Web-safe: all functions no-op on web platform.
 */

import { Platform } from 'react-native';

// RevenueCat API keys
const REVENUECAT_PROD_KEY_IOS = 'appl_fkULouOxNXGupCYfgXoyPnMmcNn';
const REVENUECAT_TEST_KEY_IOS = 'test_HFlYrYhbLNCwyHzXVGFdttDCdil';

// Toggle this for sandbox testing vs production
const USE_TEST_KEY = __DEV__;

const REVENUECAT_API_KEY_IOS = USE_TEST_KEY ? REVENUECAT_TEST_KEY_IOS : REVENUECAT_PROD_KEY_IOS;
const REVENUECAT_API_KEY_ANDROID = ''; // Add when needed

// Product IDs (must match App Store Connect)
export const PRODUCT_IDS = {
  PRO_MONTHLY: 'pab_pro_monthly',
} as const;

// Entitlement ID (must match RevenueCat dashboard)
export const ENTITLEMENT_ID = 'PriorAuth Buddy Pro';

let isConfigured = false;
let Purchases: any = null;

/**
 * Initialize RevenueCat SDK.
 * Call once at app startup. Safe to call on web (no-ops).
 */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('[RevenueCat] Skipping on web');
    return;
  }

  if (isConfigured) return;

  try {
    const RC = await import('react-native-purchases');
    Purchases = RC.default;

    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    if (!apiKey) {
      console.warn('[RevenueCat] No API key for platform:', Platform.OS);
      return;
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId || null,
    });

    isConfigured = true;
    console.log('[RevenueCat] Configured successfully (test mode:', USE_TEST_KEY, ')');
  } catch (error) {
    console.warn('[RevenueCat] Failed to initialize:', error);
  }
}

/**
 * Check if user has active "PriorAuth Buddy Pro" entitlement.
 * Returns false on web or if not configured.
 */
export async function checkSubscription(): Promise<boolean> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) {
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (error) {
    console.warn('[RevenueCat] Failed to check subscription:', error);
    return false;
  }
}

/**
 * Purchase the Pro monthly subscription ($4.99/mo).
 * Returns { success, error? }.
 */
export async function purchaseMonthly(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Subscriptions are only available in the mobile app' };
  }

  if (!isConfigured || !Purchases) {
    return { success: false, error: 'Purchase system not initialized' };
  }

  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current?.availablePackages?.length) {
      return { success: false, error: 'No subscription packages available' };
    }

    // Find the monthly package
    const monthlyPackage = offerings.current.availablePackages.find(
      (pkg: any) => pkg.packageType === 'MONTHLY'
    ) || offerings.current.availablePackages[0];

    const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
    const isPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

    return { success: isPro };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    console.error('[RevenueCat] Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases. Returns true if Pro entitlement found.
 */
export async function restorePurchases(): Promise<boolean> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) {
    return false;
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (error) {
    console.warn('[RevenueCat] Restore failed:', error);
    return false;
  }
}

/**
 * Identify user with RevenueCat (call after login).
 */
export async function identifyUser(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) return;

  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.warn('[RevenueCat] Failed to identify user:', error);
  }
}

/**
 * Log out from RevenueCat (call after logout).
 */
export async function logoutRevenueCat(): Promise<void> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) return;

  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('[RevenueCat] Logout failed:', error);
  }
}

// Re-export for backward compat with old purchases.ts consumers
export { initRevenueCat as initializePurchases };
export { checkSubscription as checkProStatus };
export { purchaseMonthly as purchasePro };
