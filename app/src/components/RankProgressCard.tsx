import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, radii } from '../theme';
import { BuddyRank, getNextRankProgress } from '../lib/buddy-evolution';

interface RankProgressCardProps {
  stats: { appealsFiled: number; wins: number };
}

const RANK_EMOJI: Record<string, string> = {
  Rookie: '🛡️',
  Fighter: '⚔️',
  Advocate: '🏛️',
  Champion: '🏆',
  Legend: '👑',
};

export function RankProgressCard({ stats }: RankProgressCardProps) {
  const { colors, typography } = useTheme();
  const { current, next, progress, remaining } = getNextRankProgress(stats);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={{ fontSize: 20 }}>{RANK_EMOJI[current.name]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: colors.text }]}>{current.name}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{current.title}</Text>
        </View>
        {next && (
          <Text style={[typography.caption, { color: current.accentColor }]}>
            → {next.name}
          </Text>
        )}
      </View>

      {next && (
        <>
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(progress, 1) * 100}%`,
                  backgroundColor: current.accentColor,
                },
              ]}
            />
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{remaining}</Text>
        </>
      )}

      {!next && (
        <Text style={[typography.caption, { color: '#FFD700' }]}>Max rank reached!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    padding: 16,
    gap: 10,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
