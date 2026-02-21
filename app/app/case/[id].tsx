import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeIn, BounceIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, radii } from '../../src/theme';
import { FORGEButton } from '../../src/components/FORGEButton';
import { MiniBuddy } from '../../src/components/MiniBuddy';
import { BuddyMascot } from '../../src/components/BuddyMascot';
import { supabase } from '../../src/lib/supabase';
import { 
  getCase, 
  getCaseEvents, 
  createCaseEvent, 
  createAppeal, 
  updateCase,
  Case, 
  CaseEvent 
} from '../../src/lib/local-storage';
import { generateAppealLetter, generateDOIComplaint, analyzeDenialLetter, scanDenialLetter, DenialAnalysis, ScanResult } from '../../src/lib/ai';
import * as ImagePicker from 'expo-image-picker';
import { trackFeedbackAction } from '../../src/components/FeedbackPrompt';
import { emailLetterToSelf } from '../../src/lib/email-letter';
import { submitAnonymousOutcome } from '../../src/lib/outcome-tracking';
import { CallLog } from '../../src/components/CallLog';
import { getUserBuddyStats, getBuddyRank, checkRankUp } from '../../src/lib/buddy-evolution';
import { DocumentChecklist } from '../../src/components/DocumentChecklist';
import { RankUpCelebration } from '../../src/components/RankUpCelebration';
import { ConfettiFall } from '../../src/components/ConfettiFall';
import { getSubscriptionStatus } from '../../src/lib/subscription';
import { BuddyRank } from '../../src/lib/buddy-evolution';
import { useBuddy } from '../../src/context/BuddyContext';

function isOutcomeSelected(caseStatus: string, optStatus: string): boolean {
  if (optStatus === 'approved') return caseStatus === 'approved' || caseStatus === 'appeal_won';
  if (optStatus === 'denied_final') return caseStatus === 'denied' || caseStatus === 'denied_final';
  if (optStatus === 'pending') return caseStatus === 'appealing' || caseStatus === 'pending' || caseStatus === 'in_review';
  return false;
}

// CaseEvent type is now imported from local-storage

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
  const { refresh: refreshBuddy } = useBuddy();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAppeal, setGeneratingAppeal] = useState(false);
  const [generatingComplaint, setGeneratingComplaint] = useState(false);
  const [denialText, setDenialText] = useState('');
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DenialAnalysis | null>(null);
  const [showCelebration, setShowCelebration] = useState<'won' | 'denied' | 'waiting' | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [appealLetter, setAppealLetter] = useState<string | null>(null);
  const [complaintLetter, setComplaintLetter] = useState<string | null>(null);
  const [rankUpData, setRankUpData] = useState<{ rank: BuddyRank; wins: number; denials: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  const fetchCaseDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch case from local storage (PHI compliance)
      const caseItem = await getCase(id as string, user.id);
      if (!caseItem) {
        console.error('Case not found');
        setLoading(false);
        return;
      }

      setCaseData(caseItem);

      // Restore analysis from saved notes if present
      if (caseItem.notes && caseItem.notes.includes('[AI Denial Analysis')) {
        try {
          const match = caseItem.notes.match(/\[AI Denial Analysis[^\]]*\]\n\nDenial Reason: ([\s\S]*?)\n\nClinical Criteria: ([\s\S]*?)\n\nTimeline: ([\s\S]*?)\n\nAppeal Angles:\n([\s\S]*?)\n\nNext Steps: ([\s\S]*?)$/);
          if (match) {
            setAnalysisResult({
              denialReason: match[1].trim(),
              clinicalCriteria: match[2].trim(),
              timeline: match[3].trim(),
              appealAngles: match[4].split('\n').map(a => a.replace(/^\d+\.\s*/, '').trim()).filter(Boolean),
              nextSteps: match[5].trim(),
            });
          }
        } catch (e) {
          // Parsing failed, that's ok
        }
      }

      // Fetch events from local storage
      const eventsData = await getCaseEvents(id as string);
      setEvents(eventsData);
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

      // Save appeal to local storage (PHI compliance)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await createAppeal(caseData.id, user.id, {
          letter_text: result.letter,
          document_type: 'appeal',
        });

        await updateCase(caseData.id, user.id, { status: 'appealing' });

        await createCaseEvent(caseData.id, user.id, {
          event_type: 'appeal_generated',
          title: 'Appeal Letter Generated',
          description: 'AI appeal letter generated and saved',
        });
        trackFeedbackAction(); // Track for feedback prompt

        // Refresh Buddy evolution (filing appeals changes rank)
        refreshBuddy();
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

      // Save to local storage (PHI compliance)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await createAppeal(caseData.id, user.id, {
          letter_text: result.complaint,
          document_type: 'complaint',
        });
        await updateCase(caseData.id, user.id, { status: 'complaint_filed' });
        await createCaseEvent(caseData.id, user.id, {
          event_type: 'complaint_filed',
          title: 'DOI Complaint Filed',
          description: 'DOI complaint generated and filed',
        });
      }
    } catch (error) {
      console.error('Complaint generation error:', error);
      Alert.alert('Error', 'Failed to generate complaint. Please try again.');
    } finally {
      setGeneratingComplaint(false);
      fetchCaseDetails();
    }
  };

  const handleScanDenial = async (source: 'camera' | 'library') => {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          base64: true,
          quality: 0.7,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          base64: true,
          quality: 0.7,
        });
      }

      if (result.canceled || !result.assets?.[0]?.base64) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setScanning(true);

      const asset = result.assets[0];
      const mediaType = asset.mimeType || 'image/jpeg';
      const scanData = await scanDenialLetter(asset.base64, mediaType);
      setScanResult(scanData);

      // Auto-populate denial text for analyzer
      if (scanData.fullText) {
        setDenialText(scanData.fullText);
      }
    } catch (e: any) {
      console.error('Scan error:', e);
      Alert.alert('Scan Failed', 'Could not read the denial letter. Try again with better lighting or a clearer photo.');
    } finally {
      setScanning(false);
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
      
      // Save analysis to case notes in local storage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const analysisNote = `\n\n[AI Denial Analysis - ${new Date().toLocaleDateString()}]\n\nDenial Reason: ${result.denialReason}\n\nClinical Criteria: ${result.clinicalCriteria}\n\nTimeline: ${result.timeline}\n\nAppeal Angles:\n${result.appealAngles.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nNext Steps: ${result.nextSteps}`;
        
        const newNotes = caseData.notes 
          ? caseData.notes + analysisNote
          : analysisNote;
        
        // Update local storage
        await updateCase(caseData.id, user.id, { notes: newNotes });
        
        // Update local state
        setCaseData(prev => prev ? { ...prev, notes: newNotes } : null);
        
        // Add event to local storage
        await createCaseEvent(caseData.id, user.id, {
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typography.h1, { color: colors.text, flex: 1 }]}>{caseData.procedure_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
              <Text style={[typography.caption, { color: status.color }]}>
                {status.emoji} {status.label}
              </Text>
            </View>
          </View>
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

        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <CallLog caseId={caseData.id} insurerName={caseData.insurer_name || 'your insurer'} />
        </Animated.View>

        {(caseData.status === 'denied' || caseData.status === 'appealing') && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.actionsSection}>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowChecklist(!showChecklist); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[typography.h3, { color: colors.text }]}>📋 Document Checklist</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 18 }}>{showChecklist ? '▲' : '▼'}</Text>
              </View>
            </Pressable>
            {showChecklist && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <DocumentChecklist caseId={caseData.id} />
              </Animated.View>
            )}
          </Animated.View>
        )}

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
                  // Update case status in local storage (PHI compliance)
                  const { data: { user } } = await supabase.auth.getUser();
                  const newStatus = opt.status === 'approved' ? 'approved' : opt.status === 'denied_final' ? 'denied' : 'appealing';
                  if (user) {
                    await updateCase(caseData.id, user.id, { status: newStatus });
                  }
                  fetchCaseDetails();

                  // Submit anonymous outcome if won or lost
                  if (opt.status !== 'pending') {
                    submitAnonymousOutcome({
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

                  // Refresh global Buddy context so all screens show correct rank
                  await refreshBuddy();

                  // Check for rank-up on win
                  if (opt.status === 'approved') {
                    try {
                      const oldStats = await getUserBuddyStats();
                      const newInsurers = [...new Set([...oldStats.insurersBeaten, caseData.insurer_name].filter(Boolean))];
                      const newStats = { ...oldStats, wins: oldStats.wins + 1, insurersBeaten: newInsurers };
                      const newRank = checkRankUp(oldStats, newStats);
                      const sub = await getSubscriptionStatus();
                      setIsPro(sub.tier === 'pro');
                      if (newRank) {
                        setRankUpData({
                          rank: newRank,
                          wins: newStats.wins,
                          denials: (await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'denied')).count ?? 0,
                        });
                      }
                    } catch (e) {
                      console.error('Rank check error:', e);
                    }
                  }

                  // Show overlay for each outcome
                  if (opt.status === 'approved') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowCelebration('won');
                  } else if (opt.status === 'denied_final') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setShowCelebration('denied');
                  } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCelebration('waiting');
                  }
                  // User closes by tapping the overlay
                }}
                style={[{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: radii.button,
                  borderWidth: 1,
                  borderColor: isOutcomeSelected(caseData.status, opt.status) ? opt.color : colors.border,
                  backgroundColor: isOutcomeSelected(caseData.status, opt.status) ? `${opt.color}15` : colors.surface,
                  alignItems: 'center',
                }]}
              >
                <Text style={[typography.caption, { color: isOutcomeSelected(caseData.status, opt.status) ? opt.color : colors.text }]}>
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
              <FORGEButton title="Copy to Clipboard" onPress={() => emailLetterToSelf(`Appeal Letter - ${caseData.procedure_name}`, appealLetter!)} />
              <FORGEButton title="Share" onPress={() => Share.share({ title: 'Appeal Letter', message: appealLetter })} variant="secondary" />
              <FORGEButton title="📧 Send to My Doctor" onPress={() => Share.share({ title: `Appeal Letter - ${caseData.procedure_name}`, message: `Hi Doctor,\n\nI've drafted an appeal letter for my denied ${caseData.procedure_name} prior authorization with ${caseData.insurer_name || 'my insurer'}. Could you please review it and consider signing or submitting a supporting Letter of Medical Necessity?\n\nI would also appreciate if we could schedule a peer-to-peer review with the insurer's medical director, as this is often the most effective way to overturn denials.\n\nThank you for your support.\n\n---\n\n${appealLetter}` })} variant="secondary" />
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
              <FORGEButton title="Copy to Clipboard" onPress={() => emailLetterToSelf(`DOI Complaint - ${caseData.procedure_name}`, complaintLetter!)} />
              <FORGEButton title="Share" onPress={() => Share.share({ title: 'DOI Complaint', message: complaintLetter })} variant="secondary" />
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
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                      <Pressable
                        onPress={() => handleScanDenial('camera')}
                        style={[styles.scanButton, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}
                      >
                        <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>
                          📷 Scan Letter
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleScanDenial('library')}
                        style={[styles.scanButton, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}
                      >
                        <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>
                          🖼️ From Photos
                        </Text>
                      </Pressable>
                    </View>

                    {scanning && (
                      <View style={{ alignItems: 'center', padding: 20, gap: 8 }}>
                        <MiniBuddy mood="thinking" size={40} />
                        <Text style={[typography.body, { color: colors.textSecondary }]}>Buddy is reading your denial letter...</Text>
                      </View>
                    )}

                    {scanResult && !scanning && (
                      <View style={[styles.scanResultCard, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
                        <Text style={[typography.caption, { color: colors.success, fontFamily: 'Outfit_600SemiBold' }]}>🛡️ Buddy extracted:</Text>
                        {scanResult.insurerName && scanResult.insurerName !== 'Not found' && (
                          <Text style={[typography.caption, { color: colors.text }]}>Insurer: {scanResult.insurerName}</Text>
                        )}
                        {scanResult.procedureName && scanResult.procedureName !== 'Not found' && (
                          <Text style={[typography.caption, { color: colors.text }]}>Procedure: {scanResult.procedureName}</Text>
                        )}
                        {scanResult.denialReason && scanResult.denialReason !== 'Not found' && (
                          <Text style={[typography.caption, { color: colors.text }]}>Reason: {scanResult.denialReason}</Text>
                        )}
                        {scanResult.appealDeadline && scanResult.appealDeadline !== 'Not found' && (
                          <Text style={[typography.caption, { color: colors.error }]}>Deadline: {scanResult.appealDeadline}</Text>
                        )}
                        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>Full text loaded below. Review and hit Analyze.</Text>
                      </View>
                    )}

                    <TextInput
                      style={[styles.analyzerInput, {
                        borderColor: colors.tabBarBorder,
                        color: colors.text,
                        fontFamily: 'Outfit_400Regular',
                        backgroundColor: colors.background,
                      }]}
                      placeholder="Paste your denial letter text here or scan it above..."
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
              <Pressable key={event.id} style={styles.timelineItem} onPress={() => {
                if (event.event_type === 'denial_analyzed' && analysisResult) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setExpandedEventId(expandedEventId === event.id ? null : event.id);
                }
              }}>
                <View style={[styles.timelineDot, { backgroundColor: event.event_type === 'denial_analyzed' ? colors.accent : colors.primary }]} />
                <View style={styles.timelineContent}>
                  <Text style={[typography.body, { color: colors.text }]}>
                    {event.title || event.description}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {formatDate(event.created_at)}
                  </Text>
                  {event.event_type === 'denial_analyzed' && analysisResult && expandedEventId !== event.id && (
                    <Text style={[typography.caption, { color: colors.primary, marginTop: 4 }]}>
                      Tap to view analysis ▾
                    </Text>
                  )}
                  {event.event_type === 'denial_analyzed' && analysisResult && expandedEventId === event.id && (
                    <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 10, gap: 10 }}>
                      <View style={[{ backgroundColor: `${colors.error}10`, padding: 12, borderRadius: radii.card }]}>  
                        <Text style={[typography.caption, { color: colors.error, fontFamily: 'Outfit_600SemiBold' }]}>Denial Reason</Text>
                        <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>{analysisResult.denialReason}</Text>
                      </View>
                      <View style={[{ backgroundColor: `${colors.primary}10`, padding: 12, borderRadius: radii.card }]}>
                        <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold' }]}>Clinical Criteria</Text>
                        <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>{analysisResult.clinicalCriteria}</Text>
                      </View>
                      <View style={[{ backgroundColor: `${colors.warning}10`, padding: 12, borderRadius: radii.card }]}>
                        <Text style={[typography.caption, { color: colors.warning, fontFamily: 'Outfit_600SemiBold' }]}>Timeline</Text>
                        <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>{analysisResult.timeline}</Text>
                      </View>
                      <View style={[{ backgroundColor: `${colors.success}10`, padding: 12, borderRadius: radii.card }]}>
                        <Text style={[typography.caption, { color: colors.success, fontFamily: 'Outfit_600SemiBold' }]}>Appeal Angles</Text>
                        {analysisResult.appealAngles.map((angle, i) => (
                          <Text key={i} style={[typography.body, { color: colors.text, marginTop: 2 }]}>{i + 1}. {angle}</Text>
                        ))}
                      </View>
                      <View style={[{ backgroundColor: `${colors.accent}10`, padding: 12, borderRadius: radii.card }]}>
                        <Text style={[typography.caption, { color: colors.accent, fontFamily: 'Outfit_600SemiBold' }]}>Next Steps</Text>
                        <Text style={[typography.body, { color: colors.text, marginTop: 4 }]}>{analysisResult.nextSteps}</Text>
                      </View>
                      <Pressable onPress={() => setExpandedEventId(null)}>
                        <Text style={[typography.caption, { color: colors.primary, textAlign: 'center', marginTop: 4 }]}>Collapse ▴</Text>
                      </Pressable>
                    </Animated.View>
                  )}
                </View>
                {index < events.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: colors.tabBarBorder }]} />
                )}
              </Pressable>
            ))
          )}
        </Animated.View>
      </ScrollView>
      {/* Rank-Up Celebration Overlay - shows AFTER win celebration is dismissed */}
      {rankUpData && !showCelebration && (
        <RankUpCelebration
          rank={rankUpData.rank}
          wins={rankUpData.wins}
          denials={rankUpData.denials}
          isPro={isPro}
          onDismiss={() => setRankUpData(null)}
        />
      )}

      {/* Outcome Overlay - shows FIRST */}
      {showCelebration && (
        <Pressable onPress={() => setShowCelebration(null)} style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
        }}>
          {/* Confetti for wins - rains down from top */}
          {showCelebration === 'won' && <ConfettiFall />}

          <Animated.View entering={BounceIn.delay(200).duration(800)}>
            <BuddyMascot mood={showCelebration === 'won' ? 'celebrating' : showCelebration === 'denied' ? 'angry' : 'thinking'} size={120} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(500).springify()} style={{ alignItems: 'center', gap: 8, paddingHorizontal: 40 }}>
            {showCelebration === 'won' && (
              <>
                <Text style={[typography.h1, { color: '#FFD700', textAlign: 'center' }]}>YOU WON! 🎉</Text>
                <Text style={[typography.body, { color: '#FFFFFF', textAlign: 'center' }]}>
                  You stood up to {caseData.insurer_name} and won. That takes real courage.
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                  Your anonymous win helps others fight back too.
                </Text>
              </>
            )}
            {showCelebration === 'denied' && (
              <>
                <Text style={[typography.h1, { color: colors.error, textAlign: 'center' }]}>Not over yet! 🛡️</Text>
                <Text style={[typography.body, { color: '#FFFFFF', textAlign: 'center' }]}>
                  {caseData.insurer_name} said no. But 50% of denials are overturned on appeal. Buddy is ready to fight.
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                  Don't give up. Write an appeal or file a DOI complaint.
                </Text>
              </>
            )}
            {showCelebration === 'waiting' && (
              <>
                <Text style={[typography.h1, { color: colors.warning, textAlign: 'center' }]}>Hang in there! ⏳</Text>
                <Text style={[typography.body, { color: '#FFFFFF', textAlign: 'center' }]}>
                  Your case with {caseData.insurer_name} is still in play. Buddy is keeping watch.
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                  Use this time to prepare your appeal and call scripts.
                </Text>
              </>
            )}
          </Animated.View>
          <Animated.View entering={FadeIn.delay(1500)} style={{ marginTop: 20 }}>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Tap anywhere to close</Text>
          </Animated.View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 20 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill },
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
  scanButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  scanResultCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
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
  letterActions: { gap: 8 },
});
