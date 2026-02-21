import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, Keyboard, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../theme';
import { MiniBuddy } from './MiniBuddy';
import { FORGEButton } from './FORGEButton';
import { supabase } from '../lib/supabase';

const FEEDBACK_STATE_KEY = 'buddy_feedback_state';
const ACTIONS_BEFORE_PROMPT = 5; // prompt after 5 meaningful actions

interface FeedbackState {
  actionCount: number;
  lastPromptedAt: number | null;
  feedbackGiven: boolean;
}

/**
 * Track user actions. Call this after meaningful interactions
 * (appeal generated, case added, coach session completed, etc.)
 */
export async function trackFeedbackAction(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_STATE_KEY);
    const state: FeedbackState = raw ? JSON.parse(raw) : { actionCount: 0, lastPromptedAt: null, feedbackGiven: false };

    state.actionCount++;
    await AsyncStorage.setItem(FEEDBACK_STATE_KEY, JSON.stringify(state));

    // Should we show the prompt?
    if (state.feedbackGiven) return false; // Already gave feedback
    if (state.lastPromptedAt && Date.now() - state.lastPromptedAt < 7 * 24 * 60 * 60 * 1000) return false; // Prompted within 7 days
    if (state.actionCount >= ACTIONS_BEFORE_PROMPT) return true;

    return false;
  } catch {
    return false;
  }
}

export async function markFeedbackPrompted(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_STATE_KEY);
    const state: FeedbackState = raw ? JSON.parse(raw) : { actionCount: 0, lastPromptedAt: null, feedbackGiven: false };
    state.lastPromptedAt = Date.now();
    await AsyncStorage.setItem(FEEDBACK_STATE_KEY, JSON.stringify(state));
  } catch {}
}

export async function markFeedbackGiven(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_STATE_KEY);
    const state: FeedbackState = raw ? JSON.parse(raw) : { actionCount: 0, lastPromptedAt: null, feedbackGiven: false };
    state.feedbackGiven = true;
    state.lastPromptedAt = Date.now();
    await AsyncStorage.setItem(FEEDBACK_STATE_KEY, JSON.stringify(state));
  } catch {}
}

interface FeedbackPromptProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackPrompt({ visible, onClose }: FeedbackPromptProps) {
  const { colors, typography } = useTheme();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Save feedback to Supabase (anonymous — no user_id link)
    try {
      await supabase.from('feedback').insert({
        rating,
        comment: comment.trim() || null,
        app_version: '1.0.0',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Feedback save failed:', e);
    }

    await markFeedbackGiven();
    setSubmitted(true);
  };

  const handleDismiss = async () => {
    await markFeedbackPrompted();
    onClose();
  };

  if (submitted) {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Animated.View entering={FadeInUp.springify()} style={[styles.card, { backgroundColor: colors.surface }]}>
            <MiniBuddy mood="celebrating" size={60} />
            <Text style={[typography.h2, { color: colors.text, textAlign: 'center' }]}>Thanks! 🛡️</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              Your feedback helps Buddy get better at fighting for you.
            </Text>
            <FORGEButton title="Back to it" onPress={onClose} />
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleDismiss}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <Animated.View entering={FadeInUp.springify()} style={[styles.card, { backgroundColor: colors.surface }]}>
            <MiniBuddy mood="curious" size={50} />
            <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
              How's Buddy doing?
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              Quick feedback to make the app better for everyone fighting denials.
            </Text>

            <View style={styles.ratingRow}>
              {([
                { n: 1, mood: 'angry' as const, label: 'Terrible' },
                { n: 2, mood: 'confused' as const, label: 'Bad' },
                { n: 3, mood: 'thinking' as const, label: 'Okay' },
                { n: 4, mood: 'happy' as const, label: 'Good' },
                { n: 5, mood: 'celebrating' as const, label: 'Amazing' },
              ]).map(({ n, mood }) => (
                <Pressable
                  key={n}
                  onPress={() => { Haptics.selectionAsync(); setRating(n); }}
                  style={[styles.ratingButton, {
                    backgroundColor: rating === n ? colors.primary : colors.surfaceElevated,
                    borderColor: rating === n ? colors.primary : colors.tabBarBorder,
                  }]}
                >
                  <MiniBuddy mood={mood} size={28} />
                </Pressable>
              ))}
            </View>

            <TextInput
              placeholder="What should Buddy do better? What's missing?"
              placeholderTextColor={colors.textTertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              blurOnSubmit
              returnKeyType="done"
              style={[styles.input, {
                backgroundColor: colors.surfaceElevated,
                color: colors.text,
                borderColor: colors.tabBarBorder,
              }]}
            />

            <View style={styles.buttonRow}>
              <View style={{ flex: 1 }}>
                <FORGEButton title="Send" onPress={handleSubmit} disabled={!rating} />
              </View>
              <Pressable onPress={handleDismiss} style={styles.skipButton}>
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Maybe later</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: radii.card,
    padding: 24,
    gap: 16,
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    borderRadius: radii.card,
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
