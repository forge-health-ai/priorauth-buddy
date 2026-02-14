import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useTheme, springs, radii } from '../theme';

// HeroIcon SVG paths (24x24 viewBox)
const icons: Record<string, { outline: string; solid: string }> = {
  home: {
    outline: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    solid: 'M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 11-1.06 1.06l-.97-.97V19.5a2.25 2.25 0 01-2.25 2.25h-2.25a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75H8.25a2.25 2.25 0 01-2.25-2.25v-6.87l-.97.97a.75.75 0 01-1.06-1.06l8.69-8.69z',
  },
  cases: {
    outline: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
    solid: 'M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.122c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z',
  },
  scripts: {
    outline: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
    solid: 'M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z',
  },
  appeals: {
    outline: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    solid: 'M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A9.75 9.75 0 0010.5 3H5.625zM8.25 15.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5zm0 3H12a.75.75 0 010 1.5H8.25a.75.75 0 010-1.5z',
  },
  profile: {
    outline: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
    solid: 'M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z',
  },
};

const tabConfig = [
  { key: 'index', icon: 'home', label: 'Home' },
  { key: 'cases', icon: 'cases', label: 'Cases' },
  { key: 'scripts', icon: 'scripts', label: 'Scripts' },
  { key: 'appeals', icon: 'appeals', label: 'Appeals' },
  { key: 'profile', icon: 'profile', label: 'Profile' },
];

function TabIcon({ name, active, color }: { name: string; active: boolean; color: string }) {
  const icon = icons[name];
  if (!icon) return null;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d={active ? icon.solid : icon.outline}
        fill={active ? color : 'none'}
        stroke={active ? 'none' : color}
        strokeWidth={active ? 0 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation }: any) {
  const { colors, typography } = useTheme();
  const indicatorX = useSharedValue(0);
  const tabWidth = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder }]}>
      <Animated.View style={[styles.indicator, { backgroundColor: colors.activeIndicator }, indicatorStyle]} />
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = tabConfig[index];
        if (!tab) return null;
        return (
          <TabButton
            key={route.key}
            label={tab.label}
            iconName={tab.icon}
            isFocused={isFocused}
            colors={colors}
            typography={typography}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (!isFocused) navigation.navigate(route.name);
            }}
            onLayout={(x: number, w: number) => {
              if (isFocused) {
                indicatorX.value = withSpring(x, springs.tab);
                tabWidth.value = withSpring(w, springs.tab);
              }
            }}
            indicatorX={indicatorX}
            tabWidthVal={tabWidth}
          />
        );
      })}
    </View>
  );
}

function TabButton({ label, iconName, isFocused, colors, typography, onPress, onLayout, indicatorX, tabWidthVal }: any) {
  const bounceScale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  React.useEffect(() => {
    if (isFocused) {
      bounceScale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 400 }),
        withSpring(1.0, springs.tab)
      );
    }
  }, [isFocused]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        onLayout(x, width);
        if (isFocused) {
          indicatorX.value = x;
          tabWidthVal.value = width;
        }
      }}
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        <TabIcon name={iconName} active={isFocused} color={isFocused ? colors.primary : colors.textTertiary} />
        <Text style={[typography.tabLabel, { color: isFocused ? colors.primary : colors.textTertiary, marginTop: 2 }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 20,
    paddingTop: 8,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    height: 48,
    borderRadius: radii.card,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
