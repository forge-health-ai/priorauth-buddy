import React, { useEffect, useState, useCallback } from 'react';
import { Pressable } from 'react-native';
import Svg, { Path, Circle, Ellipse, G, Line, Polygon, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BuddyRank, RankName } from '../lib/buddy-evolution';
import { useBuddy } from '../context/BuddyContext';

export type BuddyMood = 'happy' | 'thinking' | 'angry' | 'celebrating' | 'confused' | 'sleeping' | 'excited' | 'determined' | 'curious';

interface BuddyMascotProps {
  mood?: BuddyMood;
  size?: number;
  onPress?: () => void;
  rank?: BuddyRank;
  isPro?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BuddyMascot({ mood = 'happy', size = 120, onPress, rank: rankProp, isPro: isProProp }: BuddyMascotProps) {
  // Auto-consume context when props aren't explicitly passed
  const ctx = useBuddy();
  const rank = rankProp ?? ctx.rank;
  const isPro = isProProp ?? ctx.isPro;
  const floatY = useSharedValue(0);
  const breathScale = useSharedValue(1);
  const tapScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const [isBlinking, setIsBlinking] = useState(false);

  const rankName: RankName = rank?.name ?? 'Rookie';
  const shieldColor = rank?.shieldColor ?? '#FF6B35';
  const accentColor = rank?.accentColor ?? '#F7931E';

  // Blink every 3-5 seconds (randomized for natural feel)
  useEffect(() => {
    if (mood === 'sleeping' || mood === 'celebrating') return;
    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 3000;
      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        timerRef = scheduleBlink();
      }, delay);
    };
    let timerRef = scheduleBlink();
    return () => clearTimeout(timerRef);
  }, [mood]);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Legend glow pulsing
  useEffect(() => {
    if (rankName === 'Legend') {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [rankName]);

  // Pro glow pulsing
  const proGlow = useSharedValue(1);
  useEffect(() => {
    if (isPro) {
      proGlow.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [isPro]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: tapScale.value * breathScale.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    tapScale.value = withSequence(
      withSpring(0.9, { damping: 8, stiffness: 400 }),
      withSpring(1.1, { damping: 8, stiffness: 300 }),
      withSpring(1.0, { damping: 12, stiffness: 200 })
    );
    onPress?.();
  };

  const eyeColor = '#1A1A1E';
  const cx1 = size * 0.38;
  const cx2 = size * 0.62;
  const cy = size * 0.42;
  const r = size * 0.045;
  const pr = size * 0.025;

  // Advocate+ gets slightly narrower/sharper eyes
  const eyeNarrow = rankName === 'Advocate' || rankName === 'Champion' || rankName === 'Legend';

  const getEyes = () => {
    if (isBlinking) {
      return (
        <G>
          <Path d={`M${cx1 - r * 1.5} ${cy} Q${cx1} ${cy - r} ${cx1 + r * 1.5} ${cy}`} stroke={eyeColor} strokeWidth={2} fill="none" />
          <Path d={`M${cx2 - r * 1.5} ${cy} Q${cx2} ${cy - r} ${cx2 + r * 1.5} ${cy}`} stroke={eyeColor} strokeWidth={2} fill="none" />
        </G>
      );
    }

    switch (mood) {
      case 'sleeping':
        return (
          <G>
            <Path d={`M${cx1 - r * 1.5} ${cy} Q${cx1} ${cy - r} ${cx1 + r * 1.5} ${cy}`} stroke={eyeColor} strokeWidth={2} fill="none" />
            <Path d={`M${cx2 - r * 1.5} ${cy} Q${cx2} ${cy - r} ${cx2 + r * 1.5} ${cy}`} stroke={eyeColor} strokeWidth={2} fill="none" />
          </G>
        );
      case 'angry':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={r} fill="white" />
            <Circle cx={cx1} cy={cy} r={pr} fill={eyeColor} />
            <Circle cx={cx2} cy={cy} r={r} fill="white" />
            <Circle cx={cx2} cy={cy} r={pr} fill={eyeColor} />
            <Path d={`M${cx1 - r * 2} ${cy - r * 2.5} L${cx1 + r * 1.5} ${cy - r * 1.5}`} stroke={eyeColor} strokeWidth={2.5} strokeLinecap="round" />
            <Path d={`M${cx2 + r * 2} ${cy - r * 2.5} L${cx2 - r * 1.5} ${cy - r * 1.5}`} stroke={eyeColor} strokeWidth={2.5} strokeLinecap="round" />
          </G>
        );
      case 'celebrating':
        return (
          <G>
            <Path d={`M${cx1 - r * 1.5} ${cy + r * 0.5} Q${cx1} ${cy - r * 1.5} ${cx1 + r * 1.5} ${cy + r * 0.5}`} stroke={eyeColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Path d={`M${cx2 - r * 1.5} ${cy + r * 0.5} Q${cx2} ${cy - r * 1.5} ${cx2 + r * 1.5} ${cy + r * 0.5}`} stroke={eyeColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          </G>
        );
      case 'confused':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={r * 1.2} fill="white" />
            <Circle cx={cx1} cy={cy + 1} r={pr * 1.2} fill={eyeColor} />
            <Circle cx={cx2} cy={cy - 2} r={r * 0.9} fill="white" />
            <Circle cx={cx2} cy={cy - 1} r={pr} fill={eyeColor} />
          </G>
        );
      case 'thinking':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={r} fill="white" />
            <Circle cx={cx1 + 1} cy={cy - 1} r={pr} fill={eyeColor} />
            <Circle cx={cx2} cy={cy} r={r} fill="white" />
            <Circle cx={cx2 + 1} cy={cy - 1} r={pr} fill={eyeColor} />
          </G>
        );
      case 'excited':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={r * 1.3} fill="white" />
            <Circle cx={cx1} cy={cy} r={pr * 1.3} fill={eyeColor} />
            <Circle cx={cx2} cy={cy} r={r * 1.3} fill="white" />
            <Circle cx={cx2} cy={cy} r={pr * 1.3} fill={eyeColor} />
            <Circle cx={cx1 + r * 0.8} cy={cy - r * 0.8} r={pr * 0.4} fill="white" />
            <Circle cx={cx2 + r * 0.8} cy={cy - r * 0.8} r={pr * 0.4} fill="white" />
          </G>
        );
      case 'determined':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={r} fill="white" />
            <Circle cx={cx1} cy={cy} r={pr} fill={eyeColor} />
            <Circle cx={cx2} cy={cy} r={r} fill="white" />
            <Circle cx={cx2} cy={cy} r={pr} fill={eyeColor} />
            <Path d={`M${cx1 - r * 1.8} ${cy - r * 2} L${cx1 + r * 1.8} ${cy - r * 1.3}`} stroke={eyeColor} strokeWidth={2} strokeLinecap="round" />
            <Path d={`M${cx2 + r * 1.8} ${cy - r * 2} L${cx2 - r * 1.8} ${cy - r * 1.3}`} stroke={eyeColor} strokeWidth={2} strokeLinecap="round" />
          </G>
        );
      case 'curious':
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={r * 1.1} fill="white" />
            <Circle cx={cx1 + 1} cy={cy} r={pr * 1.1} fill={eyeColor} />
            <Circle cx={cx2} cy={cy - 2} r={r * 1.3} fill="white" />
            <Circle cx={cx2 + 1} cy={cy - 2} r={pr * 1.2} fill={eyeColor} />
          </G>
        );
      default: {
        // Default/happy eyes - narrower for Advocate+
        const eyeR = eyeNarrow ? r * 0.85 : r;
        const pupilR = eyeNarrow ? pr * 0.9 : pr;
        return (
          <G>
            <Circle cx={cx1} cy={cy} r={eyeR} fill="white" />
            <Circle cx={cx1} cy={cy} r={pupilR} fill={eyeColor} />
            <Circle cx={cx2} cy={cy} r={eyeR} fill="white" />
            <Circle cx={cx2} cy={cy} r={pupilR} fill={eyeColor} />
            {eyeNarrow && (
              <>
                <Path d={`M${cx1 - r * 1.5} ${cy - r * 1.8} L${cx1 + r * 1.5} ${cy - r * 1.2}`} stroke={eyeColor} strokeWidth={1.5} strokeLinecap="round" />
                <Path d={`M${cx2 + r * 1.5} ${cy - r * 1.8} L${cx2 - r * 1.5} ${cy - r * 1.2}`} stroke={eyeColor} strokeWidth={1.5} strokeLinecap="round" />
              </>
            )}
          </G>
        );
      }
    }
  };

  const getMouth = () => {
    const mx = size * 0.5;
    const my = size * 0.56;
    const w = size * 0.1;

    switch (mood) {
      case 'sleeping':
        return <Ellipse cx={mx} cy={my} rx={w * 0.4} ry={w * 0.3} fill={eyeColor} opacity={0.3} />;
      case 'angry':
        return <Path d={`M${mx - w} ${my + 3} Q${mx} ${my - 4} ${mx + w} ${my + 3}`} stroke={eyeColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
      case 'celebrating':
        return <Path d={`M${mx - w} ${my - 2} Q${mx} ${my + w} ${mx + w} ${my - 2}`} stroke={eyeColor} strokeWidth={2.5} fill="#FF6B35" fillOpacity={0.3} strokeLinecap="round" />;
      case 'confused':
        return <Path d={`M${mx - w * 0.6} ${my} Q${mx} ${my + 5} ${mx + w * 0.6} ${my - 2}`} stroke={eyeColor} strokeWidth={2} fill="none" strokeLinecap="round" />;
      case 'thinking':
        return <Circle cx={mx + w * 0.5} cy={my} r={w * 0.35} fill={eyeColor} opacity={0.4} />;
      case 'excited':
        return <Path d={`M${mx - w} ${my - 3} Q${mx} ${my + w * 1.2} ${mx + w} ${my - 3}`} stroke={eyeColor} strokeWidth={2.5} fill="#FF6B35" fillOpacity={0.2} strokeLinecap="round" />;
      case 'determined':
        // Champion+ gets a confident smirk instead of flat line
        if (rankName === 'Champion' || rankName === 'Legend') {
          return <Path d={`M${mx - w * 0.6} ${my + 1} Q${mx} ${my - 2} ${mx + w * 0.8} ${my - 1}`} stroke={eyeColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
        }
        return <Path d={`M${mx - w * 0.8} ${my} L${mx + w * 0.8} ${my}`} stroke={eyeColor} strokeWidth={2.5} strokeLinecap="round" />;
      case 'curious':
        return <Ellipse cx={mx} cy={my + 1} rx={w * 0.45} ry={w * 0.4} fill={eyeColor} opacity={0.4} />;
      default:
        // Champion+ gets a wider, more confident smile
        if (rankName === 'Champion' || rankName === 'Legend') {
          return <Path d={`M${mx - w * 1.1} ${my - 1} Q${mx} ${my + w * 1.1} ${mx + w * 1.1} ${my - 1}`} stroke={eyeColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
        }
        return <Path d={`M${mx - w} ${my} Q${mx} ${my + w * 0.8} ${mx + w} ${my}`} stroke={eyeColor} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
    }
  };

  // Compute SVG dimensions with room for crown and glow
  const padding = isPro ? size * 0.2 : rankName === 'Legend' ? size * 0.15 : 0;
  const crownHeight = (rankName === 'Legend' || rankName === 'Champion') ? size * 0.12 : 0;
  const totalW = size + padding * 2;
  const totalH = size * 0.85 + padding * 2 + crownHeight;
  const offsetX = padding;
  const offsetY = padding + crownHeight;

  return (
    <AnimatedPressable style={animatedStyle} onPress={handlePress}>
      <Svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`}>
        {/* Pro glow - triple-layer electric blue aura */}
        {isPro && (
          <>
            {/* Outermost diffuse glow */}
            <Circle
              cx={offsetX + size * 0.5}
              cy={offsetY + size * 0.42}
              r={size * 0.56}
              fill="none"
              stroke="#4A9EFF"
              strokeWidth={size * 0.12}
              opacity={0.12}
            />
            {/* Mid glow ring */}
            <Circle
              cx={offsetX + size * 0.5}
              cy={offsetY + size * 0.42}
              r={size * 0.52}
              fill="none"
              stroke="#60B0FF"
              strokeWidth={size * 0.06}
              opacity={0.3}
            />
            {/* Inner bright ring */}
            <Circle
              cx={offsetX + size * 0.5}
              cy={offsetY + size * 0.42}
              r={size * 0.48}
              fill="none"
              stroke="#80CFFF"
              strokeWidth={size * 0.025}
              opacity={0.7}
            />
            {/* Top highlight spark */}
            <Circle
              cx={offsetX + size * 0.5}
              cy={offsetY + size * 0.42 - size * 0.48}
              r={size * 0.03}
              fill="#FFFFFF"
              opacity={0.8}
            />
            {/* Side sparkles */}
            <Circle
              cx={offsetX + size * 0.5 + size * 0.46}
              cy={offsetY + size * 0.32}
              r={size * 0.02}
              fill="#FFFFFF"
              opacity={0.6}
            />
            <Circle
              cx={offsetX + size * 0.5 - size * 0.44}
              cy={offsetY + size * 0.35}
              r={size * 0.02}
              fill="#FFFFFF"
              opacity={0.5}
            />
          </>
        )}

        {/* Legend animated glow - rendered as static, animated via wrapper */}
        {rankName === 'Legend' && (
          <Circle
            cx={offsetX + size * 0.5}
            cy={offsetY + size * 0.42}
            r={size * 0.44}
            fill="#FFD700"
            opacity={0.15}
          />
        )}

        {/* Crown for Legend */}
        {rankName === 'Legend' && (
          <G>
            <Polygon
              points={`${offsetX + size * 0.3},${offsetY - size * 0.02} ${offsetX + size * 0.37},${offsetY - size * 0.1} ${offsetX + size * 0.44},${offsetY - size * 0.03} ${offsetX + size * 0.5},${offsetY - size * 0.12} ${offsetX + size * 0.56},${offsetY - size * 0.03} ${offsetX + size * 0.63},${offsetY - size * 0.1} ${offsetX + size * 0.7},${offsetY - size * 0.02}`}
              fill="#FFD700"
              stroke="#DAA520"
              strokeWidth={1}
            />
          </G>
        )}

        {/* Shield body */}
        <Path
          d={`M${offsetX + size * 0.5} ${offsetY + size * 0.05} L${offsetX + size * 0.88} ${offsetY + size * 0.2} L${offsetX + size * 0.88} ${offsetY + size * 0.5} Q${offsetX + size * 0.88} ${offsetY + size * 0.75} ${offsetX + size * 0.5} ${offsetY + size * 0.82} Q${offsetX + size * 0.12} ${offsetY + size * 0.75} ${offsetX + size * 0.12} ${offsetY + size * 0.5} L${offsetX + size * 0.12} ${offsetY + size * 0.2} Z`}
          fill={shieldColor}
        />

        {/* Champion/Legend gold trim border */}
        {(rankName === 'Champion' || rankName === 'Legend') && (
          <Path
            d={`M${offsetX + size * 0.5} ${offsetY + size * 0.05} L${offsetX + size * 0.88} ${offsetY + size * 0.2} L${offsetX + size * 0.88} ${offsetY + size * 0.5} Q${offsetX + size * 0.88} ${offsetY + size * 0.75} ${offsetX + size * 0.5} ${offsetY + size * 0.82} Q${offsetX + size * 0.12} ${offsetY + size * 0.75} ${offsetX + size * 0.12} ${offsetY + size * 0.5} L${offsetX + size * 0.12} ${offsetY + size * 0.2} Z`}
            fill="none"
            stroke="#FFD700"
            strokeWidth={2.5}
          />
        )}

        {/* Inner shield highlight */}
        <Path
          d={`M${offsetX + size * 0.5} ${offsetY + size * 0.1} L${offsetX + size * 0.82} ${offsetY + size * 0.23} L${offsetX + size * 0.82} ${offsetY + size * 0.48} Q${offsetX + size * 0.82} ${offsetY + size * 0.7} ${offsetX + size * 0.5} ${offsetY + size * 0.77} Q${offsetX + size * 0.18} ${offsetY + size * 0.7} ${offsetX + size * 0.18} ${offsetY + size * 0.48} L${offsetX + size * 0.18} ${offsetY + size * 0.23} Z`}
          fill={accentColor}
          opacity={0.6}
        />

        {/* Fighter battle scar */}
        {(rankName === 'Fighter') && (
          <Line
            x1={offsetX + size * 0.62}
            y1={offsetY + size * 0.18}
            x2={offsetX + size * 0.72}
            y2={offsetY + size * 0.32}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}

        {/* Face area */}
        <Ellipse cx={offsetX + size * 0.5} cy={offsetY + size * 0.48} rx={size * 0.28} ry={size * 0.22} fill="white" opacity={0.9} />

        {/* Eyes (offset by padding) */}
        <G transform={`translate(${offsetX}, ${offsetY})`}>
          {getEyes()}
          {getMouth()}
        </G>

        {/* Cheek blush */}
        <Circle cx={offsetX + size * 0.3} cy={offsetY + size * 0.52} r={size * 0.035} fill={shieldColor} opacity={0.3} />
        <Circle cx={offsetX + size * 0.7} cy={offsetY + size * 0.52} r={size * 0.035} fill={shieldColor} opacity={0.3} />
      </Svg>
    </AnimatedPressable>
  );
}
