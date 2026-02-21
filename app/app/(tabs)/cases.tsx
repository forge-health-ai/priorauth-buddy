import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii, springs } from '../../src/theme';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CaseCard } from '../../src/components/CaseCard';
import { EmptyState } from '../../src/components/EmptyState';
import { MiniBuddy } from '../../src/components/MiniBuddy';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { useBuddy } from '../../src/context/BuddyContext';
import { getBuddyRank } from '../../src/lib/buddy-evolution';
import { supabase } from '../../src/lib/supabase';
import { getCases, Case } from '../../src/lib/local-storage';

function FAB({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.fab, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.9, springs.snappy); }}
        onPressOut={() => { scale.value = withSpring(1, springs.default); }}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      >
        <LinearGradient colors={[colors.primary, colors.primaryEnd]} style={styles.fabGradient}>
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function CasesScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { buddyStats, isPro } = useBuddy();
  const rank = getBuddyRank(buddyStats);
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [cases, setCases] = useState<Case[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pick up filter from navigation params
  useEffect(() => {
    if (filter) setActiveFilter(filter);
  }, [filter]);

  const fetchCases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use local storage instead of Supabase for PHI compliance
      const localCases = await getCases(user.id);
      setCases(localCases);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCases();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

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
    // Map DB status to CaseCard status
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
            <Text style={[typography.h1, { color: colors.text }]}>Cases</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/case/add'); }}
            style={{ marginTop: 4 }}
          >
            <LinearGradient colors={[colors.primary, colors.primaryEnd]} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24, color: '#FFFFFF', fontWeight: '300', marginTop: -2 }}>+</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {cases.length > 0 && (
        <View style={styles.buddyRow}>
          <BuddyMascot
            mood={cases.some(c => ['denied', 'appeal_denied'].includes(c.status)) ? 'determined' : 'thinking'}
            size={50}
            rank={rank}
            isPro={isPro}
          />
          <View style={[styles.buddyBubble, { backgroundColor: `${colors.primary}12` }]}>
            <Text style={[typography.caption, { color: colors.text }]}>
              {cases.length === 1
                ? "I'm watching your case. Let's stay on top of it."
                : `Tracking ${cases.length} cases. I've got my eyes on all of them.`}
            </Text>
          </View>
        </View>
      )}

      {cases.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, paddingHorizontal: 20, marginBottom: 4 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
          {['all', 'pending', 'denied', 'won'].map(f => {
            const isActive = f === 'all' ? !activeFilter : activeFilter === f;
            const chipColors: Record<string, string> = { pending: colors.warning, denied: colors.error, won: colors.success };
            return (
              <Pressable key={f} onPress={() => { Haptics.selectionAsync(); setActiveFilter(f === 'all' ? null : f); }} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: isActive ? (chipColors[f] || colors.primary) + '20' : colors.surface, borderWidth: 1, borderColor: isActive ? chipColors[f] || colors.primary : colors.tabBarBorder }}>
                <Text style={[typography.caption, { color: isActive ? chipColors[f] || colors.primary : colors.textSecondary, fontFamily: isActive ? 'Outfit_600SemiBold' : 'Outfit_400Regular' }]}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {cases.length === 0 && !loading ? (
        <EmptyState
          mood="sleeping"
          title="No cases yet"
          subtitle="Track your prior authorizations and never miss a deadline. Tap + to wake Buddy up!"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {cases.filter(c => {
            if (!activeFilter) return true;
            if (activeFilter === 'pending') return c.status === 'pending';
            if (activeFilter === 'denied') return ['denied', 'appeal_denied'].includes(c.status);
            if (activeFilter === 'won') return ['approved', 'appeal_won'].includes(c.status);
            return true;
          }).map((caseItem, index) => (
            <Animated.View
              key={caseItem.id}
              entering={FadeInDown.delay(index * 50).springify()}
              style={styles.caseCardWrapper}
            >
              <CaseCard
                procedureName={caseItem.procedure_name}
                insuranceCompany={caseItem.insurer_name || 'Unknown Insurer'}
                status={getCaseStatus(caseItem.status)}
                daysRemaining={getDaysRemaining(caseItem.appeal_deadline)}
                dateSubmitted={formatDate(caseItem.created_at)}
                onPress={() => router.push(`/case/${caseItem.id}`)}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, gap: 2 },
  buddyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 10 },
  buddyBubble: { flex: 1, borderRadius: radii.card, padding: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  caseCardWrapper: { marginBottom: 12 },
  fab: { position: 'absolute', bottom: 100, right: 20 },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '300', marginTop: -2 },
});
