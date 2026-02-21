import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../theme';
import { MiniBuddy } from './MiniBuddy';

export interface CallLogEntry {
  id: string;
  date: string;
  time: string;
  repName: string;
  repId: string;
  department: string;
  summary: string;
  outcome: 'positive' | 'neutral' | 'negative';
  followUp: string;
}

const CALL_LOG_KEY = (caseId: string) => `buddy_call_log_${caseId}`;

export async function getCallLog(caseId: string): Promise<CallLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CALL_LOG_KEY(caseId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveCallLog(caseId: string, entries: CallLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(CALL_LOG_KEY(caseId), JSON.stringify(entries));
}

interface CallLogProps {
  caseId: string;
  insurerName: string;
}

export function CallLog({ caseId, insurerName }: CallLogProps) {
  const { colors, typography } = useTheme();
  const [entries, setEntries] = useState<CallLogEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    repName: '',
    repId: '',
    department: '',
    summary: '',
    outcome: 'neutral' as 'positive' | 'neutral' | 'negative',
    followUp: '',
  });

  useEffect(() => {
    getCallLog(caseId).then(setEntries);
  }, [caseId]);

  const handleSave = async () => {
    if (!form.summary.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const now = new Date();
    const entry: CallLogEntry = {
      id: Date.now().toString(),
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      repName: form.repName.trim(),
      repId: form.repId.trim(),
      department: form.department.trim(),
      summary: form.summary.trim(),
      outcome: form.outcome,
      followUp: form.followUp.trim(),
    };

    const updated = [entry, ...entries];
    setEntries(updated);
    await saveCallLog(caseId, updated);
    setForm({ repName: '', repId: '', department: '', summary: '', outcome: 'neutral', followUp: '' });
    setShowForm(false);
  };

  const outcomeColors = {
    positive: '#00C9A7',
    neutral: '#FFB800',
    negative: '#FF3B5C',
  };

  const outcomeLabels = {
    positive: '👍 Helpful',
    neutral: '😐 Neutral',
    negative: '👎 Unhelpful',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.tabBarBorder }]}>
      <Pressable onPress={() => { Haptics.selectionAsync(); setShowForm(!showForm); }} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={{ fontSize: 16 }}>📞</Text>
          <Text style={[typography.h3, { color: colors.text }]}>Call Log</Text>
          {entries.length > 0 && (
            <View style={[styles.badge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[typography.caption, { color: colors.primary }]}>{entries.length}</Text>
            </View>
          )}
        </View>
        <Text style={[typography.body, { color: colors.primary }]}>{showForm ? '✕' : '+ Log Call'}</Text>
      </Pressable>

      {entries.length === 0 && !showForm && (
        <View style={styles.emptyState}>
          <MiniBuddy mood="thinking" size={30} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            No calls logged yet. Keep a record of every call with {insurerName}. Dates, names and what was said. This paper trail wins appeals.
          </Text>
        </View>
      )}

      {showForm && (
        <Animated.View entering={FadeInDown.springify()} style={styles.form}>
          <View style={styles.formRow}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Rep Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text }]}
                placeholder="e.g. Sarah"
                placeholderTextColor={colors.textTertiary}
                value={form.repName}
                onChangeText={v => setForm({ ...form, repName: v })}
              />
            </View>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Rep/Ref ID</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text }]}
                placeholder="e.g. #4521"
                placeholderTextColor={colors.textTertiary}
                value={form.repId}
                onChangeText={v => setForm({ ...form, repId: v })}
              />
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Department</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text }]}
              placeholder="e.g. Clinical Appeals, Member Services"
              placeholderTextColor={colors.textTertiary}
              value={form.department}
              onChangeText={v => setForm({ ...form, department: v })}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>What happened? *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: colors.tabBarBorder, color: colors.text }]}
              placeholder="What did they say? What did they promise? Any reference numbers given?"
              placeholderTextColor={colors.textTertiary}
              value={form.summary}
              onChangeText={v => setForm({ ...form, summary: v })}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>How was the call?</Text>
            <View style={styles.outcomeRow}>
              {(['positive', 'neutral', 'negative'] as const).map(o => (
                <Pressable
                  key={o}
                  onPress={() => { Haptics.selectionAsync(); setForm({ ...form, outcome: o }); }}
                  style={[styles.outcomeChip, {
                    backgroundColor: form.outcome === o ? `${outcomeColors[o]}20` : colors.surfaceElevated,
                    borderColor: form.outcome === o ? outcomeColors[o] : colors.tabBarBorder,
                  }]}
                >
                  <Text style={[typography.caption, { color: form.outcome === o ? outcomeColors[o] : colors.textSecondary }]}>
                    {outcomeLabels[o]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Follow-up needed?</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text }]}
              placeholder="e.g. Call back in 5 business days, fax records to..."
              placeholderTextColor={colors.textTertiary}
              value={form.followUp}
              onChangeText={v => setForm({ ...form, followUp: v })}
            />
          </View>

          <Pressable
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: form.summary.trim() ? colors.primary : colors.surfaceElevated }]}
          >
            <Text style={[typography.body, { color: form.summary.trim() ? '#FFFFFF' : colors.textTertiary, fontWeight: '700', textAlign: 'center' }]}>
              Save to Paper Trail
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {entries.map((entry, index) => (
        <Animated.View key={entry.id} entering={FadeInDown.delay(index * 50).springify()} style={[styles.entryCard, { borderColor: colors.tabBarBorder }]}>
          <View style={styles.entryHeader}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{entry.date} at {entry.time}</Text>
            <View style={[styles.outcomeDot, { backgroundColor: outcomeColors[entry.outcome] }]} />
          </View>
          {(entry.repName || entry.repId) && (
            <Text style={[typography.caption, { color: colors.primary }]}>
              {entry.repName}{entry.repId ? ` (${entry.repId})` : ''}{entry.department ? ` — ${entry.department}` : ''}
            </Text>
          )}
          <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>{entry.summary}</Text>
          {entry.followUp ? (
            <View style={[styles.followUpTag, { backgroundColor: `${colors.warning}15` }]}>
              <Text style={[typography.caption, { color: colors.warning }]}>📋 Follow-up: {entry.followUp}</Text>
            </View>
          ) : null}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radii.card, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  emptyState: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  form: { padding: 14, paddingTop: 0, gap: 12 },
  formRow: { flexDirection: 'row', gap: 12 },
  formField: { gap: 4 },
  label: { fontSize: 11, fontFamily: 'Outfit_500Medium' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'Outfit_400Regular', fontSize: 14 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  outcomeRow: { flexDirection: 'row', gap: 8 },
  outcomeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  saveButton: { paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  entryCard: { padding: 14, borderTopWidth: 1, gap: 2 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outcomeDot: { width: 8, height: 8, borderRadius: 4 },
  followUpTag: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
