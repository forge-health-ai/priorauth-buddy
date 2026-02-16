import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../../src/theme';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { FORGEButton } from '../../src/components/FORGEButton';
import { EmptyState } from '../../src/components/EmptyState';
import { MiniBuddy } from '../../src/components/MiniBuddy';
import { CaseCard } from '../../src/components/CaseCard';
import { RankProgressCard } from '../../src/components/RankProgressCard';
import { BuddyWinBadges } from '../../src/components/BuddyWinBadges';
import { supabase, Case } from '../../src/lib/supabase';
import { generateAlerts, BuddyAlert } from '../../src/lib/buddy-alerts';
import { BuddyAlertCard } from '../../src/components/BuddyAlertCard';
import { getUserBuddyStats, getBuddyRank, UserBuddyStats } from '../../src/lib/buddy-evolution';
import { getSubscriptionStatus } from '../../src/lib/subscription';
import { useBuddy } from '../../src/context/BuddyContext';

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${timeGreeting}, ${name}` : timeGreeting;
}

function StatCard({ label, value, color, bgColor }: { label: string; value: string; color: string; bgColor: string }) {
  const { typography, colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 28, color }}>{value}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [fightScore, setFightScore] = useState(0);
  const [userName, setUserName] = useState<string>('');
  const [alerts, setAlerts] = useState<BuddyAlert[]>([]);
  const { rank, isPro, stats: buddyStats, refresh: refreshBuddy } = useBuddy();

  const fetchCases = useCallback(async () => {
    try {
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
      if (!userId) {
        setCases([]);
        setLoading(false);
        return;
      }
      const user = { id: userId };

      // Fetch user's display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      if (profile?.display_name) setUserName(profile.display_name);

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch cases error:', error);
        return;
      }

      const casesData = data || [];
      setCases(casesData);
      setAlerts(generateAlerts(casesData));

      // Calculate fight score
      let score = 0;
      casesData.forEach(c => {
        score += 10;
        if (c.status === 'appealing' || c.status === 'escalated') score += 20;
        if (c.status === 'complaint_filed') score += 30;
        if (c.status === 'appeal_won') score += 50;
      });
      setFightScore(Math.min(score, 100));

      // Refresh buddy evolution context
      refreshBuddy();
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCases();
    }, [fetchCases])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (deadlineString?: string) => {
    if (!deadlineString) return undefined;
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getCaseStatus = (status: string): any => {
    const statusMap: Record<string, any> = {
      'pending': 'pending',
      'approved': 'approved',
      'denied': 'denied',
      'appealing': 'appealing',
      'appeal_won': 'appeal_approved',
      'appeal_denied': 'appeal_denied',
      'escalated': 'appealing',
      'complaint_filed': 'appealing',
    };
    return statusMap[status] || 'pending';
  };

  // Calculate stats
  const pendingCount = cases.filter(c => c.status === 'pending').length;
  const deniedCount = cases.filter(c => c.status === 'denied').length;
  const wonCount = cases.filter(c => c.status === 'appeal_won' || c.status === 'approved').length;

  if (cases.length === 0 && !loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.centeredHeader}>
          <MiniBuddy mood="happy" size={32} />
          <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>PriorAuth Buddy</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{getGreeting(userName)}</Text>
        </Animated.View>
        <EmptyState
          mood="happy"
          title="Nothing here yet"
          subtitle="Tap + to add your first case and start fighting back"
          actionLabel="Add Your First Case"
          onAction={() => router.push('/(tabs)/cases')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.centeredHeader}>
          <MiniBuddy mood="happy" size={32} />
          <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>PriorAuth Buddy</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>{getGreeting(userName)}</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.buddySection}>
          <BuddyMascot mood="happy" size={120} />
          <Text style={[typography.body, { color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 20 }]}>
            "{rank?.quote || "Ready when you are. Let's fight this together."}"
          </Text>
          <View style={styles.scoreContainer}>
            <Text style={[typography.display, { color: colors.primary }]}>{fightScore}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Fight Score</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <RankProgressCard stats={buddyStats} />
        </Animated.View>

        {buddyStats.insurersBeaten.length > 0 && (
          <Animated.View entering={FadeInDown.delay(175).springify()}>
            <BuddyWinBadges insurersBeaten={buddyStats.insurersBeaten} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsRow}>
          <StatCard label="Pending" value={String(pendingCount)} color={colors.warning} bgColor={colors.surface} />
          <StatCard label="Denied" value={String(deniedCount)} color={colors.error} bgColor={colors.surface} />
          <StatCard label="Won" value={String(wonCount)} color={colors.success} bgColor={colors.surface} />
        </Animated.View>

        {alerts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={{ gap: 10 }}>
            <Text style={[typography.h3, { color: colors.text }]}>🛡️ Buddy Alerts</Text>
            {alerts.slice(0, 3).map((alert, i) => (
              <Animated.View key={alert.id} entering={FadeInDown.delay(350 + i * 80).springify()}>
                <BuddyAlertCard alert={alert} />
              </Animated.View>
            ))}
            {alerts.length > 3 && (
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                +{alerts.length - 3} more alerts
              </Text>
            )}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.recentCasesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.h3, { color: colors.text }]}>Recent Cases</Text>
            <Pressable onPress={() => router.push('/(tabs)/cases')} hitSlop={20}>
              <Text style={[typography.body, { color: colors.primary }]}>See all →</Text>
            </Pressable>
          </View>
          {cases.slice(0, 3).map((caseItem, index) => (
            <View key={caseItem.id} style={styles.caseCardWrapper}>
              <CaseCard
                procedureName={caseItem.procedure_name}
                insuranceCompany={caseItem.insurer_name || 'Unknown Insurer'}
                status={getCaseStatus(caseItem.status)}
                daysRemaining={getDaysRemaining(caseItem.appeal_deadline)}
                dateSubmitted={formatDate(caseItem.created_at)}
                onPress={() => router.push(`/case/${caseItem.id}`)}
              />
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.actions}>
          <FORGEButton title="Add Case" onPress={() => router.push('/case/add')} />
          <FORGEButton title="Call Insurance" onPress={() => router.push('/(tabs)/scripts')} variant="secondary" />
          <FORGEButton title="Write Appeal" onPress={() => router.push('/(tabs)/appeals')} variant="secondary" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 16 },
  centeredHeader: { alignItems: 'center', paddingTop: 16, paddingBottom: 12, gap: 4 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 },
  buddySection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  scoreContainer: { alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: radii.card, padding: 16, alignItems: 'center', gap: 4,
    shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  alertCard: {
    borderRadius: radii.card, padding: 16, gap: 6, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255, 59, 92, 0.15)',
  },
  recentCasesSection: {},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  caseCardWrapper: { marginBottom: 12 },
  actions: { gap: 12 },
});
