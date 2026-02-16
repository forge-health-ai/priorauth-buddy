import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserBuddyStats, getBuddyRank, BuddyRank, UserBuddyStats } from '../lib/buddy-evolution';
import { getSubscriptionStatus } from '../lib/subscription';
import { supabase } from '../lib/supabase';

interface BuddyContextType {
  rank: BuddyRank | undefined;
  isPro: boolean;
  stats: UserBuddyStats;
  refresh: () => Promise<void>;
}

const defaultValue: BuddyContextType = {
  rank: undefined,
  isPro: false,
  stats: { appealsFiled: 0, wins: 0, insurersBeaten: [] },
  refresh: async () => {},
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
      const sub = await getSubscriptionStatus();
      setIsPro(sub.tier === 'pro');
    } catch (e) {
      console.error('BuddyContext refresh error:', e);
    }
  }, []);

  useEffect(() => {
    // Initial load
    refresh();

    // Refresh on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <BuddyContext.Provider value={{ rank, isPro, stats, refresh }}>
      {children}
    </BuddyContext.Provider>
  );
}
