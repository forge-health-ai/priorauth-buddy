import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../../src/theme';
import { useThemeMode, AppearanceMode } from '../../src/context/ThemeContext';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { FORGEButton } from '../../src/components/FORGEButton';
import { supabase } from '../../src/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import { getUserBuddyStats, getBuddyRank, UserBuddyStats } from '../../src/lib/buddy-evolution';
import { RankProgressCard } from '../../src/components/RankProgressCard';
import { BuddyWinBadges } from '../../src/components/BuddyWinBadges';
import { ShareCard } from '../../src/components/ShareCard';
import { shareRankAchievement } from '../../src/lib/share-card';
import { getSubscriptionStatus } from '../../src/lib/subscription';
import { EvolutionPath } from '../../src/components/EvolutionPath';
import { getNotificationPrefs, saveNotificationPrefs, requestNotificationPermission, refreshNotifications, NotificationPrefs } from '../../src/lib/notifications';

function SettingRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.settingRow, { borderBottomColor: colors.tabBarBorder }]}>
      <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
      <Text style={[typography.body, { color: colors.textTertiary }]}>{value || '→'}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({ enabled: false, deadlineReminders: true, checkInNudges: true, weeklyDigest: true });
  const [userEmail, setUserEmail] = useState<string>('');
  const [stats, setStats] = useState({
    cases: 0,
    appeals: 0,
    calls: 0,
    wins: 0,
  });
  const [buddyStats, setBuddyStats] = useState<UserBuddyStats>({ appealsFiled: 0, wins: 0, insurersBeaten: [] });
  const [isPro, setIsPro] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const { mode: appearanceMode, setMode: setAppearanceMode } = useThemeMode();

  const fetchUserData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');

        // Fetch cases count
        const { count: casesCount } = await supabase
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Fetch appeals count
        const { count: appealsCount } = await supabase
          .from('appeals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Fetch call logs count (from case_updates with type 'call')
        const { count: callsCount } = await supabase
          .from('case_updates')
          .select('*', { count: 'exact', head: true })
          .eq('update_type', 'call');

        // Fetch wins (appeal_approved or approved status)
        const { count: winsCount } = await supabase
          .from('cases')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['appeal_approved', 'approved']);

        setStats({
          cases: casesCount ?? 0,
          appeals: appealsCount ?? 0,
          calls: callsCount ?? 0,
          wins: winsCount ?? 0,
        });
      }

      // Fetch buddy evolution stats
      const bStats = await getUserBuddyStats();
      setBuddyStats(bStats);

      const sub = await getSubscriptionStatus();
      setIsPro(sub.tier === 'pro');
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      getNotificationPrefs().then(setNotifPrefs);
    }, [fetchUserData])
  );

  const toggleNotifications = async (enabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return; // OS denied, don't flip the toggle
    }
    const updated = { ...notifPrefs, enabled };
    setNotifPrefs(updated);
    await saveNotificationPrefs(updated);
    if (enabled) {
      // Get user ID and refresh notifications
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) await refreshNotifications(session.user.id);
      } catch {}
    }
  };

  const toggleNotifSetting = async (key: 'deadlineReminders' | 'checkInNudges' | 'weeklyDigest') => {
    Haptics.selectionAsync();
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await saveNotificationPrefs(updated);
    if (updated.enabled) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) await refreshNotifications(session.user.id);
      } catch {}
    }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
          <Text style={[typography.h1, { color: colors.text }]}>Profile</Text>
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/upgrade'); }}>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.proCard}>
              <View style={styles.proContent}>
                <BuddyMascot mood="celebrating" size={70} isPro={true} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h2, { color: '#FFFFFF' }]}>Go Pro</Text>
                  <Text style={[typography.body, { color: 'rgba(255,255,255,0.8)' }]}>Unlimited cases, appeals, and priority support</Text>
                  <Text style={[typography.h3, { color: '#FFB800', marginTop: 4 }]}>$4.99/month</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={[typography.h3, { color: colors.textSecondary, marginBottom: 12 }]}>YOUR STATS</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Cases Tracked', value: String(stats.cases), color: colors.primary },
              { label: 'Appeals Written', value: String(stats.appeals), color: colors.accent },
              { label: 'Calls Logged', value: String(stats.calls), color: colors.secondary },
              { label: 'Wins', value: String(stats.wins), color: colors.success },
            ].map((stat, i) => (
              <View key={i} style={[styles.statBox, { backgroundColor: colors.surface }]}>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 24, color: stat.color }}>{stat.value}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()} style={{ marginTop: 16, gap: 12 }}>
          <RankProgressCard stats={buddyStats} onPress={() => { Haptics.selectionAsync(); setShowEvolution(true); }} />
          {buddyStats.insurersBeaten.length > 0 && (
            <BuddyWinBadges insurersBeaten={buddyStats.insurersBeaten} />
          )}
          <FORGEButton
            title="Share My Rank"
            onPress={() => {
              const rank = getBuddyRank(buddyStats);
              shareRankAchievement(rank, buddyStats.wins, stats.cases - buddyStats.wins);
            }}
            variant="secondary"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[typography.h3, { color: colors.textSecondary, marginBottom: 12, marginTop: 24 }]}>SETTINGS</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.tabBarBorder }]}>
              <Text style={[typography.body, { color: colors.text }]}>Appearance</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['light', 'dark', 'auto'] as AppearanceMode[]).map(m => (
                  <Pressable
                    key={m}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAppearanceMode(m); }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: appearanceMode === m ? `${colors.primary}20` : 'transparent',
                      borderWidth: 1,
                      borderColor: appearanceMode === m ? colors.primary : colors.tabBarBorder,
                    }}
                  >
                    <Text style={[typography.caption, { color: appearanceMode === m ? colors.primary : colors.textSecondary }]}>
                      {m === 'light' ? '☀️' : m === 'dark' ? '🌙' : '⚙️'} {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[styles.settingRow, { borderBottomColor: colors.tabBarBorder }]}>
              <Text style={[typography.body, { color: colors.text }]}>Push Notifications</Text>
              <Switch
                value={notifPrefs.enabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: colors.surfaceElevated, true: `${colors.primary}60` }}
                thumbColor={notifPrefs.enabled ? colors.primary : colors.textTertiary}
              />
            </View>
            {notifPrefs.enabled && (
              <View style={{ paddingLeft: 16, gap: 0 }}>
                <View style={[styles.settingRow, { borderBottomColor: colors.tabBarBorder }]}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>🛡️ Deadline reminders</Text>
                  <Switch value={notifPrefs.deadlineReminders} onValueChange={() => toggleNotifSetting('deadlineReminders')} trackColor={{ false: colors.surfaceElevated, true: `${colors.primary}60` }} thumbColor={notifPrefs.deadlineReminders ? colors.primary : colors.textTertiary} />
                </View>
                <View style={[styles.settingRow, { borderBottomColor: colors.tabBarBorder }]}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>💬 Check-in nudges</Text>
                  <Switch value={notifPrefs.checkInNudges} onValueChange={() => toggleNotifSetting('checkInNudges')} trackColor={{ false: colors.surfaceElevated, true: `${colors.primary}60` }} thumbColor={notifPrefs.checkInNudges ? colors.primary : colors.textTertiary} />
                </View>
                <View style={[styles.settingRow, { borderBottomColor: colors.tabBarBorder }]}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>📊 Weekly digest</Text>
                  <Switch value={notifPrefs.weeklyDigest} onValueChange={() => toggleNotifSetting('weeklyDigest')} trackColor={{ false: colors.surfaceElevated, true: `${colors.primary}60` }} thumbColor={notifPrefs.weeklyDigest ? colors.primary : colors.textTertiary} />
                </View>
              </View>
            )}
            <SettingRow label="Upgrade to Pro" value="$4.99/mo" onPress={() => router.push('/upgrade')} />
            <SettingRow label="Account" value={userEmail || 'Signed In'} />
            <SettingRow label="Help & Support" onPress={() => router.push('/help')} />
            <SettingRow label="Privacy Policy" onPress={() => router.push('/privacy')} />
            <SettingRow label="Terms of Service" onPress={() => router.push('/terms-of-service')} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.signOutSection}>
          <FORGEButton title="Sign Out" onPress={handleSignOut} variant="ghost" />
          <Pressable
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'This will permanently delete your account, email and all server-side data. Case data stored on your device will remain until you uninstall the app. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete My Account',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        // Delete profile data from Supabase
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                          await supabase.from('profiles').delete().eq('id', user.id);
                          await supabase.from('appeals').delete().eq('user_id', user.id);
                        }
                        await supabase.auth.signOut();
                      } catch (e) {
                        console.error('Delete account error:', e);
                        Alert.alert('Error', 'Could not delete account. Please email support@priorauthbuddy.com for assistance.');
                      }
                    },
                  },
                ]
              );
            }}
            style={{ alignSelf: 'center', paddingTop: 12 }}
          >
            <Text style={[typography.caption, { color: colors.error }]}>Delete Account</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>PriorAuth Buddy v1.0.0</Text>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>A FORGE Labs Product</Text>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>2026 Forge Partners Inc.</Text>
        </Animated.View>
      </ScrollView>

      <EvolutionPath
        visible={showEvolution}
        currentRank={getBuddyRank(buddyStats)}
        onClose={() => setShowEvolution(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { paddingTop: 8, paddingBottom: 16, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proCard: { borderRadius: radii.card, padding: 20, marginBottom: 24 },
  proContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: {
    width: '47%' as any, borderRadius: radii.card, padding: 16, alignItems: 'center', gap: 4,
    shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  settingsCard: { borderRadius: radii.card, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  signOutSection: { marginTop: 24 },
  footer: { marginTop: 32, gap: 4, paddingBottom: 20 },
});
