import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, BounceIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BuddyMascot } from './BuddyMascot';
import { FORGEButton } from './FORGEButton';
import { BuddyRank } from '../lib/buddy-evolution';
import { shareRankAchievement } from '../lib/share-card';

interface RankUpCelebrationProps {
  rank: BuddyRank;
  wins: number;
  denials: number;
  isPro?: boolean;
  onDismiss: () => void;
}

export function RankUpCelebration({ rank, wins, denials, isPro, onDismiss }: RankUpCelebrationProps) {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, []);

  const confettiColors = ['#FFD700', '#FF6B35', '#FFB347', '#22C55E', '#FF6347', '#FF8C42', '#8B5CF6', '#4A9EFF'];

  return (
    <Pressable onPress={onDismiss} style={styles.overlay}>
      {/* Confetti */}
      {Array.from({ length: 35 }).map((_, i) => (
        <Animated.View
          key={i}
          entering={FadeInDown.delay(i * 30).duration(1200 + Math.random() * 800)}
          style={{
            position: 'absolute',
            top: -10,
            left: Math.random() * 400,
            width: 5 + Math.random() * 6,
            height: 4 + Math.random() * 8,
            backgroundColor: confettiColors[i % confettiColors.length],
            borderRadius: 2,
            transform: [{ rotate: `${Math.random() * 360}deg` }],
          }}
        />
      ))}

      <Animated.View entering={BounceIn.delay(200).duration(800)}>
        <BuddyMascot mood="celebrating" size={130} rank={rank} isPro={isPro} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.content}>
        <Text style={styles.label}>RANK UP!</Text>
        <Text style={styles.rankName}>{rank.name}</Text>
        <Text style={styles.title}>{rank.title}</Text>
        <Text style={styles.description}>{rank.description}</Text>
        <Text style={styles.quote}>"{rank.quote}"</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1200)} style={styles.actions}>
        <FORGEButton
          title="Share Achievement"
          onPress={() => shareRankAchievement(rank, wins, denials)}
          variant="secondary"
        />
        <Text style={styles.dismiss}>Tap anywhere to close</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  content: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 40,
    marginTop: 16,
  },
  label: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: '#FFD700',
    letterSpacing: 2,
  },
  rankName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 36,
    color: '#FFFFFF',
  },
  title: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: 'rgba(245,245,247,0.6)',
  },
  description: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: 'rgba(245,245,247,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  quote: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: '#FF6B35',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
    width: '80%',
  },
  dismiss: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: 'rgba(245,245,247,0.3)',
  },
});
