import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions, Easing, View } from 'react-native';
import { useApp } from '../state/AppContext';

const { width, height } = Dimensions.get('window');

// Soft, low-opacity shapes that drift slowly behind the menu screens.
const SHAPES = [
  { color: '#5D9CEC', size: 120, x: 0.08, y: 0.12, dur: 7000, delay: 0 },
  { color: '#FC6E51', size: 90, x: 0.72, y: 0.18, dur: 9000, delay: 800 },
  { color: '#A0D468', size: 150, x: 0.6, y: 0.6, dur: 8000, delay: 400 },
  { color: '#AC92EC', size: 80, x: 0.15, y: 0.72, dur: 10000, delay: 1200 },
  { color: '#FFCE54', size: 70, x: 0.85, y: 0.82, dur: 7500, delay: 600 },
  { color: '#26C6DA', size: 110, x: 0.42, y: 0.3, dur: 11000, delay: 300 },
];

const FloatingShape: React.FC<{
  shape: (typeof SHAPES)[number];
  animate: boolean;
}> = ({ shape, animate }) => {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: shape.dur,
          delay: shape.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: shape.dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, drift, shape]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 16] });

  return (
    <Animated.View
      style={[
        styles.shape,
        {
          width: shape.size,
          height: shape.size,
          borderRadius: shape.size / 2,
          backgroundColor: shape.color,
          left: width * shape.x,
          top: height * shape.y,
          transform: animate ? [{ translateY }, { translateX }] : [],
        },
      ]}
    />
  );
};

/**
 * Decorative animated backdrop for menu screens. Pointer-transparent, sits
 * behind content, and freezes (static) when Reduced Motion is on.
 */
export const AnimatedBackground: React.FC = () => {
  const { settings } = useApp();
  const animate = !settings.reducedMotion;
  return (
    <View style={styles.container} pointerEvents="none">
      {SHAPES.map((s, i) => (
        <FloatingShape key={i} shape={s} animate={animate} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shape: {
    position: 'absolute',
    opacity: 0.08,
  },
});
