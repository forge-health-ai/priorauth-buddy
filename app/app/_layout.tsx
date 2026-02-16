import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../src/lib/supabase';
import { BuddyProvider } from '../src/context/BuddyContext';
import { ThemeProvider, useThemeMode } from '../src/context/ThemeContext';
import AuthScreen from './auth';
import TermsScreen from './terms';
import OnboardingScreen from './onboarding';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  // Note: this is wrapped by ThemeProvider in the default export below
  const { isDark } = useThemeMode();
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

  // Get user ID with getSession fallback (getUser can 403)
  const getUserId = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user.id;
    } catch (e) {
      console.warn('getUser failed, falling back to getSession:', e);
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    } catch (e) {
      console.error('getSession also failed:', e);
      return null;
    }
  };

  // Check if user needs to accept terms
  const checkTermsAcceptance = async (userId: string) => {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('terms_accepted_at, display_name')
          .eq('id', userId)
          .single();

        if (error && error.code === 'PGRST116') {
          // No profile row yet — trigger may still be creating it
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          // After retries, treat as new user needing terms
          setNeedsTerms(true);
          setNeedsOnboarding(true);
          return;
        }

        if (error) {
          console.error('Terms check error:', error);
          setNeedsTerms(true);
          return;
        }

        setNeedsTerms(!data?.terms_accepted_at);
        setNeedsOnboarding(!data?.display_name);
        return;
      } catch (error) {
        console.error('Error checking terms:', error);
        if (attempt === maxRetries - 1) {
          setNeedsTerms(true);
        }
      }
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
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthScreen />
      </>
    );
  }

  // Show terms screen if logged in but hasn't accepted terms
  if (needsTerms) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <TermsScreen onAccepted={() => setNeedsTerms(false)} />
      </>
    );
  }

  // Show onboarding if they accepted terms but haven't met Buddy yet
  if (needsOnboarding) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
      </>
    );
  }

  return (
    <BuddyProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="case/add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="case/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="call-coach" options={{ presentation: 'modal' }} />
        <Stack.Screen name="terms" options={{ presentation: 'modal' }} />
      </Stack>
    </BuddyProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
