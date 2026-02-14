import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, radii, scales, springs } from '../theme';

interface FORGEButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FORGEButton({ title, onPress, variant = 'primary', loading = false, disabled = false, icon, style }: FORGEButtonProps) {
  const { colors, typography } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(scales.buttonPress, springs.snappy); };
  const handlePressOut = () => { scale.value = withSpring(1, springs.default); };
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const content = loading ? (
    <ActivityIndicator color={isPrimary ? '#FFFFFF' : colors.primary} />
  ) : (
    <>
      {icon}
      <Text style={[styles.text, typography.button, { color: isPrimary ? '#FFFFFF' : colors.primary }]}>{title}</Text>
    </>
  );

  return (
    <AnimatedPressable style={[animatedStyle, isPrimary ? {} : { flex: isGhost ? undefined : 1 }, style]} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress} disabled={disabled || loading}>
      {isPrimary ? (
        <LinearGradient colors={[colors.primary, colors.primaryEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.button, disabled && styles.disabled]}>
          {content}
        </LinearGradient>
      ) : (
        <Animated.View style={[styles.button, isGhost ? { backgroundColor: 'transparent' } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: `${colors.primary}33` }, disabled && styles.disabled]}>
          {content}
        </Animated.View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  text: { textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
