import { useColorScheme } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';
import { springs, timing, scales, radii } from './animations';
import { useThemeMode } from '../context/ThemeContext';

export { colors, typography, springs, timing, scales, radii };

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useThemeMode();
  
  const isDark = themeMode.mode !== 'auto'
    ? themeMode.mode === 'dark'
    : systemScheme === 'dark';

  const c = isDark ? colors.dark : colors.light;

  return {
    colors: c,
    typography,
    springs,
    timing,
    scales,
    radii,
    isDark,
  };
}
