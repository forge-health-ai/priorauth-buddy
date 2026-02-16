import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type RankName = 'Rookie' | 'Fighter' | 'Advocate' | 'Champion' | 'Legend';

export interface BuddyRank {
  name: RankName;
  title: string;
  description: string;
  shieldColor: string;
  accentColor: string;
  glowColor: string;
  quote: string;
}

const RANKS: BuddyRank[] = [
  {
    name: 'Rookie',
    title: 'The New Recruit',
    description: 'Every fight starts somewhere. You showed up.',
    shieldColor: '#FF6B35',
    accentColor: '#F7931E',
    glowColor: 'transparent',
    quote: "Ready when you are. Let's fight this together.",
  },
  {
    name: 'Fighter',
    title: 'Battle-Tested',
    description: "You filed your first appeal. You're in the ring now.",
    shieldColor: '#FF6B35',
    accentColor: '#F7931E',
    glowColor: 'transparent',
    quote: "First shot fired. We're just getting started.",
  },
  {
    name: 'Advocate',
    title: 'Proven Winner',
    description: "You beat them once. They know your name now.",
    shieldColor: '#708090',
    accentColor: '#8FA4B8',
    glowColor: 'transparent',
    quote: "We've won before. We'll win again.",
  },
  {
    name: 'Champion',
    title: 'Insurance Nightmare',
    description: 'Three wins deep. Insurers dread your appeals.',
    shieldColor: '#708090',
    accentColor: '#FFD700',
    glowColor: '#FFD70040',
    quote: 'They should think twice before denying us.',
  },
  {
    name: 'Legend',
    title: 'Denial Destroyer',
    description: 'Five wins. Your name echoes through claims departments.',
    shieldColor: '#708090',
    accentColor: '#FFD700',
    glowColor: '#FFD70060',
    quote: 'They see our name and start sweating.',
  },
];

export function getBuddyRank(stats: { appealsFiled: number; wins: number }): BuddyRank {
  if (stats.wins >= 5) return RANKS[4]; // Legend
  if (stats.wins >= 3) return RANKS[3]; // Champion
  if (stats.wins >= 1) return RANKS[2]; // Advocate
  if (stats.appealsFiled >= 1) return RANKS[1]; // Fighter
  return RANKS[0]; // Rookie
}

export function getNextRankProgress(stats: { appealsFiled: number; wins: number }): {
  current: BuddyRank;
  next: BuddyRank | null;
  progress: number;
  remaining: string;
} {
  const current = getBuddyRank(stats);

  if (current.name === 'Legend') {
    return { current, next: null, progress: 1, remaining: 'Max rank reached!' };
  }

  if (current.name === 'Rookie') {
    return {
      current,
      next: RANKS[1],
      progress: Math.min(stats.appealsFiled, 1),
      remaining: 'File 1 appeal to rank up',
    };
  }

  if (current.name === 'Fighter') {
    return {
      current,
      next: RANKS[2],
      progress: Math.min(stats.wins, 1),
      remaining: 'Win 1 appeal to rank up',
    };
  }

  if (current.name === 'Advocate') {
    return {
      current,
      next: RANKS[3],
      progress: stats.wins / 3,
      remaining: `Win ${3 - stats.wins} more appeal${3 - stats.wins === 1 ? '' : 's'} to rank up`,
    };
  }

  // Champion
  return {
    current,
    next: RANKS[4],
    progress: stats.wins / 5,
    remaining: `Win ${5 - stats.wins} more appeal${5 - stats.wins === 1 ? '' : 's'} to rank up`,
  };
}

export interface UserBuddyStats {
  appealsFiled: number;
  wins: number;
  insurersBeaten: string[];
}

const STATS_KEY = 'buddy_evolution_stats';

export async function getUserBuddyStats(): Promise<UserBuddyStats> {
  try {
    // Get user with getSession fallback (getUser can return null or 403 on web)
    let userId: string | null = null;
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) userId = user.id;
    } catch {}
    if (!userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      } catch {}
    }
    if (userId) {
      const user = { id: userId };
      const { data: cases } = await supabase
        .from('cases')
        .select('status, insurer_name')
        .eq('user_id', user.id);

      const { count: appealsCount } = await supabase
        .from('appeals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (cases) {
        const wins = cases.filter(c => c.status === 'approved' || c.status === 'appeal_won').length;
        const insurersBeaten = [
          ...new Set(
            cases
              .filter(c => c.status === 'approved' || c.status === 'appeal_won')
              .map(c => c.insurer_name)
              .filter(Boolean)
          ),
        ];

        const stats: UserBuddyStats = {
          appealsFiled: appealsCount ?? 0,
          wins,
          insurersBeaten,
        };

        // Cache locally
        await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
        return stats;
      }
    }
  } catch (e) {
    console.error('Error fetching buddy stats:', e);
  }

  // Fallback to cached
  try {
    const cached = await AsyncStorage.getItem(STATS_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}

  return { appealsFiled: 0, wins: 0, insurersBeaten: [] };
}

/**
 * Check if recording an outcome caused a rank change.
 * Returns the new rank if changed, null otherwise.
 */
export function checkRankUp(
  oldStats: { appealsFiled: number; wins: number },
  newStats: { appealsFiled: number; wins: number }
): BuddyRank | null {
  const oldRank = getBuddyRank(oldStats);
  const newRank = getBuddyRank(newStats);
  if (oldRank.name !== newRank.name) return newRank;
  return null;
}

/** Map insurer names to short abbreviations for badges */
export function getInsurerAbbrev(name: string): string {
  const map: Record<string, string> = {
    'UnitedHealthcare': 'UHC',
    'Anthem / Elevance': 'ANTH',
    'Cigna': 'CIG',
    'Aetna / CVS Health': 'AETNA',
    'Humana': 'HUM',
    'Blue Cross Blue Shield': 'BCBS',
    'Kaiser Permanente': 'KP',
    'Molina Healthcare': 'MOL',
    'Centene': 'CENT',
    'Medicare Advantage': 'MA',
    'Medicaid': 'MCAID',
  };

  for (const [key, abbrev] of Object.entries(map)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
      return abbrev;
    }
  }

  // Generate abbreviation from first letters
  return name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}
