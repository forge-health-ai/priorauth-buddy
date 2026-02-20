import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { getUserBuddyStats, getBuddyRank, BuddyRank, UserBuddyStats } from '../lib/buddy-evolution';
import { getSubscriptionStatus } from '../lib/subscription';
import { initRevenueCat, checkSubscription, purchaseMonthly, restorePurchases as rcRestore } from '../lib/revenuecat';
import { supabase } from '../lib/supabase';

interface BuddyContextType {
  rank: BuddyRank | undefined;
  isPro: boolean;
  stats: UserBuddyStats;
  refresh: () => Promise<void>;
  purchasePro: () => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<boolean>;
}

const defaultValue: BuddyContextType = {
  rank: undefined,
  isPro: false,
  stats: { appealsFiled: 0, wins: 0, insurersBeaten: [] },
  refresh: async () => {},
  purchasePro: async () => ({ success: false }),
  restorePurchases: async () => false,
};

const BuddyContext = createContext<BuddyContextType>(defaultValue);

export function useBuddy(): BuddyContextType {
  return useContext(BuddyContext);
}

export function BuddyProvider({ children }: { children: React.ReactNode }) {
  const [rank, setRank] = useState<BuddyRank | undefined>(undefined);
  const [isPro, setIsPro] = useState(false);
  const [stats, setStats] = useState<UserBuddyStats>({ appealsFiled: 0, wins: 0, insurersBeaten: [] });

  const refresh = useCallback(async () => {
    try {
      const s = await getUserBuddyStats();
      setStats(s);
      setRank(getBuddyRank(s));

      // Check RevenueCat first on native, fall back to Supabase profile
      if (Platform.OS !== 'web') {
        const rcPro = await checkSubscription();
        if (rcPro) {
          setIsPro(true);
          return;
        }
      }

      // Fallback: check Supabase profile subscription_tier
      const sub = await getSubscriptionStatus();
      setIsPro(sub.tier === 'pro');
    } catch (e) {
      console.error('BuddyContext refresh error:', e);
    }
  }, []);

  const handlePurchasePro = useCallback(async () => {
    const result = await purchaseMonthly();
    if (result.success) {
      setIsPro(true);
    }
    return result;
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    const restored = await rcRestore();
    if (restored) {
      setIsPro(true);
    }
    return restored;
  }, []);

  useEffect(() => {
    // Initialize RevenueCat on mount (non-blocking — app works without it)
    initRevenueCat().catch(() => {}).then(() => refresh().catch(() => {}));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <BuddyContext.Provider value={{ rank, isPro, stats, refresh, purchasePro: handlePurchasePro, restorePurchases: handleRestorePurchases }}>
      {children}
    </BuddyContext.Provider>
  );
}
