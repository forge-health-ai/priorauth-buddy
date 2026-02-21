import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'buddy_streak_data';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string | null; // ISO date string (YYYY-MM-DD)
  totalCheckIns: number;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function getStreakData(): Promise<StreakData> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { currentStreak: 0, longestStreak: 0, lastCheckIn: null, totalCheckIns: 0 };
}

/**
 * Record a check-in for today. Returns updated streak data
 * and whether a new milestone was hit.
 */
export async function recordCheckIn(): Promise<{ data: StreakData; milestone: number | null }> {
  const data = await getStreakData();
  const today = todayString();
  const yesterday = yesterdayString();

  // Already checked in today
  if (data.lastCheckIn === today) {
    return { data, milestone: null };
  }

  const oldStreak = data.currentStreak;

  if (data.lastCheckIn === yesterday) {
    // Consecutive day — extend streak
    data.currentStreak++;
  } else if (data.lastCheckIn === null) {
    // First ever check-in
    data.currentStreak = 1;
  } else {
    // Streak broken — reset to 1
    data.currentStreak = 1;
  }

  data.lastCheckIn = today;
  data.totalCheckIns++;

  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }

  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));

  // Check milestones
  const milestones = [3, 7, 14, 30, 60, 100];
  const milestone = milestones.includes(data.currentStreak) ? data.currentStreak : null;

  return { data, milestone };
}

/**
 * Get an encouraging message based on streak count.
 */
export function getStreakMessage(streak: number, name?: string): string {
  const hey = name ? `${name}, ` : '';

  if (streak === 0) return `${hey}start your streak today!`;
  if (streak === 1) return `${hey}day 1 — every fight starts here.`;
  if (streak === 2) return `${hey}2 days strong. You're building momentum.`;
  if (streak === 3) return `${hey}3-day streak! Insurance companies hate consistency.`;
  if (streak <= 5) return `${hey}${streak} days straight. You're not backing down.`;
  if (streak <= 7) return `${hey}${streak}-day streak! A full week of fighting.`;
  if (streak <= 14) return `${hey}${streak} days. They're starting to notice you.`;
  if (streak <= 30) return `${hey}${streak}-day streak! You're relentless.`;
  if (streak <= 60) return `${hey}${streak} days. You're a force of nature.`;
  return `${hey}${streak}-day streak. Legendary. They fear you.`;
}

/**
 * Get the milestone celebration message.
 */
export function getMilestoneMessage(days: number): string {
  switch (days) {
    case 3: return '3-day streak! Most people give up by now. Not you. 🔥';
    case 7: return '7 days straight! A full week of fighting for your health. 🛡️';
    case 14: return '2-week streak! You are relentless. Insurance companies dread people like you. ⚔️';
    case 30: return '30-DAY STREAK! One month of not backing down. You are unstoppable. 🏆';
    case 60: return '60 days. Two months. You are the definition of persistence. ⭐';
    case 100: return '100-DAY STREAK. You are a legend. The system was not built for someone like you. 👑';
    default: return `${days}-day streak! Keep going!`;
  }
}
