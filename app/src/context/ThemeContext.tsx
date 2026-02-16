import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearanceMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
  isDark: boolean;
}

const STORAGE_KEY = 'appearance_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'auto',
  setMode: () => {},
  isDark: true,
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>('auto');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        setModeState(stored);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setMode = (newMode: AppearanceMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
  };

  const isDark = mode === 'auto' ? systemScheme === 'dark' : mode === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
