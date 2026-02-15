import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Share, Clipboard } from 'react-native';
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
import { useFocusEffect } from 'expo-router';

export default function AppealsScreen() {
  const { colors, typography } = useTheme();
  const [step, setStep] = useState<'empty' | 'form' | 'result'>('empty');
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string>('');

  const fetchDeniedCases = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['denied', 'appealing'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch cases error:', error);
        return;
      }

      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDeniedCases();
    }, [fetchDeniedCases])
  );

  const handleGenerate = async () => {
    if (!selectedCaseId) {
      Alert.alert('Select a Case', 'Please select a denied case to appeal.');
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

      // Save appeal to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('appeals').insert({
          case_id: selectedCase.id,
          user_id: user.id,
          letter_text: result.letter,
          model_used: result.model,
        });

        // Update case status if it's denied
        if (selectedCase.status === 'denied') {
          await supabase.from('cases').update({ status: 'appealing' }).eq('id', selectedCase.id);
        }

        // Add event
        await supabase.from('case_events').insert({
          case_id: selectedCase.id,
          user_id: user.id,
          event_type: 'appeal_generated',
          description: 'AI appeal letter generated via Appeals screen',
        });
      }

      setGeneratedLetter(result.letter);
      setStep('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Appeal generation error:', error);
      Alert.alert('Error', 'Failed to generate appeal letter. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await Share.share({ message: generatedLetter });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to share letter');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Appeal Letter',
        message: generatedLetter,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to share letter');
    }
  };

  const resetForm = () => {
    setStep('empty');
    setSelectedCaseId('');
    setAdditionalContext('');
    setGeneratedLetter('');
    fetchDeniedCases();
  };

  if (step === 'empty') {
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
        <EmptyState 
          mood="thinking" 
          title="Fight back with words" 
          subtitle="Generate a professional appeal letter in seconds. 50% of denials are overturned on appeal!" 
          actionLabel="Write an Appeal" 
          onAction={() => setStep('form')} 
        />
      </SafeAreaView>
    );
  }

  if (step === 'form') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MiniBuddy mood="celebrating" size={24} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
          </View>
          <Text style={[typography.h1, { color: colors.text }]}>Write Appeal</Text>
        </View>
        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.springify()} style={styles.buddySection}>
            <BuddyMascot mood="thinking" size={80} />
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Select a denied case and I'll draft a compelling appeal letter</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.formGroup}>
            <Text style={[typography.h3, { color: colors.text }]}>Select Case</Text>
            {cases.length === 0 ? (
              <View style={[styles.emptyCases, { backgroundColor: colors.surface, borderColor: colors.tabBarBorder }]}>
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
                      borderColor: selectedCaseId === caseItem.id ? colors.primary : colors.tabBarBorder,
                    }]}
                  >
                    <Text style={[typography.body, { color: selectedCaseId === caseItem.id ? colors.primary : colors.text }]} 
                          numberOfLines={1}>
                      {caseItem.procedure_name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {caseItem.insurer_name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formGroup}>
            <Text style={[typography.h3, { color: colors.text }]}>Additional Context (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.tabBarBorder }]}
              placeholder="Add any extra details that might help the appeal: medical history, why this treatment is critical, previous treatments tried, etc."
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
              disabled={!selectedCaseId || generating}
              loading={generating}
            />
            <FORGEButton title="Cancel" onPress={resetForm} variant="ghost" />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MiniBuddy mood="celebrating" size={24} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
        </View>
        <Text style={[typography.h1, { color: colors.text }]}>Your Appeal</Text>
      </View>
      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.buddySection}>
          <BuddyMascot mood="celebrating" size={80} />
          <Text style={[typography.body, { color: colors.success, textAlign: 'center', fontFamily: 'Outfit_600SemiBold' }]}>Appeal letter ready!</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.letterBox, { backgroundColor: colors.surface, borderColor: colors.tabBarBorder }]}>
            <Text style={[styles.letterText, { color: colors.text }]}>
              {generatedLetter}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.buttonRow}>
          <FORGEButton title="Copy / Share" onPress={handleShare} />
          <FORGEButton title="New Appeal" onPress={resetForm} variant="secondary" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buddySection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  formContent: { paddingHorizontal: 20, paddingBottom: 100 },
  formGroup: { gap: 8, marginBottom: 16 },
  emptyCases: { borderWidth: 1, borderRadius: radii.card, padding: 16 },
  caseList: { gap: 8 },
  caseChip: { 
    borderWidth: 1, 
    borderRadius: radii.button, 
    padding: 12,
    gap: 2,
  },
  input: { borderWidth: 1, borderRadius: radii.button, padding: 14, fontSize: 16, fontFamily: 'Outfit_400Regular' },
  textArea: { minHeight: 100, paddingTop: 14 },
  letterBox: { borderWidth: 1, borderRadius: radii.card, padding: 20 },
  letterText: { fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
