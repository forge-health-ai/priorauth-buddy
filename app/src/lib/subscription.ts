import { supabase } from './supabase';
import { getCaseCount } from './local-storage';

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  casesUsed: number;
  casesLimit: number;
  canAddCase: boolean;
  canUseAI: boolean;
  canUseCallCoach: boolean;
}

const FREE_CASE_LIMIT = 1;

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    let userId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (user) {
      userId = user.id;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id || null;
    }
    
    if (!userId) {
      return { tier: 'free', casesUsed: 0, casesLimit: FREE_CASE_LIMIT, canAddCase: true, canUseAI: false, canUseCallCoach: false };
    }

    // Check profile for subscription status (non-PHI)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const tier: SubscriptionTier = profile?.subscription_tier === 'pro' ? 'pro' : 'free';

    // Count cases from local storage (PHI compliance)
    const casesUsed = await getCaseCount(userId);

    if (tier === 'pro') {
      return { tier: 'pro', casesUsed, casesLimit: Infinity, canAddCase: true, canUseAI: true, canUseCallCoach: true };
    }

    return {
      tier: 'free',
      casesUsed,
      casesLimit: FREE_CASE_LIMIT,
      canAddCase: casesUsed < FREE_CASE_LIMIT,
      canUseAI: casesUsed <= FREE_CASE_LIMIT, // Allow AI on first case
      canUseCallCoach: casesUsed <= FREE_CASE_LIMIT,
    };
  } catch (error) {
    console.error('Subscription check error:', error);
    return { tier: 'free', casesUsed: 0, casesLimit: FREE_CASE_LIMIT, canAddCase: true, canUseAI: true, canUseCallCoach: true };
  }
}
