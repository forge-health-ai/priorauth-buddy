import { Share } from 'react-native';
import { BuddyRank } from './buddy-evolution';

/**
 * Share rank achievement via native share sheet.
 * Uses text-based sharing since react-native-view-shot
 * would require an additional dependency.
 */
export async function shareRankAchievement(rank: BuddyRank, wins: number, denials: number): Promise<void> {
  const message = [
    `I reached ${rank.name} rank on PriorAuth Buddy! ${rank.name === 'Legend' ? '👑' : '🛡️'}`,
    '',
    `My insurer denied me ${denials} time${denials === 1 ? '' : 's'}. I won ${wins} time${wins === 1 ? '' : 's'}.`,
    '',
    rank.quote,
    '',
    'Fight your insurance denial: priorauthbuddy.com',
  ].join('\n');

  await Share.share({
    title: `I reached ${rank.name} on PriorAuth Buddy`,
    message,
  });
}
