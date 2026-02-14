import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BuddyMascot, BuddyMood } from './BuddyMascot';
import { FORGEButton } from './FORGEButton';
import { useTheme } from '../theme';

interface EmptyStateProps {
  mood?: BuddyMood;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ mood = 'sleeping', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.container}>
      <BuddyMascot mood={mood} size={140} />
      <Text style={[styles.title, typography.h2, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, typography.body, { color: colors.textSecondary }]}>{subtitle}</Text>
      {actionLabel && onAction && (
        <View style={styles.action}>
          <FORGEButton title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  title: { textAlign: 'center', marginTop: 16 },
  subtitle: { textAlign: 'center' },
  action: { marginTop: 20 },
});
