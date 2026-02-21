import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii, springs } from '../../src/theme';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import type { BuddyMood } from '../../src/components/BuddyMascot';

const SCRIPT_ICONS: Record<string, string> = {
  '1': '📋',
  '2': '🔥',
  '3': '🔎',
  '4': '🎯',
  '5': '🤝',
};

const SCRIPTS: Array<{ id: string; scenario: string; buddyMood: BuddyMood; intro: string; phrases: string[]; rebuttals: Record<string, string>; tips: string[] }> = [
  {
    id: '1', scenario: 'Initial Status Check', buddyMood: 'thinking',
    intro: "Hi, I'm calling to check the status of a prior authorization request. My reference number is [NUMBER].",
    phrases: ['Can you tell me the current status?', 'When was this request received?', 'What is the expected decision date?', 'Is there any missing information I should provide?'],
    rebuttals: {
      "It's still in review": 'Can you tell me specifically where it is in the review process and who is handling it?',
      'We need more information': 'What specific information do you need? Can I provide it right now over the phone?',
      'Call back in a few days': "I understand, but can you give me a specific date? The treatment is time-sensitive.",
    },
    tips: ["Always get the representative's name and ID", 'Write down the date and time of your call', "Ask for a reference number if you don't have one"],
  },
  {
    id: '2', scenario: 'Deadline Approaching (Day 10+)', buddyMood: 'angry' as BuddyMood,
    intro: "Hi, I'm calling about an urgent prior authorization. It's been [X] days and I haven't received a decision.",
    phrases: ['This request was submitted on [DATE], which is [X] days ago', 'Federal regulations require a decision within [14/30] days', "I need to understand why there's been a delay", 'Can this be escalated for immediate review?'],
    rebuttals: {
      "We're backed up": "I understand you're busy, but the regulatory timeline still applies. Can a supervisor expedite this?",
      "It's with the medical director": 'When did it go to the medical director? What is the expected turnaround?',
      'We need a peer-to-peer review': "Can we schedule that today? My doctor is available.",
    },
    tips: ['Be firm but polite - you have rights', 'Mention regulatory timelines (14 days standard, 72 hours urgent)', 'Ask to escalate if past deadline'],
  },
  {
    id: '3', scenario: 'After Denial - Understanding Why', buddyMood: 'confused' as BuddyMood,
    intro: 'Hi, I received a denial for my prior authorization and I need to understand the specific reason.',
    phrases: ['What is the specific clinical reason for the denial?', 'What criteria was my request evaluated against?', 'What would I need to provide to get this approved?', 'I would like to request a peer-to-peer review with my physician.'],
    rebuttals: {
      "It's not medically necessary": 'Can you tell me specifically what clinical criteria were not met? I would like this in writing.',
      'You can appeal': "Yes, and I intend to. But first I need to understand exactly why this was denied so the appeal addresses the right issues.",
      "That's our policy": 'I understand you have policies, but federal and state regulations require specific clinical justification for denials. Can I speak to a medical reviewer?',
    },
    tips: ['Get the denial reason in writing', 'Ask for the specific policy or guideline used', 'Request a peer-to-peer review immediately'],
  },
  {
    id: '5', scenario: 'Requesting Peer-to-Peer Review', buddyMood: 'determined' as BuddyMood,
    intro: "Hi, I'm calling to request a peer-to-peer review between my treating physician and your medical director regarding a denied prior authorization.",
    phrases: [
      'My doctor would like to discuss the clinical necessity directly with your medical reviewer',
      'When is the earliest available peer-to-peer review slot?',
      'Can you confirm the name and credentials of the reviewing physician?',
      'Please provide the direct scheduling line for peer-to-peer reviews',
      'What documentation should my physician have ready for the review?',
    ],
    rebuttals: {
      "That's not available": 'Federal and state regulations require insurers to offer peer-to-peer review when requested. I am formally requesting one now. Can I speak with a supervisor?',
      'The decision is final': 'A peer-to-peer review is part of the appeals process and must be offered before a final determination. Please escalate this request.',
      'Your doctor needs to call us': 'I understand. Please provide the direct phone number and hours for peer-to-peer scheduling so my physician can call today.',
    },
    tips: [
      'Peer-to-peer review is the #1 most effective appeal strategy per AMA research',
      'Your physician speaks directly with the insurance medical director',
      'Have all clinical documentation ready before the scheduled call',
      'Request the review in writing as well as by phone for a paper trail',
      'Many denials are overturned during the peer-to-peer conversation itself',
    ],
  },
  {
    id: '4', scenario: 'Escalation to Supervisor', buddyMood: 'celebrating' as BuddyMood,
    intro: "I've been trying to resolve a prior authorization issue and I need to speak with a supervisor.",
    phrases: ["I've called [X] times about reference [NUMBER] without resolution", "I'd like to speak with your supervisor or a case manager", 'This is a time-sensitive medical issue that needs immediate attention', 'I will be filing a formal complaint if this is not resolved today'],
    rebuttals: {
      'A supervisor will say the same thing': "That's okay, I'd still like to speak with one. I have the right to escalate.",
      'I can help you': "I appreciate that, but I've already spoken with [X] representatives. I need supervisor-level intervention.",
      'Let me put you on hold': 'How long will the hold be? I have been on hold for [X] minutes already.',
    },
    tips: ['Stay calm and professional', 'Document every call, name, and reference number', 'Mention you will contact your state insurance commissioner if needed'],
  },
];

function ScriptCard({ script, isExpanded, onToggle, onPractice }: { script: typeof SCRIPTS[0]; isExpanded: boolean; onToggle: () => void; onPractice: () => void }) {
  const { colors, typography } = useTheme();
  const icon = SCRIPT_ICONS[script.id] || '🛡️';

  return (
    <View style={[styles.scriptCard, { backgroundColor: colors.surface }]}>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(); }}>
        <View style={styles.scriptHeader}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
          <Text style={[typography.h3, { color: colors.text, flex: 1 }]}>{script.scenario}</Text>
          <Text style={{ color: colors.textTertiary, fontSize: 18 }}>{isExpanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

        {isExpanded && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <View style={[styles.section, { backgroundColor: `${colors.primary}08`, borderLeftColor: colors.primary }]}>
              <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>SAY THIS</Text>
              <Text style={[typography.body, { color: colors.text }]}>{script.intro}</Text>
            </View>

            <Text style={[typography.h3, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>Key Phrases</Text>
            {script.phrases.map((phrase, i) => (
              <Pressable key={i} onPress={() => Haptics.selectionAsync()} style={styles.phraseRow}>
                <Text style={[typography.body, { color: colors.secondary }]}>💬 {phrase}</Text>
              </Pressable>
            ))}

            <Text style={[typography.h3, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>If They Say...</Text>
            {Object.entries(script.rebuttals).map(([pushback, response], i) => (
              <View key={i} style={styles.rebuttalBlock}>
                <Text style={[typography.body, { color: colors.error, fontFamily: 'Outfit_600SemiBold' }]}>"{pushback}"</Text>
                <Text style={[typography.body, { color: colors.success, marginTop: 4 }]}>→ {response}</Text>
              </View>
            ))}

            <Text style={[typography.h3, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>💡 Tips</Text>
            {script.tips.map((tip, i) => (
              <Text key={i} style={[typography.body, { color: colors.textSecondary, marginBottom: 4 }]}>• {tip}</Text>
            ))}

            <Pressable
              onPress={onPractice}
              style={[styles.practiceButton, { backgroundColor: colors.accent }]}
            >
              <Text style={{ fontSize: 16 }}>🛡️</Text>
              <Text style={[typography.body, { color: '#fff', fontFamily: 'Outfit_600SemiBold' }]}>
                Practice This Call
              </Text>
            </Pressable>
          </Animated.View>
        )}
    </View>
  );
}

export default function ScriptsScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  const handlePractice = (script: typeof SCRIPTS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/call-coach',
      params: {
        scenario: script.scenario,
        intro: script.intro,
        buddyMood: script.buddyMood,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
        <Text style={[typography.h1, { color: colors.text }]}>Call Scripts</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Know exactly what to say</Text>
      </View>

      <View style={styles.buddyRow}>
        <BuddyMascot mood="happy" size={60} />
        <View style={[styles.buddyBubble, { backgroundColor: `${colors.primary}14` }]}>
          <Text style={[typography.body, { color: colors.text }]}>Pick a scenario and I'll coach you through the call!</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/rights'); }}
            style={[styles.scriptCard, { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.primary }]}
          >
            <View style={styles.scriptHeader}>
              <Text style={{ fontSize: 22 }}>⚖️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[typography.h3, { color: colors.text }]}>Know Your Rights</Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>State-specific appeal rights and contacts</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 18 }}>→</Text>
            </View>
          </Pressable>
        </Animated.View>

        {SCRIPTS.map((script, i) => (
          <Animated.View key={script.id} entering={FadeInDown.delay(i * 80).springify()}>
            <ScriptCard
              script={script}
              isExpanded={expanded === script.id}
              onToggle={() => setExpanded(expanded === script.id ? null : script.id)}
              onPractice={() => handlePractice(script)}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buddyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  buddyBubble: { flex: 1, borderRadius: radii.card, padding: 12 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 100 },
  scriptCard: { borderRadius: radii.card, padding: 16, shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  scriptHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scriptIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 16, padding: 12, borderRadius: radii.button, borderLeftWidth: 3, gap: 6 },
  phraseRow: { paddingVertical: 6 },
  rebuttalBlock: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: radii.button, marginBottom: 8 },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
});
