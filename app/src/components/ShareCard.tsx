import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BuddyMascot } from './BuddyMascot';
import { BuddyRank } from '../lib/buddy-evolution';

interface ShareCardProps {
  rank: BuddyRank;
  denials: number;
  wins: number;
  isPro?: boolean;
}

export function ShareCard({ rank, denials, wins, isPro }: ShareCardProps) {
  return (
    <View style={styles.card}>
      <BuddyMascot mood="celebrating" size={90} rank={rank} isPro={isPro} />
      <Text style={styles.title}>I reached {rank.name}!</Text>
      <Text style={styles.subtitle}>on PriorAuth Buddy</Text>
      <Text style={styles.stats}>
        My insurer denied me {denials} time{denials === 1 ? '' : 's'}. I won {wins} time{wins === 1 ? '' : 's'}.
      </Text>
      <View style={styles.divider} />
      <Text style={styles.cta}>Fight your insurance denial at priorauthbuddy.com</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F0F14',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(245, 245, 247, 0.6)',
  },
  stats: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: '#F5F5F7',
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#FF6B35',
    borderRadius: 1,
    marginVertical: 8,
  },
  cta: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: 'rgba(245, 245, 247, 0.4)',
    textAlign: 'center',
  },
});
