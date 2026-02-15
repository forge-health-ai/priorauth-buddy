import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii, springs } from '../../src/theme';
import { useRouter } from 'expo-router';
import { CaseCard } from '../../src/components/CaseCard';
import { EmptyState } from '../../src/components/EmptyState';
import { MiniBuddy } from '../../src/components/MiniBuddy';

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MiniBuddy mood="thinking" size={24} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
        </View>
        <Text style={[typography.h1, { color: colors.text }]}>Cases</Text>
      </View>
      <EmptyState
        mood="confused"
        title="No cases yet"
        subtitle="Track your prior authorizations and never miss a deadline. Tap + to get started."
      />
      <FAB onPress={() => router.push('/case/add')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fab: { position: 'absolute', bottom: 100, right: 20 },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '300', marginTop: -2 },
});
