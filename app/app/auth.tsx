import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii } from '../src/theme';
import { FORGEButton } from '../src/components/FORGEButton';
import { BuddyMascot } from '../src/components/BuddyMascot';
import { supabase } from '../src/lib/supabase';

export default function AuthScreen() {
  const { colors, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const validateEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const getErrorMessage = (error: any): string => {
    const msg = error?.message || '';
    const status = error?.status;
    if (status === 429 || msg.includes('rate') || msg.includes('429')) {
      return 'Too many attempts. Please wait a few minutes and try again.';
    }
    if (status === 500 || msg.includes('500')) {
      return 'Server error. Please try again in a moment.';
    }
    return msg || 'An unexpected error occurred. Please try again.';
  };

  const handleSignUp = async () => {
    if (submittingRef.current || loading) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorMsg(getErrorMessage(error));
        return;
      }

      // If user exists but session is null, email confirmation is required
      if (data?.user && !data?.session) {
        setSuccessMsg('Check your email for a confirmation link to complete sign up.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // Profile is created automatically by database trigger (handle_new_user)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleSignIn = async () => {
    if (submittingRef.current || loading) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorMsg(getErrorMessage(error));
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const toggleMode = () => {
    Haptics.selectionAsync();
    setErrorMsg(null);
    setSuccessMsg(null);
    setMode(mode === 'signup' ? 'signin' : 'signup');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View entering={FadeInDown.springify()} style={styles.content}>
          <View style={styles.header}>
            <BuddyMascot mood="celebrating" size={100} />
            <Text style={[typography.h1, { color: colors.text, marginTop: 16 }]}>PriorAuth Buddy</Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              {mode === 'signup' ? 'Create an account to start fighting denials' : 'Welcome back! Sign in to continue'}
            </Text>
          </View>

          <View style={styles.form}>
            {errorMsg && (
              <View style={[styles.messageBanner, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}40` }]}>
                <Text style={[typography.body, { color: colors.error }]}>{errorMsg}</Text>
              </View>
            )}
            {successMsg && (
              <View style={[styles.messageBanner, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}40` }]}>
                <Text style={[typography.body, { color: colors.success }]}>{successMsg}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Email</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrorMsg(null); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Password</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrorMsg(null); }}
                secureTextEntry
                autoComplete={mode === 'signup' ? 'new-password' : 'password'}
              />
            </View>

            <View style={styles.buttonRow}>
              {mode === 'signup' ? (
                <FORGEButton
                  title="Sign Up"
                  onPress={handleSignUp}
                  loading={loading}
                  disabled={loading}
                />
              ) : (
                <FORGEButton
                  title="Sign In"
                  onPress={handleSignIn}
                  loading={loading}
                  disabled={loading}
                />
              )}
            </View>

            <View style={styles.toggleRow}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {mode === 'signup' ? 'Already have an account?' : 'Need an account?'}
              </Text>
              <FORGEButton
                title={mode === 'signup' ? 'Sign In' : 'Sign Up'}
                onPress={toggleMode}
                variant="ghost"
              />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  form: { gap: 16 },
  field: { gap: 0 },
  input: { borderWidth: 1, borderRadius: radii.button, padding: 14, fontSize: 16 },
  buttonRow: { marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  messageBanner: { borderWidth: 1, borderRadius: radii.button, padding: 12 },
});
