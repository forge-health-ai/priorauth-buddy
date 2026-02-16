import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COLORS = ['#FFD700', '#FF6B35', '#FFB347', '#22C55E', '#FF6347', '#FF8C42', '#4A9EFF', '#8B5CF6'];

interface Piece {
  x: number;
  delay: number;
  duration: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  sway: number;
}

function generatePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * SCREEN_W,
    delay: i * 60 + Math.random() * 200,
    duration: 2000 + Math.random() * 1500,
    w: 5 + Math.random() * 8,
    h: 4 + Math.random() * 10,
    color: COLORS[i % COLORS.length],
    rotation: Math.random() * 360,
    sway: (Math.random() - 0.5) * 80,
  }));
}

const PIECES = generatePieces(45);

function ConfettiPiece({ piece }: { piece: Piece }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      piece.delay,
      withTiming(SCREEN_H + 50, { duration: piece.duration, easing: Easing.in(Easing.quad) })
    );
    translateX.value = withDelay(
      piece.delay,
      withTiming(piece.sway, { duration: piece.duration, easing: Easing.inOut(Easing.sin) })
    );
    opacity.value = withDelay(
      piece.delay + piece.duration * 0.7,
      withTiming(0, { duration: piece.duration * 0.3 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: piece.x,
    top: 0,
    width: piece.w,
    height: piece.h,
    backgroundColor: piece.color,
    borderRadius: 2,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${piece.rotation}deg` },
    ],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

export function ConfettiFall() {
  return (
    <>
      {PIECES.map((piece, i) => (
        <ConfettiPiece key={i} piece={piece} />
      ))}
    </>
  );
}
