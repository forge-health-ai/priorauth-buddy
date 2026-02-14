import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii, scales, springs } from '../theme';

export type CaseStatus = 'pending' | 'approved' | 'denied' | 'appealing' | 'appeal_approved' | 'appeal_denied' | 'expired';

interface CaseCardProps {
  procedureName: string;
  insuranceCompany: string;
  status: CaseStatus;
  daysRemaining?: number;
  dateSubmitted: string;
  onPress?: () => void;
}

const statusMap: Record<CaseStatus, { label: string; colorKey: string; emoji: string }> = {
  pending: { label: 'Pending', colorKey: 'warning', emoji: '⏳' },
  approved: { label: 'Approved', colorKey: 'success', emoji: '✅' },
  denied: { label: 'Denied', colorKey: 'error', emoji: '❌' },
  appealing: { label: 'Appealing', colorKey: 'accent', emoji: '⚔️' },
  appeal_approved: { label: 'Appeal Won', colorKey: 'success', emoji: '🎉' },
  appeal_denied: { label: 'Appeal Denied', colorKey: 'error', emoji: '💔' },
  expired: { label: 'Expired', colorKey: 'textTertiary', emoji: '⏰' },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CaseCard({ procedureName, insuranceCompany, status, daysRemaining, dateSubmitted, onPress }: CaseCardProps) {
  const { colors, typography } = useTheme();
  const scale = useSharedValue(1);
  const cfg = statusMap[status];
  const statusColor = (colors as any)[cfg.colorKey] || colors.textTertiary;
  const isUrgent = daysRemaining !== undefined && daysRemaining <= 3 && (status === 'pending' || status === 'appealing');

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={animStyle}
      onPressIn={() => { scale.value = withSpring(scales.cardPress, springs.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, springs.default); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: statusColor, shadowColor: colors.cardShadow }]}>
        <View style={styles.header}>
          <Text style={[typography.h3, { color: colors.text, flex: 1 }]} numberOfLines={1}>{procedureName}</Text>
          <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[typography.caption, { color: statusColor }]}>{cfg.emoji} {cfg.label}</Text>
          </View>
        </View>
        <Text style={[typography.body, { color: colors.textSecondary }]}>{insuranceCompany}</Text>
        <View style={styles.footer}>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>Submitted {dateSubmitted}</Text>
          {daysRemaining !== undefined && (status === 'pending' || status === 'appealing') && (
            <Text style={[typography.caption, { color: isUrgent ? colors.error : colors.textSecondary, fontFamily: 'Outfit_600SemiBold' }]}>
              {isUrgent ? '🔥 ' : ''}{daysRemaining}d remaining
            </Text>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, padding: 16, borderLeftWidth: 4, gap: 8, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});
