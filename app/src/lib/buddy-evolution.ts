import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type RankName = 'Rookie' | 'Fighter' | 'Advocate' | 'Warrior' | 'Champion' | 'Veteran' | 'Elite' | 'Legend';

export interface BuddyRank {
  name: RankName;
  title: string;
  description: string;
  shieldColor: string;
  accentColor: string;
  glowColor: string;
  quote: string;
  tier: number; // 0-7 for comparison
}

const RANKS: BuddyRank[] = [
  {
    name: 'Rookie',
    tier: 0,
    title: 'The New Recruit',
    description: 'Every fight starts somewhere. You showed up.',
    shieldColor: '#FF6B35',
    accentColor: '#F7931E',
    glowColor: 'transparent',
    quote: "Ready when you are. Let's fight this together.",
  },
  {
    name: 'Fighter',
    tier: 1,
    title: 'Battle-Tested',
    description: "You filed your first appeal. You're in the ring now.",
    shieldColor: '#FF6B35',
    accentColor: '#F7931E',
    glowColor: 'transparent',
    quote: "First shot fired. We're just getting started.",
  },
  {
    name: 'Advocate',
    tier: 2,
    title: 'First Win',
    description: "You beat them once. They know your name now.",
    shieldColor: '#708090',
    accentColor: '#8FA4B8',
    glowColor: 'transparent',
    quote: "We've won before. We'll win again.",
  },
  {
    name: 'Warrior',
    tier: 3,
    title: 'Persistent',
    description: "Three wins in. You don't back down.",
    shieldColor: '#708090',
    accentColor: '#C0392B',
    glowColor: 'transparent',
    quote: "They denied us three times. We won three times.",
  },
  {
    name: 'Champion',
    tier: 4,
    title: 'Insurance Nightmare',
    description: 'Five wins across multiple insurers. They dread your name.',
    shieldColor: '#708090',
    accentColor: '#FFD700',
    glowColor: '#FFD70030',
    quote: 'They should think twice before denying us.',
  },
  {
    name: 'Veteran',
    tier: 5,
    title: 'Claims Crusher',
    description: 'Eight wins against three insurers. A force of nature.',
    shieldColor: '#DAA520',
    accentColor: '#FFD700',
    glowColor: '#FFD70040',
    quote: 'Insurance companies warn each other about us.',
  },
  {
    name: 'Elite',
    tier: 6,
    title: 'Denial Destroyer',
    description: 'Twelve wins, four insurers, five appeals deep. Unstoppable.',
    shieldColor: '#B0C4DE',
    accentColor: '#E8E8E8',
    glowColor: '#C0C0FF40',
    quote: "They've stopped fighting us. Smart move.",
  },
  {
    name: 'Legend',
    tier: 7,
    title: 'The Unstoppable',
    description: 'Twenty wins. Five insurers. Ten appeals. The system bows.',
    shieldColor: '#B0C4DE',
    accentColor: '#E8E8E8',
    glowColor: '#C0C0FF60',
    quote: 'They see our name and start sweating.',
  },
];

export { RANKS };

export interface FullStats {
  appealsFiled: number;
  wins: number;
  insurersBeaten: string[];
}

export function getBuddyRank(stats: FullStats | { appealsFiled: number; wins: number }): BuddyRank {
  const wins = stats.wins;
  const appeals = stats.appealsFiled;
  const insurers = 'insurersBeaten' in stats ? stats.insurersBeaten.length : 0;

  // Legend: 20 wins + 5 insurers + 10 appeals
  if (wins >= 20 && insurers >= 5 && appeals >= 10) return RANKS[7];
  // Elite: 12 wins + 4 insurers + 5 appeals
  if (wins >= 12 && insurers >= 4 && appeals >= 5) return RANKS[6];
  // Veteran: 8 wins + 3 insurers
  if (wins >= 8 && insurers >= 3) return RANKS[5];
  // Champion: 5 wins + 2 insurers
  if (wins >= 5 && insurers >= 2) return RANKS[4];
  // Warrior: 3 wins
  if (wins >= 3) return RANKS[3];
  // Advocate: 1 win
  if (wins >= 1) return RANKS[2];
  // Fighter: 1 appeal filed
  if (appeals >= 1) return RANKS[1];
  // Rookie
  return RANKS[0];
}

export function getNextRankProgress(stats: FullStats): {
  current: BuddyRank;
  next: BuddyRank | null;
  progress: number;
  remaining: string;
} {
  const current = getBuddyRank(stats);

  if (current.name === 'Legend') {
    return { current, next: null, progress: 1, remaining: 'Max rank reached!' };
  }

  const nextRank = RANKS[current.tier + 1];
  const requirements = getRankRequirements(nextRank.name, stats);

  return {
    current,
    next: nextRank,
    progress: requirements.progress,
    remaining: requirements.text,
  };
}

function getRankRequirements(targetRank: RankName, stats: FullStats): { progress: number; text: string } {
  const w = stats.wins;
  const i = stats.insurersBeaten.length;
  const a = stats.appealsFiled;
  const parts: string[] = [];
  let progressParts = 0;
  let totalParts = 0;

  switch (targetRank) {
    case 'Fighter': {
      totalParts = 1;
      progressParts = Math.min(a, 1);
      if (a < 1) parts.push('File 1 appeal');
      break;
    }
    case 'Advocate': {
      totalParts = 1;
      progressParts = Math.min(w, 1);
      if (w < 1) parts.push('Win 1 appeal');
      break;
    }
    case 'Warrior': {
      totalParts = 3;
      progressParts = Math.min(w, 3);
      if (w < 3) parts.push(`Win ${3 - w} more appeal${3 - w === 1 ? '' : 's'}`);
      break;
    }
    case 'Champion': {
      totalParts = 2;
      progressParts = (Math.min(w, 5) / 5 + Math.min(i, 2) / 2) / 2 * 2;
      if (w < 5) parts.push(`Win ${5 - w} more appeal${5 - w === 1 ? '' : 's'}`);
      if (i < 2) parts.push(`Beat ${2 - i} more insurer${2 - i === 1 ? '' : 's'}`);
      break;
    }
    case 'Veteran': {
      totalParts = 2;
      progressParts = (Math.min(w, 8) / 8 + Math.min(i, 3) / 3) / 2 * 2;
      if (w < 8) parts.push(`Win ${8 - w} more appeal${8 - w === 1 ? '' : 's'}`);
      if (i < 3) parts.push(`Beat ${3 - i} more insurer${3 - i === 1 ? '' : 's'}`);
      break;
    }
    case 'Elite': {
      totalParts = 3;
      progressParts = (Math.min(w, 12) / 12 + Math.min(i, 4) / 4 + Math.min(a, 5) / 5) / 3 * 3;
      if (w < 12) parts.push(`Win ${12 - w} more`);
      if (i < 4) parts.push(`Beat ${4 - i} more insurer${4 - i === 1 ? '' : 's'}`);
      if (a < 5) parts.push(`File ${5 - a} more appeal${5 - a === 1 ? '' : 's'}`);
      break;
    }
    case 'Legend': {
      totalParts = 3;
      progressParts = (Math.min(w, 20) / 20 + Math.min(i, 5) / 5 + Math.min(a, 10) / 10) / 3 * 3;
      if (w < 20) parts.push(`Win ${20 - w} more`);
      if (i < 5) parts.push(`Beat ${5 - i} more insurer${5 - i === 1 ? '' : 's'}`);
      if (a < 10) parts.push(`File ${10 - a} more appeal${10 - a === 1 ? '' : 's'}`);
      break;
    }
    default:
      return { progress: 0, text: '' };
  }

  const progress = totalParts > 0 ? Math.min(progressParts / totalParts, 0.99) : 0;
  const text = parts.length > 0 ? parts.join(' + ') : 'Almost there!';
  return { progress, text };
}

export type UserBuddyStats = FullStats;

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
 * Now accepts full stats with insurersBeaten for multi-dimensional ranking.
 */
export function checkRankUp(
  oldStats: FullStats,
  newStats: FullStats
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

  return name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}
