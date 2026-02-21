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
import { createCase, createCaseEvent, CaseStatus, UrgencyLevel } from '../../src/lib/local-storage';
import { getInsurerIntel, InsurerIntel, estimateAppealDeadline } from '../../src/data/insurer-intel';

const PROCEDURE_TYPES = [
  { value: 'imaging', label: 'Imaging (MRI, CT, X-ray)' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'specialty_med', label: 'Specialty Medication' },
  { value: 'physical_therapy', label: 'Physical Therapy' },
  { value: 'mental_health', label: 'Mental Health / Therapy' },
  { value: 'dme', label: 'Medical Equipment (DME)' },
  { value: 'specialist', label: 'Specialist Visit / Referral' },
  { value: 'lab_test', label: 'Lab Test / Diagnostic' },
  { value: 'home_health', label: 'Home Health / Nursing' },
  { value: 'other', label: 'Other' },
];

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
  const [insurerIntel, setInsurerIntel] = useState<InsurerIntel | null>(null);
  const [showIntel, setShowIntel] = useState(false);
  const [form, setForm] = useState({
    procedureTypes: [] as string[],
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
    
    // Load insurer intelligence when insurer is selected
    if (field === 'insurerName') {
      const intel = getInsurerIntel(value);
      setInsurerIntel(intel);
      if (intel) {
        setShowIntel(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
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

      // Calculate appeal deadline from insurer's known window + denial date
      const denialDateObj = form.denialDate ? new Date(form.denialDate) : new Date();
      const { deadline: appealDeadline, windowDays } = estimateAppealDeadline(form.insurerName, denialDateObj);

      // Use local storage instead of Supabase for PHI compliance
      const caseData = await createCase(user.id, {
        procedure_name: form.procedureName,
        procedure_code: form.procedureCode || undefined,
        insurer_name: form.insurerName,
        policy_number: form.policyNumber || undefined,
        reference_number: form.referenceNumber || undefined,
        provider_name: form.providerName || undefined,
        status: (form.denialReason ? 'denied' : 'pending') as CaseStatus,
        denial_reason: form.denialReason || undefined,
        denial_date: form.denialDate || undefined,
        appeal_deadline: form.denialReason ? appealDeadline.toISOString() : undefined,
        urgency: form.urgency as UrgencyLevel,
        notes: form.notes || undefined,
        fight_score: 0,
      });

      // Create initial case event in local storage
      await createCaseEvent(caseData.id, user.id, {
        event_type: form.denialReason ? 'denial_received' : 'case_created',
        title: form.denialReason ? 'Denial Received' : 'Case Created',
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
      Alert.alert('Error', 'Failed to save case. Please try again.');
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
        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Type of Procedure</Text>
        <View style={styles.typeGrid}>
          {PROCEDURE_TYPES.map(pt => {
            const selected = form.procedureTypes.includes(pt.value);
            return (
              <Pressable
                key={pt.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setForm(prev => ({
                    ...prev,
                    procedureTypes: selected
                      ? prev.procedureTypes.filter(t => t !== pt.value)
                      : [...prev.procedureTypes, pt.value],
                  }));
                }}
                style={[styles.typeChip, {
                  backgroundColor: selected ? `${colors.primary}20` : colors.surface,
                  borderColor: selected ? colors.primary : colors.tabBarBorder,
                }]}
              >
                <Text style={[typography.caption, { color: selected ? colors.primary : colors.text }]}>{pt.label}</Text>
              </Pressable>
            );
          })}
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

      {showIntel && insurerIntel && (
        <Animated.View entering={FadeInDown.duration(300).springify()} style={styles.intelCard}>
          <Pressable onPress={() => setShowIntel(!showIntel)}>
            <View style={[styles.intelHeader, { backgroundColor: `${colors.primary}10` }]}>
              <BuddyMascot mood="thinking" size={40} />
              <View style={styles.intelTitle}>
                <Text style={[typography.h3, { color: colors.text }]}>Know Your Opponent</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Intelligence on {insurerIntel.name}
                </Text>
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: 18 }}>{showIntel ? '▲' : '▼'}</Text>
            </View>
          </Pressable>
          
          <View style={[styles.intelBody, { backgroundColor: colors.surface }]}>
            <View style={styles.intelRow}>
              <View style={styles.intelItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Denial Rate</Text>
                <Text style={[typography.h3, { color: colors.error }]}>{insurerIntel.denialRate}</Text>
              </View>
              <View style={styles.intelItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Avg Appeal Time</Text>
                <Text style={[typography.h3, { color: colors.text }]}>{insurerIntel.avgAppealTime}</Text>
              </View>
            </View>

            <View style={styles.intelSection}>
              <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>
                Common Denials
              </Text>
              {insurerIntel.commonDenials.map((denial, i) => (
                <Text key={i} style={[typography.body, { color: colors.textSecondary }]}>• {denial}</Text>
              ))}
            </View>

            <View style={styles.intelSection}>
              <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>
                Best Strategy
              </Text>
              <Text style={[typography.body, { color: colors.text }]}>{insurerIntel.bestStrategy}</Text>
            </View>

            <View style={styles.intelSection}>
              <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>
                Phone Hours
              </Text>
              <Text style={[typography.body, { color: colors.text }]}>{insurerIntel.phoneHours}</Text>
            </View>

            <View style={styles.intelSection}>
              <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>
                Escalation Tip
              </Text>
              <Text style={[typography.body, { color: colors.text }]}>{insurerIntel.escalationTip}</Text>
            </View>

            <View style={[styles.intelProTip, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}30` }]}>
              <Text style={[typography.caption, { color: colors.accent, fontFamily: 'Outfit_600SemiBold' }]}>
                Pro Tip
              </Text>
              <Text style={[typography.body, { color: colors.text }]}>{insurerIntel.proTip}</Text>
            </View>
          </View>
        </Animated.View>
      )}

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

      {form.denialReason ? (
        <View style={styles.field}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>When were you denied? (MM/DD/YYYY)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
            placeholder="e.g. 02/15/2026"
            placeholderTextColor={colors.textTertiary}
            value={form.denialDate}
            onChangeText={v => updateField('denialDate', v)}
            keyboardType="numbers-and-punctuation"
          />
          {(() => {
            const intel = getInsurerIntel(form.insurerName);
            const windowDays = intel?.appealWindowDays || 30;
            const denialDateObj = form.denialDate ? new Date(form.denialDate) : new Date();
            const deadlineDate = new Date(denialDateObj);
            deadlineDate.setDate(deadlineDate.getDate() + windowDays);
            const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <View style={[styles.bubble, { backgroundColor: `${daysLeft <= 7 ? colors.error : colors.primary}10`, marginTop: 8, padding: 10 }]}>
                <Text style={[typography.caption, { color: daysLeft <= 7 ? colors.error : colors.primary }]}>
                  🛡️ Buddy's estimate: {form.insurerName} typically allows {windowDays} days to appeal.{' '}
                  {form.denialDate
                    ? `That gives you until ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (~${daysLeft} days left).`
                    : `From today, that's ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`
                  }
                </Text>
                <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11, marginTop: 2 }]}>
                  This is an estimate. Check your denial letter for the exact deadline.
                </Text>
              </View>
            );
          })()}
        </View>
      ) : null}

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} style={{ flex: 1 }}>
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
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { borderWidth: 1, borderRadius: radii.button, paddingHorizontal: 12, paddingVertical: 10 },
  insurerChip: { borderWidth: 1, borderRadius: radii.button, padding: 12, marginBottom: 8 },
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyChip: { flex: 1, borderWidth: 1, borderRadius: radii.button, padding: 12 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  intelCard: {
    borderRadius: radii.card,
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  intelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  intelTitle: { flex: 1, gap: 2 },
  intelBody: {
    padding: 16,
    gap: 16,
  },
  intelRow: {
    flexDirection: 'row',
    gap: 16,
  },
  intelItem: {
    flex: 1,
  },
  intelSection: {
    gap: 4,
  },
  intelProTip: {
    padding: 12,
    borderRadius: radii.button,
    borderWidth: 1,
    gap: 4,
  },
});
