import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../theme';
import { MiniBuddy } from './MiniBuddy';
import { BuddyAlert } from '../lib/buddy-alerts';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#22C55E',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '🔴 URGENT',
  high: '🟡 Important',
  medium: '🔵 Heads Up',
  low: '🟢 FYI',
};

export function BuddyAlertCard({ alert }: { alert: BuddyAlert }) {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const borderColor = PRIORITY_COLORS[alert.priority] || colors.border;

  const handlePress = () => {
    if (alert.actionRoute) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(alert.actionRoute);
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={!alert.actionRoute} style={[styles.card, { backgroundColor: colors.surface, borderColor, borderLeftWidth: 3 }]}>
      <View style={styles.row}>
        <MiniBuddy mood={alert.mood} size={32} />
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[typography.caption, { color: borderColor, fontFamily: 'Outfit_600SemiBold' }]}>
              {PRIORITY_LABELS[alert.priority]}
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.text, fontFamily: 'Outfit_600SemiBold', marginTop: 2 }]}>
            {alert.title}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
            {alert.message}
          </Text>
        </View>
      </View>
      {alert.actionLabel && alert.actionRoute && (
        <View style={[styles.actionBtn, { backgroundColor: `${borderColor}15` }]}>
          <Text style={[typography.caption, { color: borderColor, fontFamily: 'Outfit_600SemiBold' }]}>
            {alert.actionLabel} →
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { borderRadius: radii.button, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', marginLeft: 42 },
});
