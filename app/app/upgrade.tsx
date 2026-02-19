import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../src/theme';
import { BuddyMascot } from '../src/components/BuddyMascot';
import { FORGEButton } from '../src/components/FORGEButton';
import { useBuddy } from '../src/context/BuddyContext';

const FEATURES = [
  { icon: '📝', title: 'Unlimited AI Appeal Letters', desc: 'Tailored to your insurer\'s playbook' },
  { icon: '📞', title: 'AI Call Coach', desc: 'Practice before every call with real scenarios' },
  { icon: '🔍', title: 'Denial Analyzer', desc: 'Paste denial letters for instant AI breakdown' },
  { icon: '📄', title: 'DOI Complaint Generator', desc: 'Escalate to your state\'s Department of Insurance' },
  { icon: '🛡️', title: 'Unlimited Cases', desc: 'Track and fight every denial' },
  { icon: '🧠', title: 'Insurer Intelligence', desc: 'Know their denial patterns and weaknesses' },
  { icon: '⏰', title: 'Smart Deadline Alerts', desc: 'Never miss an appeal window again' },
  { icon: '📊', title: 'Priority Support', desc: 'Get help when you need it most' },
];

export default function UpgradeScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { purchasePro, restorePurchases } = useBuddy();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleSubscribe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    try {
      const result = await purchasePro();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      } else if (result.error && result.error !== 'cancelled') {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored!', 'Your Pro subscription has been restored.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for your account.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Text style={[typography.body, { color: colors.primary }]}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.heroSection}>
          <BuddyMascot mood="excited" size={90} isPro={true} />
          <Text style={[typography.h1, { color: colors.text, textAlign: 'center' }]}>Upgrade to Pro</Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Your insurance company has a full team working against you. Level up your fight.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.priceCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <View style={styles.priceRow}>
            <Text style={[typography.h1, { color: colors.primary, fontSize: 40 }]}>$4.99</Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>/month</Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
            Cancel anytime. Less than a coffee. Worth more than a lawyer.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ gap: 2 }}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>Everything in Pro</Text>
          {FEATURES.map((feature, i) => (
            <Animated.View key={feature.title} entering={FadeInDown.delay(250 + i * 40).springify()}>
              <View style={[styles.featureRow, { borderBottomColor: `${colors.border}50` }]}>
                <Text style={{ fontSize: 20 }}>{feature.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.text, fontFamily: 'Outfit_600SemiBold' }]}>{feature.title}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{feature.desc}</Text>
                </View>
                <Text style={{ color: colors.success }}>✓</Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).springify()} style={[styles.freeVsPro, { backgroundColor: `${colors.primary}08` }]}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>Free vs Pro</Text>
          <View style={styles.compareRow}>
            <Text style={[typography.body, { color: colors.textSecondary, flex: 1 }]}>Cases</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, width: 60, textAlign: 'center' }]}>1</Text>
            <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold', width: 80, textAlign: 'center' }]}>Unlimited</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[typography.body, { color: colors.textSecondary, flex: 1 }]}>Appeal Letters</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, width: 60, textAlign: 'center' }]}>1</Text>
            <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold', width: 80, textAlign: 'center' }]}>Unlimited</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[typography.body, { color: colors.textSecondary, flex: 1 }]}>Call Coach</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, width: 60, textAlign: 'center' }]}>--</Text>
            <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold', width: 80, textAlign: 'center' }]}>✓</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[typography.body, { color: colors.textSecondary, flex: 1 }]}>Denial Analyzer</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, width: 60, textAlign: 'center' }]}>--</Text>
            <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold', width: 80, textAlign: 'center' }]}>✓</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[typography.body, { color: colors.textSecondary, flex: 1 }]}>Insurer Intel</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, width: 60, textAlign: 'center' }]}>Basic</Text>
            <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold', width: 80, textAlign: 'center' }]}>Full</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.ctaSection}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ paddingVertical: 16 }} />
          ) : (
            <FORGEButton title="Start Pro - $4.99/month" onPress={handleSubscribe} />
          )}

          <Pressable onPress={handleRestore} disabled={restoring} hitSlop={20} style={{ alignSelf: 'center', paddingTop: 12 }}>
            {restoring ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Restore Purchases</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} hitSlop={20} style={{ alignSelf: 'center', paddingTop: 8 }}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>Maybe later</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  heroSection: { alignItems: 'center', gap: 8, paddingTop: 8 },
  priceCard: { borderWidth: 2, borderRadius: radii.card, padding: 20, alignItems: 'center', gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  freeVsPro: { borderRadius: radii.card, padding: 16, gap: 4 },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  ctaSection: { gap: 4, paddingTop: 8 },
});
