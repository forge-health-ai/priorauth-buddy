import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, radii } from '../src/theme';
import { FORGEButton } from '../src/components/FORGEButton';
import { BuddyMascot } from '../src/components/BuddyMascot';
import { MiniBuddy } from '../src/components/MiniBuddy';
import { supabase } from '../src/lib/supabase';

const DISCLAIMER_TEXT = `PriorAuth Buddy helps you understand and navigate the prior authorization process. It does not guarantee approval of any claim, provide medical or legal advice, or act on your behalf with your insurer. Always consult your healthcare provider or insurance company for decisions about your care.`;

const TERMS_VERSION = '1.0.0';

interface TermsScreenProps {
  onAccepted?: () => void;
}

export default function TermsScreen({ onAccepted }: TermsScreenProps) {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAccept = async () => {
    setErrorMsg(null);
    if (!accepted) {
      setErrorMsg('You must accept the terms to continue.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      // Try getUser first, fall back to getSession (getUser can 403 on some configs)
      let userId: string | null = null;
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (user) {
        userId = user.id;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id || null;
      }
      
      if (!userId) {
        console.error('No user found — session may be invalid');
        setErrorMsg('You must be signed in to accept terms.');
        setLoading(false);
        return;
      }

      // Update profile with terms acceptance
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          terms_accepted_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.error('Terms acceptance error:', error);
        setErrorMsg('Failed to save your acceptance. Please try again.');
        setLoading(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (onAccepted) {
        onAccepted();
      }
    } catch (error) {
      console.error('Terms acceptance error:', error);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MiniBuddy mood="happy" size={24} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
        </View>
        <Text style={[typography.h1, { color: colors.text }]}>Terms & Disclaimer</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.mascotSection}>
          <BuddyMascot mood="happy" size={100} />
          <Text style={[typography.h2, { color: colors.text, textAlign: 'center', marginTop: 16 }]}>
            Welcome, Advocate!
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Before we start fighting denials together, please review this important information.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={[`${colors.primary}08`, `${colors.primary}03`]}
            style={[styles.disclaimerCard, { borderColor: `${colors.primary}20` }]}
          >
            <Text style={[typography.h3, { color: colors.primary, marginBottom: 12 }]}>
              ⚖️ Important Disclaimer
            </Text>
            <Text style={[typography.body, { color: colors.text, lineHeight: 24 }]}>
              {DISCLAIMER_TEXT}
            </Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setAccepted(!accepted);
            }}
            style={[
              styles.checkboxRow,
              { 
                backgroundColor: accepted ? `${colors.success}10` : colors.surface,
                borderColor: accepted ? colors.success : colors.tabBarBorder,
              }
            ]}
          >
            <View style={[
              styles.checkbox,
              { 
                backgroundColor: accepted ? colors.success : 'transparent',
                borderColor: accepted ? colors.success : colors.textTertiary,
              }
            ]}>
              {accepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
              {'I understand and agree to these terms'}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.termsList}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 12 }]}>
            By using PriorAuth Buddy, you acknowledge:
          </Text>
          
          {[
            'This app provides educational information only',
            'We are not lawyers, doctors, or insurance agents',
            'You are responsible for your own insurance decisions',
            'Always verify information with your insurer',
          ].map((item, index) => (
            <View key={index} style={styles.bulletPoint}>
              <Text style={[typography.body, { color: colors.primary, marginRight: 8 }]}>•</Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}40` }]}>
            <Text style={[typography.body, { color: colors.error }]}>{errorMsg}</Text>
          </View>
        )}
        <FORGEButton
          title={loading ? 'Saving...' : 'Get Started'}
          onPress={handleAccept}
          loading={loading}
          disabled={!accepted}
        />
        <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center', marginTop: 12 }]}>
          Version {TERMS_VERSION} • Updated February 2026
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  mascotSection: { alignItems: 'center', paddingVertical: 16 },
  disclaimerCard: {
    borderRadius: radii.card,
    padding: 20,
    borderWidth: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radii.button,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsList: { marginTop: 8 },
  bulletPoint: { flexDirection: 'row', marginBottom: 8, paddingLeft: 4 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  errorBanner: { borderWidth: 1, borderRadius: radii.button, padding: 12, marginBottom: 12 },
});
