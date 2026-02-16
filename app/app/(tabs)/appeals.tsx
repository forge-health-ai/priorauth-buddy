import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../../src/theme';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { FORGEButton } from '../../src/components/FORGEButton';
import { EmptyState } from '../../src/components/EmptyState';
import { MiniBuddy } from '../../src/components/MiniBuddy';
import { supabase, Case } from '../../src/lib/supabase';
import { generateAppealLetter } from '../../src/lib/ai';
import { emailLetterToSelf } from '../../src/lib/email-letter';
import { useFocusEffect } from 'expo-router';

interface SavedAppeal {
  id: string;
  letter_text: string;
  created_at: string;
  case_id: string;
  procedure_name?: string;
  insurer_name?: string;
  document_type?: string;
}

export default function AppealsScreen() {
  const { colors, typography } = useTheme();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [savedAppeals, setSavedAppeals] = useState<SavedAppeal[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<SavedAppeal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch saved appeals and complaints
      const { data: appeals } = await supabase
        .from('appeals')
        .select('id, letter_text, created_at, case_id, document_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch cases for cross-referencing
      const { data: casesData } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const caseMap: Record<string, Case> = {};
      (casesData || []).forEach(c => { caseMap[c.id] = c; });

      const enrichedAppeals = (appeals || []).map(a => ({
        ...a,
        procedure_name: caseMap[a.case_id]?.procedure_name || 'Unknown Case',
        insurer_name: caseMap[a.case_id]?.insurer_name || '',
      }));

      setSavedAppeals(enrichedAppeals);
      setCases((casesData || []).filter(c => c.status === 'denied' || c.status === 'appealing'));
    } catch (error) {
      console.error('Error fetching appeals data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleGenerate = async () => {
    if (!selectedCaseId) {
      Alert.alert('Select a Case', 'Please select a case to appeal.');
      return;
    }

    const selectedCase = cases.find(c => c.id === selectedCaseId);
    if (!selectedCase) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGenerating(true);

    try {
      const result = await generateAppealLetter({
        procedureName: selectedCase.procedure_name,
        procedureCode: selectedCase.procedure_code,
        insurerName: selectedCase.insurer_name || 'Insurance Company',
        denialReason: selectedCase.denial_reason || 'Unspecified denial',
        providerName: selectedCase.provider_name,
        patientContext: additionalContext,
      });

      // Show result immediately
      const newAppeal: SavedAppeal = {
        id: Date.now().toString(),
        letter_text: result.letter,
        created_at: new Date().toISOString(),
        case_id: selectedCase.id,
        procedure_name: selectedCase.procedure_name,
        insurer_name: selectedCase.insurer_name,
      };
      setSelectedAppeal(newAppeal);
      setView('detail');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Save to DB non-blocking
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from('appeals').insert({
          case_id: selectedCase.id,
          user_id: user.id,
          letter_text: result.letter,
        }).then(() => fetchData());

        supabase.from('cases').update({ status: 'appealing' }).eq('id', selectedCase.id).then(() => {});
        supabase.from('case_events').insert({
          case_id: selectedCase.id,
          user_id: user.id,
          event_type: 'appeal_generated',
          title: 'Appeal Letter Generated',
          description: 'AI appeal letter generated via Appeals tab',
        }).then(() => {});
      }
    } catch (error) {
      console.error('Appeal generation error:', error);
      Alert.alert('Error', 'Failed to generate appeal letter. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // DETAIL VIEW - viewing a single appeal
  if (view === 'detail' && selectedAppeal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => { setView('list'); setSelectedAppeal(null); fetchData(); }} hitSlop={20}>
            <Text style={[typography.body, { color: colors.primary }]}>← Back to Appeals</Text>
          </Pressable>
          <Text style={[typography.h1, { color: colors.text, marginTop: 8 }]}>
            {selectedAppeal.document_type === 'complaint' ? 'DOI Complaint' : 'Appeal Letter'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {selectedAppeal.procedure_name} · {selectedAppeal.insurer_name}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.springify()} style={styles.buddySection}>
            <BuddyMascot mood={selectedAppeal.document_type === 'complaint' ? 'determined' : 'celebrating'} size={70} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={[styles.letterBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.letterText, { color: colors.text }]} selectable>
                {selectedAppeal.letter_text}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.buttonRow}>
            <FORGEButton title="Email to Myself" onPress={() => emailLetterToSelf(`Appeal Letter - ${selectedAppeal.procedure_name}`, selectedAppeal.letter_text)} />
            <FORGEButton title="Copy / Share" onPress={() => Share.share({ title: 'Appeal Letter', message: selectedAppeal.letter_text })} variant="secondary" />
            <FORGEButton title="New Appeal" onPress={() => { setView('form'); setSelectedAppeal(null); setSelectedCaseId(''); setAdditionalContext(''); }} variant="secondary" />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // FORM VIEW - generate new appeal
  if (view === 'form') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setView('list')} hitSlop={20}>
            <Text style={[typography.body, { color: colors.primary }]}>← Back</Text>
          </Pressable>
          <Text style={[typography.h1, { color: colors.text, marginTop: 8 }]}>Write Appeal</Text>
        </View>
        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.springify()} style={styles.buddySection}>
            <BuddyMascot mood="thinking" size={70} />
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Select a denied case and I'll draft a compelling appeal letter</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.formGroup}>
            <Text style={[typography.h3, { color: colors.text }]}>Select Case</Text>
            {cases.length === 0 ? (
              <View style={[styles.emptyCases, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  No denied cases found. Add a denied case first.
                </Text>
              </View>
            ) : (
              <View style={styles.caseList}>
                {cases.map((caseItem) => (
                  <Pressable
                    key={caseItem.id}
                    onPress={() => { Haptics.selectionAsync(); setSelectedCaseId(caseItem.id); }}
                    style={[styles.caseChip, {
                      backgroundColor: selectedCaseId === caseItem.id ? `${colors.primary}20` : colors.surface,
                      borderColor: selectedCaseId === caseItem.id ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[typography.body, { color: selectedCaseId === caseItem.id ? colors.primary : colors.text }]} numberOfLines={1}>
                      {caseItem.procedure_name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>{caseItem.insurer_name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
            <Text style={[typography.h3, { color: colors.text }]}>Additional Context (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Medical history, why this treatment is critical, previous treatments tried..."
              placeholderTextColor={colors.textTertiary}
              value={additionalContext}
              onChangeText={setAdditionalContext}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: 8, gap: 12 }}>
            <FORGEButton
              title={generating ? 'Generating...' : 'Generate Appeal Letter'}
              onPress={handleGenerate}
              disabled={generating}
              loading={generating}
            />
            <FORGEButton title="Cancel" onPress={() => setView('list')} variant="ghost" />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // LIST VIEW - show saved appeals + generate new
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MiniBuddy mood="celebrating" size={24} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
        </View>
        <Text style={[typography.h1, { color: colors.text }]}>Appeals</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>AI-powered appeal letters that win</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        {/* New Appeal Button */}
        <Animated.View entering={FadeInDown.springify()} style={{ marginBottom: 20 }}>
          <FORGEButton title="Write New Appeal" onPress={() => setView('form')} />
        </Animated.View>

        {/* Saved Appeals */}
        {savedAppeals.length === 0 && !loading ? (
          <EmptyState
            mood="thinking"
            title="No appeals yet"
            subtitle="Generate your first appeal letter and it will appear here for reference"
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={[typography.h3, { color: colors.text }]}>Your Documents</Text>
            {(() => {
              // Group appeals (not complaints) by case and number them
              const appealsOnly = savedAppeals.filter(a => !a.document_type || a.document_type === 'appeal');
              const caseCount: Record<string, number> = {};
              const labeled = appealsOnly.map(appeal => {
                const key = appeal.case_id;
                caseCount[key] = (caseCount[key] || 0) + 1;
                return { ...appeal, appealNum: caseCount[key] };
              });
              // Reverse count per case so oldest = 1st
              const caseTotals: Record<string, number> = {};
              labeled.forEach(a => { caseTotals[a.case_id] = Math.max(caseTotals[a.case_id] || 0, a.appealNum); });
              const numberedAppeals = labeled.map(a => ({
                ...a,
                appealNum: caseTotals[a.case_id] - a.appealNum + 1,
              }));

              // Build combined list in original order
              let appealIdx = 0;
              const allItems = savedAppeals.map(item => {
                const isComplaint = item.document_type === 'complaint';
                if (isComplaint) {
                  return { ...item, label: 'DOI Complaint', description: 'Department of Insurance complaint letter', mood: 'determined' as const };
                }
                const numbered = numberedAppeals[appealIdx++];
                const ordinal = numbered.appealNum === 1 ? '1st' : numbered.appealNum === 2 ? '2nd' : numbered.appealNum === 3 ? '3rd' : `${numbered.appealNum}th`;
                return {
                  ...item,
                  label: `${ordinal} Appeal`,
                  description: numbered.appealNum === 1 ? 'Initial appeal letter to overturn denial' : `${ordinal} appeal with strengthened arguments`,
                  mood: 'celebrating' as const,
                };
              });

              return allItems.map((appeal, i) => (
                  <Animated.View key={appeal.id} entering={FadeInDown.delay(i * 60).springify()}>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedAppeal(appeal); setView('detail'); }}
                      style={[styles.appealCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <View style={styles.appealCardHeader}>
                        <MiniBuddy mood={appeal.mood} size={28} />
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.body, { color: colors.text, fontFamily: 'Outfit_600SemiBold' }]} numberOfLines={1}>
                            {appeal.procedure_name} · {appeal.label}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>
                            {appeal.insurer_name} · {formatDate(appeal.created_at)}
                          </Text>
                        </View>
                        <Text style={{ color: colors.textTertiary, fontSize: 16 }}>→</Text>
                      </View>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6 }]} numberOfLines={1}>
                        {appeal.description}
                      </Text>
                    </Pressable>
                  </Animated.View>
              ));
            })()}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buddySection: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  formContent: { paddingHorizontal: 20, paddingBottom: 100 },
  formGroup: { gap: 8, marginBottom: 16 },
  emptyCases: { borderWidth: 1, borderRadius: radii.card, padding: 16 },
  caseList: { gap: 8 },
  caseChip: { borderWidth: 1, borderRadius: radii.button, padding: 12, gap: 2 },
  input: { borderWidth: 1, borderRadius: radii.button, padding: 14, fontSize: 16, fontFamily: 'Outfit_400Regular' },
  textArea: { minHeight: 100, paddingTop: 14 },
  letterBox: { borderWidth: 1, borderRadius: radii.card, padding: 20 },
  letterText: { fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 22 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  appealCard: { borderWidth: 1, borderRadius: radii.card, padding: 16 },
  appealCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
