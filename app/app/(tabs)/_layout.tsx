import { Tabs } from 'expo-router';
import { AnimatedTabBar } from '../../src/components/AnimatedTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="cases" options={{ title: 'Cases' }} />
      <Tabs.Screen name="scripts" options={{ title: 'Scripts' }} />
      <Tabs.Screen name="appeals" options={{ title: 'Appeals' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
