import React from 'react';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import type { BuddyMood } from './BuddyMascot';

interface MiniBuddyProps {
  mood?: BuddyMood;
  size?: number;
}

export function MiniBuddy({ mood = 'happy', size = 36 }: MiniBuddyProps) {
  const eyeColor = '#1A1A1E';
  const cx1 = size * 0.38;
  const cx2 = size * 0.62;
  const cy = size * 0.42;
  const r = size * 0.06;
  const pr = size * 0.035;

  const getEyes = () => {
    switch (mood) {
      case 'sleeping':
        return (
          <G>
            <Path d={`M${cx1 - r * 1.2} ${cy} Q${cx1} ${cy - r} ${cx1 + r * 1.2} ${cy}`} stroke={eyeColor} strokeWidth={1.5} fill="none" />
            <Path d={`M${cx2 - r * 1.2} ${cy} Q${cx2} ${cy - r} ${cx2 + r * 1.2} ${cy}`} stroke={eyeColor} strokeWidth={1.5} fill="none" />
          </G>
        );
      case 'angry':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={pr} fill={eyeColor} />
            <Circle cx={cx2} cy={cy} r={pr} fill={eyeColor} />
            <Path d={`M${cx1 - r * 1.5} ${cy - r * 2} L${cx1 + r} ${cy - r}`} stroke={eyeColor} strokeWidth={1.5} strokeLinecap="round" />
            <Path d={`M${cx2 + r * 1.5} ${cy - r * 2} L${cx2 - r} ${cy - r}`} stroke={eyeColor} strokeWidth={1.5} strokeLinecap="round" />
          </G>
        );
      case 'celebrating':
        return (
          <G>
            <Path d={`M${cx1 - r} ${cy + r * 0.3} Q${cx1} ${cy - r} ${cx1 + r} ${cy + r * 0.3}`} stroke={eyeColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />
            <Path d={`M${cx2 - r} ${cy + r * 0.3} Q${cx2} ${cy - r} ${cx2 + r} ${cy + r * 0.3}`} stroke={eyeColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          </G>
        );
      case 'confused':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={r * 0.9} fill="white" />
            <Circle cx={cx1} cy={cy} r={pr * 0.9} fill={eyeColor} />
            <Circle cx={cx2} cy={cy - 1} r={r * 0.7} fill="white" />
            <Circle cx={cx2} cy={cy - 1} r={pr * 0.7} fill={eyeColor} />
          </G>
        );
      case 'thinking':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={pr} fill={eyeColor} />
            <Circle cx={cx2} cy={cy} r={pr} fill={eyeColor} />
          </G>
        );
      default:
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={pr} fill={eyeColor} />
            <Circle cx={cx2} cy={cy} r={pr} fill={eyeColor} />
          </G>
        );
    }
  };

  const getMouth = () => {
    const mx = size * 0.5;
    const my = size * 0.56;
    const w = size * 0.08;
    switch (mood) {
      case 'angry':
        return <Path d={`M${mx - w} ${my + 1} Q${mx} ${my - 2} ${mx + w} ${my + 1}`} stroke={eyeColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />;
      case 'celebrating':
        return <Path d={`M${mx - w} ${my} Q${mx} ${my + w} ${mx + w} ${my}`} stroke={eyeColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />;
      case 'confused':
        return <Path d={`M${mx - w * 0.5} ${my} Q${mx} ${my + 2} ${mx + w * 0.5} ${my - 1}`} stroke={eyeColor} strokeWidth={1.2} fill="none" strokeLinecap="round" />;
      case 'sleeping':
        return <Ellipse cx={mx} cy={my} rx={w * 0.4} ry={w * 0.3} fill={eyeColor} opacity={0.3} />;
      default:
        return <Path d={`M${mx - w} ${my} Q${mx} ${my + w * 0.7} ${mx + w} ${my}`} stroke={eyeColor} strokeWidth={1.5} fill="none" strokeLinecap="round" />;
    }
  };

  return (
    <Svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
      <Path
        d={`M${size * 0.5} ${size * 0.05} L${size * 0.88} ${size * 0.2} L${size * 0.88} ${size * 0.5} Q${size * 0.88} ${size * 0.75} ${size * 0.5} ${size * 0.82} Q${size * 0.12} ${size * 0.75} ${size * 0.12} ${size * 0.5} L${size * 0.12} ${size * 0.2} Z`}
        fill="#FF6B35"
      />
      <Path
        d={`M${size * 0.5} ${size * 0.1} L${size * 0.82} ${size * 0.23} L${size * 0.82} ${size * 0.48} Q${size * 0.82} ${size * 0.7} ${size * 0.5} ${size * 0.77} Q${size * 0.18} ${size * 0.7} ${size * 0.18} ${size * 0.48} L${size * 0.18} ${size * 0.23} Z`}
        fill="#F7931E"
        opacity={0.6}
      />
      <Ellipse cx={size * 0.5} cy={size * 0.48} rx={size * 0.28} ry={size * 0.22} fill="white" opacity={0.9} />
      {getEyes()}
      {getMouth()}
    </Svg>
  );
}
