import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, radii } from '../../src/theme';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { FORGEButton } from '../../src/components/FORGEButton';
import { EmptyState } from '../../src/components/EmptyState';

const HAS_CASES = false;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ label, value, color, bgColor }: { label: string; value: string; color: string; bgColor: string }) {
  const { typography, colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={[{ fontFamily: typography.display.fontFamily, fontSize: 28, color }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { colors, typography } = useTheme();

  if (!HAS_CASES) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.text }]}>PriorAuth Buddy</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{getGreeting()} 👋</Text>
        </View>
        <EmptyState
          mood="sleeping"
          title="Nothing here yet"
          subtitle="Tap + to add your first case and start fighting back"
          actionLabel="Add Your First Case"
          onAction={() => {}}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.text }]}>PriorAuth Buddy</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{getGreeting()} 👋</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.buddySection}>
          <BuddyMascot mood="happy" size={120} />
          <View style={styles.scoreContainer}>
            <Text style={[typography.display, { color: colors.primary }]}>85</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Fight Score</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsRow}>
          <StatCard label="Pending" value="2" color={colors.warning} bgColor={colors.surface} />
          <StatCard label="Denied" value="1" color={colors.error} bgColor={colors.surface} />
          <StatCard label="Won" value="3" color={colors.success} bgColor={colors.surface} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <LinearGradient colors={[`${colors.error}15`, `${colors.error}05`]} style={styles.alertCard}>
            <Text style={[typography.h3, { color: colors.error }]}>🔥 Deadline Alert</Text>
            <Text style={[typography.body, { color: colors.text }]}>MRI Pre-Authorization expires in 2 days</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>UnitedHealthcare - Ref #PA2024-1847</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.actions}>
          <FORGEButton title="Add Case" onPress={() => {}} />
          <FORGEButton title="Call Insurance" onPress={() => {}} variant="secondary" />
          <FORGEButton title="Write Appeal" onPress={() => {}} variant="secondary" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 },
  buddySection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  scoreContainer: { alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: radii.card, padding: 16, alignItems: 'center', gap: 4,
    shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  alertCard: {
    borderRadius: radii.card, padding: 16, gap: 6, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255, 59, 92, 0.15)',
  },
  actions: { gap: 12 },
});
