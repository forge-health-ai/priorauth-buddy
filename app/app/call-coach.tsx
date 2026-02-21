import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, radii } from '../src/theme';
import { MiniBuddy } from '../src/components/MiniBuddy';
import { BuddyMascot } from '../src/components/BuddyMascot';
import type { BuddyMood } from '../src/components/BuddyMascot';
import { getCoachResponse, CoachMessage } from '../src/lib/ai';

interface ChatMessage extends CoachMessage {
  id: string;
  timestamp: Date;
}

interface SessionSummary {
  confidenceScore: number;
  tips: string[];
}

export default function CallCoachScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { scenario, intro, buddyMood } = useLocalSearchParams<{ scenario: string; intro: string; buddyMood: BuddyMood }>();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'coach',
      content: `Welcome! I'm going to play the role of an insurance representative. Your scenario is: "${scenario}".\n\nGo ahead and respond as if you're on the phone with me!`,
      timestamp: new Date(),
    },
    {
      id: 'tip',
      role: 'tip',
      content: `Try opening with something like:\n"${intro}"`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [buddyMoodState, setBuddyMoodState] = useState<BuddyMood>(buddyMood || 'happy');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const inputScale = useSharedValue(1);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      const history: CoachMessage[] = messages
        .filter(m => m.id !== 'welcome' && m.role !== 'tip')
        .map(m => ({ role: m.role, content: m.content, coachFeedback: m.coachFeedback }));
      
      const response = await getCoachResponse(
        scenario,
        history,
        userMessage.content,
        messages.filter(m => m.role === 'user').length + 1
      );
      
      setBuddyMoodState(response.mood);
      
      const coachMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: response.repResponse,
        coachFeedback: response.feedback,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, coachMessage]);
      
      // Check if session should end (7+ exchanges)
      if (messages.filter(m => m.role === 'user').length >= 6) {
        // Parse confidence score from feedback if available
        const scoreMatch = response.feedback.match(/(\d{1,3})\s*(?:\/|out of)\s*100/i);
        const confidenceScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 75;
        
        // Extract tips
        const tipsMatch = response.feedback.match(/(?:tips?|suggestions?):?\s*([\s\S]*?)(?:$|confidence)/i);
        const tips = tipsMatch
          ? tipsMatch[1].split(/\n|\\d\./).filter(t => t.trim()).map(t => t.replace(/^[-•\s]+/, '').trim()).slice(0, 5)
          : ['Practice being specific with reference numbers', 'Ask for names and direct contact info', 'Stay calm and professional', 'Take notes during calls', 'Follow up in writing'];
        
        setSummary({ confidenceScore, tips });
        setSessionComplete(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Coach error:', error);
      Alert.alert('Error', 'Something went wrong. Let\'s try again!');
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [inputText, messages, scenario, isLoading]);

  const handleInputFocus = () => {
    inputScale.value = withSpring(1.02, { damping: 15, stiffness: 200 });
  };

  const handleInputBlur = () => {
    inputScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isTip = message.role === 'tip';
    const showFeedback = !isUser && !isTip && message.coachFeedback && index === messages.length - 1 && !sessionComplete;

    if (isTip) {
      return (
        <Animated.View key={message.id} entering={FadeInUp.duration(300).springify()} style={{ paddingHorizontal: 8, marginVertical: 4 }}>
          <View style={[styles.messageBubble, { backgroundColor: `${colors.primary}15`, borderLeftWidth: 3, borderLeftColor: colors.primary, borderRadius: radii.card }]}>
            <Text style={[typography.caption, { color: colors.primary, fontFamily: 'Outfit_600SemiBold', marginBottom: 4 }]}>💡 Buddy's tip — try saying:</Text>
            <Text style={[typography.body, { color: colors.text, fontStyle: 'italic' }]}>{message.content.replace('Try opening with something like:\n', '')}</Text>
          </View>
        </Animated.View>
      );
    }
    
    return (
      <Animated.View
        key={message.id}
        entering={FadeInUp.duration(300).springify()}
        style={[styles.messageRow, isUser && styles.userMessageRow]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <MiniBuddy mood={buddyMoodState} size={32} />
          </View>
        )}
        
        <View style={[styles.messageBubble, {
          backgroundColor: isUser ? colors.primary : colors.surface,
          borderBottomRightRadius: isUser ? 4 : radii.card,
          borderBottomLeftRadius: isUser ? radii.card : 4,
        }]}>
          <Text style={[typography.body, {
            color: isUser ? '#fff' : colors.text,
          }]}>
            {message.content}
          </Text>
        </View>
        
        {isUser && (
          <View style={[styles.avatarContainer, styles.userAvatar]}>
            <View style={[styles.userAvatarCircle, { backgroundColor: colors.secondary }]}>
              <Text style={styles.userAvatarText}>You</Text>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderFeedback = () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'coach' || !lastMessage.coachFeedback || sessionComplete) return null;
    
    return (
      <Animated.View entering={FadeInDown.delay(200)} style={styles.feedbackCard}>
        <LinearGradient
          colors={[`${colors.accent}15`, `${colors.accent}05`]}
          style={[styles.feedbackGradient, { borderColor: `${colors.accent}30` }]}
        >
          <View style={styles.feedbackHeader}>
            <MiniBuddy mood="thinking" size={24} />
            <Text style={[typography.caption, { color: colors.accent, fontFamily: 'Outfit_600SemiBold' }]}>
              Coach Feedback
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.text, fontSize: 14, lineHeight: 20 }]}>
            {lastMessage.coachFeedback.replace(/\[COACH\]/gi, '').trim()}
          </Text>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderSummary = () => {
    if (!sessionComplete || !summary) return null;
    
    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.summaryCard}>
        <LinearGradient
          colors={[`${colors.success}15`, `${colors.success}05`]}
          style={[styles.summaryGradient, { borderColor: `${colors.success}30` }]}
        >
          <View style={styles.summaryHeader}>
            <BuddyMascot mood="celebrating" size={60} />
            <View style={styles.summaryTitle}>
              <Text style={[typography.h2, { color: colors.text }]}>Practice Complete!</Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Great work practicing your advocacy skills
              </Text>
            </View>
          </View>
          
          <View style={[styles.scoreBox, { backgroundColor: colors.surface }]}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Confidence Score</Text>
            <Text style={[styles.scoreText, { color: colors.success }]}>
              {summary.confidenceScore}/100
            </Text>
          </View>
          
          <Text style={[typography.h3, { color: colors.text, marginTop: 16 }]}>Your Personalized Tips</Text>
          {summary.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Text style={[styles.tipBullet, { color: colors.primary }]}>✓</Text>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{tip}</Text>
            </View>
          ))}
          
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[typography.body, { color: '#fff', fontFamily: 'Outfit_600SemiBold' }]}>
              Back to Scripts
            </Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            hitSlop={20}
          >
            <Text style={[typography.body, { color: colors.primary }]}>← Back</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <MiniBuddy mood={buddyMoodState} size={20} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Call Coach</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress indicator */}
        <View style={styles.progressRow}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Exchange {Math.min(messages.filter(m => m.role === 'user').length + 1, 7)} of 7
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.tabBarBorder }]}>
            <View style={[styles.progressFill, {
              backgroundColor: colors.primary,
              width: `${Math.min((messages.filter(m => m.role === 'user').length / 7) * 100, 100)}%`,
            }]} />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message, index) => renderMessage(message, index))}
          {renderFeedback()}
          {renderSummary()}
          
          {isLoading && (
            <Animated.View entering={FadeInUp} style={styles.typingIndicator}>
              <MiniBuddy mood="thinking" size={28} />
              <View style={[styles.typingBubble, { backgroundColor: colors.surface }]}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Buddy is typing...</Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input */}
        {!sessionComplete && (
          <Animated.View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.input, {
                borderColor: colors.tabBarBorder,
                color: colors.text,
                fontFamily: 'Outfit_400Regular',
                backgroundColor: colors.background,
              }]}
              placeholder="Type your response..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              editable={!isLoading}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={[styles.sendButton, {
                backgroundColor: inputText.trim() && !isLoading ? colors.primary : colors.tabBarBorder,
              }]}
            >
              <Text style={[styles.sendButtonText]}>Send</Text>
            </Pressable>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  messagesContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '90%',
  },
  userMessageRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    alignItems: 'flex-end',
  },
  userAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackCard: {
    marginLeft: 44,
    marginTop: 4,
    marginBottom: 12,
  },
  feedbackGradient: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  summaryCard: {
    marginTop: 8,
  },
  summaryGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryTitle: {
    flex: 1,
    gap: 2,
  },
  scoreBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 36,
    fontFamily: 'Outfit_700Bold',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  tipBullet: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  doneButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
});
