import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  BounceIn,
  ZoomIn,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii, springs } from '../src/theme';
import { BuddyMascot } from '../src/components/BuddyMascot';
import { FORGEButton } from '../src/components/FORGEButton';
import { supabase } from '../src/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingProps {
  onComplete: () => void;
}

// Particle/confetti component for celebration - falls from top to bottom
function ConfettiParticle({ delay, x, color, size }: { delay: number; x: number; color: string; size?: number }) {
  const s = size || (4 + Math.random() * 6);
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(1800 + Math.random() * 1200)}
      style={[
        {
          position: 'absolute',
          top: -10,
          left: x,
          width: s,
          height: s * (0.6 + Math.random() * 0.8),
          backgroundColor: color,
          borderRadius: s > 6 ? 2 : s,
          opacity: 0.85 + Math.random() * 0.15,
          transform: [{ rotate: `${Math.random() * 360}deg` }],
        },
      ]}
    />
  );
}

export default function OnboardingScreen({ onComplete }: OnboardingProps) {
  const { colors, typography } = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const saveName = async () => {
    if (name.trim()) {
      setSaving(true);
      setErrorMsg(null);
      try {
        // Try getUser first, fall back to getSession
        let userId: string | null = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id || null;
        } catch (_) {}
        if (!userId) {
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id || null;
        }
        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({ display_name: name.trim() })
            .eq('id', userId);
          if (error) {
            console.error('Name save error:', error);
            setErrorMsg('Could not save your name. You can update it later in settings.');
          }
        }
      } catch (e) {
        console.error('Name save error:', e);
        setErrorMsg('Could not save your name. You can update it later in settings.');
      }
      setSaving(false);
    }
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 2) {
      await saveName();
      setStep(3);
    } else if (step === 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  };

  const confettiColors = ['#FF6B35', '#FFB347', '#FF8C42', '#FFA07A', '#FFD700', '#FF6347'];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Skip button */}
      {step < 3 && (
        <Animated.View entering={FadeIn.delay(1000)} style={styles.skipContainer}>
          <Pressable onPress={handleSkip} hitSlop={20}>
            <Text style={[typography.body, { color: colors.textTertiary }]}>Skip</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Step 0: Buddy drops in */}
      {step === 0 && (
        <Animated.View entering={FadeIn} style={styles.content}>
          <Animated.View entering={BounceIn.delay(300).duration(1000)}>
            <BuddyMascot mood="excited" size={160} />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(800).springify()}
            style={[typography.h1, { color: colors.text, textAlign: 'center', marginTop: 32 }]}
          >
            Hey there! I'm Buddy
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(1100).springify()}
            style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 12, paddingHorizontal: 40 }]}
          >
            Your personal prior authorization advocate
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(1400).springify()} style={styles.buttonContainer}>
            <FORGEButton title="Nice to meet you!" onPress={handleNext} />
          </Animated.View>
        </Animated.View>
      )}

      {/* Step 1: Buddy's mission */}
      {step === 1 && (
        <Animated.View entering={SlideInRight.duration(400)} style={styles.content}>
          <Animated.View entering={ZoomIn.delay(200)}>
            <BuddyMascot mood="determined" size={140} />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(400).springify()}
            style={[typography.h2, { color: colors.text, textAlign: 'center', marginTop: 32 }]}
          >
            Insurance claims get denied every day
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(700).springify()}
            style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 16, paddingHorizontal: 32 }]}
          >
            But most can be overturned with the right approach. I'll help you track deadlines, prepare appeal letters, and know exactly what to say on the phone.
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.delay(1000).springify()}
            style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <Text style={[typography.h1, { color: colors.primary, textAlign: 'center' }]}>80%</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              of denied claims are never appealed
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1300).springify()} style={styles.buttonContainer}>
            <FORGEButton title="That changes now" onPress={handleNext} />
          </Animated.View>
        </Animated.View>
      )}

      {/* Step 2: Name ask */}
      {step === 2 && (
        <Animated.View entering={SlideInRight.duration(400)} style={styles.content}>
          <Animated.View entering={ZoomIn.delay(200)}>
            <BuddyMascot mood="curious" size={130} />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(400).springify()}
            style={[typography.h2, { color: colors.text, textAlign: 'center', marginTop: 28 }]}
          >
            What should I call you?
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(600).springify()}
            style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }]}
          >
            So I can cheer you on personally
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.delay(800).springify()}
            style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
          >
            <TextInput
              style={[typography.body, styles.input, { color: colors.text }]}
              placeholder="Your first name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          </Animated.View>

          {errorMsg && (
            <Animated.View entering={FadeInDown} style={[styles.errorBanner, { backgroundColor: '#FF3B5C15', borderColor: '#FF3B5C40' }]}>
              <Text style={[typography.body, { color: '#FF3B5C' }]}>{errorMsg}</Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.buttonContainer}>
            <FORGEButton
              title={name.trim() ? `Let's go, ${name.trim()}!` : "Let's go!"}
              onPress={handleNext}
            />
          </Animated.View>
        </Animated.View>
      )}

      {/* Step 3: Celebration */}
      {step === 3 && (
        <Animated.View entering={FadeIn} style={styles.content}>
          {/* Confetti */}
          {confettiColors.map((color, i) =>
            Array.from({ length: 5 }).map((_, j) => (
              <ConfettiParticle
                key={`${i}-${j}`}
                delay={j * 60 + i * 40}
                x={Math.random() * (SCREEN_WIDTH - 10)}
                color={color}
              />
            ))
          )}

          <Animated.View entering={BounceIn.delay(200).duration(800)}>
            <BuddyMascot mood="celebrating" size={160} />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(600).springify()}
            style={[typography.h1, { color: colors.text, textAlign: 'center', marginTop: 32 }]}
          >
            {name.trim() ? `Let's do this, ${name.trim()}! 🛡️` : "Let's do this! 🛡️"}
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(900).springify()}
            style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 12, paddingHorizontal: 32 }]}
          >
            Your insurance company has a team working to deny your claims. Now you have Buddy on your side.
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(1200).springify()} style={styles.buttonContainer}>
            <FORGEButton title="Start Fighting Back" onPress={handleNext} />
          </Animated.View>
        </Animated.View>
      )}

      {/* Page dots */}
      <Animated.View entering={FadeIn.delay(1500)} style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: step === i ? colors.primary : colors.border,
                width: step === i ? 24 : 8,
              },
            ]}
          />
        ))}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 32,
  },
  statCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: radii.card,
    borderWidth: 1,
    width: '80%',
  },
  inputContainer: {
    marginTop: 24,
    borderWidth: 1.5,
    borderRadius: radii.button,
    width: '80%',
    overflow: 'hidden',
  },
  input: {
    padding: 16,
    fontSize: 18,
    outlineColor: 'transparent',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 50,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    width: '80%',
  },
    // confetti styles are inline now
});
