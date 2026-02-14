import { useColorScheme } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';
import { springs, timing, scales, radii } from './animations';

export { colors, typography, springs, timing, scales, radii };

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
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
