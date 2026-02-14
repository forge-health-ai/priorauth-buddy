import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, radii } from '../../src/theme';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { FORGEButton } from '../../src/components/FORGEButton';
import { EmptyState } from '../../src/components/EmptyState';

export default function AppealsScreen() {
  const { colors, typography } = useTheme();
  const [step, setStep] = useState<'empty' | 'form' | 'result'>('empty');
  const [form, setForm] = useState({ procedureName: '', insuranceCompany: '', denialReason: '', patientContext: '' });

  if (step === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.text }]}>Appeals</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>AI-powered appeal letters that win</Text>
        </View>
        <EmptyState mood="thinking" title="Fight back with words" subtitle="Generate a professional appeal letter in seconds. 50% of denials are overturned on appeal!" actionLabel="Write an Appeal" onAction={() => setStep('form')} />
      </SafeAreaView>
    );
  }

  if (step === 'form') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.text }]}>Write Appeal</Text>
        </View>
        <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.springify()} style={styles.buddySection}>
            <BuddyMascot mood="thinking" size={80} />
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Tell me about the denial and I'll draft a compelling appeal letter</Text>
          </Animated.View>

          {[
            { label: 'Procedure / Medication', key: 'procedureName', placeholder: 'e.g., MRI Lumbar Spine', multiline: false },
            { label: 'Insurance Company', key: 'insuranceCompany', placeholder: 'e.g., UnitedHealthcare', multiline: false },
            { label: 'Reason for Denial', key: 'denialReason', placeholder: 'What did they say? Paste from the denial letter if you have it', multiline: true },
            { label: 'Additional Context', key: 'patientContext', placeholder: 'Anything else we should know? Medical history, why this treatment matters, etc.', multiline: true },
          ].map((field, i) => (
            <Animated.View key={field.key} entering={FadeInDown.delay(100 + i * 50).springify()} style={styles.formGroup}>
              <Text style={[typography.h3, { color: colors.text }]}>{field.label}</Text>
              <TextInput
                style={[styles.input, field.multiline && styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.tabBarBorder }]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textTertiary}
                value={(form as any)[field.key]}
                onChangeText={(t) => setForm({ ...form, [field.key]: t })}
                multiline={field.multiline}
                numberOfLines={field.multiline ? 4 : 1}
                textAlignVertical={field.multiline ? 'top' : 'center'}
              />
            </Animated.View>
          ))}

          <Animated.View entering={FadeInDown.delay(350).springify()} style={{ marginTop: 8, gap: 12 }}>
            <FORGEButton title="Generate Appeal Letter" onPress={() => setStep('result')} disabled={!form.procedureName || !form.denialReason} />
            <FORGEButton title="Cancel" onPress={() => setStep('empty')} variant="ghost" />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.text }]}>Your Appeal</Text>
      </View>
      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.buddySection}>
          <BuddyMascot mood="celebrating" size={80} />
          <Text style={[typography.body, { color: colors.success, textAlign: 'center', fontFamily: 'Outfit_600SemiBold' }]}>Appeal letter ready! 🎉</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.letterBox, { backgroundColor: colors.surface, borderColor: colors.tabBarBorder }]}>
            <Text style={[typography.body, { color: colors.text }]}>
              [Generated appeal letter will appear here]{'\n\n'}
              Powered by Claude API to generate professional, personalized appeal letters based on your denial reason and medical context.{'\n\n'}
              Letters include:{'\n'}
              • Direct counter-arguments to denial reason{'\n'}
              • Medical necessity justification{'\n'}
              • References to relevant guidelines{'\n'}
              • Proper formatting and legal language
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.buttonRow}>
          <FORGEButton title="Copy Letter" onPress={() => {}} />
          <FORGEButton title="Share" onPress={() => {}} variant="secondary" />
        </Animated.View>
        <FORGEButton title="Write Another" onPress={() => { setStep('form'); setForm({ procedureName: '', insuranceCompany: '', denialReason: '', patientContext: '' }); }} variant="ghost" style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 },
  buddySection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  formContent: { paddingHorizontal: 20, paddingBottom: 100 },
  formGroup: { gap: 8, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: radii.button, padding: 14, fontSize: 16, fontFamily: 'Outfit_400Regular' },
  textArea: { minHeight: 100, paddingTop: 14 },
  letterBox: { borderWidth: 1, borderRadius: radii.card, padding: 20 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
