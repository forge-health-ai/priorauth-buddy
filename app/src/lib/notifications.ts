import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Case } from './local-storage';

const NOTIF_PREFS_KEY = 'buddy_notification_prefs';
const SCHEDULED_NOTIFS_KEY = 'buddy_scheduled_notifs';

export interface NotificationPrefs {
  enabled: boolean;
  deadlineReminders: boolean;
  checkInNudges: boolean;
  weeklyDigest: boolean;
  userName?: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  deadlineReminders: true,
  checkInNudges: true,
  weeklyDigest: true,
};

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const stored = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_PREFS;
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// Helper to personalize messages
function greet(name?: string): string {
  return name ? `Hey ${name}` : 'Hey';
}

/**
 * Schedule all notifications based on current cases.
 * Call this after any case update, status change, or pref change.
 */
export async function scheduleAllNotifications(cases: Case[], prefs?: NotificationPrefs): Promise<void> {
  if (Platform.OS === 'web') return;

  const p = prefs || await getNotificationPrefs();
  if (!p.enabled) return;

  // Cancel all existing scheduled notifications and reschedule fresh
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const name = p.userName;

  if (p.deadlineReminders) {
    for (const c of cases) {
      if (!c.appeal_deadline) continue;
      if (!['denied', 'appealing', 'pending'].includes(c.status)) continue;

      const deadline = new Date(c.appeal_deadline);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // 7-day warning
      if (daysLeft > 7 && daysLeft <= 14) {
        const triggerDate = new Date(deadline.getTime() - 7 * 24 * 60 * 60 * 1000);
        triggerDate.setHours(9, 0, 0, 0);
        if (triggerDate > now) {
          await scheduleNotification(
            `${greet(name)}, 7 days left to appeal`,
            `Your deadline for "${c.procedure_name}" is coming up. Let's get your letter ready. I've got your back. - Buddy 🛡️`,
            triggerDate,
          );
        }
      }

      // 3-day urgent
      if (daysLeft > 3 && daysLeft <= 7) {
        const triggerDate = new Date(deadline.getTime() - 3 * 24 * 60 * 60 * 1000);
        triggerDate.setHours(9, 0, 0, 0);
        if (triggerDate > now) {
          await scheduleNotification(
            `⚠️ ${greet(name)}, 3 days left!`,
            `"${c.procedure_name}" appeal deadline is almost here. Don't let ${c.insurer_name || 'them'} win by default. - Buddy 🛡️`,
            triggerDate,
          );
        }
      }

      // 1-day critical
      if (daysLeft > 1 && daysLeft <= 3) {
        const triggerDate = new Date(deadline.getTime() - 1 * 24 * 60 * 60 * 1000);
        triggerDate.setHours(9, 0, 0, 0);
        if (triggerDate > now) {
          await scheduleNotification(
            `🚨 ${greet(name)}, TOMORROW is the deadline`,
            `"${c.procedure_name}" — you appeal tomorrow or lose the right to fight. Let's do this now. - Buddy 🛡️`,
            triggerDate,
          );
        }
      }

      // Day-of final push
      if (daysLeft === 1 || (daysLeft <= 1 && daysLeft > 0)) {
        await scheduleNotification(
          `🚨 ${greet(name)}, TODAY is the day`,
          `Last chance to appeal "${c.procedure_name}". Open the app and I'll walk you through it. - Buddy 🛡️`,
          new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 8, 0, 0),
        );
      }
    }
  }

  if (p.checkInNudges) {
    // Check-in for cases idle more than 5 days
    const activeCases = cases.filter(c => ['denied', 'pending', 'appealing'].includes(c.status));
    for (const c of activeCases) {
      const lastUpdate = new Date(c.updated_at || c.created_at);
      const daysSince = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince >= 5) {
        // Schedule for tomorrow morning
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        await scheduleNotification(
          `${greet(name)}, any news on your case?`,
          `It's been ${daysSince} days since we worked on "${c.procedure_name}". Still fighting? I'm here when you need me. - Buddy 🛡️`,
          tomorrow,
        );
        break; // Only one check-in nudge at a time
      }
    }

    // Inactivity nudge if no app open in 7+ days
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);
    sevenDays.setHours(10, 0, 0, 0);

    if (activeCases.length > 0) {
      await scheduleNotification(
        `${greet(name)}, I miss you 🛡️`,
        `You have ${activeCases.length} active case${activeCases.length > 1 ? 's' : ''} that need attention. Insurance companies count on you giving up. Don't let them. - Buddy`,
        sevenDays,
      );
    }
  }

  if (p.weeklyDigest) {
    // Schedule weekly Sunday 6pm digest
    const nextSunday = new Date(now);
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
    nextSunday.setHours(18, 0, 0, 0);
    if (nextSunday <= now) nextSunday.setDate(nextSunday.getDate() + 7);

    const active = cases.filter(c => ['denied', 'pending', 'appealing'].includes(c.status)).length;
    const won = cases.filter(c => ['approved', 'appeal_won'].includes(c.status)).length;

    if (cases.length > 0) {
      await scheduleNotification(
        `${greet(name)}, your weekly update`,
        `${active} active case${active !== 1 ? 's' : ''}, ${won} win${won !== 1 ? 's' : ''}. ${won > 0 ? "You're making progress!" : "Keep fighting, it pays off."} - Buddy 🛡️`,
        nextSunday,
      );
    }
  }
}

async function scheduleNotification(title: string, body: string, triggerDate: Date): Promise<void> {
  try {
    const secondsFromNow = Math.max(1, Math.floor((triggerDate.getTime() - Date.now()) / 1000));
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsFromNow },
    });
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
  }
}

/**
 * Call on app launch and after any case update to refresh scheduled notifications.
 */
export async function refreshNotifications(userId: string): Promise<void> {
  try {
    const prefs = await getNotificationPrefs();
    if (!prefs.enabled) return;

    // Import dynamically to avoid circular deps
    const { getCases } = require('./local-storage');
    const cases = await getCases(userId);
    await scheduleAllNotifications(cases, prefs);
  } catch (e) {
    console.warn('Failed to refresh notifications:', e);
  }
}
