import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../theme';
import { BuddyMascot } from './BuddyMascot';
import { RANKS, BuddyRank } from '../lib/buddy-evolution';

interface EvolutionPathProps {
  visible: boolean;
  currentRank: BuddyRank;
  onClose: () => void;
}

const RANK_REQUIREMENTS: Record<string, string> = {
  Rookie: 'Starting rank',
  Fighter: 'File 1 appeal',
  Advocate: 'Win 1 appeal',
  Warrior: 'Win 3 appeals',
  Champion: '5 wins + 2 insurers beaten',
  Veteran: '8 wins + 3 insurers beaten',
  Elite: '12 wins + 4 insurers + 5 appeals',
  Legend: '20 wins + 5 insurers + 10 appeals',
};

export function EvolutionPath({ visible, currentRank, onClose }: EvolutionPathProps) {
  const { colors, typography } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.text }]}>Evolution Path</Text>
          <Pressable onPress={() => { Haptics.selectionAsync(); onClose(); }} hitSlop={20}>
            <Text style={[typography.body, { color: colors.primary }]}>Done</Text>
          </Pressable>
        </View>

        <Text style={[typography.body, { color: colors.textSecondary, paddingHorizontal: 20, marginBottom: 16 }]}>
          Win appeals to evolve Buddy. Crown is earned, not bought.
        </Text>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {RANKS.map((rank, index) => {
            const isCurrent = rank.name === currentRank.name;
            const isLocked = rank.tier > currentRank.tier;
            const isUnlocked = rank.tier <= currentRank.tier;

            return (
              <Animated.View
                key={rank.name}
                entering={FadeInDown.delay(index * 80).springify()}
              >
                <View style={[
                  styles.rankCard,
                  {
                    backgroundColor: isCurrent ? `${rank.accentColor}15` : colors.surface,
                    borderColor: isCurrent ? rank.accentColor : colors.tabBarBorder,
                    opacity: isLocked ? 0.5 : 1,
                  }
                ]}>
                  <View style={styles.rankRow}>
                    <View style={styles.rankBadge}>
                      <BuddyMascot
                        mood={isCurrent ? 'happy' : isUnlocked ? 'happy' : 'sleeping'}
                        size={50}
                        rank={rank}
                      />
                    </View>
                    <View style={styles.rankInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[typography.h3, { color: isLocked ? colors.textTertiary : colors.text }]}>
                          {rank.name}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentBadge, { backgroundColor: rank.accentColor }]}>
                            <Text style={styles.currentText}>YOU</Text>
                          </View>
                        )}
                        {isLocked && (
                          <Text style={[typography.caption, { color: colors.textTertiary }]}>🔒</Text>
                        )}
                      </View>
                      <Text style={[typography.caption, { color: isLocked ? colors.textTertiary : colors.textSecondary }]}>
                        {rank.title}
                      </Text>
                      <Text style={[typography.caption, { color: isLocked ? colors.textTertiary : rank.accentColor, marginTop: 4 }]}>
                        {RANK_REQUIREMENTS[rank.name]}
                      </Text>
                    </View>
                  </View>
                  {!isLocked && (
                    <Text style={[typography.caption, { color: colors.textSecondary, fontStyle: 'italic', marginTop: 8 }]}>
                      "{rank.quote}"
                    </Text>
                  )}
                </View>

                {index < RANKS.length - 1 && (
                  <View style={styles.connector}>
                    <View style={[styles.connectorLine, {
                      backgroundColor: isUnlocked && RANKS[index + 1].tier <= currentRank.tier
                        ? rank.accentColor
                        : colors.tabBarBorder
                    }]} />
                  </View>
                )}
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  rankCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 16,
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rankBadge: { width: 50, height: 50 },
  rankInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  connector: { alignItems: 'center', height: 20 },
  connectorLine: { width: 2, height: 20, borderRadius: 1 },
});
