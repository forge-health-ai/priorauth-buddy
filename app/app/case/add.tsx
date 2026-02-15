import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../../src/theme';
import { FORGEButton } from '../../src/components/FORGEButton';
import { MiniBuddy } from '../../src/components/MiniBuddy';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { supabase } from '../../src/lib/supabase';

const INSURERS = [
  'UnitedHealthcare', 'Anthem / Elevance', 'Cigna', 'Aetna / CVS Health',
  'Humana', 'Blue Cross Blue Shield', 'Kaiser Permanente', 'Molina Healthcare',
  'Centene', 'Medicare Advantage', 'Medicaid', 'Other',
];

const URGENCY_OPTIONS = [
  { value: 'normal' as const, label: 'Standard', color: '#22C55E' },
  { value: 'urgent' as const, label: 'Urgent', color: '#F59E0B' },
  { value: 'emergency' as const, label: 'Emergency', color: '#EF4444' },
];

type Step = 1 | 2 | 3;

export default function AddCaseScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    procedureName: '',
    procedureCode: '',
    insurerName: '',
    policyNumber: '',
    referenceNumber: '',
    providerName: '',
    status: 'pending' as const,
    denialReason: '',
    denialDate: '',
    urgency: 'normal' as 'normal' | 'urgent' | 'emergency',
    notes: '',
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 1) return form.procedureName.length > 0;
    if (step === 2) return form.insurerName.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be signed in to add a case');
        setSaving(false);
        return;
      }

      // Calculate appeal deadline (typically 180 days from denial or 60 days for some plans)
      const appealDeadline = new Date();
      appealDeadline.setDate(appealDeadline.getDate() + 60); // 60 days from now as default

      // Insert case into database
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .insert({
          user_id: user.id,
          procedure_name: form.procedureName,
          procedure_code: form.procedureCode || null,
          insurer_name: form.insurerName,
          policy_number: form.policyNumber || null,
          reference_number: form.referenceNumber || null,
          provider_name: form.providerName || null,
          status: form.denialReason ? 'denied' : 'pending',
          denial_reason: form.denialReason || null,
          denial_date: form.denialDate || null,
          appeal_deadline: form.denialReason ? appealDeadline.toISOString() : null,
          urgency: form.urgency,
          notes: form.notes || null,
          fight_score: 0,
        })
        .select()
        .single();

      if (caseError) {
        console.error('Case insert error:', caseError);
        Alert.alert('Error', 'Failed to save case. Please try again.');
        setSaving(false);
        return;
      }

      // Create initial case event
      await supabase
        .from('case_events')
        .insert({
          case_id: caseData.id,
          user_id: user.id,
          event_type: form.denialReason ? 'denial_received' : 'case_created',
          description: form.denialReason 
            ? `Denial received: ${form.denialReason.substring(0, 100)}...`
            : 'Case created and tracking started',
        });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Case Added!',
        `Tracking "${form.procedureName}" with ${form.insurerName}. Buddy will watch your deadlines.`,
        [{ text: 'Let\'s go!', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {[1, 2, 3].map(s => (
        <View key={s} style={[styles.stepDot, { backgroundColor: s <= step ? colors.primary : colors.tabBarBorder }]} />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.formSection}>
      <View style={styles.buddyPrompt}>
        <BuddyMascot mood="thinking" size={60} />
        <View style={[styles.bubble, { backgroundColor: `${colors.primary}12` }]}>
          <Text style={[typography.body, { color: colors.text }]}>What procedure or treatment was denied (or needs pre-authorization)?</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Procedure / Treatment</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
          placeholder="e.g. MRI of left knee, Physical therapy..."
          placeholderTextColor={colors.textTertiary}
          value={form.procedureName}
          onChangeText={v => updateField('procedureName', v)}
          autoFocus
        />
      </View>

      <View style={styles.field}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>CPT Code (optional)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
          placeholder="e.g. 73721"
          placeholderTextColor={colors.textTertiary}
          value={form.procedureCode}
          onChangeText={v => updateField('procedureCode', v)}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.field}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Your Doctor / Facility</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
          placeholder="e.g. Dr. Smith, City Hospital"
          placeholderTextColor={colors.textTertiary}
          value={form.providerName}
          onChangeText={v => updateField('providerName', v)}
        />
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.formSection}>
      <View style={styles.buddyPrompt}>
        <BuddyMascot mood="angry" size={60} />
        <View style={[styles.bubble, { backgroundColor: `${colors.primary}12` }]}>
          <Text style={[typography.body, { color: colors.text }]}>Who are we fighting? Pick your insurance company.</Text>
        </View>
      </View>

      <ScrollView horizontal={false} style={styles.insurerList} showsVerticalScrollIndicator={false}>
        {INSURERS.map(name => (
          <Pressable
            key={name}
            onPress={() => { Haptics.selectionAsync(); updateField('insurerName', name); }}
            style={[styles.insurerChip, {
              backgroundColor: form.insurerName === name ? `${colors.primary}20` : colors.surface,
              borderColor: form.insurerName === name ? colors.primary : colors.tabBarBorder,
            }]}
          >
            <Text style={[typography.body, { color: form.insurerName === name ? colors.primary : colors.text }]}>{name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.field}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Policy Number (optional)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
          placeholder="Found on your insurance card"
          placeholderTextColor={colors.textTertiary}
          value={form.policyNumber}
          onChangeText={v => updateField('policyNumber', v)}
        />
      </View>

      <View style={styles.field}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>PA Reference Number (optional)</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
          placeholder="If you have one from your insurer"
          placeholderTextColor={colors.textTertiary}
          value={form.referenceNumber}
          onChangeText={v => updateField('referenceNumber', v)}
        />
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.formSection}>
      <View style={styles.buddyPrompt}>
        <BuddyMascot mood="happy" size={60} />
        <View style={[styles.bubble, { backgroundColor: `${colors.primary}12` }]}>
          <Text style={[typography.body, { color: colors.text }]}>Almost there! How urgent is this?</Text>
        </View>
      </View>

      <View style={styles.urgencyRow}>
        {URGENCY_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            onPress={() => { Haptics.selectionAsync(); updateField('urgency', opt.value); }}
            style={[styles.urgencyChip, {
              backgroundColor: form.urgency === opt.value ? `${opt.color}20` : colors.surface,
              borderColor: form.urgency === opt.value ? opt.color : colors.tabBarBorder,
            }]}
          >
            <Text style={[typography.body, { color: form.urgency === opt.value ? opt.color : colors.text, textAlign: 'center' }]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Denial Reason (if denied)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
          placeholder="What reason did they give? Copy from the denial letter if you can."
          placeholderTextColor={colors.textTertiary}
          value={form.denialReason}
          onChangeText={v => updateField('denialReason', v)}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Additional Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
          placeholder="Anything else Buddy should know..."
          placeholderTextColor={colors.textTertiary}
          value={form.notes}
          onChangeText={v => updateField('notes', v)}
          multiline
          numberOfLines={2}
        />
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => step > 1 ? setStep((step - 1) as Step) : router.back()} hitSlop={20}>
            <Text style={[typography.body, { color: colors.primary }]}>{step > 1 ? '← Back' : '✕ Cancel'}</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <MiniBuddy mood="happy" size={20} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
          </View>
        </View>

        <Text style={[typography.h1, { color: colors.text, paddingHorizontal: 20 }]}>
          {step === 1 ? 'New Case' : step === 2 ? 'Your Insurance' : 'Final Details'}
        </Text>

        {renderStepIndicator()}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        <View style={styles.footer}>
          {step < 3 ? (
            <FORGEButton
              title="Continue"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep((step + 1) as Step); }}
              disabled={!canProceed()}
            />
          ) : (
            <FORGEButton title="Add Case" onPress={handleSubmit} loading={saving} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  stepDot: { flex: 1, height: 4, borderRadius: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  formSection: { gap: 16 },
  buddyPrompt: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  bubble: { flex: 1, borderRadius: radii.card, padding: 12 },
  field: { gap: 0 },
  input: { borderWidth: 1, borderRadius: radii.button, padding: 14, fontSize: 16 },
  textArea: { minHeight: 80, paddingTop: 14, textAlignVertical: 'top' },
  insurerList: { maxHeight: 220 },
  insurerChip: { borderWidth: 1, borderRadius: radii.button, padding: 12, marginBottom: 8 },
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyChip: { flex: 1, borderWidth: 1, borderRadius: radii.button, padding: 12 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
});
