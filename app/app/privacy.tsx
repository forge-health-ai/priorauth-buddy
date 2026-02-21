import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, radii } from '../src/theme';

const EFFECTIVE_DATE = 'February 15, 2026';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function Section({ title, children, delay = 0 }: SectionProps) {
  const { colors, typography } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[styles.section, { backgroundColor: colors.surface }]}>  
      <Text style={[typography.h3, { color: colors.primary, marginBottom: 12 }]}>{title}</Text>
      {children}
    </Animated.View>
  );
}

export default function PrivacyPolicyScreen() {
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
        <Text style={[typography.h1, { color: colors.text }]}>Privacy Policy</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>Effective {EFFECTIVE_DATE}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={[styles.highlightCard, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}40` }]}>
          <Text style={[typography.h3, { color: colors.success, marginBottom: 8 }]}>🔒 The Short Version</Text>
          <Text style={bodyStyle}>
            Your medical information stays on your device. We do not store health records on our servers. We do not sell your data. Ever.
          </Text>
        </Animated.View>

        <Section title="Who We Are" delay={50}>
          <Text style={bodyStyle}>
            PriorAuth Buddy is operated by Forge Partners Inc., a health technology company. We built this app to help people navigate insurance prior authorization and appeals. This policy explains what data we collect, what we do not collect and how we protect your privacy.
          </Text>
        </Section>

        <Section title="What We Collect" delay={100}>
          <Text style={bodyStyle}>We keep data collection to an absolute minimum. Here is what we store on our servers:</Text>
          {[
            'Your email address (for account login and communication)',
            'Account preferences (notification settings, display options)',
            'Subscription status (whether you are on a free or paid plan)',
            'Anonymized usage analytics (which features are used, crash reports)',
            'Anonymous aggregate outcome data (win/loss rates by insurer with no personally identifiable information)',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
          <Text style={[bodyStyle, { marginTop: 12 }]}>That is the complete list. Nothing more.</Text>
        </Section>

        <Section title="What We Do NOT Collect" delay={150}>
          <Text style={bodyStyle}>This is just as important as what we do collect:</Text>
          {[
            'We do NOT store medical records, diagnoses or health information on our servers',
            'We do NOT store protected health information (PHI)',
            'We do NOT retain AI-generated appeal letters on our servers',
            'We do NOT collect Social Security numbers, insurance policy numbers or financial information (payments are handled by Apple/Google)',
            'We do NOT build health profiles or advertising profiles about you',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
        </Section>

        <Section title="How We Use Your Data" delay={200}>
          <Text style={bodyStyle}>The data we do collect is used to:</Text>
          {[
            'Keep your account secure and functional',
            'Process your subscription',
            'Send you important updates about the app or your account',
            'Improve the app based on anonymous usage patterns',
            'Track aggregate appeal outcomes (anonymized) to improve our tools for everyone',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
        </Section>

        <Section title="Data Storage and Security" delay={250}>
          <Text style={boldStyle}>Your case data lives on your device.</Text>
          <Text style={[bodyStyle, { marginTop: 8 }]}>
            All case information, medical details and documents you enter into PriorAuth Buddy are stored locally on your device. This data is not uploaded to or stored on our servers.
          </Text>
          <Text style={[bodyStyle, { marginTop: 12 }]}>
            When you use our AI-powered letter generation, your case information is sent to our AI provider for processing. The AI provider does not retain your data after generating the response. No copies are stored on our servers or theirs.
          </Text>
          <Text style={[bodyStyle, { marginTop: 12 }]}>
            Account data stored on our servers is protected using industry-standard encryption in transit (TLS) and at rest. We use Supabase for our backend infrastructure, which provides enterprise-grade security.
          </Text>
        </Section>

        <Section title="Third Parties" delay={300}>
          <Text style={boldStyle}>We do NOT sell your data. Period.</Text>
          <Text style={[bodyStyle, { marginTop: 8 }]}>We work with a limited number of service providers:</Text>
          {[
            'AI Processing: Your case data is sent to our AI provider solely to generate appeal letters. They do not retain your data.',
            'Payment Processing: Apple App Store and Google Play handle all payment transactions. We never see your credit card information.',
            'Analytics: We use privacy-focused analytics to understand app usage. All data is anonymized and aggregated.',
            'Infrastructure: Our backend is hosted on Supabase with servers in the United States.',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
          <Text style={[bodyStyle, { marginTop: 12 }]}>
            We do not share, sell or rent your personal information to advertisers, data brokers or any other third parties.
          </Text>
        </Section>

        <Section title="A Note on HIPAA" delay={350}>
          <Text style={bodyStyle}>
            PriorAuth Buddy is an educational tool that helps you understand and navigate the prior authorization process. We are not a healthcare provider, health plan or healthcare clearinghouse. We are not a covered entity or business associate under HIPAA.
          </Text>
          <Text style={[bodyStyle, { marginTop: 12 }]}>
            That said, we take your privacy seriously and follow privacy best practices that meet or exceed what most apps in this space do. Your health information stays on your device and is never stored on our servers.
          </Text>
        </Section>

        <Section title="Your Rights" delay={400}>
          <Text style={bodyStyle}>You have full control over your data:</Text>
          {[
            'Access: You can request a copy of all data we store about you at any time.',
            'Deletion: You can delete your account and all associated data at any time from the app settings or by contacting us.',
            'Correction: You can update your account information at any time.',
            'Portability: You can export your locally stored case data at any time.',
            'Opt Out: You can disable analytics and non-essential communications.',
          ].map((item, i) => (
            <View key={i} style={styles.bullet}>
              <Text style={bulletStyle}>  •  {item}</Text>
            </View>
          ))}
          <Text style={[bodyStyle, { marginTop: 12 }]}>
            To exercise any of these rights, email us at privacy@forgehealth.ai. We will respond within 30 days.
          </Text>
        </Section>

        <Section title="Children's Privacy" delay={450}>
          <Text style={bodyStyle}>
            PriorAuth Buddy is designed for adults aged 18 and older. We do not knowingly collect information from anyone under 18. If you believe a minor has provided us with personal information, please contact us at privacy@forgehealth.ai and we will promptly delete it.
          </Text>
        </Section>

        <Section title="Changes to This Policy" delay={500}>
          <Text style={bodyStyle}>
            If we make meaningful changes to this policy, we will notify you through the app or by email before the changes take effect. We will never quietly reduce your privacy protections. Minor clarifications or formatting changes may be made without notice.
          </Text>
        </Section>

        <Section title="Contact Us" delay={550}>
          <Text style={bodyStyle}>
            If you have questions about this policy or your privacy, we want to hear from you:
          </Text>
          <Text style={[boldStyle, { marginTop: 12 }]}>Forge Partners Inc.</Text>
          <Text style={bodyStyle}>Ontario, Canada</Text>
          <Text style={[bodyStyle, { color: colors.primary, marginTop: 4 }]}>privacy@forgehealth.ai</Text>
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
