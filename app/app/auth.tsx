import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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

  const validateEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setLoading(false);
      Alert.alert('Sign Up Error', error.message);
      return;
    }

    // Create profile record for new user
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          terms_accepted_at: null,
          terms_accepted_version: null,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Note: Terms screen will be shown automatically by _layout.tsx
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    setLoading(false);

    if (error) {
      Alert.alert('Sign In Error', error.message);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleMode = () => {
    Haptics.selectionAsync();
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
            <View style={styles.field}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>Email</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.tabBarBorder, color: colors.text, fontFamily: 'Outfit_400Regular' }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
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
                onChangeText={setPassword}
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
                />
              ) : (
                <FORGEButton
                  title="Sign In"
                  onPress={handleSignIn}
                  loading={loading}
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
});
