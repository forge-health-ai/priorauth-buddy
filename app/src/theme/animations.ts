import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

export const springs = {
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
    overshootClamping: false,
  } as WithSpringConfig,

  tab: {
    damping: 18,
    stiffness: 200,
  } as WithSpringConfig,

  bounceIn: {
    damping: 12,
    stiffness: 180,
  } as WithSpringConfig,

  gentle: {
    damping: 20,
    stiffness: 120,
  } as WithSpringConfig,

  snappy: {
    damping: 15,
    stiffness: 300,
  } as WithSpringConfig,
};

export const timing = {
  fadeIn: {
    duration: 200,
    easing: Easing.out(Easing.ease),
  } as WithTimingConfig,

  quick: {
    duration: 100,
    easing: Easing.out(Easing.ease),
  } as WithTimingConfig,
};

export const scales = {
  cardPress: 0.98,
  buttonPress: 0.95,
  iconBounce: 1.2,
};

export const radii = {
  card: 16,
  button: 12,
  modal: 24,
  pill: 20,
  full: 9999,
};
