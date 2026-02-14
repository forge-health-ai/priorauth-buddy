import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../../src/theme';
import { BuddyMascot } from '../../src/components/BuddyMascot';

function SettingRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.settingRow, { borderBottomColor: colors.tabBarBorder }]}>
      <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
      <Text style={[typography.body, { color: colors.textTertiary }]}>{value || '→'}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const [notifications, setNotifications] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.text }]}>Profile</Text>
        </View>

        <Animated.View entering={FadeInDown.springify()}>
          <Pressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.proCard}>
              <View style={styles.proContent}>
                <BuddyMascot mood="celebrating" size={70} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h2, { color: '#FFFFFF' }]}>Go Pro 👑</Text>
                  <Text style={[typography.body, { color: 'rgba(255,255,255,0.8)' }]}>Unlimited cases, appeals, and priority support</Text>
                  <Text style={[typography.h3, { color: '#FFB800', marginTop: 4 }]}>$4.99/month</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={[typography.h3, { color: colors.textSecondary, marginBottom: 12 }]}>YOUR STATS</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Cases Tracked', value: '0', color: colors.primary },
              { label: 'Appeals Written', value: '0', color: colors.accent },
              { label: 'Calls Logged', value: '0', color: colors.secondary },
              { label: 'Wins', value: '0', color: colors.success },
            ].map((stat, i) => (
              <View key={i} style={[styles.statBox, { backgroundColor: colors.surface }]}>
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 24, color: stat.color }}>{stat.value}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[typography.h3, { color: colors.textSecondary, marginBottom: 12, marginTop: 24 }]}>SETTINGS</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.settingRow, { borderBottomColor: colors.tabBarBorder }]}>
              <Text style={[typography.body, { color: colors.text }]}>Push Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotifications(v); }}
                trackColor={{ false: colors.surfaceElevated, true: `${colors.primary}60` }}
                thumbColor={notifications ? colors.primary : colors.textTertiary}
              />
            </View>
            <SettingRow label="Account" value="Sign In" />
            <SettingRow label="Help & Support" />
            <SettingRow label="Privacy Policy" />
            <SettingRow label="Terms of Service" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.footer}>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>PriorAuth Buddy v1.0.0</Text>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>A FORGE Labs Product</Text>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>© 2026 Forge Partners Inc.</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { paddingTop: 16, paddingBottom: 16 },
  proCard: { borderRadius: radii.card, padding: 20, marginBottom: 24 },
  proContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: {
    width: '47%' as any, borderRadius: radii.card, padding: 16, alignItems: 'center', gap: 4,
    shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  settingsCard: { borderRadius: radii.card, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  footer: { marginTop: 32, gap: 4, paddingBottom: 20 },
});
