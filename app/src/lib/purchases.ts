/**
 * RevenueCat Integration for PriorAuth Buddy
 * Handles subscription purchases, restore, and status checking
 */

import { Platform } from 'react-native';

// RevenueCat API keys
const REVENUECAT_API_KEY_IOS = 'test_HFlYrYhbLNCwyHzXVGFdttDCdil';
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
 * Initialize RevenueCat SDK
 * Call this once at app startup after auth
 */
export async function initializePurchases(userId?: string): Promise<void> {
  // Only initialize on native platforms
  if (Platform.OS === 'web') {
    console.log('[Purchases] Skipping RevenueCat on web');
    return;
  }

  try {
    // Dynamic import so web builds don't crash
    const RC = await import('react-native-purchases');
    Purchases = RC.default;

    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    if (!apiKey) {
      console.warn('[Purchases] No API key for platform:', Platform.OS);
      return;
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId || null, // null = anonymous, RevenueCat generates ID
    });

    isConfigured = true;
    console.log('[Purchases] RevenueCat configured successfully');
  } catch (error) {
    console.warn('[Purchases] Failed to initialize:', error);
  }
}

/**
 * Check if user has active Pro subscription
 */
export async function checkProStatus(): Promise<boolean> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) {
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    return !!entitlement;
  } catch (error) {
    console.warn('[Purchases] Failed to check status:', error);
    return false;
  }
}

/**
 * Get available subscription packages
 */
export async function getOfferings(): Promise<any> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.warn('[Purchases] Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase the Pro monthly subscription
 */
export async function purchasePro(): Promise<{ success: boolean; error?: string }> {
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
    console.error('[Purchases] Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<boolean> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) {
    return false;
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (error) {
    console.warn('[Purchases] Restore failed:', error);
    return false;
  }
}

/**
 * Identify user with RevenueCat (call after login)
 */
export async function identifyUser(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) {
    return;
  }

  try {
    await Purchases.logIn(userId);
    console.log('[Purchases] User identified:', userId);
  } catch (error) {
    console.warn('[Purchases] Failed to identify user:', error);
  }
}

/**
 * Log out from RevenueCat (call after logout)
 */
export async function logoutPurchases(): Promise<void> {
  if (Platform.OS === 'web' || !isConfigured || !Purchases) {
    return;
  }

  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('[Purchases] Logout failed:', error);
  }
}
