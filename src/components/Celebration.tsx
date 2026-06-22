import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Dimensions, Easing, View } from 'react-native';
import { useApp } from '../state/AppContext';

const { width } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#FC6E51',
  '#FFCE54',
  '#A0D468',
  '#5D9CEC',
  '#AC92EC',
  '#EC407A',
  '#4FC3F7',
];
const STAR_EMOJIS = ['⭐', '🌟', '✨'];

type Intensity = 'small' | 'big';

interface CelebrationProps {
  /** Change this value to fire a new burst. */
  trigger: number;
  intensity?: Intensity;
}

interface PieceSpec {
  key: string;
  startX: number;
  drift: number;
  rise: number;
  delay: number;
  duration: number;
  rotate: number;
  isStar: boolean;
  color: string;
  emoji: string;
  size: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function buildBatch(batchId: number, intensity: Intensity): PieceSpec[] {
  const count = intensity === 'big' ? 26 : 12;
  return Array.from({ length: count }, (_, i) => {
    const isStar = intensity === 'big' ? i % 4 === 0 : i % 3 === 0;
    return {
      key: `${batchId}_${i}`,
      startX: rand(width * 0.2, width * 0.8),
      drift: rand(-70, 70),
      rise: intensity === 'big' ? rand(260, 420) : rand(150, 260),
      delay: intensity === 'big' ? rand(0, 250) : rand(0, 90),
      duration: rand(900, 1500),
      rotate: rand(-220, 220),
      isStar,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      emoji: STAR_EMOJIS[i % STAR_EMOJIS.length],
      size: isStar ? rand(20, 30) : rand(9, 15),
    };
  });
}

const Piece: React.FC<{ spec: PieceSpec }> = ({ spec }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: spec.duration,
      delay: spec.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress, spec]);

  // Rise upward (like stars flying to the score), then ease away while fading.
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -spec.rise],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, spec.drift],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0, 1, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.4, 1, 0.9],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${spec.rotate}deg`],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: spec.startX,
        top: '55%',
        opacity,
        transform: [{ translateY }, { translateX }, { scale }, { rotate }],
      }}
    >
      {spec.isStar ? (
        <Animated.Text style={{ fontSize: spec.size }}>{spec.emoji}</Animated.Text>
      ) : (
        <View
          style={{
            width: spec.size,
            height: spec.size * 1.4,
            borderRadius: 2,
            backgroundColor: spec.color,
          }}
        />
      )}
    </Animated.View>
  );
};

/**
 * Full-screen, non-interactive celebration overlay. Renders a fresh burst of
 * rising stars + confetti whenever `trigger` changes. Respects the user's
 * Reduced Motion accessibility setting (renders nothing when enabled).
 */
export const Celebration: React.FC<CelebrationProps> = ({
  trigger,
  intensity = 'small',
}) => {
  const { settings } = useApp();
  const [pieces, setPieces] = useState<PieceSpec[]>([]);

  useEffect(() => {
    if (trigger <= 0) return;
    if (settings.reducedMotion) return;
    const batch = buildBatch(trigger, intensity);
    setPieces(batch);
    const timer = setTimeout(() => setPieces([]), 1700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {pieces.map(spec => (
        <Piece key={spec.key} spec={spec} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
});
