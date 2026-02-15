import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, radii } from '../../src/theme';
import { FORGEButton } from '../../src/components/FORGEButton';
import { MiniBuddy } from '../../src/components/MiniBuddy';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { supabase, Case } from '../../src/lib/supabase';
import { generateAppealLetter, generateDOIComplaint } from '../../src/lib/ai';

interface CaseEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
  pending: { label: 'Pending', color: '#F59E0B', emoji: '⏳' },
  approved: { label: 'Approved', color: '#22C55E', emoji: '✅' },
  denied: { label: 'Denied', color: '#EF4444', emoji: '❌' },
  appealing: { label: 'Appealing', color: '#8B5CF6', emoji: '⚔️' },
  appeal_won: { label: 'Appeal Won', color: '#22C55E', emoji: '🎉' },
  appeal_denied: { label: 'Appeal Denied', color: '#EF4444', emoji: '💔' },
  escalated: { label: 'Escalated', color: '#F97316', emoji: '🔥' },
  complaint_filed: { label: 'Complaint Filed', color: '#EC4899', emoji: '📋' },
};

export default function CaseDetailScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAppeal, setGeneratingAppeal] = useState(false);
  const [generatingComplaint, setGeneratingComplaint] = useState(false);

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  const fetchCaseDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch case
      const { data: caseItem, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (caseError) {
        console.error('Fetch case error:', caseError);
        return;
      }

      setCaseData(caseItem);

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('case_events')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: false });

      if (!eventsError) {
        setEvents(eventsData || []);
      }
    } catch (error) {
      console.error('Error fetching case details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWriteAppeal = async () => {
    if (!caseData) return;
    if (!caseData.denial_reason) {
      Alert.alert('Missing Info', 'This case does not have a denial reason recorded. Please edit the case to add one.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGeneratingAppeal(true);

    try {
      const result = await generateAppealLetter({
        procedureName: caseData.procedure_name,
        procedureCode: caseData.procedure_code,
        insurerName: caseData.insurer_name || 'Insurance Company',
        denialReason: caseData.denial_reason,
        providerName: caseData.provider_name,
      });

      // Save appeal to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('appeals').insert({
          case_id: caseData.id,
          user_id: user.id,
          letter_text: result.letter,
          model_used: result.model,
        });

        // Update case status
        await supabase.from('cases').update({ status: 'appealing' }).eq('id', caseData.id);

        // Add event
        await supabase.from('case_events').insert({
          case_id: caseData.id,
          user_id: user.id,
          event_type: 'appeal_generated',
          description: 'AI appeal letter generated and saved',
        });
      }

      // Show appeal letter
      Alert.alert(
        'Appeal Letter Ready!',
        'Your appeal letter has been generated. Would you like to copy or share it?',
        [
          { text: 'Close', style: 'cancel' },
          { 
            text: 'Copy', 
            onPress: async () => {
              await Share.share({ message: result.letter });
            }
          },
          {
            text: 'Share',
            onPress: async () => {
              await Share.share({
                title: 'Appeal Letter',
                message: result.letter,
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Appeal generation error:', error);
      Alert.alert('Error', 'Failed to generate appeal letter. Please try again.');
    } finally {
      setGeneratingAppeal(false);
      fetchCaseDetails();
    }
  };

  const handleFileComplaint = async () => {
    if (!caseData) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGeneratingComplaint(true);

    try {
      const result = await generateDOIComplaint({
        procedureName: caseData.procedure_name,
        insurerName: caseData.insurer_name || 'Insurance Company',
        denialReason: caseData.denial_reason || 'Unspecified denial',
        denialDate: caseData.denial_date || undefined,
        state: 'CA', // Default to CA, should be from user profile
      });

      // Save complaint to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('doi_complaints').insert({
          case_id: caseData.id,
          user_id: user.id,
          complaint_text: result.complaint,
          state: 'CA',
        });

        // Update case status
        await supabase.from('cases').update({ status: 'complaint_filed' }).eq('id', caseData.id);

        // Add event
        await supabase.from('case_events').insert({
          case_id: caseData.id,
          user_id: user.id,
          event_type: 'complaint_filed',
          description: 'DOI complaint generated and filed',
        });
      }

      Alert.alert(
        'Complaint Generated!',
        'Your Department of Insurance complaint has been created.',
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Share',
            onPress: async () => {
              await Share.share({
                title: 'DOI Complaint',
                message: result.complaint,
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Complaint generation error:', error);
      Alert.alert('Error', 'Failed to generate complaint. Please try again.');
    } finally {
      setGeneratingComplaint(false);
      fetchCaseDetails();
    }
  };

  const handleLogCall = () => {
    router.push({
      pathname: '/(tabs)/scripts',
      params: { caseId: id, insurer: caseData?.insurer_name }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysRemaining = (deadlineString?: string) => {
    if (!deadlineString) return null;
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading || !caseData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={20}>
            <Text style={[typography.body, { color: colors.primary }]}>← Back</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <MiniBuddy mood="thinking" size={20} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
          </View>
        </View>
        <View style={styles.centered}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusConfig[caseData.status] || statusConfig.pending;
  const daysRemaining = getDaysRemaining(caseData.appeal_deadline);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Text style={[typography.body, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <MiniBuddy mood="thinking" size={20} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>PriorAuth Buddy</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Text style={[typography.caption, { color: status.color }]}>
              {status.emoji} {status.label}
            </Text>
          </View>

          <Text style={[typography.h1, { color: colors.text }]}>{caseData.procedure_name}</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{caseData.insurer_name}</Text>

          {daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && (
            <LinearGradient colors={[`${colors.error}15`, `${colors.error}05`]} style={styles.alertCard}>
              <Text style={[typography.h3, { color: colors.error }]}>
                🔥 {daysRemaining === 1 ? '1 day' : `${daysRemaining} days`} remaining to appeal
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Deadline: {caseData.appeal_deadline ? formatDate(caseData.appeal_deadline) : 'Not set'}
              </Text>
            </LinearGradient>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.infoSection}>
          <Text style={[typography.h3, { color: colors.text }]}>Case Details</Text>
          
          <View style={styles.infoGrid}>
            {caseData.procedure_code && (
              <View style={styles.infoItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>CPT Code</Text>
                <Text style={[typography.body, { color: colors.text }]}>{caseData.procedure_code}</Text>
              </View>
            )}
            {caseData.policy_number && (
              <View style={styles.infoItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Policy Number</Text>
                <Text style={[typography.body, { color: colors.text }]}>{caseData.policy_number}</Text>
              </View>
            )}
            {caseData.reference_number && (
              <View style={styles.infoItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Reference #</Text>
                <Text style={[typography.body, { color: colors.text }]}>{caseData.reference_number}</Text>
              </View>
            )}
            {caseData.provider_name && (
              <View style={styles.infoItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Provider</Text>
                <Text style={[typography.body, { color: colors.text }]}>{caseData.provider_name}</Text>
              </View>
            )}
          </View>

          {caseData.denial_reason && (
            <View style={[styles.denialBox, { backgroundColor: colors.surface, borderColor: colors.tabBarBorder }]}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Denial Reason</Text>
              <Text style={[typography.body, { color: colors.text }]}>{caseData.denial_reason}</Text>
            </View>
          )}

          {caseData.notes && (
            <View style={[styles.notesBox, { backgroundColor: colors.surface, borderColor: colors.tabBarBorder }]}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4 }]}>Notes</Text>
              <Text style={[typography.body, { color: colors.text }]}>{caseData.notes}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.actionsSection}>
          <Text style={[typography.h3, { color: colors.text }]}>Actions</Text>
          <View style={styles.actionButtons}>
            <FORGEButton
              title={generatingAppeal ? 'Generating...' : 'Write an Appeal'}
              onPress={handleWriteAppeal}
              loading={generatingAppeal}
            />
            <FORGEButton
              title="Log a Call"
              onPress={handleLogCall}
              variant="secondary"
            />
            <FORGEButton
              title={generatingComplaint ? 'Generating...' : 'File DOI Complaint'}
              onPress={handleFileComplaint}
              loading={generatingComplaint}
              variant="secondary"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.timelineSection}>
          <Text style={[typography.h3, { color: colors.text }]}>Timeline</Text>
          {events.length === 0 ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>No events yet</Text>
          ) : (
            events.map((event, index) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                <View style={styles.timelineContent}>
                  <Text style={[typography.body, { color: colors.text }]}>
                    {event.description}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {formatDate(event.created_at)}
                  </Text>
                </View>
                {index < events.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: colors.tabBarBorder }]} />
                )}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 20 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, marginBottom: 12 },
  alertCard: { borderRadius: radii.card, padding: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255, 59, 92, 0.15)' },
  infoSection: { gap: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoItem: { flex: 1, minWidth: '45%', backgroundColor: 'transparent' },
  denialBox: { borderWidth: 1, borderRadius: radii.card, padding: 16, marginTop: 8 },
  notesBox: { borderWidth: 1, borderRadius: radii.card, padding: 16, marginTop: 8 },
  actionsSection: { gap: 12 },
  actionButtons: { gap: 12 },
  timelineSection: { gap: 12 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingVertical: 8, position: 'relative' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineContent: { flex: 1, gap: 2 },
  timelineLine: { position: 'absolute', left: 4, top: 22, width: 2, height: 40 },
});
