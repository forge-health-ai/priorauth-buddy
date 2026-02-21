import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../theme';
import { MiniBuddy } from './MiniBuddy';

const DOCUMENTS = [
  { key: 'denial_letter', label: 'Denial letter (with date and reference number)' },
  { key: 'eob', label: 'Explanation of Benefits (EOB)' },
  { key: 'medical_records', label: 'Medical records supporting the procedure' },
  { key: 'medical_necessity', label: 'Letter of Medical Necessity from treating physician' },
  { key: 'prior_auth', label: 'Prior authorization request (original submission)' },
  { key: 'correspondence', label: 'Any correspondence with insurer (emails, letters and notes)' },
  { key: 'policy_docs', label: 'Insurance policy/plan documents showing coverage' },
];

function getStorageKey(caseId: string) {
  return `doc_checklist_${caseId}`;
}

function getBuddyMessage(checked: number, total: number): { text: string; mood: 'thinking' | 'happy' | 'celebrating' } {
  if (checked === 0) return { text: "Let's get organized! Gather these documents before filing your appeal.", mood: 'thinking' };
  if (checked < Math.ceil(total / 2)) return { text: "Good start! Keep gathering your documents.", mood: 'thinking' };
  if (checked < total) return { text: "Almost there! Just a few more to go.", mood: 'happy' };
  return { text: "You're armed and ready! Time to fight back.", mood: 'celebrating' };
}

interface Props {
  caseId: string;
}

export function DocumentChecklist({ caseId }: Props) {
  const { colors, typography } = useTheme();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(getStorageKey(caseId)).then(val => {
      if (val) setChecked(JSON.parse(val));
    });
  }, [caseId]);

  const toggle = useCallback(async (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    await AsyncStorage.setItem(getStorageKey(caseId), JSON.stringify(next));
  }, [checked, caseId]);

  const checkedCount = DOCUMENTS.filter(d => checked[d.key]).length;
  const total = DOCUMENTS.length;
  const buddy = getBuddyMessage(checkedCount, total);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.headerRow}>
        <MiniBuddy mood={buddy.mood} size={28} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { color: colors.text }]}>Document Checklist</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {checkedCount} of {total} documents ready
          </Text>
        </View>
      </View>

      <View style={[styles.buddyBubble, { backgroundColor: `${colors.primary}10` }]}>
        <Text style={[typography.body, { color: colors.text }]}>{buddy.text}</Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.tabBarBorder }]}>
        <View style={[styles.progressFill, { width: `${(checkedCount / total) * 100}%`, backgroundColor: colors.primary }]} />
      </View>

      {DOCUMENTS.map((doc, i) => (
        <Animated.View key={doc.key} entering={FadeInDown.delay(i * 40).springify()}>
          <Pressable onPress={() => toggle(doc.key)} style={styles.itemRow}>
            <View style={[styles.checkbox, {
              borderColor: checked[doc.key] ? colors.primary : colors.tabBarBorder,
              backgroundColor: checked[doc.key] ? colors.primary : 'transparent',
            }]}>
              {checked[doc.key] && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[typography.body, {
              color: checked[doc.key] ? colors.textSecondary : colors.text,
              textDecorationLine: checked[doc.key] ? 'line-through' : 'none',
              flex: 1,
            }]}>{doc.label}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.card,
    padding: 16,
    gap: 12,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buddyBubble: { borderRadius: radii.button, padding: 10 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
