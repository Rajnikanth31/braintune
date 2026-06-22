import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle, StyleProp } from 'react-native';
import { useApp } from '../state/AppContext';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Slight upward slide distance (px). */
  offset?: number;
  duration?: number;
}

/**
 * Fades (and gently slides) its children in on mount — used to soften screen
 * transitions. Honors the Reduced Motion accessibility setting by appearing
 * instantly with no animation.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  style,
  offset = 12,
  duration = 260,
}) => {
  const { settings } = useApp();
  const reduce = settings.reducedMotion;
  const anim = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) {
      anim.setValue(1);
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, reduce, duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [offset, 0],
  });

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};
