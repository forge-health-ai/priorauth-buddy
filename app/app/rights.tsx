import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, radii } from '../src/theme';
import { MiniBuddy } from '../src/components/MiniBuddy';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface StateRightsData {
  name: string;
  internalAppealDays: number;
  externalReviewAvailable: boolean;
  doiName: string;
  doiPhone: string;
  doiWebsite: string;
  keyLaws: string[];
  erisaNote: string;
}

const STATE_DATA: Record<string, StateRightsData> = {
  CA: {
    name: 'California',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'CA Dept. of Insurance',
    doiPhone: '1-800-927-4357',
    doiWebsite: 'https://www.insurance.ca.gov',
    keyLaws: [
      'Timely Access to Care (Health & Safety Code 1367.03)',
      'Independent Medical Review through DMHC',
      'Insurers must respond to urgent appeals within 72 hours',
    ],
    erisaNote: 'State-regulated plans go through DMHC or CDI. ERISA plans bypass state review and go to federal court after internal appeal.',
  },
  TX: {
    name: 'Texas',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'TX Dept. of Insurance',
    doiPhone: '1-800-252-3439',
    doiWebsite: 'https://www.tdi.texas.gov',
    keyLaws: [
      'Insurance Code Chapter 4201 (Utilization Review)',
      'Right to independent review organization (IRO)',
      'Adverse determinations must include clinical basis',
    ],
    erisaNote: 'State-regulated plans can use the IRO process. ERISA plans must exhaust internal appeals before filing in federal court.',
  },
  FL: {
    name: 'Florida',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'FL Office of Insurance Regulation',
    doiPhone: '1-877-693-5236',
    doiWebsite: 'https://www.floir.com',
    keyLaws: [
      'FL Statute 627.6131 (Claims Administration)',
      'External review through FL AHCA for HMOs',
      'Insurers must provide written denial reasons',
    ],
    erisaNote: 'State-regulated HMO plans may appeal through AHCA. ERISA plans skip state processes entirely.',
  },
  NY: {
    name: 'New York',
    internalAppealDays: 60,
    externalReviewAvailable: true,
    doiName: 'NY Dept. of Financial Services',
    doiPhone: '1-800-342-3736',
    doiWebsite: 'https://www.dfs.ny.gov',
    keyLaws: [
      'Insurance Law Section 4904 (External Appeal)',
      'Surprise Bill protections under Financial Services Law',
      '45-day external appeal deadline after final adverse determination',
    ],
    erisaNote: 'NY has strong external appeal rights for state-regulated plans. ERISA plans do not qualify for the state external appeal process.',
  },
  PA: {
    name: 'Pennsylvania',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'PA Insurance Dept.',
    doiPhone: '1-877-881-6388',
    doiWebsite: 'https://www.pa.gov/services/insurance',
    keyLaws: [
      'Act 68 (Quality Health Care Accountability)',
      'Right to external grievance review',
      'Utilization review decisions must be made by licensed physicians',
    ],
    erisaNote: 'Act 68 protections apply to state-regulated plans. ERISA plans follow federal appeal rules only.',
  },
  IL: {
    name: 'Illinois',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'IL Dept. of Insurance',
    doiPhone: '1-866-445-5364',
    doiWebsite: 'https://insurance.illinois.gov',
    keyLaws: [
      '215 ILCS 180 (Health Carrier External Review Act)',
      'HMO Act external review provisions',
      'Mandatory coverage for clinical trial costs',
    ],
    erisaNote: 'State external review applies to fully insured plans. ERISA self-funded plans must use internal appeals then federal court.',
  },
  OH: {
    name: 'Ohio',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'OH Dept. of Insurance',
    doiPhone: '1-800-686-1526',
    doiWebsite: 'https://insurance.ohio.gov',
    keyLaws: [
      'ORC 3922 (Health Insurance External Review)',
      'Right to request independent external review',
      'Insurers must notify of appeal rights in denial letters',
    ],
    erisaNote: 'Ohio external review covers state-regulated plans only. Self-funded ERISA plans follow federal rules.',
  },
  GA: {
    name: 'Georgia',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'GA Office of Insurance',
    doiPhone: '1-800-656-2298',
    doiWebsite: 'https://oci.georgia.gov',
    keyLaws: [
      'OCGA 33-20A (Patient\'s Bill of Rights)',
      'External review through Commissioner of Insurance',
      'Insurers must respond to complaints within 15 business days',
    ],
    erisaNote: 'State-regulated plans have external review through the Commissioner. ERISA plans are exempt from state review.',
  },
  NC: {
    name: 'North Carolina',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'NC Dept. of Insurance',
    doiPhone: '1-855-408-1212',
    doiWebsite: 'https://www.ncdoi.gov',
    keyLaws: [
      'NCGS 58-50-75 through 58-50-95 (External Review)',
      'Managed care patient protections',
      'Right to second opinion at insurer\'s expense',
    ],
    erisaNote: 'NC external review law applies to fully insured plans. ERISA self-funded plans bypass state processes.',
  },
  NJ: {
    name: 'New Jersey',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'NJ Dept. of Banking and Insurance',
    doiPhone: '1-800-446-7467',
    doiWebsite: 'https://www.state.nj.us/dobi',
    keyLaws: [
      'NJSA 26:2S (Health Care Quality Act)',
      'Independent Utilization Review Organization process',
      'Network adequacy requirements',
    ],
    erisaNote: 'NJ external review and IURO process covers state-regulated plans. ERISA plans follow federal standards.',
  },
  MI: {
    name: 'Michigan',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'MI Dept. of Insurance and Financial Services',
    doiPhone: '1-877-999-6442',
    doiWebsite: 'https://www.michigan.gov/difs',
    keyLaws: [
      'MCL 550.1901 (External Review)',
      'Patient Right to Independent Review Act',
      'Prompt pay requirements for claims',
    ],
    erisaNote: 'Michigan external review covers fully insured plans. ERISA plans must exhaust federal internal appeals first.',
  },
  VA: {
    name: 'Virginia',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'VA Bureau of Insurance',
    doiPhone: '1-877-310-6560',
    doiWebsite: 'https://www.scc.virginia.gov/pages/Bureau-of-Insurance',
    keyLaws: [
      'VA Code 38.2-5900 (External Review)',
      'Health carrier grievance procedures required',
      'Balance billing protections for emergency services',
    ],
    erisaNote: 'Virginia external review applies to state-regulated plans. Self-funded ERISA plans are not covered.',
  },
  WA: {
    name: 'Washington',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'WA Office of the Insurance Commissioner',
    doiPhone: '1-800-562-6900',
    doiWebsite: 'https://www.insurance.wa.gov',
    keyLaws: [
      'RCW 48.43.535 (Independent Review)',
      'Balance Billing Protection Act',
      'Insurers must cover emergency services without prior auth',
    ],
    erisaNote: 'WA independent review covers state-regulated plans. ERISA plans follow federal appeal procedures.',
  },
  AZ: {
    name: 'Arizona',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'AZ Dept. of Insurance and Financial Institutions',
    doiPhone: '1-602-364-3100',
    doiWebsite: 'https://difi.az.gov',
    keyLaws: [
      'ARS 20-2533 (External Review of Adverse Decisions)',
      'Health care appeals process through ADOI',
      'Mandatory disclosure of utilization review criteria',
    ],
    erisaNote: 'Arizona external review covers fully insured plans. ERISA self-funded plans are federally regulated.',
  },
  MA: {
    name: 'Massachusetts',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'MA Division of Insurance',
    doiPhone: '1-877-563-4467',
    doiWebsite: 'https://www.mass.gov/orgs/division-of-insurance',
    keyLaws: [
      'MGL Chapter 176O (Managed Care Consumer Protections)',
      'External review through Office of Patient Protection',
      'Mental health parity enforcement',
    ],
    erisaNote: 'MA has robust consumer protections for state-regulated plans. ERISA plans are not subject to state external review.',
  },
  OTHER: {
    name: 'Other / Not Listed',
    internalAppealDays: 30,
    externalReviewAvailable: true,
    doiName: 'Your State Dept. of Insurance',
    doiPhone: 'Check NAIC.org for your state',
    doiWebsite: 'https://www.naic.org',
    keyLaws: [
      'ACA requires all plans to offer internal appeals',
      'External review is available in all states under federal floor',
      'You have 180 days to file an internal appeal after denial',
    ],
    erisaNote: 'If your plan is self-funded (ERISA), state insurance laws generally do not apply. You must exhaust internal appeals then file in federal court. Fully insured plans are regulated by your state.',
  },
};

const STATE_OPTIONS = [
  { label: 'Select your state...', value: '' },
  { label: 'Arizona', value: 'AZ' },
  { label: 'California', value: 'CA' },
  { label: 'Florida', value: 'FL' },
  { label: 'Georgia', value: 'GA' },
  { label: 'Illinois', value: 'IL' },
  { label: 'Massachusetts', value: 'MA' },
  { label: 'Michigan', value: 'MI' },
  { label: 'New Jersey', value: 'NJ' },
  { label: 'New York', value: 'NY' },
  { label: 'North Carolina', value: 'NC' },
  { label: 'Ohio', value: 'OH' },
  { label: 'Pennsylvania', value: 'PA' },
  { label: 'Texas', value: 'TX' },
  { label: 'Virginia', value: 'VA' },
  { label: 'Washington', value: 'WA' },
  { label: 'Alabama', value: 'OTHER' },
  { label: 'Alaska', value: 'OTHER' },
  { label: 'Arkansas', value: 'OTHER' },
  { label: 'Colorado', value: 'OTHER' },
  { label: 'Connecticut', value: 'OTHER' },
  { label: 'Delaware', value: 'OTHER' },
  { label: 'Hawaii', value: 'OTHER' },
  { label: 'Idaho', value: 'OTHER' },
  { label: 'Indiana', value: 'OTHER' },
  { label: 'Iowa', value: 'OTHER' },
  { label: 'Kansas', value: 'OTHER' },
  { label: 'Kentucky', value: 'OTHER' },
  { label: 'Louisiana', value: 'OTHER' },
  { label: 'Maine', value: 'OTHER' },
  { label: 'Maryland', value: 'OTHER' },
  { label: 'Minnesota', value: 'OTHER' },
  { label: 'Mississippi', value: 'OTHER' },
  { label: 'Missouri', value: 'OTHER' },
  { label: 'Montana', value: 'OTHER' },
  { label: 'Nebraska', value: 'OTHER' },
  { label: 'Nevada', value: 'OTHER' },
  { label: 'New Hampshire', value: 'OTHER' },
  { label: 'New Mexico', value: 'OTHER' },
  { label: 'North Dakota', value: 'OTHER' },
  { label: 'Oklahoma', value: 'OTHER' },
  { label: 'Oregon', value: 'OTHER' },
  { label: 'Rhode Island', value: 'OTHER' },
  { label: 'South Carolina', value: 'OTHER' },
  { label: 'South Dakota', value: 'OTHER' },
  { label: 'Tennessee', value: 'OTHER' },
  { label: 'Utah', value: 'OTHER' },
  { label: 'Vermont', value: 'OTHER' },
  { label: 'West Virginia', value: 'OTHER' },
  { label: 'Wisconsin', value: 'OTHER' },
  { label: 'Wyoming', value: 'OTHER' },
  { label: 'Washington D.C.', value: 'OTHER' },
];

export default function RightsScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const [selectedState, setSelectedState] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const stateData = selectedState ? STATE_DATA[selectedState] : null;
  const selectedLabel = STATE_OPTIONS.find(
    (o) => o.value === selectedState && o.value !== ''
  )?.label || '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: colors.primary, fontSize: 16, fontFamily: 'Outfit_600SemiBold' }}>← Back</Text>
        </Pressable>
        <Text style={[typography.h1, { color: colors.text }]}>Know Your Rights</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          State-specific appeal rights and contacts
        </Text>
      </View>

      <View style={styles.buddyRow}>
        <MiniBuddy size={48} />
        <View style={[styles.buddyBubble, { backgroundColor: `${colors.primary}14` }]}>
          <Text style={[typography.body, { color: colors.text }]}>
            Every state has different rules. Let's find yours.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* State Dropdown */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>YOUR STATE</Text>
          <Pressable
            onPress={() => setDropdownOpen(!dropdownOpen)}
            style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <Text style={[typography.body, { color: selectedState ? colors.text : colors.textTertiary }]}>
              {selectedState ? selectedLabel : 'Select your state...'}
            </Text>
            <Text style={{ color: colors.textTertiary }}>{dropdownOpen ? '▲' : '▼'}</Text>
          </Pressable>

          {dropdownOpen && (
            <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                {STATE_OPTIONS.filter((o) => o.value !== '').map((option, i) => (
                  <Pressable
                    key={`${option.label}-${i}`}
                    onPress={() => {
                      setSelectedState(option.value);
                      setDropdownOpen(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: `${colors.border}40` },
                    ]}
                  >
                    <Text style={[typography.body, { color: colors.text }]}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>

        {/* State Info */}
        {stateData && (
          <>
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                <Text style={[typography.h3, { color: colors.primary, marginBottom: 12 }]}>
                  ⏱ Appeal Deadlines
                </Text>
                <View style={styles.infoRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Internal appeal deadline</Text>
                  <Text style={[typography.body, { color: colors.text, fontFamily: 'Outfit_600SemiBold' }]}>
                    {stateData.internalAppealDays} days
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>External review available</Text>
                  <Text style={[typography.body, { color: stateData.externalReviewAvailable ? colors.success : colors.error, fontFamily: 'Outfit_600SemiBold' }]}>
                    {stateData.externalReviewAvailable ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                <Text style={[typography.h3, { color: colors.primary, marginBottom: 12 }]}>
                  📞 Insurance Department Contact
                </Text>
                <Text style={[typography.body, { color: colors.text, fontFamily: 'Outfit_600SemiBold', marginBottom: 4 }]}>
                  {stateData.doiName}
                </Text>
                <Pressable onPress={() => Linking.openURL(`tel:${stateData.doiPhone.replace(/[^0-9+]/g, '')}`)}>
                  <Text style={[typography.body, { color: colors.secondary, marginBottom: 4 }]}>
                    📱 {stateData.doiPhone}
                  </Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(stateData.doiWebsite)}>
                  <Text style={[typography.body, { color: colors.secondary }]}>
                    🌐 {stateData.doiWebsite}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                <Text style={[typography.h3, { color: colors.primary, marginBottom: 12 }]}>
                  📜 Public References
                </Text>
                {stateData.keyLaws.map((law, i) => (
                  <Text key={i} style={[typography.body, { color: colors.text, marginBottom: 6 }]}>
                    • {law}
                  </Text>
                ))}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).springify()}>
              <View style={[styles.infoCard, { backgroundColor: `${colors.accent}10`, borderLeftColor: colors.accent, borderLeftWidth: 3 }]}>
                <Text style={[typography.h3, { color: colors.accent, marginBottom: 8 }]}>
                  ⚖️ ERISA vs State-Regulated Plans
                </Text>
                <Text style={[typography.body, { color: colors.text }]}>
                  {stateData.erisaNote}
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).springify()}>
              <View style={[styles.tipCard, { backgroundColor: `${colors.primary}10` }]}>
                <Text style={[typography.body, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>
                  💡 Tip: Check your insurance card or benefits summary to find out if your plan is self-funded (ERISA) or fully insured (state-regulated). This determines which appeal process applies to you.
                </Text>
              </View>
            </Animated.View>

            <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center', paddingHorizontal: 16, marginTop: 4 }]}>
              For informational purposes only. This is not legal advice. Consult a licensed attorney for guidance specific to your situation.
            </Text>
          </>
        )}

        {!selectedState && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🗺️</Text>
              <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>
                Select your state above
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                We'll show you your appeal deadlines, insurance department contact info and key laws that protect you.
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 2 },
  backButton: { marginBottom: 8 },
  buddyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  buddyBubble: { flex: 1, borderRadius: radii.card, padding: 12 },
  content: { paddingHorizontal: 20, gap: 16, paddingBottom: 100 },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  dropdownList: {
    borderRadius: radii.card,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoCard: {
    borderRadius: radii.card,
    padding: 16,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tipCard: {
    borderRadius: radii.card,
    padding: 16,
  },
  emptyState: {
    borderRadius: radii.card,
    padding: 32,
    alignItems: 'center',
  },
});
