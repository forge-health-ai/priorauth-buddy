import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, radii } from '../theme';
import { getInsurerAbbrev } from '../lib/buddy-evolution';

interface BuddyWinBadgesProps {
  insurersBeaten: string[];
}

export function BuddyWinBadges({ insurersBeaten }: BuddyWinBadgesProps) {
  const { colors, typography } = useTheme();

  if (insurersBeaten.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
        INSURERS BEATEN
      </Text>
      <View style={styles.badgeRow}>
        {insurersBeaten.map((name, i) => (
          <View key={i} style={[styles.badge, { backgroundColor: `${colors.success}20`, borderColor: `${colors.success}40` }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>
              {getInsurerAbbrev(name)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.card,
    padding: 16,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
