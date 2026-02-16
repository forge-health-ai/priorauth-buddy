import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, radii } from '../src/theme';

const EFFECTIVE_DATE = 'February 15, 2026';

interface SectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function Section({ number, title, children, delay = 0 }: SectionProps) {
  const { colors, typography } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[typography.h3, { color: colors.primary, marginBottom: 12 }]}>{number}. {title}</Text>
      {children}
    </Animated.View>
  );
}

export default function TermsOfServiceScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();

  const bodyStyle = [typography.body, { color: colors.text, lineHeight: 24 }];
  const boldStyle = [typography.body, { color: colors.text, fontWeight: '700' as const, lineHeight: 24 }];
  const bulletStyle = [typography.body, { color: colors.textSecondary, lineHeight: 24 }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[typography.body, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <Text style={[typography.h1, { color: colors.text }]}>Terms of Service</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>Effective {EFFECTIVE_DATE}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={[styles.highlightCard, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}40` }]}>
          <Text style={[typography.h3, { color: colors.accent, marginBottom: 8 }]}>📋 Plain English Summary</Text>
          <Text style={bodyStyle}>
            PriorAuth Buddy is an educational tool. We help you understand prior authorization and write appeal letters, but we are not lawyers, doctors or insurance agents. Success is never guaranteed. You are responsible for verifying all information before using it.
          </Text>
        </Animated.View>

        <Section number="1" title="Agreement to Terms" delay={50}>
          <Text style={bodyStyle}>
            By downloading, accessing or using PriorAuth Buddy ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App. These Terms constitute a legally binding agreement between you and Forge Partners Inc. ("we," "us," "our"), a company incorporated in Ontario, Canada.
          </Text>
        </Section>

        <Section number="2" title="Eligibility" delay={75}>
          <Text style={bodyStyle}>
            You must be at least 18 years old to use the App. By using the App, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms.
          </Text>
        </Section>

        <Section number="3" title="Educational Tool Disclaimer" delay={100}>
          <Text style={boldStyle}>This is critically important:</Text>
          <Text style={[bodyStyle, { marginTop: 8 }]}>
            PriorAuth Buddy is an educational tool designed to help you understand and navigate the insurance prior authorization and appeals process. The App does NOT provide:
          </Text>
          {[
            'Legal advice or legal representation',
            'Medical advice, diagnoses or treatment recommendations',
            'Insurance advice or insurance brokerage services',
            'Guarantees of any outcome for any appeal or prior authorization request',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
          <Text style={[bodyStyle, { marginTop: 12 }]}>
            AI-generated content (including appeal letters, talking points and recommendations) is a starting point, not a final product. You are solely responsible for reviewing, editing and verifying all information before submitting anything to your insurer, healthcare provider or any other party.
          </Text>
        </Section>

        <Section number="4" title="No Guarantee of Outcomes" delay={125}>
          <Text style={bodyStyle}>
            We make no guarantees, representations or warranties that using the App will result in approval of any prior authorization request or appeal. Insurance decisions are made by insurers based on their own criteria, policies and medical review processes. Past success rates displayed in the App are for informational purposes only and do not predict future outcomes.
          </Text>
        </Section>

        <Section number="5" title="User Responsibilities" delay={150}>
          <Text style={bodyStyle}>You agree to:</Text>
          {[
            'Verify all information generated by the App before using it',
            'Provide accurate information when using the App',
            'Use the App only for lawful purposes',
            'Not misrepresent AI-generated content as professional legal or medical advice',
            'Not use the App to submit fraudulent claims or appeals',
            'Keep your account credentials secure',
            'Not reverse engineer, decompile or attempt to extract the source code of the App',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
        </Section>

        <Section number="6" title="Subscription and Payment" delay={175}>
          <Text style={boldStyle}>Pricing</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            PriorAuth Buddy Pro is available for $4.99 per month (USD). Pricing may change with reasonable notice.
          </Text>
          <Text style={[boldStyle, { marginTop: 12 }]}>Billing</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            Subscriptions are billed monthly through the Apple App Store or Google Play Store. Your subscription automatically renews unless you cancel at least 24 hours before the end of your current billing period.
          </Text>
          <Text style={[boldStyle, { marginTop: 12 }]}>Cancellation</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            You may cancel your subscription at any time through your device's app store settings. Cancellation takes effect at the end of your current billing period. You will retain access to Pro features until that period ends.
          </Text>
          <Text style={[boldStyle, { marginTop: 12 }]}>Refunds</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            No refunds are provided for partial months. Refund requests for full billing periods are handled by Apple or Google according to their respective refund policies.
          </Text>
        </Section>

        <Section number="7" title="Intellectual Property" delay={200}>
          <Text style={boldStyle}>Our Property</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            The App, including its design, code, AI models, branding, content and all related intellectual property, is owned by Forge Partners Inc. and protected by copyright, trademark and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the App for personal, non-commercial purposes.
          </Text>
          <Text style={[boldStyle, { marginTop: 12 }]}>Your Content</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            You retain full ownership of all information, documents and content you input into the App. We do not claim any ownership rights over your content. Case data you enter is stored locally on your device and is not uploaded to our servers.
          </Text>
        </Section>

        <Section number="8" title="Limitation of Liability" delay={225}>
          <Text style={bodyStyle}>
            To the maximum extent permitted by applicable law, Forge Partners Inc. and its officers, directors, employees, agents and affiliates shall not be liable for any indirect, incidental, special, consequential or punitive damages, including but not limited to:
          </Text>
          {[
            'Loss of profits, data or other intangible losses',
            'Denial of any insurance claim or appeal',
            'Any decisions made based on information provided by the App',
            'Interruption or unavailability of the App',
            'Unauthorized access to your account',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
          <Text style={[bodyStyle, { marginTop: 12 }]}>
            In no event shall our total liability to you for all claims arising from or related to the App exceed the amount you paid us in the twelve (12) months preceding the claim, or fifty dollars ($50 USD), whichever is greater.
          </Text>
        </Section>

        <Section number="9" title="Indemnification" delay={250}>
          <Text style={bodyStyle}>
            You agree to indemnify, defend and hold harmless Forge Partners Inc. and its officers, directors, employees and agents from and against any claims, liabilities, damages, losses, costs and expenses (including reasonable attorney fees) arising from or related to:
          </Text>
          {[
            'Your use of the App',
            'Your violation of these Terms',
            'Your violation of any third-party rights',
            'Any content you submit through the App',
            'Any insurance claims or appeals you file using information from the App',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
        </Section>

        <Section number="10" title="Dispute Resolution" delay={275}>
          <Text style={boldStyle}>Informal Resolution</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            Before filing any formal dispute, you agree to contact us at support@priorauthbuddy.com and attempt to resolve the issue informally for at least 30 days.
          </Text>
          <Text style={[boldStyle, { marginTop: 12 }]}>Arbitration</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            If informal resolution fails, you and Forge Partners Inc. agree to resolve any disputes through binding arbitration administered in Ontario, Canada, rather than in court, except that either party may bring claims in small claims court if eligible.
          </Text>
          <Text style={[boldStyle, { marginTop: 12 }]}>Class Action Waiver</Text>
          <Text style={[bodyStyle, { marginTop: 4 }]}>
            You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated or representative action.
          </Text>
        </Section>

        <Section number="11" title="Governing Law" delay={300}>
          <Text style={bodyStyle}>
            These Terms are governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of law principles. Any legal proceedings not subject to arbitration shall be brought exclusively in the courts of Ontario, Canada.
          </Text>
        </Section>

        <Section number="12" title="Termination" delay={325}>
          <Text style={bodyStyle}>
            You may stop using the App and delete your account at any time. We reserve the right to suspend or terminate your access to the App at our discretion, with or without notice, for conduct that we believe violates these Terms or is harmful to other users, us or third parties. Upon termination, your right to use the App ceases immediately. Provisions that by their nature should survive termination (including limitation of liability, indemnification and dispute resolution) will remain in effect.
          </Text>
        </Section>

        <Section number="13" title="Changes to These Terms" delay={350}>
          <Text style={bodyStyle}>
            We may update these Terms from time to time. If we make material changes, we will notify you through the App or by email at least 30 days before the changes take effect. Your continued use of the App after changes take effect constitutes acceptance of the updated Terms. If you do not agree, stop using the App and delete your account.
          </Text>
        </Section>

        <Section number="14" title="Severability" delay={375}>
          <Text style={bodyStyle}>
            If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision will be modified to the minimum extent necessary to make it enforceable, or if modification is not possible, it will be severed. The remaining provisions will continue in full force and effect.
          </Text>
        </Section>

        <Section number="15" title="Entire Agreement" delay={400}>
          <Text style={bodyStyle}>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Forge Partners Inc. regarding the App and supersede all prior agreements, understandings and communications, whether written or oral.
          </Text>
        </Section>

        <Section number="16" title="Contact" delay={425}>
          <Text style={bodyStyle}>Questions about these Terms? Reach out:</Text>
          <Text style={[boldStyle, { marginTop: 12 }]}>Forge Partners Inc.</Text>
          <Text style={bodyStyle}>Ontario, Canada</Text>
          <Text style={[bodyStyle, { color: colors.primary, marginTop: 4 }]}>support@priorauthbuddy.com</Text>
        </Section>

        <View style={styles.footer}>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
            PriorAuth Buddy v1.0.0
          </Text>
          <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
            2026 Forge Partners Inc. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 4 },
  backButton: { paddingVertical: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 100, gap: 16 },
  highlightCard: { borderRadius: radii.card, padding: 20, borderWidth: 1 },
  section: { borderRadius: radii.card, padding: 20 },
  bullet: { marginTop: 6 },
  footer: { marginTop: 16, gap: 4, paddingBottom: 20 },
});
