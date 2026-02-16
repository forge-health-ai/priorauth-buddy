import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, Share } from 'react-native';
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
import { generateAppealLetter, generateDOIComplaint, analyzeDenialLetter, DenialAnalysis } from '../../src/lib/ai';
import { emailLetterToSelf } from '../../src/lib/email-letter';
import { submitAnonymousOutcome } from '../../src/lib/outcome-tracking';

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
  const [denialText, setDenialText] = useState('');
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DenialAnalysis | null>(null);
  const [appealLetter, setAppealLetter] = useState<string | null>(null);
  const [complaintLetter, setComplaintLetter] = useState<string | null>(null);

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

      // Show appeal letter inline FIRST
      setAppealLetter(result.letter);

      // Save appeal to database (non-blocking)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from('appeals').insert({
          case_id: caseData.id,
          user_id: user.id,
          letter_text: result.letter,
        }).then(() => {});

        supabase.from('cases').update({ status: 'appealing' }).eq('id', caseData.id).then(() => {});

        supabase.from('case_events').insert({
          case_id: caseData.id,
          user_id: user.id,
          event_type: 'appeal_generated',
          title: 'Appeal Letter Generated',
          description: 'AI appeal letter generated and saved',
        }).then(() => {});
      }
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

      // Show complaint inline FIRST
      setComplaintLetter(result.complaint);

      // Save to database (non-blocking) - store in appeals table with document_type = 'complaint'
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from('appeals').insert({
          case_id: caseData.id,
          user_id: user.id,
          letter_text: result.complaint,
          document_type: 'complaint',
        }).then(() => {});
        supabase.from('cases').update({ status: 'complaint_filed' }).eq('id', caseData.id).then(() => {});
        supabase.from('case_events').insert({
          case_id: caseData.id,
          user_id: user.id,
          event_type: 'complaint_filed',
          title: 'DOI Complaint Filed',
          description: 'DOI complaint generated and filed',
        }).then(() => {});
      }
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

  const handleAnalyzeDenial = async () => {
    if (!denialText.trim() || !caseData) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnalyzing(true);
    
    try {
      const result = await analyzeDenialLetter(denialText, caseData.insurer_name || undefined);
      setAnalysisResult(result);
      
      // Save analysis to case notes
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const analysisNote = `\n\n[AI Denial Analysis - ${new Date().toLocaleDateString()}]\n\nDenial Reason: ${result.denialReason}\n\nClinical Criteria: ${result.clinicalCriteria}\n\nTimeline: ${result.timeline}\n\nAppeal Angles:\n${result.appealAngles.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nNext Steps: ${result.nextSteps}`;
        
        const newNotes = caseData.notes 
          ? caseData.notes + analysisNote
          : analysisNote;
        
        await supabase
          .from('cases')
          .update({ notes: newNotes })
          .eq('id', caseData.id);
        
        // Update local state
        setCaseData(prev => prev ? { ...prev, notes: newNotes } : null);
        
        // Add event
        await supabase.from('case_events').insert({
          case_id: caseData.id,
          user_id: user.id,
          event_type: 'denial_analyzed',
          title: 'Denial Analysis Complete',
          description: 'AI denial letter analysis completed',
        });
        
        fetchCaseDetails();
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze denial letter. Please try again.');
    } finally {
      setAnalyzing(false);
    }
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
          <Pressable onPress={() => { router.push('/(tabs)/cases') }} hitSlop={20}>
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
        <Pressable onPress={() => { router.push('/(tabs)/cases') }} hitSlop={20}>
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

        {/* Outcome Update */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.actionsSection}>
          <Text style={[typography.h3, { color: colors.text }]}>Update Outcome</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Did you win? Help others fight back (shared anonymously).
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { status: 'approved', label: '🎉 I Won!', color: colors.success },
              { status: 'denied_final', label: '😔 Denied', color: colors.error },
              { status: 'pending', label: '⏳ Still Waiting', color: colors.warning },
            ].map(opt => (
              <Pressable
                key={opt.status}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // Update case status
                  const newStatus = opt.status === 'approved' ? 'approved' : opt.status === 'denied_final' ? 'denied' : caseData.status;
                  supabase.from('cases').update({ status: newStatus }).eq('id', caseData.id).then(() => fetchCaseDetails());

                  // Submit anonymous outcome if won or lost
                  if (opt.status !== 'pending') {
                    await submitAnonymousOutcome({
                      insurer_name: caseData.insurer_name || 'Unknown',
                      procedure_type: 'general',
                      procedure_category: caseData.procedure_name || 'Unknown',
                      outcome: opt.status === 'approved' ? 'won' : 'lost',
                      appeal_count: 1,
                      used_peer_review: false,
                      used_doi_complaint: false,
                      days_to_resolution: null,
                    });
                  }

                  if (opt.status === 'approved') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                style={[{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: radii.button,
                  borderWidth: 1,
                  borderColor: caseData.status === (opt.status === 'denied_final' ? 'denied' : opt.status) ? opt.color : colors.border,
                  backgroundColor: caseData.status === (opt.status === 'denied_final' ? 'denied' : opt.status) ? `${opt.color}15` : colors.surface,
                  alignItems: 'center',
                }]}
              >
                <Text style={[typography.caption, { color: caseData.status === (opt.status === 'denied_final' ? 'denied' : opt.status) ? opt.color : colors.text }]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {appealLetter && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.letterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.letterHeader}>
              <BuddyMascot mood="celebrating" size={40} />
              <Text style={[typography.h3, { color: colors.text, flex: 1 }]}>Your Appeal Letter</Text>
              <Pressable onPress={() => setAppealLetter(null)} hitSlop={20}>
                <Text style={[typography.body, { color: colors.textTertiary }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.letterContent} nestedScrollEnabled>
              <Text style={[typography.body, { color: colors.text }]} selectable>{appealLetter}</Text>
            </ScrollView>
            <View style={styles.letterActions}>
              <FORGEButton title="Email to Myself" onPress={() => emailLetterToSelf(`Appeal Letter - ${caseData.procedure_name}`, appealLetter!)} />
              <FORGEButton title="Copy / Share" onPress={() => Share.share({ title: 'Appeal Letter', message: appealLetter })} variant="secondary" />
            </View>
          </Animated.View>
        )}

        {complaintLetter && (
          <Animated.View entering={FadeInDown.springify()} style={[styles.letterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.letterHeader}>
              <BuddyMascot mood="determined" size={40} />
              <Text style={[typography.h3, { color: colors.text, flex: 1 }]}>DOI Complaint</Text>
              <Pressable onPress={() => setComplaintLetter(null)} hitSlop={20}>
                <Text style={[typography.body, { color: colors.textTertiary }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.letterContent} nestedScrollEnabled>
              <Text style={[typography.body, { color: colors.text }]} selectable>{complaintLetter}</Text>
            </ScrollView>
            <View style={styles.letterActions}>
              <FORGEButton title="Email to Myself" onPress={() => emailLetterToSelf(`DOI Complaint - ${caseData.procedure_name}`, complaintLetter!)} />
              <FORGEButton title="Copy / Share" onPress={() => Share.share({ title: 'DOI Complaint', message: complaintLetter })} variant="secondary" />
            </View>
          </Animated.View>
        )}

        {caseData.denial_reason && (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.analyzerSection}>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAnalyzer(!showAnalyzer); }}>
              <View style={[styles.analyzerHeader, { backgroundColor: colors.surface }]}>
                <BuddyMascot mood="determined" size={48} />
                <View style={styles.analyzerTitle}>
                  <Text style={[typography.h3, { color: colors.text }]}>Analyze My Denial</Text>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>
                    Paste your denial letter for AI analysis
                  </Text>
                </View>
                <Text style={{ color: colors.textTertiary, fontSize: 18 }}>{showAnalyzer ? '▲' : '▼'}</Text>
              </View>
            </Pressable>

            {showAnalyzer && (
              <Animated.View entering={FadeInDown.duration(200)}>
                {!analysisResult ? (
                  <View style={styles.analyzerInputSection}>
                    <TextInput
                      style={[styles.analyzerInput, {
                        borderColor: colors.tabBarBorder,
                        color: colors.text,
                        fontFamily: 'Outfit_400Regular',
                        backgroundColor: colors.background,
                      }]}
                      placeholder="Paste your denial letter text here..."
                      placeholderTextColor={colors.textTertiary}
                      value={denialText}
                      onChangeText={setDenialText}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                    <FORGEButton
                      title={analyzing ? 'Analyzing...' : 'Analyze Denial'}
                      onPress={handleAnalyzeDenial}
                      loading={analyzing}
                      disabled={!denialText.trim()}
                    />
                  </View>
                ) : (
                  <View style={styles.analysisResults}>
                    <LinearGradient colors={[`${colors.accent}10`, `${colors.accent}05`]} style={[styles.analysisCard, { borderColor: `${colors.accent}20` }]}>
                      <Text style={[typography.caption, { color: colors.accent, fontFamily: 'Outfit_600SemiBold' }]}>DENIAL REASON</Text>
                      <Text style={[typography.body, { color: colors.text }]}>{analysisResult.denialReason}</Text>
                    </LinearGradient>

                    <LinearGradient colors={[`${colors.secondary}10`, `${colors.secondary}05`]} style={[styles.analysisCard, { borderColor: `${colors.secondary}20` }]}>
                      <Text style={[typography.caption, { color: colors.secondary, fontFamily: 'Outfit_600SemiBold' }]}>CLINICAL CRITERIA CITED</Text>
                      <Text style={[typography.body, { color: colors.text }]}>{analysisResult.clinicalCriteria}</Text>
                    </LinearGradient>

                    <LinearGradient colors={[`${colors.warning}10`, `${colors.warning}05`]} style={[styles.analysisCard, { borderColor: `${colors.warning}20` }]}>
                      <Text style={[typography.caption, { color: colors.warning, fontFamily: 'Outfit_600SemiBold' }]}>REGULATORY TIMELINE</Text>
                      <Text style={[typography.body, { color: colors.text }]}>{analysisResult.timeline}</Text>
                    </LinearGradient>

                    <View style={[styles.analysisCard, { backgroundColor: colors.surface, borderColor: colors.tabBarBorder }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontFamily: 'Outfit_600SemiBold' }]}>TOP 3 APPEAL ANGLES</Text>
                      {analysisResult.appealAngles.map((angle, i) => (
                        <View key={i} style={styles.appealAngleRow}>
                          <Text style={[styles.angleNumber, { color: colors.primary }]}>{i + 1}</Text>
                          <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{angle}</Text>
                        </View>
                      ))}
                    </View>

                    <LinearGradient colors={[`${colors.success}10`, `${colors.success}05`]} style={[styles.analysisCard, { borderColor: `${colors.success}20` }]}>
                      <Text style={[typography.caption, { color: colors.success, fontFamily: 'Outfit_600SemiBold' }]}>RECOMMENDED NEXT STEPS</Text>
                      <Text style={[typography.body, { color: colors.text }]}>{analysisResult.nextSteps}</Text>
                    </LinearGradient>

                    <FORGEButton
                      title="Analyze Another Letter"
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAnalysisResult(null); setDenialText(''); }}
                      variant="secondary"
                    />
                  </View>
                )}
              </Animated.View>
            )}
          </Animated.View>
        )}

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
  analyzerSection: { gap: 12 },
  analyzerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radii.card,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  analyzerTitle: { flex: 1, gap: 2 },
  analyzerInputSection: { gap: 12, marginTop: 12 },
  analyzerInput: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  analysisResults: { gap: 12, marginTop: 12 },
  analysisCard: {
    padding: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 8,
  },
  appealAngleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },
  angleNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,107,53,0.15)',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    overflow: 'hidden',
  },
  timelineSection: { gap: 12 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingVertical: 8, position: 'relative' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineContent: { flex: 1, gap: 2 },
  timelineLine: { position: 'absolute', left: 4, top: 22, width: 2, height: 40 },
  letterSection: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  letterHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  letterContent: { maxHeight: 300 },
  letterActions: { flexDirection: 'row', gap: 8 },
});
