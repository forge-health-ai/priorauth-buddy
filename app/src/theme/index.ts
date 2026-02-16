import { useColorScheme } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';
import { springs, timing, scales, radii } from './animations';
import { useThemeMode } from '../context/ThemeContext';

export { colors, typography, springs, timing, scales, radii };

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeCtx = useThemeMode();

  // Use context if available, otherwise fall back to system
  const isDark = themeCtx ? themeCtx.isDark : (systemScheme === 'dark');
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
