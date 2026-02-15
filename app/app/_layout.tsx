import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../src/lib/supabase';
import AuthScreen from './auth';
import TermsScreen from './terms';
import OnboardingScreen from './onboarding';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsTerms, setNeedsTerms] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // Check if user needs to accept terms
  const checkTermsAcceptance = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('terms_accepted_at, display_name')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which means new user
        console.error('Terms check error:', error);
        return;
      }

      // User needs to accept terms if terms_accepted_at is null
      setNeedsTerms(!data?.terms_accepted_at);
      // User needs onboarding if they haven't set a display name yet
      setNeedsOnboarding(!data?.display_name);
    } catch (error) {
      console.error('Error checking terms:', error);
      // Default to requiring terms on error (safe default)
      setNeedsTerms(true);
    }
  };

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkTermsAcceptance(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        checkTermsAcceptance(session.user.id);
      } else {
        setNeedsTerms(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (fontsLoaded && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loading]);

  if (!fontsLoaded || loading) return null;

  // Show auth screen if not logged in
  if (!session) {
    return (
      <>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <AuthScreen />
      </>
    );
  }

  // Show terms screen if logged in but hasn't accepted terms
  if (needsTerms) {
    return (
      <>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <TermsScreen onAccepted={() => setNeedsTerms(false)} />
      </>
    );
  }

  // Show onboarding if they accepted terms but haven't met Buddy yet
  if (needsOnboarding) {
    return (
      <>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="case/add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="terms" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
