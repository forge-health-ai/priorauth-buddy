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
import { initRevenueCat, identifyUser } from '../src/lib/revenuecat';
import { BuddyProvider } from '../src/context/BuddyContext';
import { ThemeProvider } from '../src/context/ThemeContext';
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
  
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

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
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
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
    // Initialize RevenueCat early (no-ops on web, non-blocking)
    initRevenueCat().catch(() => {});

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkTermsAcceptance(session.user.id);
        identifyUser(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        checkTermsAcceptance(session.user.id);
        identifyUser(session.user.id);
      } else {
        setNeedsTerms(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, loading]);

  if (loading) return null;

  const statusStyle = scheme === 'dark' ? 'light' : 'dark';

  if (!session) {
    return (
      <ThemeProvider>
        <StatusBar style={statusStyle} />
        <AuthScreen />
      </ThemeProvider>
    );
  }

  if (needsTerms) {
    return (
      <ThemeProvider>
        <StatusBar style={statusStyle} />
        <TermsScreen onAccepted={() => setNeedsTerms(false)} />
      </ThemeProvider>
    );
  }

  if (needsOnboarding) {
    return (
      <ThemeProvider>
        <StatusBar style={statusStyle} />
        <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BuddyProvider>
        <StatusBar style={statusStyle} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="case/add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="case/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="call-coach" options={{ presentation: 'modal' }} />
          <Stack.Screen name="terms" options={{ presentation: 'modal' }} />
        </Stack>
      </BuddyProvider>
    </ThemeProvider>
  );
}
